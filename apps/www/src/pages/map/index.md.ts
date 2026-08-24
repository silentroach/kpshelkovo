import type { APIRoute } from 'astro';

import { createMarkdownResponse } from '@/lib/markdown/response';
import { loadPlaces } from '@/lib/places/load';
import { buildPlacesMarkdown } from '@/lib/places/markdown';

export const prerender = true;

export const GET: APIRoute = async () =>
  createMarkdownResponse(buildPlacesMarkdown(await loadPlaces()));
