export const PERSON_ALTERNATE_NAME_CASES = ['gen', 'dat', 'acc', 'ins', 'prep'] as const;

export const PERSON_NAME_CASES = ['nom', ...PERSON_ALTERNATE_NAME_CASES] as const;

export type PersonAlternateNameCase = (typeof PERSON_ALTERNATE_NAME_CASES)[number];
export type PersonNameCase = (typeof PERSON_NAME_CASES)[number];
export type PersonNameCaseForms = Readonly<Partial<Record<PersonAlternateNameCase, string>>>;

const PERSON_NAME_CASE_SET = new Set<string>(PERSON_NAME_CASES);

export const PERSON_DEFAULT_NAME_CASE = 'nom';

export const isPersonNameCase = (value: string): value is PersonNameCase =>
  PERSON_NAME_CASE_SET.has(value);
