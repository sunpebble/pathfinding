export default {
  extends: ["@commitlint/config-conventional"],
  rules: {
    "type-enum": [
      2,
      "always",
      [
        "feat", // New feature
        "fix", // Bug fix
        "docs", // Documentation
        "style", // Code style (formatting, etc)
        "refactor", // Code refactoring
        "perf", // Performance improvement
        "test", // Adding/updating tests
        "build", // Build system changes
        "ci", // CI configuration
        "chore", // Other changes
        "revert", // Revert commit
      ],
    ],
    "subject-case": [2, "always", "lower-case"],
    "header-max-length": [2, "always", 100],
  },
};
