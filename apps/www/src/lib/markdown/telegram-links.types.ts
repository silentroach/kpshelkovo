import type { parseMarkdownFragment } from '@shelkovo/markdown';

export type TelegramMarkdownNode = ReturnType<typeof parseMarkdownFragment>[number] & {
  readonly children?: readonly TelegramMarkdownNode[];
};
