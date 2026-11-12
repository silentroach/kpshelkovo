import type { HTMLAttributes } from 'astro/types';

type HeadingActionIcon = (props: { readonly class?: string }) => unknown;

interface HeadingActionBase {
  readonly icon: HeadingActionIcon;
  readonly label: string;
  readonly title?: string;
  readonly class?: HTMLAttributes<'a'>['class'];
}

type NativeActionAttributes<Tag extends 'a' | 'button'> = Omit<
  HTMLAttributes<Tag>,
  'class' | 'title' | 'aria-label' | 'resource' | Extract<keyof HTMLAttributes<Tag>, `on${string}`>
>;

type HeadingActionLink = NativeActionAttributes<'a'> & {
  readonly href: string;
  readonly resource?: boolean;
};

type HeadingActionButton = NativeActionAttributes<'button'> & {
  readonly href?: never;
  readonly resource?: never;
};

export type HeadingActionProps = HeadingActionBase &
  Readonly<HeadingActionLink | HeadingActionButton>;
