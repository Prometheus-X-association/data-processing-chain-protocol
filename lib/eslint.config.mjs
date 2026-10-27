import globals from 'globals';
import js from '@eslint/js';
import tseslint from '@typescript-eslint/eslint-plugin';
import tsparser from '@typescript-eslint/parser';

const commonRules = {
  'max-len': ['error', { code: 200 }],
  indent: [
    'error',
    2,
    {
      SwitchCase: 1,
      ignoredNodes: ['SwitchCase > BlockStatement'],
    },
  ],
  'no-tabs': 'error',
  'object-curly-spacing': ['error', 'always'],
  'arrow-parens': ['error', 'always'],
  quotes: [
    'error',
    'single',
    { avoidEscape: true, allowTemplateLiterals: true },
  ],
  'no-unused-vars': [
    'warn',
    {
      argsIgnorePattern: '^_',
      varsIgnorePattern: '^_',
      ignoreRestSiblings: true,
      args: 'after-used',
    },
  ],
};

export default [
  {
    files: ['**/*.{js,mjs,cjs}'],
    languageOptions: {
      globals: globals.node,
      ecmaVersion: 'latest',
      sourceType: 'module',
    },
    rules: {
      ...commonRules,
    },
  },
  {
    ...js.configs.recommended,
  },
  {
    files: ['**/*.ts'],
    languageOptions: {
      parser: tsparser,
      globals: {
        process: 'readonly',
        __dirname: 'readonly',
        structuredClone: 'readonly',
      },
      parserOptions: {
        project: './tsconfig.json',
      },
    },
    plugins: {
      '@typescript-eslint': tseslint,
    },
    rules: {
      ...commonRules,
      '@typescript-eslint/no-unused-expressions': 'off',
      '@typescript-eslint/await-thenable': 'error',
      '@typescript-eslint/no-floating-promises': 'warn',
      '@typescript-eslint/no-explicit-any': 'warn',
    },
  },
  {
    files: ['**/*.spec.ts'],
    languageOptions: {
      globals: {
        ...globals.mocha,
      },
    },
    rules: {
      ...commonRules,
      'no-undef': 'off',
    },
  },
];
