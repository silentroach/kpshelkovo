import fs from 'node:fs';
import path from 'node:path';

import {
  CONTENT_SIGNAL,
  analyzeLighthouseReport,
  validateRobotsPolicy,
} from './lighthouse-policy.mjs';

const target = process.env.LIGHTHOUSE_SITE_TARGET ?? 'production';
const reportsDir = process.env.LIGHTHOUSE_REPORTS_DIR ?? '.lighthouseci';
const categories = [
  ['performance', 'Performance'],
  ['accessibility', 'Accessibility'],
  ['best-practices', 'Best Practices'],
];
const metrikaPattern = /https:\/\/mc\.yandex\.(?:ru|com)\//i;

const escapeCell = (value) =>
  String(value).replace(/\\/g, '\\\\').replace(/\|/g, '\\|');
const formatScore = (score) =>
  typeof score === 'number' ? Math.round(score * 100) : 'n/a';
const displayUrl = (value) => {
  try {
    const url = new URL(value);
    return `${url.pathname}${url.search}` || value;
  } catch {
    return value;
  }
};

const auditMentionsMetrika = (audit) =>
  audit &&
  metrikaPattern.test(
    JSON.stringify({
      description: audit.description,
      details: audit.details,
      displayValue: audit.displayValue,
      title: audit.title,
    }),
  );

const metrikaAuditsFor = (report) =>
  [
    ['third-party-cookies', 'third-party cookies'],
    ['inspector-issues', 'inspector issues'],
  ].filter(([id]) => auditMentionsMetrika(report.audits?.[id]));

const listJsonFiles = (directory) => {
  if (!fs.existsSync(directory)) return [];

  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const entryPath = path.join(directory, entry.name);
    if (entry.isDirectory()) return listJsonFiles(entryPath);
    return entry.isFile() && entry.name.endsWith('.json') ? [entryPath] : [];
  });
};

const loadReports = () => {
  const manifestPath = path.join(reportsDir, 'manifest.json');
  const representativeNames = fs.existsSync(manifestPath)
    ? new Set(
        JSON.parse(fs.readFileSync(manifestPath, 'utf8'))
          .filter((entry) => entry.isRepresentativeRun && entry.jsonPath)
          .map((entry) => path.basename(entry.jsonPath)),
      )
    : new Set();
  const reports = listJsonFiles(reportsDir)
    .filter((file) => path.basename(file) !== 'manifest.json')
    .map((file) => ({
      file,
      report: JSON.parse(fs.readFileSync(file, 'utf8')),
    }))
    .filter(
      ({ report }) =>
        report.categories && (report.finalUrl || report.requestedUrl),
    );

  return representativeNames.size > 0
    ? reports.filter(({ file }) => representativeNames.has(path.basename(file)))
    : reports;
};

const loadRobotsTxt = async () => {
  if (target === 'static') {
    const file =
      process.env.LIGHTHOUSE_STATIC_ROBOTS_PATH ?? 'dist/www/robots.txt';
    return { source: file, content: fs.readFileSync(file, 'utf8') };
  }

  if (target !== 'production') {
    throw new Error(`Unsupported LIGHTHOUSE_SITE_TARGET: ${target}`);
  }

  const origin = (
    process.env.LHCI_PRODUCTION_ORIGIN ?? 'https://kpshelkovo.online'
  ).replace(/\/+$/, '');
  const url = `${origin}/robots.txt`;
  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(`${url} returned HTTP ${response.status}`);
  }

  return { source: url, content: await response.text() };
};

const reports = loadReports();
const reportResults = reports
  .map(({ report }) => ({ report, analysis: analyzeLighthouseReport(report) }))
  .sort((left, right) =>
    displayUrl(left.analysis.url).localeCompare(displayUrl(right.analysis.url)),
  );
const analyses = reportResults.map(({ analysis }) => analysis);
const failures = [];
let robotsSource = target;
let robotsPolicy = { passed: false, errors: [] };

try {
  const robots = await loadRobotsTxt();
  robotsSource = robots.source;
  robotsPolicy = validateRobotsPolicy(robots.content);
} catch (error) {
  robotsPolicy = {
    passed: false,
    errors: [error instanceof Error ? error.message : String(error)],
  };
}

if (reports.length === 0) {
  failures.push('No Lighthouse JSON reports were found');
}

failures.push(...robotsPolicy.errors.map((error) => `robots.txt: ${error}`));

for (const analysis of analyses) {
  failures.push(...analysis.errors);
  failures.push(
    ...analysis.seoAuditFailures.map(
      (audit) =>
        `${analysis.url}: SEO audit ${audit.id} scored ${formatScore(audit.score)}`,
    ),
  );
}

const summary = [
  '## Lighthouse CI',
  '',
  `Target: \`${target}\``,
  `Analytics: \`${process.env.LIGHTHOUSE_DISABLE_ANALYTICS === 'true' ? 'disabled' : 'enabled'}\``,
  '',
];

if (analyses.length > 0) {
  summary.push(
    '| URL | Performance | Accessibility | Best Practices | SEO (raw) | SEO without accepted Content-Signal |',
    '| --- | ---: | ---: | ---: | ---: | ---: |',
  );

  for (const { report, analysis } of reportResults) {
    const scores = categories.map(([key]) =>
      formatScore(report.categories[key]?.score),
    );
    summary.push(
      `| ${escapeCell(displayUrl(analysis.url))} | ${scores.join(' | ')} | ${formatScore(analysis.rawSeoScore)} | ${formatScore(analysis.normalizedSeoScore)} |`,
    );
  }

  summary.push('');
} else {
  summary.push(
    'No Lighthouse JSON reports were found. Check the workflow logs and the `lighthouse-reports` artifact.',
    '',
  );
}

summary.push('### robots.txt policy', '');

if (robotsPolicy.passed) {
  summary.push(
    `- Strict policy check passed for \`${robotsSource}\`: exact \`User-agent\`, \`Allow\`, \`Content-Signal\`, and \`Sitemap\` lines with no additional directives.`,
  );
} else {
  summary.push(`- Strict policy check failed for \`${robotsSource}\`.`);
  summary.push(...robotsPolicy.errors.map((error) => `- ${error}`));
}

const acceptedFindingCount = analyses.filter(
  ({ robotsFinding }) => robotsFinding === 'accepted-content-signal',
).length;
const passedRobotsCount = analyses.filter(
  ({ robotsFinding }) => robotsFinding === 'passed',
).length;

if (acceptedFindingCount > 0) {
  summary.push(
    `- Raw Lighthouse reports \`${CONTENT_SIGNAL}\` as \`Unknown directive\` in ${acceptedFindingCount} of ${analyses.length} representative reports. Only this exact finding is excluded from normalized SEO.`,
  );
}

if (passedRobotsCount > 0) {
  summary.push(
    `- Raw Lighthouse accepted robots.txt in ${passedRobotsCount} of ${analyses.length} representative reports.`,
  );
}

summary.push('');

const metrikaFindings = reports
  .map(({ report }) => ({
    url: displayUrl(report.finalUrl || report.requestedUrl),
    audits: metrikaAuditsFor(report),
  }))
  .filter(({ audits }) => audits.length > 0);

if (metrikaFindings.length > 0) {
  summary.push(
    '### Yandex Metrika Best Practices Finding',
    '',
    'Production Lighthouse runs intentionally keep Yandex Metrika enabled. The recurring third-party-cookie Best Practices finding is an accepted external-service limitation; scheduled static runs disable analytics with `LIGHTHOUSE_DISABLE_ANALYTICS=true`.',
    '',
  );

  for (const finding of metrikaFindings) {
    summary.push(
      `- ${finding.url}: ${finding.audits.map(([, label]) => `\`${label}\``).join(', ')}`,
    );
  }

  summary.push('');
}

summary.push(
  'Raw scores come from representative Lighthouse runs. Normalized SEO must pass every scored SEO audit except the exact accepted `Content-Signal` false positive. Full unmodified reports are attached as the `lighthouse-reports` artifact.',
);

const output = `${summary.join('\n')}\n`;

if (process.env.GITHUB_STEP_SUMMARY) {
  fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY, output);
} else {
  process.stdout.write(output);
}

if (failures.length > 0) {
  for (const failure of failures)
    console.error(`Lighthouse policy: ${failure}`);
  process.exitCode = 1;
}
