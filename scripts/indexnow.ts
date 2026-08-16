import { appendFile } from 'node:fs/promises';

import {
  submitIndexNowChanges,
  writeIndexNowKeyFile,
} from '../apps/www/src/lib/indexnow.ts';

const appendIndexNowSummary = async (
  urls: readonly string[],
  requestCount: number,
): Promise<void> => {
  const summaryPath = process.env.GITHUB_STEP_SUMMARY;

  if (!summaryPath) {
    return;
  }

  const lines = [
    '## IndexNow submission',
    '',
    `- URLs submitted: **${urls.length}**`,
    `- Requests accepted: **${requestCount}**`,
  ];

  if (urls.length > 0) {
    lines.push(
      '',
      '### Submitted URLs',
      '',
      ...urls.map((url) => `- <${url}>`),
    );
  }

  await appendFile(summaryPath, `${lines.join('\n')}\n`, 'utf8');
};

const [command, targetPath, changesPath] = process.argv.slice(2);
const key = process.env.INDEXNOW_KEY;

if (!key) {
  throw new Error('INDEXNOW_KEY is required');
}

switch (command) {
  case 'prepare': {
    if (!targetPath || changesPath) {
      throw new Error('usage: indexnow prepare <site-root>');
    }

    await writeIndexNowKeyFile(targetPath, key);
    console.log('IndexNow ownership file prepared.');
    break;
  }

  case 'submit': {
    if (!targetPath || !changesPath) {
      throw new Error('usage: indexnow submit <url-manifest> <rsync-changes>');
    }

    const [urls, requestCount] = await submitIndexNowChanges(
      targetPath,
      changesPath,
      key,
    );

    console.log(
      urls.length === 0
        ? 'IndexNow ownership file verified; no changed URLs to submit.'
        : `IndexNow submitted ${urls.length} changed URLs in ${requestCount} request(s).`,
    );
    await appendIndexNowSummary(urls, requestCount);
    break;
  }

  default:
    throw new Error('usage: indexnow <prepare|submit>');
}
