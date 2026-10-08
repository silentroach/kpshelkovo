import { describe, it } from 'node:test';

import { RuleTester } from 'oxlint/plugins-dev';

import { noConditionalEmptyObjectSpreadRule } from './rules/no-conditional-empty-object-spread.ts';

RuleTester.describe = describe;
RuleTester.it = it;

const tester = new RuleTester({ languageOptions: { parserOptions: { lang: 'ts' } } });

tester.run('no-conditional-empty-object-spread', noConditionalEmptyObjectSpreadRule, {
  valid: [
    'const options = { value };',
    'const options = { ...base };',
    'const options = { ...(flag ? { value } : { other }) };',
    'const options = flag ? { value } : {};',
    'const items = [...(flag ? [value] : [])];'
  ],
  invalid: [
    {
      code: 'const options = { ...(flag ? { value } : {}) };',
      errors: [{ messageId: 'avoid' }]
    },
    {
      code: 'const options = { ...(flag ? {} : { value }) };',
      errors: [{ messageId: 'avoid' }]
    },
    {
      code: 'const options = { ...((flag ? { value } : {})) };',
      errors: [{ messageId: 'avoid' }]
    }
  ]
});
