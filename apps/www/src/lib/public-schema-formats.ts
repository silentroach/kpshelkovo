import type { Format } from 'ajv';
import addFormats from 'ajv-formats';
import { z } from 'zod';

type StringFormatValidator = (value: string) => boolean;

const stringFormatValidator = (format: Format): StringFormatValidator => {
  if (format instanceof RegExp) {
    return (value) => format.test(value);
  }

  if (typeof format === 'function') {
    return format;
  }

  if (typeof format === 'object' && format.type !== 'number' && !format.async) {
    const { validate } = format;

    if (validate instanceof RegExp) {
      return (value) => validate.test(value);
    }

    if (typeof validate === 'function') {
      return (value) => Reflect.apply(validate, undefined, [value]) === true;
    }
  }

  throw new Error('Expected a synchronous string format validator');
};

const uriValidator = stringFormatValidator(addFormats.get('uri'));
const dateTimeValidator = stringFormatValidator(addFormats.get('date-time'));

export const publicUriSchema = () => z.stringFormat('uri', uriValidator);

export const publicDateTimeSchema = () =>
  z.stringFormat('date-time', dateTimeValidator);
