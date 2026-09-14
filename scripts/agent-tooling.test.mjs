import assert from 'node:assert/strict';
import { cpSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';

import { checkGenerated, generateOpenSpec } from './openspec.mjs';
import {
  applySkillPatches,
  hashSkill,
  verifyOpenCodeSkills,
  verifySkillHashes
} from './skills.mjs';

test('generation ignores the caller profile and detects modified, missing and extra instructions', () => {
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
    checkGenerated(expected, actual);
    assert.equal(readFileSync(join(temp, 'profile/openspec/config.json'), 'utf8'), profile);
    const command = join(actual, '.opencode/commands/opsx-apply.md');
    writeFileSync(command, 'drift');
    assert.throws(() => checkGenerated(expected, actual), /opsx-apply\.md/);
    rmSync(command);
    assert.throws(() => checkGenerated(expected, actual), /opsx-apply\.md/);
    cpSync(join(expected, '.opencode'), join(actual, '.opencode'), { recursive: true });
    writeFileSync(join(actual, '.opencode/commands/opsx-extra.md'), 'extra');
    assert.throws(() => checkGenerated(expected, actual), /opsx-extra\.md/);
  } finally {
    if (previous === undefined) delete process.env.XDG_CONFIG_HOME;
    else process.env.XDG_CONFIG_HOME = previous;
    rmSync(temp, { recursive: true, force: true });
  }
});

test('skill verification catches incomplete installs and incompatible patches, and verifies restored upstream bytes', () => {
  const temp = mkdtempSync(join(tmpdir(), 'skills-test-'));
  try {
    const directory = join(temp, '.agents/skills/example');
    mkdirSync(directory, { recursive: true });
    writeFileSync(join(directory, 'SKILL.md'), 'Upstream\n');
    const skills = { example: { computedHash: hashSkill(directory) } };
    const check = () => verifySkillHashes(join(temp, '.agents/skills'), skills);
    check();
    const patch = join(temp, 'example.patch');
    writeFileSync(
      patch,
      '--- a/.agents/skills/example/SKILL.md\n+++ b/.agents/skills/example/SKILL.md\n@@ -1 +1 @@\n-Upstream\n+Project\n'
    );
    applySkillPatches(temp, [patch]);
    assert.throws(check, /content differs/);
    assert.throws(() => applySkillPatches(temp, [patch]), /Command failed/);
    applySkillPatches(temp, [patch], true);
    check();
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
