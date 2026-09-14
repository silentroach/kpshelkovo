import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import {
  cpSync,
  existsSync,
  globSync,
  lstatSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  rmSync
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { z } from 'zod';

const root = fileURLToPath(new URL('..', import.meta.url));
const skillName = z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);
const lockSchema = z.strictObject({
  version: z.literal(1),
  skills: z.record(
    skillName,
    z.strictObject({
      source: z.string().regex(/^[\w.-]+\/[\w.-]+$/),
      sourceType: z.literal('github'),
      ref: z.string().regex(/^[a-f0-9]{40}$/),
      skillPath: z
        .string()
        .regex(/^(?:[\w.-]+\/)*SKILL\.md$/)
        .refine((path) => !path.split('/').includes('..')),
      computedHash: z.string().regex(/^[a-f0-9]{64}$/)
    })
  )
});

// Match skills@1.5.24: sorted relative paths + bytes, excluding runtime Python caches.
export function hashSkill(directory) {
  const files = [];
  const collect = (path) => {
    for (const entry of readdirSync(path, { withFileTypes: true })) {
      if (['.git', 'node_modules', '__pycache__'].includes(entry.name)) continue;
      const file = join(path, entry.name);
      if (entry.isSymbolicLink()) throw new Error(`Unexpected skill symlink: ${file}`);
      if (entry.isDirectory()) collect(file);
      else if (entry.isFile()) files.push(relative(directory, file).replaceAll('\\', '/'));
    }
  };
  collect(directory);
  const hash = createHash('sha256');
  for (const file of files.sort((a, b) => a.localeCompare(b)))
    hash.update(file).update(readFileSync(join(directory, file)));
  return hash.digest('hex');
}

export function verifySkillHashes(directory, skills) {
  for (const [name, entry] of Object.entries(skills)) {
    const installed = join(directory, name);
    if (!existsSync(join(installed, 'SKILL.md'))) throw new Error(`Missing skill: ${name}`);
    if (lstatSync(installed).isSymbolicLink() || hashSkill(installed) !== entry.computedHash) {
      throw new Error(`Skill content differs from skills-lock.json: ${name}`);
    }
  }
  const extras = readdirSync(directory).filter((name) => !Object.keys(skills).includes(name));
  if (extras.length) throw new Error(`Unexpected skills: ${extras.join(', ')}`);
}

export function applySkillPatches(directory, patches, reverse = false) {
  for (const patch of reverse ? [...patches].reverse() : patches) {
    execFileSync(
      'git',
      ['apply', ...(reverse ? ['--reverse'] : []), '--whitespace=nowarn', patch],
      {
        cwd: directory,
        stdio: 'pipe'
      }
    );
  }
}

export function verifyOpenCodeSkills(directory, projectSkills) {
  for (const path of globSync('.opencode/skills/*/SKILL.md', { cwd: directory })) {
    const name = path.split('/')[2];
    if (!name.startsWith('openspec-') || projectSkills.has(name)) {
      throw new Error(`Unexpected or duplicate OpenCode skill: ${path}`);
    }
  }
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const mode = process.argv[2];
  if (!['install', 'check'].includes(mode))
    throw new Error('Use: node scripts/skills.mjs install|check');
  const lock = lockSchema.parse(JSON.parse(readFileSync(join(root, 'skills-lock.json'), 'utf8')));
  const names = Object.keys(lock.skills);
  const tracked = execFileSync('git', ['ls-files', '-z', '--', '.agents/skills'], {
    cwd: root,
    encoding: 'utf8'
  });
  const owned = new Set(
    tracked
      .split('\0')
      .filter(Boolean)
      .map((path) => path.split('/')[2])
  );
  for (const name of names)
    if (owned.has(name)) throw new Error(`Skill is both project-owned and external: ${name}`);
  const local = join(root, '.agents/skills');
  for (const name of owned) {
    if (!existsSync(join(local, name, 'SKILL.md')))
      throw new Error(`Missing project-owned skill: ${name}`);
  }
  const extras = readdirSync(local).filter((name) => !owned.has(name) && !names.includes(name));
  if (extras.length)
    throw new Error(`Remove unconfigured project skills first: ${extras.join(', ')}`);
  verifyOpenCodeSkills(root, new Set([...owned, ...names]));
  const patches = globSync('.agents/skill-patches/*.patch', { cwd: root })
    .sort()
    .map((path) => join(root, path));
  const temp = mkdtempSync(join(tmpdir(), 'shelkovo-skills-'));
  try {
    const staged = join(temp, '.agents/skills');
    if (mode === 'install') {
      const groups = Map.groupBy(
        Object.entries(lock.skills),
        ([, entry]) => `${entry.source}#${entry.ref}`
      );
      const cli = join(root, 'node_modules/skills/bin/cli.mjs');
      for (const [source, entries] of groups) {
        console.log(`Installing ${entries.length} skills from ${source}`);
        execFileSync(
          process.execPath,
          [
            cli,
            'add',
            source,
            '--skill',
            ...entries.map(([name]) => name),
            '--agent',
            'opencode',
            '--yes',
            '--full-depth'
          ],
          {
            cwd: temp,
            env: {
              ...process.env,
              HOME: temp,
              XDG_CONFIG_HOME: join(temp, 'config'),
              XDG_CACHE_HOME: join(temp, 'cache'),
              DISABLE_TELEMETRY: '1',
              CI: '1'
            },
            stdio: 'pipe',
            timeout: 180_000
          }
        );
      }
      verifySkillHashes(staged, lock.skills);
      applySkillPatches(temp, patches);
      for (const name of names) {
        const destination = join(local, name);
        if (existsSync(destination) && lstatSync(destination).isSymbolicLink())
          throw new Error(`Unexpected skill symlink: ${destination}`);
        rmSync(destination, { recursive: true, force: true });
        cpSync(join(staged, name), destination, { recursive: true });
      }
    } else {
      for (const name of names) {
        const installed = join(local, name);
        if (!existsSync(installed)) throw new Error(`Missing skill: ${name}`);
        if (lstatSync(installed).isSymbolicLink())
          throw new Error(`Unexpected skill symlink: ${installed}`);
        cpSync(installed, join(staged, name), { recursive: true });
      }
    }
    applySkillPatches(temp, patches, true);
    verifySkillHashes(staged, lock.skills);
    console.log(
      `Skills ${mode}: ${names.length} pinned external skills and ${owned.size} project-owned skills verified.`
    );
  } finally {
    rmSync(temp, { recursive: true, force: true });
  }
}
