import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import tseslint from 'typescript-eslint'

export default tseslint.config(
  { ignores: ['dist', 'node_modules', 'coverage'] },
  {
    files: ['**/*.{ts,tsx}'],
    extends: [js.configs.recommended, ...tseslint.configs.recommended, reactHooks.configs.flat.recommended],
    languageOptions: { ecmaVersion: 2022, globals: globals.browser },
    rules: {
      'no-restricted-syntax': [
        'error',
        {
          selector: "JSXAttribute[name.name='dangerouslySetInnerHTML']",
          message: 'Raw HTML injection is forbidden. Render untrusted text through MarkdownView.',
        },
      ],
      'no-restricted-imports': [
        'error',
        { patterns: [{ group: ['rehype-raw'], message: 'Raw HTML in markdown is forbidden.' }] },
      ],
    },
  },
  {
    // Only the API client may load the mock layer.
    files: ['src/**/*.{ts,tsx}'],
    ignores: ['src/api/client.ts', 'src/api/mock/**', 'src/**/*.test.{ts,tsx}', 'src/test/**'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            { group: ['rehype-raw'], message: 'Raw HTML in markdown is forbidden.' },
            { group: ['**/api/mock/**', '**/mock/*'], message: 'Import the API only through src/api/client.ts.' },
          ],
        },
      ],
    },
  },
  {
    files: ['scripts/**/*.mjs', 'eslint.config.js', 'vite.config.ts'],
    extends: [js.configs.recommended],
    languageOptions: { globals: globals.node },
  },
)
