export interface ContactMethods {
  readonly phone?: string;
  readonly telegram?: string;
  readonly whatsapp?: string;
  readonly email?: string;
  readonly website?: string;
}

export interface ContactMethod {
  readonly type: keyof ContactMethods;
  readonly label: string;
  readonly value: string;
  readonly href?: string;
}
