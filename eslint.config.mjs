import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import pluginVue from 'eslint-plugin-vue';
import prettier from 'eslint-config-prettier';

export default tseslint.config(
  {
    ignores: [
      '**/dist/**',
      '**/node_modules/**',
      'python/**',
      'apps/backend/data/**',
      'eslint.config.mjs',
    ],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  ...pluginVue.configs['flat/recommended'],
  {
    files: ['**/*.vue'],
    languageOptions: { parserOptions: { parser: tseslint.parser } },
  },
  {
    // TypeScript already resolves globals (DOM lib, Node types) far more
    // accurately than ESLint's static list, so no-undef only produces false
    // positives here. This is the rule typescript-eslint recommends.
    files: ['**/*.ts', '**/*.tsx', '**/*.vue', '**/*.mts'],
    rules: { 'no-undef': 'off' },
  },
  prettier,
);
