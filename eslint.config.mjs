import antfu from '@antfu/eslint-config';

export default antfu({
  // Enable React support
  react: true,

  // Enable TypeScript support (without type-aware linting for monorepo compatibility)
  typescript: true,

  // Enable formatters (antfu's config handles formatting)
  formatters: true,

  // Enable stylistic rules (antfu's config handles code style)
  stylistic: {
    indent: 2,
    quotes: 'single',
    semi: true,
  },

  markdown: false,

  // Ignore patterns
  ignores: [
    '.claude/**',
    '**/.claude/**',
    '.auto-claude/**',
    '.sisyphus/**',
    '.planning/**',
    'dist/**',
    '**/dist/**',
    'node_modules/**',
    '.nx/**',
    '.next/**',
    'coverage/**',
    '**/coverage/**',
    'pnpm-workspace.yaml',
    '**/_generated/**',
    // Ignore auto-generated shadcn/ui and AI Elements components
    '**/components/ui/**',
    '**/components/ai-elements/**',
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

    // Allow non-component exports in files with components
    'react-refresh/only-export-components': 'off',

    // Stricter TypeScript rules (non-type-aware)
    'ts/no-explicit-any': 'error',
  },
});
