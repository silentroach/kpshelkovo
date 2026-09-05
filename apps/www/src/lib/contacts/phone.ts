const RUSSIAN_PHONE_INPUT = /^(?:\+7|8)[\d\s().\p{Dash_Punctuation}]*$/u;
const INTERNATIONAL_PHONE_INPUT = /^\+[1-9][\d\s().\p{Dash_Punctuation}]*$/u;
const INTERNATIONAL_PHONE = /^\+[1-9]\d{7,14}$/u;

const normalizeRussianContactPhone = (phone: string): string | undefined => {
  if (!RUSSIAN_PHONE_INPUT.test(phone)) {
    return;
  }

  const digits = phone.replace(/\D/gu, '');

  return digits.length === 11 ? `+7${digits.slice(1)}` : undefined;
};

export const normalizeContactPhone = (phone: string): string | undefined => {
  const value = phone.trim();
  const russianPhone = normalizeRussianContactPhone(value);

  if (russianPhone) {
    return russianPhone;
  }

  if (value.startsWith('+7') || !INTERNATIONAL_PHONE_INPUT.test(value)) {
    return;
  }

  const internationalPhone = `+${value.replace(/\D/gu, '')}`;

  return INTERNATIONAL_PHONE.test(internationalPhone)
    ? internationalPhone
    : undefined;
};

export const formatContactPhone = (phone: string): string => {
  const value = phone.trim();
  const normalized = normalizeContactPhone(value);

  if (!normalized?.startsWith('+7')) {
    return value;
  }

  return `${normalized.slice(0, 2)} ${normalized.slice(2, 5)} ${normalized.slice(5, 8)}-${normalized.slice(8, 10)}-${normalized.slice(10)}`;
};
