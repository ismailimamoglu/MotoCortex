module.exports = {
  root: true,
  parser: '@typescript-eslint/parser',
  plugins: ['@typescript-eslint', 'i18next'],
  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/recommended',
    'plugin:i18next/recommended',
  ],
  rules: {
    'i18next/no-literal-string': 'off',
    '@typescript-eslint/no-explicit-any': 'off',
    '@typescript-eslint/no-var-requires': 'off',
    '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
    'no-undef': 'off',
    'no-case-declarations': 'off',
    'no-empty': 'off',
    'prefer-const': 'off',
    'no-constant-condition': 'off',
  },
  globals: {
    __DEV__: 'readonly',
    NodeJS: 'readonly',
    requestAnimationFrame: 'readonly',
    cancelAnimationFrame: 'readonly',
  },
  env: {
    node: true,
    jest: true,
    es2021: true,
  },
};
