const tsEslintParser = require("@typescript-eslint/parser");
const tsEslintPlugin = require("@typescript-eslint/eslint-plugin");
const importPlugin = require("eslint-plugin-import");

module.exports = {
  ignores: ["lib/**", "generated/**", "node_modules/**"],
  languageOptions: {
    ecmaVersion: "latest",
    sourceType: "module",
    parser: tsEslintParser,
    parserOptions: {
      project: ["./tsconfig.json", "./tsconfig.dev.json"],
      sourceType: "module",
    },
  },
  plugins: {
    "@typescript-eslint": tsEslintPlugin,
    import: importPlugin,
  },
  settings: {
    "import/resolver": {
      node: {
        extensions: [".js", ".jsx", ".ts", ".tsx", ".mts", ".cts"],
      },
      typescript: {
        alwaysTryTypes: true,
      },
    },
  },
  extends: [
    "eslint:recommended",
    "plugin:import/errors",
    "plugin:import/warnings",
    "plugin:import/typescript",
    "google",
    "plugin:@typescript-eslint/recommended",
  ],
  rules: {
    quotes: ["error", "double"],
    "import/no-unresolved": "off",
    indent: ["error", 2],
  },
};
