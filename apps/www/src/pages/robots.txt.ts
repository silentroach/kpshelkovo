import type { APIRoute } from 'astro';

const site = import.meta.env.SITE;
const sitemap = new URL('/sitemap-index.xml', site).toString();
const body = [
  'User-agent: *',
  'Allow: /',
  'Content-Signal: ai-train=yes, search=yes, ai-input=yes',
  `Sitemap: ${sitemap}`
].join('\n');

export const GET: APIRoute = () =>
  new Response(`${body}\n`, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8'
    }
  });
