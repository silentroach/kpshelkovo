import type { APIRoute } from 'astro';

import { createMarkdownResponse } from '@/lib/markdown/response';
import { loadContactsData } from '@/lib/contacts/load';
import { buildContactsHomeMarkdown } from '@/lib/contacts/markdown';

export const prerender = true;

export const GET: APIRoute = async () => {
  const data = await loadContactsData();

  return createMarkdownResponse(buildContactsHomeMarkdown(data));
};
