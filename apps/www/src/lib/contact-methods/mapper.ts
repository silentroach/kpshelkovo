import type { RawContactMethods } from './raw-schema';
import type { ContactMethods } from './types';

export const mapRawContactMethods = (contacts: RawContactMethods): ContactMethods => ({
  phone: contacts.phone,
  telegram: contacts.telegram,
  whatsapp: contacts.whatsapp,
  email: contacts.email,
  website: contacts.website
});
