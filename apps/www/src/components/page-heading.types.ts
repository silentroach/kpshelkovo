import type { HTMLAttributes } from 'astro/types';

export interface PageHeadingProps {
  readonly title: string;
  readonly class?: HTMLAttributes<'div'>['class'];
  readonly headingAttributes?: Readonly<HTMLAttributes<'h1'>>;
  readonly subtitleAttributes?: Readonly<HTMLAttributes<'div'>>;
}
