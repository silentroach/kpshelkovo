import type { APIRoute } from 'astro';

import { createMarkdownResponse } from '@/lib/markdown/response';
import { loadSiteMentionRegistry } from '@/lib/mentions/registry';
import { buildTariffTldrMarkdown } from '@/lib/tariff-tldr/markdown';

export const prerender = true;

export const GET: APIRoute = async () =>
  createMarkdownResponse(buildTariffTldrMarkdown(await loadSiteMentionRegistry()));
