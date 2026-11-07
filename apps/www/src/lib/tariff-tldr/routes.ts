import { canon, withBase } from '@/lib/site';

export const tariffTldrPath = (): string => '/815/tldr/';
export const tariffTldrMarkdownPath = (): string => '/815/tldr/index.md';
export const tariffTldrUrl = (): string => withBase(tariffTldrPath());
export const tariffTldrCanonical = (): string => canon(tariffTldrPath());
