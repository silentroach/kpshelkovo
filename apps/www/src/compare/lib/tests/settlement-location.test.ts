/// <reference types="astro/client" />

import { readFileSync } from 'node:fs';

import * as geo from '@shelkovo/geo';
import { Window } from 'happy-dom';
import { afterEach, expect, test, vi } from 'vitest';
import { parse } from 'yaml';

// @ts-expect-error Astro page modules are resolved by Astro/Vitest at test time.
import Page, { getStaticPaths } from '@/pages/815/compare/settlements/[slug]/index.astro';
import { getStaticPaths as getMarkdownPaths } from '@/pages/815/compare/settlements/[slug]/index.md';
import { createAstroContainer } from '@/test/astro-container';

import { loadAllData } from '../data';
import { toFullPayload } from '../full';
import { buildSettlementMd } from '../markdown';
import { buildRatings, MKAD_RADIUS } from '../rating';
import { mapRawSettlement } from '../settlement/mapper';
import { RawSettlementSchema } from '../settlement/schema';
import { computeStats } from '../stats';

vi.mock('../data', () => ({ loadAllData: vi.fn() }));

afterEach(() => vi.restoreAllMocks());

test.each([
  [9.96, 10, '~10 км'],
  [14.96, 15, '~20 км'],
  [24.96, 25, '~30 км'],
  [0, 0, '0 км']
] as const)('keeps MKAD distance consistent for %s km', async (rawKm, roundedKm, label) => {
  const baseline = mapRawSettlement(
    RawSettlementSchema.parse(
      parse(
        readFileSync(
          new URL('../../../data/compare/settlements/shelkovo.yaml', import.meta.url),
          'utf8'
        )
      )
    )
  );
  vi.spyOn(geo, 'calculateDistance').mockReturnValue(MKAD_RADIUS + rawKm);
  const settlements = [baseline];
  const ratings = buildRatings(settlements);
  const data = {
    settlements,
    baseline,
    ratings,
    comparisons: new Map(),
    stats: computeStats(settlements, ratings, baseline)
  };
  vi.mocked(loadAllData).mockResolvedValue(data);

  const [page] = await getStaticPaths();
  const [markdownPage] = await getMarkdownPaths();
  const container = await createAstroContainer();
  const html = await container.renderToString(Page, {
    props: page.props,
    request: new Request('https://kpshelkovo.online/815/compare/settlements/shelkovo/')
  });
  const window = new Window();
  try {
    window.document.write(html);
    expect(
      Array.from(
        window.document.querySelectorAll(
          '.settlement-fact-detail[title], .settlement-passport-location [title]'
        ),
        (element) => element.textContent.trim().replace(/^, /, '')
      )
    ).toEqual([`${label} от МКАД`, `${label} от МКАД`]);
    const markdownDistance = buildSettlementMd(markdownPage.props)
      .split('\n')
      .find((line) => line.includes('за МКАД:'));
    expect(markdownDistance).toContain(label.replace('~', '\\~'));
    expect(toFullPayload(data).settlements[0].distance.mkad_km).toBe(roundedKm);
  } finally {
    await window.happyDOM.close();
  }
});
