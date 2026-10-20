import { formatContactPhone, normalizeContactPhone } from './phone';
import type { ContactMethod, ContactMethods } from './types';

const phoneHref = (phone: string): string | undefined => {
  const normalized = normalizeContactPhone(phone);

  return normalized ? `tel:${normalized}` : undefined;
};

const method = (
  type: keyof ContactMethods,
  label: string,
  value: string | undefined,
  href?: string
): ContactMethod | undefined =>
  value
    ? {
        type,
        label,
        value,
        href
      }
    : undefined;

const telegramValue = (url: string | undefined): string | undefined => {
  if (!url) {
    return;
  }

  try {
    const username = new URL(url).pathname.split('/').find(Boolean);

    return username ? `@${username}` : url;
  } catch {
    return url;
  }
};

export const contactMethods = (contacts: ContactMethods): readonly ContactMethod[] => {
  const phone = contacts.phone ? formatContactPhone(contacts.phone) : undefined;

  return [
    method('phone', 'Телефон', phone, contacts.phone ? phoneHref(contacts.phone) : undefined),
    method('telegram', 'Telegram', telegramValue(contacts.telegram), contacts.telegram),
    method('whatsapp', 'WhatsApp', contacts.whatsapp, contacts.whatsapp),
    method(
      'email',
      'Email',
      contacts.email,
      contacts.email ? `mailto:${contacts.email}` : undefined
    ),
    method('website', 'Сайт', contacts.website, contacts.website)
  ].filter((item): item is ContactMethod => Boolean(item));
};
