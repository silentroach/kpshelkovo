import VCard from 'vcard-creator';

import type { ContactVcfName, ContactWithVcf } from './types';
import { contactExcerpt } from './view';

const addPersonName = (
  card: VCard,
  fullName: string,
  name: ContactVcfName,
): void => {
  card.addFullName(fullName).addName({
    familyName: name.family,
    givenName: name.given,
    additionalNames: name.additional,
    honorificPrefix: name.prefix,
    honorificSuffix: name.suffix,
  });
};

const addLabeledUrl = (
  card: VCard,
  group: string,
  label: string,
  url: string,
): void => {
  // A grouped URL stays visible in Apple Contacts and keeps its service label.
  card.addCustomProperty({
    name: 'URL',
    value: url,
    group,
  });
  card.addCustomProperty({
    name: 'X-ABLabel',
    value: label,
    params: 'CHARSET=UTF-8',
    group,
  });
};

export const buildContactVcard = (contact: ContactWithVcf): string => {
  const vcf = contact.vcf;
  const card = new VCard();
  const fullName =
    vcf.fullName ??
    (vcf.kind === 'organization' ? vcf.organization : contact.title);
  const phone = vcf.phone ?? contact.contacts.phone;
  const telegram = vcf.telegram ?? contact.contacts.telegram;
  const whatsapp = vcf.whatsapp ?? contact.contacts.whatsapp;
  const email = vcf.email ?? contact.contacts.email;
  const website = vcf.website ?? contact.contacts.website;
  const address = vcf.address ?? contact.location?.address;
  const profileUrl = contact.canonical;
  const note = vcf.note ?? contactExcerpt(contact);

  // Explicit charset prevents Apple Contacts from decoding Cyrillic as MacRoman.
  card.setCharset('UTF-8');
  if (vcf.kind === 'person') {
    addPersonName(card, fullName, vcf.name);
  } else {
    card.addFullName(fullName).addName();
  }

  if (phone) {
    card.addPhoneNumber({ number: phone, type: ['cell', 'voice'] });
  }

  if (email) {
    card.addEmail({ address: email, type: ['internet'] });
  }

  if (telegram) {
    addLabeledUrl(card, 'item1', 'Telegram', telegram);
  }

  if (whatsapp) {
    addLabeledUrl(card, 'item2', 'WhatsApp', whatsapp);
  }

  if (address) {
    card.addAddress({ street: address, type: ['work'] });
  }

  if (vcf.organization) {
    card.addCompany({ name: vcf.organization });
  }

  if (vcf.kind === 'organization') {
    card.addCustomProperty({ name: 'X-ABShowAs', value: 'COMPANY' });
  }

  if (vcf.jobTitle) {
    card.addJobtitle(vcf.jobTitle);
  }

  if (vcf.role) {
    card.addRole(vcf.role);
  }

  if (website) {
    card.addUrl({ url: website, type: ['work'] });
  }

  if (profileUrl && profileUrl !== website) {
    card.addUrl({ url: profileUrl });
  }

  if (contact.location) {
    addLabeledUrl(card, 'item3', 'Карта', contact.location.url);
  }

  if (contact.location?.coordinates) {
    card.addGeo({
      latitude: contact.location.coordinates.lat,
      longitude: contact.location.coordinates.lng,
    });
  }

  if (note) {
    card.addNote(note);
  }

  card.addRevision(contact.updatedAt);

  return card.toString();
};
