export interface ContractSchema {
  readonly $ref?: string;
  readonly type?: string;
  readonly properties?: Readonly<Record<string, ContractSchema>>;
  readonly required?: readonly string[];
  readonly items?: ContractSchema;
  readonly $defs?: Readonly<Record<string, ContractSchema>>;
  readonly additionalProperties?: boolean;
}

export interface NewsOpenApi {
  readonly jsonSchemaDialect: string;
  readonly paths: Readonly<
    Record<
      string,
      {
        readonly get: {
          readonly responses: {
            readonly 200: {
              readonly content: {
                readonly 'application/json': { readonly schema: ContractSchema };
              };
            };
          };
        };
      }
    >
  >;
  readonly components: Readonly<Record<string, unknown>>;
}

export interface ContractObject {
  readonly path: string;
  readonly schema: ContractSchema;
  readonly value: Record<string, unknown>;
}
