import type { APIRoute, GetStaticPaths } from 'astro';

import { createMarkdownResponse } from '@/lib/markdown/response';
import { loadContact, loadContacts } from '@/lib/contacts/load';
import { buildContactMarkdown } from '@/lib/contacts/markdown';

export const prerender = true;

export const getStaticPaths = (async () => {
  const contacts = await loadContacts();

  return contacts.map((contact) => ({
    params: { category: contact.category, slug: contact.slug },
  }));
}) satisfies GetStaticPaths;

export const GET: APIRoute = async ({ params }) => {
  const category = params.category;
  const slug = params.slug;

  if (!category || !slug) {
    throw new Error('contact category and slug are required');
  }

  const contact = await loadContact(category, slug);

  if (!contact) {
    throw new Error(`contact "${category}/${slug}" not found`);
  }

  return createMarkdownResponse(buildContactMarkdown(contact));
};
