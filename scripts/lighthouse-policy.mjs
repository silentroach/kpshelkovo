export const CONTENT_SIGNAL =
  'Content-Signal: ai-train=yes, search=yes, ai-input=yes';

const EXPECTED_ROBOTS_LINES = [
  'User-agent: *',
  'Allow: /',
  CONTENT_SIGNAL,
  'Sitemap: https://kpshelkovo.online/sitemap-index.xml',
];

const ROBOTS_AUDIT_ID = 'robots-txt';

export const validateRobotsPolicy = (content) => {
  const lines = content.replaceAll('\r\n', '\n').split('\n');

  if (lines.at(-1) === '') lines.pop();

  const errors = [];
  const lineCount = Math.max(lines.length, EXPECTED_ROBOTS_LINES.length);

  for (let index = 0; index < lineCount; index += 1) {
    const actual = lines[index];
    const expected = EXPECTED_ROBOTS_LINES[index];

    if (actual === expected) continue;

    if (expected === undefined) {
      errors.push(
        `Line ${index + 1} is not allowed: ${JSON.stringify(actual)}`,
      );
      continue;
    }

    errors.push(
      `Line ${index + 1}: expected ${JSON.stringify(expected)}, received ${JSON.stringify(actual)}`,
    );
  }

  return { passed: errors.length === 0, errors };
};

const isAcceptedContentSignalFinding = (audit) => {
  const items = audit?.details?.items;

  return (
    audit?.score === 0 &&
    Array.isArray(items) &&
    items.length === 1 &&
    items[0]?.line === CONTENT_SIGNAL &&
    items[0]?.message === 'Unknown directive'
  );
};

const getRobotsFinding = (audit) => {
  if (isAcceptedContentSignalFinding(audit)) return 'accepted-content-signal';
  if (audit?.score === 1) return 'passed';
  return 'unexpected';
};

export const analyzeLighthouseReport = (report) => {
  const url = report.finalUrl ?? report.requestedUrl ?? 'unknown URL';
  const seo = report.categories?.seo;
  const errors = [];
  const seoAuditFailures = [];
  const robotsAudit = report.audits?.[ROBOTS_AUDIT_ID];
  const robotsFinding = getRobotsFinding(robotsAudit);

  if (robotsFinding === 'unexpected') {
    errors.push(`${url}: Lighthouse reported an unexpected robots.txt result`);
  }

  if (!seo || !Array.isArray(seo.auditRefs)) {
    errors.push(`${url}: Lighthouse SEO category is missing`);

    return {
      url,
      rawSeoScore: seo?.score,
      robotsFinding,
      seoAuditFailures,
      errors,
    };
  }

  let weightedScore = 0;
  let totalWeight = 0;

  for (const reference of seo.auditRefs) {
    if (reference.id === ROBOTS_AUDIT_ID || !(reference.weight > 0)) continue;

    const audit = report.audits?.[reference.id];

    if (!audit) {
      errors.push(`${url}: Lighthouse SEO audit ${reference.id} is missing`);
      continue;
    }

    if (audit.scoreDisplayMode === 'notApplicable') continue;

    if (typeof audit.score !== 'number') {
      errors.push(`${url}: Lighthouse SEO audit ${reference.id} has no score`);
      continue;
    }

    weightedScore += audit.score * reference.weight;
    totalWeight += reference.weight;

    if (audit.score < 1) {
      seoAuditFailures.push({
        id: reference.id,
        score: audit.score,
        title: audit.title ?? reference.id,
      });
    }
  }

  if (totalWeight === 0) {
    errors.push(`${url}: Lighthouse SEO category has no scored audits`);
  }

  return {
    url,
    rawSeoScore: seo.score,
    normalizedSeoScore:
      totalWeight > 0 ? weightedScore / totalWeight : undefined,
    robotsFinding,
    seoAuditFailures,
    errors,
  };
};
