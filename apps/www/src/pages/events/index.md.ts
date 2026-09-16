import type { APIRoute } from 'astro';

import { loadEventsBuildData } from '@/lib/events/build';
import { buildEventsRootMarkdown } from '@/lib/events/markdown';
import { createMarkdownResponse } from '@/lib/markdown/response';
import { canonRoot } from '@/lib/site';

export const prerender = true;
export const GET: APIRoute = async () =>
  createMarkdownResponse(
    buildEventsRootMarkdown((await loadEventsBuildData()).startMonth, canonRoot())
  );
