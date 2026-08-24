const MARKDOWN_RESPONSE_HEADERS = {
  'Content-Type': 'text/markdown; charset=utf-8',
  'X-Robots-Tag': 'noindex, follow',
} as const;

export const createMarkdownResponse = (body: string): Response =>
  new Response(body, { headers: MARKDOWN_RESPONSE_HEADERS });
