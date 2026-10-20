import type { APIRoute } from 'astro';

import { loadInventoryData } from '@/lib/inventory/load';
import { buildInventoryHomeMarkdown } from '@/lib/inventory/markdown';
import { createMarkdownResponse } from '@/lib/markdown/response';

export const prerender = true;

export const GET: APIRoute = async () =>
  createMarkdownResponse(buildInventoryHomeMarkdown(await loadInventoryData()));
