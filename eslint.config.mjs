import antfu from '@antfu/eslint-config';

export default antfu({
  // Enable React support
  react: true,

  // Enable TypeScript support
  typescript: true,

  // Disable all formatters (use Prettier instead)
  formatters: false,

  // Disable stylistic rules (formatting handled by Prettier)
  stylistic: false,

  markdown: false,

  // Ignore patterns
  ignores: ['.claude/**', 'dist/**', 'node_modules/**', 'pnpm-workspace.yaml'],

  // Custom rule overrides
  rules: {
    // Allow console.log in development (warn instead of error)
    'no-console': ['warn', { allow: ['warn', 'error'] }],

    // Allow no-use-before-define for functions and classes (common React Native pattern)
    'ts/no-use-before-define': [
      'error',
      {
        functions: false,
        classes: false,
        variables: false, // Allow StyleSheet.create pattern
        allowNamedExports: false,
      },
    ],

    // Allow comparing Date objects in while loops
    'no-unmodified-loop-condition': 'off',

    // Allow process.env in React Native (handled by Metro bundler)
    'node/prefer-global/process': 'off',

    // Allow non-component exports in files with components
    'react-refresh/only-export-components': 'off',
  },
});
