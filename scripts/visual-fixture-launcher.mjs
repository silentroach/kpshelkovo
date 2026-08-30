// @ts-check

import { spawnSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';

const host = '127.0.0.1';

/** @typedef {import('./visual-fixture-launcher.types.ts').VisualFixtureOptions} VisualFixtureOptions */

/**
 * @param {readonly string[]} args
 * @returns {VisualFixtureOptions}
 */
export const parseVisualFixtureArgs = (args) => {
  if (args.length !== 2) {
    throw new Error('Expected a fixture root and port');
  }

  const [fixtureRoot, rawPort] = args;
  const port = Number(rawPort);

  if (!fixtureRoot) {
    throw new Error('Fixture root must not be empty');
  }

  if (!Number.isSafeInteger(port) || port < 1 || port > 65_535) {
    throw new Error(`Invalid preview port: ${rawPort}`);
  }

  return { fixtureRoot, port };
};

/** @param {readonly string[]} args */
const runAstro = (args) => {
  const result = spawnSync('astro', args, {
    env: {
      ...process.env,
      ASTRO_PREVIEW_BACKGROUND: '0',
    },
    stdio: 'inherit',
  });

  if (result.error) {
    throw result.error;
  }

  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
};

const serveVisualFixture = () => {
  const { fixtureRoot, port } = parseVisualFixtureArgs(process.argv.slice(2));

  runAstro(['build', '--root', fixtureRoot]);
  runAstro([
    'preview',
    '--root',
    fixtureRoot,
    '--host',
    host,
    '--port',
    String(port),
  ]);
};

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(process.argv[1]).href
) {
  serveVisualFixture();
}
