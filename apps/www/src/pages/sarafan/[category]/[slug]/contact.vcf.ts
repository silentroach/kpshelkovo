import type { APIRoute, GetStaticPaths } from 'astro';

import { loadContactsWithVcf, loadContactWithVcf } from '@/lib/contacts/load';
import { buildContactVcard } from '@/lib/contacts/vcard';

export const prerender = true;

export const getStaticPaths = (async () => {
  const contacts = await loadContactsWithVcf();

  return contacts.map((contact) => ({
    params: { category: contact.category, slug: contact.slug }
  }));
}) satisfies GetStaticPaths;

export const GET: APIRoute = async ({ params }) => {
  const category = params.category;
  const slug = params.slug;

  if (!category || !slug) {
    throw new Error('contact category and slug are required');
  }

  const contact = await loadContactWithVcf(category, slug);

  if (!contact) {
    return new Response('Not found', { status: 404 });
  }

  return new Response(buildContactVcard(contact), {
    headers: {
      'Content-Type': 'text/vcard; charset=utf-8',
      'Content-Disposition': `attachment; filename="${contact.vcf.filename}"`
    }
  });
};
