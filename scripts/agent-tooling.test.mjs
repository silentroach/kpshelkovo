import assert from 'node:assert/strict';
import { mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, relative } from 'node:path';
import { test } from 'node:test';

import { generateOpenSpec } from './openspec.mjs';
import { hashSkill, verifyOpenCodeSkills, verifySkillHashes } from './skills.mjs';

const tree = (directory) =>
  readdirSync(directory, { recursive: true, withFileTypes: true })
    .filter((entry) => entry.isFile())
    .map((entry) => {
      const path = relative(directory, join(entry.parentPath, entry.name));
      return [path, readFileSync(join(directory, path))];
    })
    .sort(([a], [b]) => a.localeCompare(b));

test('generation ignores the caller profile and leaves it untouched', () => {
  const temp = mkdtempSync(join(tmpdir(), 'openspec-test-'));
  const previous = process.env.XDG_CONFIG_HOME;
  try {
    const expected = join(temp, 'expected');
    const actual = join(temp, 'actual');
    mkdirSync(join(temp, 'profile/openspec'), { recursive: true });
    const profile = '{"profile":"custom","workflows":["onboard"],"delivery":"commands"}';
    writeFileSync(join(temp, 'profile/openspec/config.json'), profile);
    generateOpenSpec(expected);
    process.env.XDG_CONFIG_HOME = join(temp, 'profile');
    generateOpenSpec(actual);
    assert.deepEqual(tree(actual), tree(expected));
    assert.equal(readFileSync(join(temp, 'profile/openspec/config.json'), 'utf8'), profile);
  } finally {
    if (previous === undefined) delete process.env.XDG_CONFIG_HOME;
    else process.env.XDG_CONFIG_HOME = previous;
    rmSync(temp, { recursive: true, force: true });
  }
});

test('skill verification detects altered, missing and unexpected skills alongside project-owned skills', () => {
  const temp = mkdtempSync(join(tmpdir(), 'skills-test-'));
  try {
    const directory = join(temp, '.agents/skills/example');
    mkdirSync(directory, { recursive: true });
    writeFileSync(join(directory, 'SKILL.md'), 'Upstream\n');
    const skills = { example: { computedHash: hashSkill(directory) } };
    mkdirSync(join(temp, '.agents/skills/project-owned'));
    writeFileSync(join(temp, '.agents/skills/project-owned/SKILL.md'), 'Project-owned\n');
    const check = () =>
      verifySkillHashes(join(temp, '.agents/skills'), skills, new Set(['project-owned']));
    check();
    writeFileSync(join(directory, 'SKILL.md'), 'Altered\n');
    assert.throws(check, /content differs/);
    writeFileSync(join(directory, 'SKILL.md'), 'Upstream\n');
    check();
    mkdirSync(join(temp, '.agents/skills/unexpected'));
    assert.throws(check, /Unexpected skills: unexpected/);
    rmSync(join(temp, '.agents/skills/unexpected'), { recursive: true });
    rmSync(join(directory, 'SKILL.md'));
    assert.throws(check, /Missing skill: example/);
    const stale = join(temp, '.opencode/skills/ask-matt');
    mkdirSync(stale, { recursive: true });
    writeFileSync(join(stale, 'SKILL.md'), 'Old process');
    assert.throws(() => verifyOpenCodeSkills(temp, new Set()), /Unexpected or duplicate/);
  } finally {
    rmSync(temp, { recursive: true, force: true });
  }
});
