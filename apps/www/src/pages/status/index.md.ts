import type { APIRoute } from 'astro';

import { createMarkdownResponse } from '@/lib/markdown/response';
import { loadStatusData } from '@/lib/status/load';
import { buildStatusHomeMarkdown } from '@/lib/status/markdown';

export const prerender = true;

export const GET: APIRoute = async () => {
  const data = await loadStatusData();

  return createMarkdownResponse(buildStatusHomeMarkdown(data));
};
