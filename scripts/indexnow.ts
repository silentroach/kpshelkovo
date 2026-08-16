import {
  submitIndexNowChanges,
  writeIndexNowKeyFile,
} from '../apps/www/src/lib/indexnow.ts';

const [command, siteRoot, changesPath] = process.argv.slice(2);
const key = process.env.INDEXNOW_KEY;

if (!key) {
  throw new Error('INDEXNOW_KEY is required');
}

switch (command) {
  case 'prepare': {
    if (!siteRoot || changesPath) {
      throw new Error('usage: indexnow prepare <site-root>');
    }

    await writeIndexNowKeyFile(siteRoot, key);
    console.log('IndexNow ownership file prepared.');
    break;
  }

  case 'submit': {
    if (!siteRoot || !changesPath) {
      throw new Error('usage: indexnow submit <site-root> <rsync-changes>');
    }

    const [urlCount, requestCount] = await submitIndexNowChanges(
      siteRoot,
      changesPath,
      key,
    );

    console.log(
      urlCount === 0
        ? 'IndexNow ownership file verified; no changed URLs to submit.'
        : `IndexNow submitted ${urlCount} changed URLs in ${requestCount} request(s).`,
    );
    break;
  }

  default:
    throw new Error('usage: indexnow <prepare|submit>');
}
