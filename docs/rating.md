# Rating

Internal note for the settlement rating in `/815/compare/` within `apps/www`. This file is for future agent sessions, not for UI copy.

## Goal

- Build-time only.
- Hidden numeric score for manual sorting on the main page and explorer.
- Tariff is excluded on purpose.
- Score is a quality proxy, not an absolute real-estate ranking.

## Numerical Source Of Truth

All exact weights, scales, distance thresholds, score limits, bonuses, and penalties live in `RATING_METHODOLOGY` and the calculation in `apps/www/src/compare/lib/rating.ts`.

Public explanations consume those values at build time:

- HTML: `apps/www/src/pages/815/compare/rating.astro`
- generated Markdown: `apps/www/src/compare/lib/markdown.ts`
- published methodology: <https://kpshelkovo.online/815/compare/rating/>

Do not copy the current numerical values into this document. Change them in `rating.ts`; update this note only when the meaning, inputs, or maintenance rules change.

## Output

- One computed number per settlement: `rating`.
- Stored as `score` in `apps/www/src/compare/lib/rating.ts`, serialized as `rating` in explorer DTO.
- Rounded to one decimal and clamped to the range declared by `RATING_METHODOLOGY`.

## Inputs

- `location.lat`, `location.lng`
- `infrastructure.*`
- `common_spaces.*`
- `service_model.*`
- `lots.*` is metadata only for tariff normalization and is excluded from rating.

Do not add tariff into this formula.

## Distance Block

- The calculation estimates the MKAD radius from a small fixed set of sample points.
- `km` is the haversine distance from the settlement to the Moscow center.
- `ring` is the distance beyond the estimated MKAD radius, never below zero.
- The distance score uses `ring`, not raw `km`, because the intent is “how far beyond MKAD”.
- Between the declared distance points, the score changes linearly and stays at the final floor beyond the last point.

This is intentionally soft. Distance matters, but should not dominate basic settlement quality.

## Field Mapping

Binary statuses and ordered enums map confirmed field values to block scores. The exact mappings remain beside the calculation in `rating.ts`.

Ordered enums cover:

- roads
- drainage
- video surveillance
- underground electricity

## Group Scores

The model has four weighted groups:

- infrastructure
- common spaces
- service model
- distance from MKAD

Infrastructure, common spaces, and service model are weighted means over known fields only. Their exact field weights and final group weights belong in `rating.ts`.

## Unknown Handling

Unknown is never interpreted as `no`.

Algorithm per group:

1. Compute the weighted mean from known fields only.
2. Compute the group fill ratio from known and total field weights.
3. Pull sparse rows towards the neutral midpoint declared by `RATING_METHODOLOGY`.

Effects:

- fully filled row uses its own data
- sparse row is pulled towards the center of the scale
- fully unknown row falls back to the neutral midpoint

Why a fixed midpoint instead of the dataset average:

- missing data in this project are not random
- positive traits are more likely to be explicitly documented than absent ones
- using the observed dataset average as a prior would systematically overrate sparse rows

This avoids two bad outcomes:

- treating unknown as zero
- letting rows with one or two confirmed positives inherit an overly optimistic score from the rest of the dataset

## Final Formula

The calculation multiplies each mixed group score by its declared group weight, scales the sum to the public score range, applies explicit adjustments, and clamps the result. Tariff remains outside the formula.

For the current exact formula, use `RATING_METHODOLOGY` in `rating.ts` or the published methodology linked above.

## Extra Adjustments

After the base formula, the calculation applies two explicit corrections:

- `water_in_tariff = true` adds the declared bonus.
- `rabstvo = true` subtracts the declared penalty.

The exact values belong only in `RATING_METHODOLOGY`.

## Data Rules For Rating Fields

These rules belong here, not in generic YAML notes, because they exist specifically to protect rating semantics.

- `water_in_tariff`
  - Use only when central water supply is explicitly confirmed.
  - Required precondition: `infrastructure.water = yes`.
  - Means water is already included in the settlement tariff without separate payment/meters for ordinary use.
  - If water availability is unknown, partial, seasonal, or billed separately, omit the field.
- `rabstvo`
  - Use only for confirmed mentions in Telegram channel `@obmandachniki` / `Коттеджное рабство`.
  - Do not infer it from rumors, comments, tone, or unrelated complaints.
  - If a settlement is not clearly confirmed there, omit the field.

## Sorting Rules

- Default sort in UI is `Условный уровень (↓)`.
- Rating is available as manual sort options: `Условный уровень (↓)` and `Условный уровень (↑)`.
- Additional sorting options include tariff, distance to MKAD, distance to Shelkovo, and name.
- Static fallback on the index page follows the same default rating-desc order.
- Tariff rank remains separate and unchanged.

## Files

- formula and numerical methodology: `apps/www/src/compare/lib/rating.ts`
- data wiring: `apps/www/src/compare/lib/data.ts`
- explorer DTO: `apps/www/src/compare/lib/explorer.ts`
- build JSON: `apps/www/src/pages/815/compare/data/explorer.json.ts`
- public explanation page: `apps/www/src/pages/815/compare/rating.astro`
- generated public Markdown: `apps/www/src/compare/lib/markdown.ts`
- schema and template for extra flags: `apps/www/src/compare/lib/settlement/schema.ts`, `apps/www/src/data/compare/settlements/_template.yaml`
- main page sort: `apps/www/src/pages/815/compare/index.astro`
- explorer default sort: `apps/www/src/compare/components/SettlementsExplorer.svelte`
