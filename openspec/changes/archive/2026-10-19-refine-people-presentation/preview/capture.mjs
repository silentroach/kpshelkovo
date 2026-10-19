import { execFileSync } from 'node:child_process';
import { readFile, writeFile, mkdir, mkdtemp, rm } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { z } from 'zod';

const root = dirname(fileURLToPath(import.meta.url));
const workspace = resolve(root, '../../../../..');
const require = createRequire(join(workspace, 'apps/www/package.json'));
const sharp = require('sharp');
const session = execFileSync(
  'agent-browser',
  ['session', 'id', '--scope', 'worktree', '--prefix', 'people-1063-capture'],
  { encoding: 'utf8' }
).trim();
const temp = await mkdtemp(join(process.env.TMPDIR || '/tmp', 'people-1063-'));
const css = await readFile(join(root, 'proposal.css'), 'utf8');
const apply = await readFile(join(root, 'apply.js'), 'utf8');
const profileSlugs = ['kschemelinin', 'gmozgov', 'msorochinsky', 'sminakov', 'ykizilov'];
const requested = process.argv.slice(2);
const profiles = requested.length ? z.array(z.enum(profileSlugs)).parse(requested) : profileSlugs;
const widths = [390, 320, 1440];
const previous = requested.length
  ? JSON.parse(await readFile(join(root, 'checks.json'), 'utf8'))
  : undefined;
const checks = (previous?.checks ?? [])
  .filter((check) => !profiles.includes(check.slug))
  .map((check) => ({ ...check, capturedAt: check.capturedAt ?? previous.capturedAt }));
const capturedAt = new Date().toISOString();
await mkdir(join(root, 'images'), { recursive: true });

function browser(...args) {
  const result = JSON.parse(
    execFileSync('agent-browser', ['--session', session, '--json', ...args], {
      encoding: 'utf8',
      maxBuffer: 10 * 1024 * 1024
    })
  );
  if (!result.success) throw new Error(JSON.stringify(result.error));
  return result.data;
}

const inspect = `(() => {
  const main = document.querySelector('.person-profile');
  const rect = (selector) => main.querySelector(selector)?.getBoundingClientRect().toJSON();
  return {
    preserved: {
      name: main.querySelector('h1').textContent,
      body: main.querySelector('.person-profile__body')?.innerHTML,
      contacts: [...main.querySelectorAll('.person-profile__contact-link')].map(a => [a.textContent, a.getAttribute('href')]),
      caption: main.querySelector('figcaption')?.innerHTML,
      photo: [...(main.querySelector('.person-profile__photo img')?.attributes || [])].map(a => [a.name, a.value])
    },
    headline: main.querySelector('.person-profile__headline')?.textContent,
    roles: [...main.querySelectorAll('.person-profile__role')].map(role => [...role.children].map(p => p.textContent)),
    width: innerWidth,
    scrollWidth: document.documentElement.scrollWidth,
    hasContactsSection: Boolean(main.querySelector('.person-profile__contacts')),
    contactTop: rect('.person-profile__contacts')?.top,
    photoTop: rect('.person-profile__photo')?.top,
    contentBottom: rect('.person-profile__header-inner')?.bottom,
    fontStatus: document.fonts.status,
    photoLoaded: main.querySelector('img')?.naturalWidth,
    contactWeight: main.querySelector('.person-profile__contact-link') && getComputedStyle(main.querySelector('.person-profile__contact-link')).fontWeight
  };
})()`;

try {
  for (const slug of profiles) {
    for (const width of widths) {
      browser('set', 'viewport', String(width), width === 1440 ? '1000' : '844');
      browser('open', `https://kpshelkovo.online/people/${slug}/`);
      browser(
        'eval',
        '(async () => { await document.fonts.ready; await Promise.all([...document.images].map(image => image.decode().catch(() => {}))); return true; })()'
      );
      const before = browser('eval', inspect).result;
      const original = join(temp, 'before.png');
      browser('screenshot', '--full', original);
      browser(
        'eval',
        `${apply}\nconst style = document.createElement('style'); style.textContent = ${JSON.stringify(css)}; document.head.append(style);`
      );
      const after = browser('eval', inspect).result;
      const { body: beforeBody, ...beforeUnchanged } = before.preserved;
      const { body: afterBody, ...afterUnchanged } = after.preserved;
      z.literal(JSON.stringify(beforeUnchanged)).parse(JSON.stringify(afterUnchanged));
      const bodySchema =
        slug === 'sminakov'
          ? z.literal('<p>Бывший руководитель группы компаний «Земля МО».</p>')
          : beforeBody === undefined
            ? z.undefined()
            : z.literal(beforeBody);
      bodySchema.parse(afterBody);
      z.literal(width).parse(after.scrollWidth);
      z.literal('loaded').parse(after.fontStatus);
      z.literal(before.preserved.contacts.length > 0).parse(after.hasContactsSection);
      if (after.photoTop !== undefined && after.hasContactsSection && width < 768)
        z.literal(true).parse(after.contactTop < after.photoTop);
      if (width >= 768) z.literal(before.photoTop).optional().parse(after.photoTop);
      if (slug === 'sminakov') {
        z.literal(0).parse(after.roles.length);
        z.undefined().parse(after.headline);
      } else if (slug === 'ykizilov') {
        z.literal(JSON.stringify([['Генеральный директор', 'группа компаний «Земля МО»']])).parse(
          JSON.stringify(after.roles)
        );
      } else {
        z.literal(before.headline.trim()).parse(after.roles[0].join(', '));
      }
      const proposed = join(temp, 'after.png');
      browser('screenshot', '--full', proposed);

      const originalMeta = await sharp(original).metadata();
      const proposedMeta = await sharp(proposed).metadata();
      const height =
        width === 1440
          ? Math.min(1000, Math.ceil(Math.max(before.contentBottom, after.contentBottom) + 40))
          : Math.max(originalMeta.height, proposedMeta.height);
      const background = '#f8faf7';
      const images = [];
      for (const [variant, file, metadata] of [
        ['before', original, originalMeta],
        ['after', proposed, proposedMeta]
      ]) {
        const buffer = await sharp(file)
          .extract({ left: 0, top: 0, width, height: Math.min(height, metadata.height) })
          .extend({ bottom: Math.max(0, height - metadata.height), background })
          .webp({ lossless: true })
          .toBuffer();
        await writeFile(join(root, 'images', `${slug}-${width}-${variant}.webp`), buffer);
        images.push(buffer);
      }
      await sharp({ create: { width: width * 2 + 24, height, channels: 3, background: '#dde4de' } })
        .composite([
          { input: images[0], left: 0, top: 0 },
          { input: images[1], left: width + 24, top: 0 }
        ])
        .webp({ lossless: true })
        .toFile(join(root, 'images', `${slug}-${width}-pair.webp`));
      checks.push({
        slug,
        width,
        capturedAt,
        before: {
          headline: before.headline,
          contactTop: before.contactTop,
          photoTop: before.photoTop
        },
        after: {
          roles: after.roles,
          hasContactsSection: after.hasContactsSection,
          contactTop: after.contactTop,
          photoTop: after.photoTop,
          scrollWidth: after.scrollWidth,
          contactWeight: after.contactWeight
        },
        preserved: true,
        editorialChange:
          slug === 'sminakov'
            ? 'Бывшая должность перенесена из подзаголовка в body.'
            : slug === 'ykizilov'
              ? 'Уточнена единственная должность в группе компаний «Земля МО».'
              : undefined,
        imageHeight: height
      });
      console.log(`${slug} ${width}: captured and checked`);
    }
  }
  await writeFile(
    join(root, 'checks.json'),
    JSON.stringify({ updatedAt: new Date().toISOString(), checks }, undefined, 2) + '\n'
  );
} finally {
  browser('close');
  await rm(temp, { recursive: true });
}
