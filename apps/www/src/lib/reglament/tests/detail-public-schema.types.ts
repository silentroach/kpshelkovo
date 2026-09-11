export interface DetailOpenApi {
  readonly jsonSchemaDialect?: string;
  readonly paths?: Readonly<
    Record<
      string,
      {
        readonly get?: {
          readonly responses?: Readonly<
            Record<
              string,
              {
                readonly content?: Readonly<
                  Record<string, { readonly schema?: Readonly<Record<string, unknown>> }>
                >;
              }
            >
          >;
        };
      }
    >
  >;
  readonly components?: {
    readonly schemas: Readonly<Record<string, Readonly<Record<string, unknown>>>>;
  };
}
