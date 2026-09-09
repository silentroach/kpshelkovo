import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

import {
  auditNonHtmlAnchorPrefetch,
  findNonHtmlAnchorPrefetchViolations,
  formatNonHtmlAnchorPrefetchViolation
} from '@/lib/non-html-link-prefetch';

describe('non-HTML link prefetch guard', () => {
  it('reports internal non-HTML anchors without prefetch opt-out', () => {
    const code = `
      <a href="/files/rules.pdf">PDF</a>
      <a href="/data/feed.json">JSON feed</a>
      <a href="https://kpshelkovo.online/.well-known/app.json">Discovery</a>
      <a href="/sarafan/electricity/alexander-eremin/contact.vcf">vCard</a>
      <a href="https://example.com/file.pdf">External PDF</a>
      <a href="/files/rules.pdf" data-astro-prefetch="false">Guarded PDF</a>
      <ResourceLink href="/files/rules.pdf">PDF</ResourceLink>
    `;

    const violations = findNonHtmlAnchorPrefetchViolations({
      code,
      filePath: 'Fixture.astro'
    });

    expect(violations.map(formatNonHtmlAnchorPrefetchViolation)).toMatchInlineSnapshot(`
        [
          "Fixture.astro:2:7 links to /files/rules.pdf without data-astro-prefetch=\"false\". Preferred fix: use ResourceLink, or add the attribute explicitly.",
          "Fixture.astro:3:7 links to /data/feed.json without data-astro-prefetch=\"false\". Preferred fix: use ResourceLink, or add the attribute explicitly.",
          "Fixture.astro:4:7 links to https://kpshelkovo.online/.well-known/app.json without data-astro-prefetch=\"false\". Preferred fix: use ResourceLink, or add the attribute explicitly.",
          "Fixture.astro:5:7 links to /sarafan/electricity/alexander-eremin/contact.vcf without data-astro-prefetch=\"false\". Preferred fix: use ResourceLink, or add the attribute explicitly.",
        ]
      `);
  });

  it('keeps current source anchors guarded', () => {
    const violations = auditNonHtmlAnchorPrefetch({
      rootDir: join(process.cwd(), 'src')
    });

    expect(violations.map(formatNonHtmlAnchorPrefetchViolation)).toEqual([]);
  });
});
