import type { APIRoute } from 'astro';

import { loadContactsData } from '@/lib/contacts/load';
import { buildContactsHomeMarkdown } from '@/lib/contacts/markdown';
import { createMarkdownResponse } from '@/lib/markdown/response';

export const prerender = true;

export const GET: APIRoute = async () => {
  const data = await loadContactsData();

  return createMarkdownResponse(buildContactsHomeMarkdown(data));
};
