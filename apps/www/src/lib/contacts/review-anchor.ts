import { createHash } from 'node:crypto';

/** Server-only identity derived from the exact source URL, not review order or text. */
export const contactReviewAnchorId = (url: string): string =>
  `contact-review-${createHash('sha256').update(url).digest('hex').slice(0, 16)}`;
