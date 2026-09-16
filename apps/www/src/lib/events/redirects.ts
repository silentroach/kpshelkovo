import type { EventRecord } from './types';

// Input comes from loadEventsData: paths and all canonical/alias collisions are validated there.
export const buildEventRedirects = (events: readonly EventRecord[]): string =>
  '# Generated from validated event aliases. Do not edit.\n' +
  events
    .flatMap((event) =>
      event.aliases.map(
        (alias) => `location = ${alias} { return 301 ${event.url}$is_args$args; }\n`
      )
    )
    .join('');
