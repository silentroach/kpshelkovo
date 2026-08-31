import type { ValidateFunction } from 'ajv';
import Ajv2020 from 'ajv/dist/2020';
import addFormats from 'ajv-formats';

const object = (
  value: unknown,
  label: string,
): Readonly<Record<string, unknown>> => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error(`Expected ${label} to be an object`);
  }

  return value as Readonly<Record<string, unknown>>;
};

const pointerSegment = (value: string): string =>
  value.replaceAll('~', '~0').replaceAll('/', '~1');

const resolveLocalRef = (document: unknown, ref: string): unknown =>
  ref
    .slice(2)
    .split('/')
    .map((segment) => segment.replaceAll('~1', '/').replaceAll('~0', '~'))
    .reduce<unknown>((current, segment) => {
      if (!current || typeof current !== 'object') {
        return undefined;
      }

      return (current as Readonly<Record<string, unknown>>)[segment];
    }, document);

const createValidator = (): Ajv2020 => {
  const validator = new Ajv2020({ allErrors: true, strict: false });
  addFormats(validator);
  return validator;
};

export const compileGeneratedSchemaValidators = (
  standalone: Readonly<Record<string, unknown>>,
  api: Readonly<Record<string, unknown>>,
  path: string,
): readonly ValidateFunction[] => {
  const responseSchema = object(
    resolveLocalRef(
      api,
      `#/paths/${pointerSegment(path)}/get/responses/200/content/application~1json/schema`,
    ),
    'OpenAPI response schema',
  );
  const dialect = api.jsonSchemaDialect;

  if (typeof dialect !== 'string') {
    throw new Error('Expected OpenAPI jsonSchemaDialect to be a string');
  }

  const validator = createValidator();

  return [
    validator.compile(standalone),
    validator.compile({
      $schema: dialect,
      ...responseSchema,
      components: object(api.components, 'OpenAPI components'),
    }),
  ];
};
