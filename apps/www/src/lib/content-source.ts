import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const MARKDOWN_FRONTMATTER = /^---\r?\n[\s\S]*?\r?\n---(?:\r?\n)*/u;

export const trimMarkdown = (entry: string): string => entry.replace(/\.md$/i, '');

// Call lazily from source rules so path/frontmatter errors precede filesystem errors.
export const rawMarkdownBody = (base: URL, entry: string): string =>
  readFileSync(join(fileURLToPath(base), entry), 'utf8').replace(MARKDOWN_FRONTMATTER, '');
