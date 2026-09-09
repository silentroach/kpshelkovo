import { spawnSync } from 'node:child_process';
import { access, chmod } from 'node:fs/promises';
import { join } from 'node:path';

const root = process.cwd();
const git = join(root, '.git');
const file = join(root, '.githooks', 'pre-commit');

await access(git).catch(() => process.exit(0));

const out = spawnSync('git', ['config', '--local', 'core.hooksPath', '.githooks'], {
  cwd: root,
  stdio: 'inherit'
});

if (out.status !== 0) {
  process.exit(out.status ?? 1);
}

await chmod(file, 0o755);
