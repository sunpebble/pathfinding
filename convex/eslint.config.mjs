import antfu from '@antfu/eslint-config';

export default antfu({
  // Enable TypeScript support
  typescript: true,

  // Disable all formatters (use Prettier instead)
  formatters: false,

  // Disable stylistic rules (formatting handled by Prettier)
  stylistic: false,

  markdown: false,

  // Ignore patterns
  ignores: ['_generated/**', 'node_modules/**', '*.json'],

  // Custom rule overrides for Convex
  rules: {
    // Allow console.log for debugging in convex functions
    'no-console': 'off',

    // Allow any type in convex handlers (convex uses any internally)
    'ts/no-explicit-any': 'off',

    // Allow unused vars with underscore prefix
    'ts/no-unused-vars': [
      'warn',
      {
        argsIgnorePattern: '^_',
        varsIgnorePattern: '^_',
        caughtErrorsIgnorePattern: '^_',
      },
    ],

    // Convex patterns that need relaxed rules
    'ts/no-use-before-define': 'off',

    // Allow process.env
    'node/prefer-global/process': 'off',

    // Allow non-null assertions in convex code
    'ts/no-non-null-assertion': 'off',

    // Disable import sorting (convex has specific patterns)
    'perfectionist/sort-imports': 'off',

    // Disable loop condition check (convex date iteration patterns)
    'no-unmodified-loop-condition': 'off',

    // Allow parseInt/parseFloat (common in convex code)
    'unicorn/prefer-number-properties': 'off',
  },
});
