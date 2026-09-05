const target = process.env.LIGHTHOUSE_SITE_TARGET ?? 'production';
const productionOrigin = (
  process.env.LHCI_PRODUCTION_ORIGIN ?? 'https://kpshelkovo.online'
).replace(/\/+$/, '');
const allowedTargets = new Set(['production', 'static']);
// Production includes accepted Yandex Metrika third-party-cookie noise.
const bestPracticesMinScore = target === 'production' ? 0.75 : 0.9;

if (!allowedTargets.has(target)) {
  throw new Error(`Unsupported LIGHTHOUSE_SITE_TARGET: ${target}`);
}

const paths = [
  '/',
  '/news/',
  '/status/',
  '/815/compare/',
  '/815/compare/rating/',
  '/815/regulation/',
];

const urls = paths.map((path) =>
  target === 'static'
    ? `http://localhost${path}`
    : `${productionOrigin}${path}`,
);

const collect = {
  ...(target === 'static' ? { staticDistDir: './dist/www' } : {}),
  url: urls,
  numberOfRuns: 3,
};

module.exports = {
  ci: {
    collect,
    assert: {
      assertions: {
        'categories:performance': ['warn', { minScore: 0.85 }],
        'categories:accessibility': ['warn', { minScore: 0.95 }],
        'categories:best-practices': [
          'warn',
          { minScore: bestPracticesMinScore },
        ],
        'categories:seo': ['warn', { minScore: 0.9 }],
      },
    },
    upload: {
      target: 'filesystem',
      outputDir: './.lighthouseci',
    },
  },
};
