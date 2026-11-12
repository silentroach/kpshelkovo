export interface HeadingActionLinkProps {
  readonly href: string;
}

export interface HeadingActionAddToCalendarProps extends HeadingActionLinkProps {
  readonly filename: string;
}

export interface HeadingActionStatusCalendarProps {
  readonly year: number;
}
