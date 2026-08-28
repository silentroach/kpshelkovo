import assert from 'node:assert/strict';
import test from 'node:test';

import {
  CONTENT_SIGNAL,
  analyzeLighthouseReport,
  validateRobotsPolicy,
} from './lighthouse-policy.mjs';

const validRobots = `User-agent: *
Allow: /
${CONTENT_SIGNAL}
Sitemap: https://kpshelkovo.online/sitemap-index.xml
`;

const makeReport = ({ metaDescriptionScore = 1, robotsItems }) => ({
  finalUrl: 'https://kpshelkovo.online/',
  categories: {
    seo: {
      score: 0.92,
      auditRefs: [
        { id: 'meta-description', weight: 1 },
        { id: 'robots-txt', weight: 1 },
      ],
    },
  },
  audits: {
    'meta-description': {
      title: 'Has a meta description',
      score: metaDescriptionScore,
      scoreDisplayMode: 'binary',
    },
    'robots-txt': {
      score: 0,
      details: {
        items: robotsItems ?? [
          { line: CONTENT_SIGNAL, message: 'Unknown directive' },
        ],
      },
    },
  },
});

test('accepts only the exact robots policy', () => {
  assert.deepEqual(validateRobotsPolicy(validRobots), {
    passed: true,
    errors: [],
  });
});

test('rejects a malformed standard directive', () => {
  assert.deepEqual(
    validateRobotsPolicy(validRobots.replace('Allow: /', 'Allows: /')),
    {
      passed: false,
      errors: ['Line 2: expected "Allow: /", received "Allows: /"'],
    },
  );
});

test('rejects an additional unknown directive', () => {
  assert.deepEqual(validateRobotsPolicy(`${validRobots}Unknown: value\n`), {
    passed: false,
    errors: ['Line 5 is not allowed: "Unknown: value"'],
  });
});

test('normalizes only the accepted Content-Signal finding', () => {
  assert.deepEqual(analyzeLighthouseReport(makeReport({})), {
    url: 'https://kpshelkovo.online/',
    rawSeoScore: 0.92,
    normalizedSeoScore: 1,
    robotsFinding: 'accepted-content-signal',
    seoAuditFailures: [],
    errors: [],
  });
});

test('keeps another SEO failure visible after normalization', () => {
  assert.deepEqual(
    analyzeLighthouseReport(makeReport({ metaDescriptionScore: 0 })),
    {
      url: 'https://kpshelkovo.online/',
      rawSeoScore: 0.92,
      normalizedSeoScore: 0,
      robotsFinding: 'accepted-content-signal',
      seoAuditFailures: [
        {
          id: 'meta-description',
          score: 0,
          title: 'Has a meta description',
        },
      ],
      errors: [],
    },
  );
});

test('does not accept a different robots.txt finding', () => {
  assert.deepEqual(
    analyzeLighthouseReport(
      makeReport({
        robotsItems: [{ line: 'Unknown: value', message: 'Unknown directive' }],
      }),
    ),
    {
      url: 'https://kpshelkovo.online/',
      rawSeoScore: 0.92,
      normalizedSeoScore: 1,
      robotsFinding: 'unexpected',
      seoAuditFailures: [],
      errors: [
        'https://kpshelkovo.online/: Lighthouse reported an unexpected robots.txt result',
      ],
    },
  );
});
