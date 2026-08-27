import { mkdtemp, mkdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';

import { afterEach, describe, expect, it } from 'vitest';

import { validateStatusCalendarAlternates } from '../status-calendar-alternate-validation';

const site = new URL('https://kpshelkovo.online');
const temporaryDirectories: string[] = [];

const createOutput = async (): Promise<string> => {
  const directory = await mkdtemp(join(tmpdir(), 'calendar-alternates-'));
  temporaryDirectories.push(directory);

  return directory;
};

const writeCalendarHtml = async (
  directory: string,
  href: string,
): Promise<void> => {
  const calendarDirectory = join(directory, 'status/calendar/2026');
  await mkdir(calendarDirectory, { recursive: true });
  await writeFile(
    join(calendarDirectory, 'index.html'),
    `<link rel="alternate" type="text/markdown" href="${href}">`,
  );
};

afterEach(async () => {
  await Promise.all(
    temporaryDirectories.splice(0).map((directory) =>
      rm(directory, {
        recursive: true,
        force: true,
      }),
    ),
  );
});

describe('status calendar alternate validation', () => {
  it('accepts an alternate backed by a physical Markdown document', async () => {
    const directory = await createOutput();
    await writeCalendarHtml(
      directory,
      'https://kpshelkovo.online/status/calendar/2026/index.md',
    );
    await writeFile(
      join(directory, 'status/calendar/2026/index.md'),
      '# Календарь',
    );

    await expect(
      validateStatusCalendarAlternates(pathToFileURL(`${directory}/`), site),
    ).resolves.toBeUndefined();
  });

  it('reports a declared alternate missing from the build', async () => {
    const directory = await createOutput();
    await writeCalendarHtml(directory, '/status/calendar/2026/index.md');

    await expect(
      validateStatusCalendarAlternates(pathToFileURL(`${directory}/`), site),
    ).rejects.toThrowErrorMatchingInlineSnapshot(`
      [Error: Invalid status calendar Markdown alternates:
      - status/calendar/2026/index.html -> /status/calendar/2026/index.md]
    `);
  });

  it('rejects a calendar HTML without a local Markdown alternate', async () => {
    const directory = await createOutput();
    await writeCalendarHtml(directory, 'https://example.com/calendar.md');

    await expect(
      validateStatusCalendarAlternates(pathToFileURL(`${directory}/`), site),
    ).rejects.toThrowErrorMatchingInlineSnapshot(`
      [Error: Invalid status calendar Markdown alternates:
      - status/calendar/2026/index.html -> expected one same-origin Markdown alternate, found 0]
    `);
  });
});
