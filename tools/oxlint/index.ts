import { eslintCompatPlugin } from '@oxlint/plugins';

import { noConditionalEmptyObjectSpreadRule } from './rules/no-conditional-empty-object-spread.ts';

export default eslintCompatPlugin({
  meta: { name: 'local' },
  rules: {
    'no-conditional-empty-object-spread': noConditionalEmptyObjectSpreadRule
  }
});
