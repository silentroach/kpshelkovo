import type { HeaderPayload } from 'astro';

export type StaticEndpointRoute = Pick<
  HeaderPayload['route'],
  'type' | 'isPrerendered' | 'redirect' | 'entrypoint'
>;

export type StaticResponseHeaders = ReadonlyMap<
  string,
  {
    readonly headers: Headers;
    readonly route: StaticEndpointRoute;
  }
>;
