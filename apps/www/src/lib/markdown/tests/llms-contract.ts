import { parseMarkdownFragment } from '@shelkovo/markdown';
import { z } from 'zod';

const nodeSchema = z.object({
  type: z.string(),
  depth: z.number().optional(),
  url: z.string().optional(),
  value: z.string().optional(),
  position: z
    .object({
      start: z.object({ offset: z.number() }),
      end: z.object({ offset: z.number() })
    })
    .optional(),
  get children() {
    return z.array(nodeSchema).optional();
  }
});

// Validate the serialized document: an AST link can still serialize as an autolink.
export const llmsDocumentSchema = z
  .string()
  .min(50)
  .transform((source, ctx) => {
    const nodes = z.array(nodeSchema).parse(parseMarkdownFragment(source));
    const links: string[] = [];
    const invalid = (message: string) => ctx.addIssue({ code: 'custom', message });
    if (nodes[0]?.type !== 'heading' || nodes[0].depth !== 1 || nodes[1]?.type !== 'blockquote') {
      invalid('Expected an H1 followed by a summary blockquote');
    }
    let inResources = false;
    for (const [index, node] of nodes.entries()) {
      if (index < 2) continue;
      if (node.type === 'heading') {
        inResources = true;
        if (node.depth !== 2 || nodes[index + 1]?.type !== 'list') {
          invalid('Resource sections must be H2 headings followed by lists');
        }
      } else if (inResources && node.type !== 'list') {
        invalid('Only resource lists belong after an H2');
      }
    }
    const walk = (node: z.infer<typeof nodeSchema>, resourceList = false): void => {
      if (node.type === 'code' || node.type === 'inlineCode') return;
      if (node.type === 'link') {
        const raw = source.slice(node.position?.start.offset, node.position?.end.offset);
        if (!raw.startsWith('[') || !raw.includes('](') || /^\[https?:/u.test(raw))
          invalid(`Expected a named inline link: ${raw}`);
        const url = z
          .url({ protocol: /^https$/, hostname: /^(?:kpshelkovo\.online|example\.com)$/ })
          .safeParse(node.url);
        if (!url.success || /[\[\]*]/u.test(node.url ?? ''))
          invalid(`Expected an absolute public resource URL: ${node.url}`);
        else links.push(url.data);
        return;
      }
      if (node.type === 'linkReference' || node.type === 'definition' || node.type === 'html') {
        invalid('Navigation must use named inline Markdown links');
      }
      if (node.type === 'text' && /https?:\/\/|(?:apps\/www|src\/|repo:)/u.test(node.value ?? '')) {
        invalid('Found a bare URL or an internal path');
      }
      const before = links.length;
      node.children?.forEach((child) => walk(child, resourceList));
      if (node.type === 'listItem' && resourceList && links.length === before) {
        invalid('Every resource item needs a named link');
      }
    };
    inResources = false;
    for (const node of nodes) {
      if (node.type === 'heading' && node.depth === 2) inResources = true;
      walk(node, inResources);
    }
    if (!links.length) invalid('Expected navigation links');
    return links;
  });
