module.exports = {
  root: true,
  env: {
    browser: true,
    node: true,
    es2022: true,
  },
  parser: 'vue-eslint-parser',
  parserOptions: {
    parser: '@typescript-eslint/parser',
    ecmaVersion: 2022,
    sourceType: 'module',
  },
  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/recommended',
    'plugin:vue/recommended',
  ],
  plugins: [
    '@typescript-eslint',
    'vue',
  ],
  rules: {
    // Vue - relaxed rules to avoid blocking CI on existing code
    'vue/multi-word-component-names': 'off',
    'vue/no-v-html': 'warn',
    'vue/require-default-prop': 'off',
    'vue/require-prop-types': 'off',
    'vue/no-setup-props-destructure': 'off',
    'vue/singleline-html-element-content-newline': 'off',
    'vue/max-attributes-per-line': 'off',
    'vue/html-closing-bracket-spacing': 'off',
    'vue/html-self-closing': 'off',
    'vue/no-mutating-props': 'warn',
    'vue/no-unused-vars': 'warn',

    // TypeScript - warnings only for gradual improvement
    '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
    '@typescript-eslint/no-explicit-any': 'warn',
    '@typescript-eslint/ban-ts-comment': 'warn',
    '@typescript-eslint/no-unused-expressions': 'warn',

    // JavaScript/General - permissive for now
    'no-console': 'off',
    'no-debugger': process.env.NODE_ENV === 'production' ? 'warn' : 'off',
    'no-undef': 'off', // TypeScript handles this better
    'comma-dangle': 'off',
    'prefer-const': 'warn',
    'no-case-declarations': 'warn',
    'no-empty': 'warn',
    '@typescript-eslint/no-require-imports': 'warn',
  },
  ignorePatterns: [
    'node_modules/',
    '.nuxt/',
    'dist/',
    '.output/',
    'coverage/',
    '*.d.ts',
  ],
}
