# Rating

Internal note for the settlement rating in `/815/compare/` within `apps/www`. This file is for future agent sessions, not for UI copy.

## Goal

- Build-time only.
- Hidden numeric score for manual sorting on the main page and explorer.
- Tariff is excluded on purpose.
- Score is a quality proxy, not an absolute real-estate ranking.

## Output

- One computed number per settlement: `rating`.
- Stored as `score` in `apps/www/src/compare/lib/rating.ts`, serialized as `rating` in explorer DTO.
- Rounded to 0.1, range `0..100`.

## Inputs

- `location.lat`, `location.lng`
- `infrastructure.*`
- `common_spaces.*`
- `service_model.*`
- `lots.*` is metadata only for tariff normalization and is excluded from rating.

Do not add tariff into this formula.

## Distance Block

- Moscow center is fixed at `55.7558, 37.6176`.
- `MKAD_RADIUS` is an internal approximation from a small hardcoded set of MKAD sample points.
- `km` = haversine distance from settlement to Moscow center.
- `ring` = `max(km - MKAD_RADIUS, 0)`.
- Distance score uses `ring`, not raw `km`, because the intent is “how far beyond MKAD”.

Current piecewise function:

- `0..20 km` beyond MKAD -> `1.00`
- `20..40 km` -> linear `1.00..0.82`
- `40..60 km` -> linear `0.82..0.58`
- `60..80 km` -> linear `0.58..0.32`
- `80..100 km` -> linear `0.32..0.12`
- `100+ km` -> `0.12`

This is intentionally soft. Distance matters, but should not dominate basic settlement quality.

## Field Mapping

Binary status:

- `yes = 1`
- `partial = 0.5`
- `no = 0`

Ordered enums:

- `roads`: `asphalt = 1`, `partial_asphalt = 0.75`, `gravel = 0.35`, `dirt = 0`
- `drainage`: `closed = 1`, `open = 0.6`, `none = 0`
- `video_surveillance`: `full = 1`, `checkpoint_only = 0.55`, `none = 0`
- `underground_electricity`: `full = 1`, `partial = 0.5`, `none = 0`

## Group Scores

Each group is a weighted mean over known fields only.

### Infrastructure

- `roads 1.00`
- `sidewalks 0.35`
- `lighting 0.50`
- `gas 0.90`
- `water 1.00`
- `sewage 0.95`
- `drainage 0.45`
- `checkpoints 0.60`
- `security 0.95`
- `fencing 0.35`
- `video_surveillance 0.75`
- `underground_electricity 0.35`
- `admin_building 0.25`
- `retail_or_services 0.55`

### Common Spaces

- `club_infrastructure 0.60`
- `playgrounds 0.90`
- `sports 0.80`
- `walking_routes 0.80`
- `water_access 0.60`
- `beach_zones 0.35`
- `bbq_zones 0.25`
- `pool 0.45`
- `fitness_club 0.40`
- `restaurant 0.35`
- `spa_center 0.20`
- `kids_club 0.30`
- `sports_camp 0.15`
- `primary_school 0.15`

### Service Model

- `garbage_collection 1.00`
- `snow_removal 0.90`
- `road_cleaning 0.80`
- `landscaping 0.60`
- `emergency_service 0.60`
- `dispatcher 0.40`

## Unknown Handling

Unknown is never interpreted as `no`.

Algorithm per group:

1. Compute weighted mean from known fields only.
2. Compute group fill ratio: `known_weight / total_weight`.
3. Shrink sparse rows towards a fixed neutral midpoint `0.5`:

`mixed = raw * fill + 0.5 * (1 - fill)`

Effects:

- fully filled row -> uses its own data
- sparse row -> pulled towards the center of the scale
- fully unknown row -> falls back to `0.5`

Why midpoint instead of dataset average:

- missing data in this project are not random
- positive traits are more likely to be explicitly documented than absent ones
- using the observed dataset average as a prior would systematically overrate sparse rows

This avoids two bad outcomes:

- treating unknown as zero
- letting rows with 1-2 confirmed positives inherit an overly optimistic score from the rest of the dataset

## Final Formula

`rating = 100 * (infra * 0.50 + spaces * 0.25 + service * 0.10 + distance * 0.15)`

Where `infra`, `spaces`, `service` are the mixed group scores after neutral shrinkage.

## Extra Adjustments

After the base formula, apply two explicit corrections and clamp the result to `0..100`.

- `water_in_tariff = true` -> `+4`
  - Use only when central water supply is confirmed (`infrastructure.water: yes`) and water is already included in the tariff without separate metering/payment.
- `rabstvo = true` -> `-15`
  - Strong negative signal.
  - Use only for confirmed mentions in Telegram channel `@obmandachniki` / `Коттеджное рабство`.

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

- formula: `apps/www/src/compare/lib/rating.ts`
- data wiring: `apps/www/src/compare/lib/data.ts`
- explorer DTO: `apps/www/src/compare/lib/explorer.ts`
- build JSON: `apps/www/src/pages/815/compare/data/explorer.json.ts`
- public explanation page: `apps/www/src/pages/815/compare/rating.astro`
- schema and template for extra flags: `apps/www/src/compare/lib/settlement/schema.ts`, `apps/www/src/data/compare/settlements/_template.yaml`
- main page sort: `apps/www/src/pages/815/compare/index.astro`
- explorer default sort: `apps/www/src/compare/components/SettlementsExplorer.svelte`
