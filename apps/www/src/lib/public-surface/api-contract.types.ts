export interface PrerenderedApiContract {
  readonly id: string;
  readonly ownerId: string;
  readonly path: string;
  readonly mediaType: string;
  readonly cacheControl: string;
  readonly link: string;
}
