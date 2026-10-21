import {
  createMarkdownDocument,
  expandTableOfContents,
  md,
  parseMarkdownFragment,
  resolveMarkdownResourceReferences,
  serializeMarkdownDocument
} from '@shelkovo/markdown';

import { contactMethods } from '@/lib/contact-methods/view';
import { transformContentEmphasis } from '@/lib/markdown/content-emphasis';
import { renderMarkdownWithMetadata } from '@/lib/markdown/render';
import { absoluteUrl } from '@/lib/site';

import type { InventoryMarkdownBodyNode, InventoryMarkdownNode } from './markdown.types';
import { inventoryMarkdownUrl } from './routes';
import type {
  InventoryBody,
  InventoryDataset,
  InventoryGroup,
  InventoryKind,
  InventoryOffer,
  InventoryOwner
} from './types';
import { formatInventoryPrice, inventoryContentsGroups, inventoryOwnerOffers } from './view';

const serialize = (children: readonly InventoryMarkdownNode[]): string =>
  serializeMarkdownDocument(createMarkdownDocument({ children }));

const catalogLink = (): InventoryMarkdownNode =>
  md.paragraph([md.link(absoluteUrl(inventoryMarkdownUrl()), 'Весь каталог')]);

const kindLine = (kind: InventoryKind) =>
  md.listItem([md.paragraph([md.link(absoluteUrl(kind.markdownUrl), kind.title)])]);

const bodyLink = (
  url: string,
  canonical: string,
  localIds: ReadonlyMap<string, string>
): string => {
  if (!url.startsWith('#')) return url;
  let target: string | undefined;
  try {
    target = localIds.get(decodeURIComponent(url.slice(1)));
  } catch {
    // Preserve the author's fragment even when it is not a valid encoded target.
  }
  return `${canonical}${target ? `#${encodeURIComponent(target)}` : url}`;
};

const scopeBodyNodes = (
  node: InventoryMarkdownBodyNode,
  canonical: string,
  localIds: ReadonlyMap<string, string>
): void => {
  if (node.type === 'link' && node.url) {
    node.url = bodyLink(node.url, canonical, localIds);
  }
  node.children?.forEach((child) => scopeBodyNodes(child, canonical, localIds));
};

const bodyNodes = (body: InventoryBody, canonical: string): readonly InventoryMarkdownNode[] => {
  const { localIds } = renderMarkdownWithMetadata(body.body, { idPrefix: body.bodyIdPrefix });
  const children = parseMarkdownFragment(body.body);
  transformContentEmphasis(children, 'markdown');
  const document = expandTableOfContents(createMarkdownDocument({ children }));
  document.children = [...resolveMarkdownResourceReferences(document.children)];
  scopeBodyNodes(document, canonical, localIds);
  // Expand the authored TOC before adding generated page headings; its targets
  // must match the independently rendered canonical HTML body.
  return document.children;
};

const ownerFacts = (owner: InventoryOwner): readonly InventoryMarkdownNode[] => [
  md.paragraph([md.text('Владелец: '), md.link(absoluteUrl(owner.markdownUrl), owner.name)]),
  ownerParcel(owner)
];

const ownerParcel = (owner: InventoryOwner): InventoryMarkdownNode =>
  md.paragraph([md.link(absoluteUrl(owner.parcel.url), `Участок ${owner.parcel.code}`)]);

const ownerContacts = (owner: InventoryOwner): InventoryMarkdownNode =>
  md.list(
    contactMethods(owner.contacts).map((method) =>
      md.listItem([
        md.paragraph([
          md.text(`${method.label}: `),
          method.href ? md.link(method.href, method.value) : md.text(method.value)
        ])
      ])
    )
  );

const offerFacts = (offer: InventoryOffer): readonly InventoryMarkdownNode[] => [
  md.paragraph(offer.summary),
  md.paragraph(formatInventoryPrice(offer.price))
];

const offerNodes = (
  offer: InventoryOffer,
  kind?: InventoryKind
): readonly InventoryMarkdownNode[] => [
  md.heading(2, [
    ...(kind ? [md.link(absoluteUrl(kind.markdownUrl), kind.title), md.text(' › ')] : []),
    md.link(absoluteUrl(offer.markdownUrl), offer.title)
  ]),
  ...offer.photos
    .slice(0, 1)
    .flatMap((photo): InventoryMarkdownNode[] => [
      md.paragraph([
        md.link(absoluteUrl(offer.markdownUrl), [{ type: 'image', url: photo.url, alt: photo.alt }])
      ]),
      ...(photo.caption ? [md.paragraph(photo.caption)] : [])
    ]),
  ...offerFacts(offer)
];

export const buildInventoryHomeMarkdown = (data: InventoryDataset): string => {
  const groups = inventoryContentsGroups(data);
  return serialize([
    md.heading(1, 'У кого есть'),
    md.paragraph([
      md.text('Хотите сдать инвентарь в аренду или дать попользоваться бесплатно? '),
      md.text('Напишите '),
      md.link('https://t.me/silentroach', 'silentroach'),
      md.text('.')
    ]),
    ...(groups.length
      ? groups.flatMap((group) => [
          md.heading(2, [md.link(absoluteUrl(group.markdownUrl), group.title)]),
          md.list(group.kinds.map(kindLine))
        ])
      : [md.paragraph('Пока нет предложений.')])
  ]);
};

export const buildInventoryGroupMarkdown = (group: InventoryGroup): string =>
  serialize([
    md.heading(1, group.title),
    catalogLink(),
    group.kinds.length ? md.list(group.kinds.map(kindLine)) : md.paragraph('Пока нет предложений.')
  ]);

export const buildInventoryKindMarkdown = (kind: InventoryKind): string =>
  serialize([
    md.heading(1, kind.title),
    md.paragraph([md.link(kind.canonical, 'Страница вида')]),
    catalogLink(),
    ...bodyNodes(kind, kind.canonical),
    ...(kind.offers.length
      ? kind.offers.flatMap((offer) => [...offerNodes(offer), ...ownerFacts(offer.owner)])
      : [md.paragraph('Пока нет предложений.')])
  ]);

export const buildInventoryOwnerMarkdown = (
  owner: InventoryOwner,
  data: InventoryDataset
): string => {
  const offers = inventoryOwnerOffers(data, owner.id);
  return serialize([
    md.heading(1, owner.name),
    md.paragraph([md.link(owner.canonical, 'Страница владельца')]),
    catalogLink(),
    ownerParcel(owner),
    ownerContacts(owner),
    ...(offers.length
      ? offers.flatMap((offer) => offerNodes(offer, data.byKind.get(offer.kindId)))
      : [md.paragraph('Пока нет предложений.')])
  ]);
};

export const buildInventoryOfferMarkdown = (offer: InventoryOffer): string =>
  serialize([
    md.heading(1, offer.title),
    md.paragraph([md.link(offer.canonical, 'Страница предложения')]),
    md.paragraph([md.link(absoluteUrl(offer.listingUrl), 'К списку предложений')]),
    catalogLink(),
    ...offerFacts(offer),
    ...ownerFacts(offer.owner),
    ownerContacts(offer.owner),
    ...bodyNodes(offer, offer.canonical),
    ...offer.photos.flatMap((photo): InventoryMarkdownNode[] => [
      md.paragraph([{ type: 'image', url: photo.url, alt: photo.alt }]),
      ...(photo.caption ? [md.paragraph(photo.caption)] : [])
    ])
  ]);
