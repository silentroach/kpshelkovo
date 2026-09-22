export interface PeoplePublicPhotoDto {
  readonly src: string;
  readonly width: number;
  readonly height: number;
  readonly source?: {
    readonly label: string;
    readonly url: string;
  };
}
