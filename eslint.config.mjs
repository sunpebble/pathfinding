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

  // Ignore patterns
  ignores: [
    '.claude/**',
    '**/*.md',
    'dist/**',
    'plugin-sdk/**',
    'pnpm-workspace.yaml',
    'node_modules/**',
  ],

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

    // Allow array index as key when necessary
    'react/no-array-index-key': 'warn',

    // Allow useState lazy initialization warning
    'react/prefer-use-state-lazy-initialization': 'warn',

    // Allow event listener patterns (managed by framework lifecycle)
    'react-web-api/no-leaked-event-listener': 'warn',

    // Allow non-component exports in files with components
    'react-refresh/only-export-components': 'off',

    // Allow direct setState in useEffect for initialization patterns
    'react-hooks-extra/no-direct-set-state-in-use-effect': 'warn',
  },
});
