import js from '@eslint/js';
import prettier from 'eslint-config-prettier';
import pluginVue from 'eslint-plugin-vue';
import globals from 'globals';
import tseslint from 'typescript-eslint';

/**
 * Module boundaries are not just documented intent (see docs/DEVELOPMENT.md);
 * they are enforced here.
 */
const INTERNAL_PACKAGES = [
  '@writehand/contracts',
  '@writehand/core',
  '@writehand/ui',
  '@writehand/outlook-web',
  '@writehand/gmail-web',
  '@writehand/mail-dom',
  '@writehand/ai-openai',
  '@writehand/ai-claude-code',
  '@writehand/ai-chat-completions',
  '@writehand/email-format',
  '@writehand/session',
  '@writehand/ai-connection',
  '@writehand/locales',
];

/** Packages shared by the apps above the mail connectors; nothing below them may import them. */
const APP_SHARED_PACKAGES = ['@writehand/session', '@writehand/ai-connection', '@writehand/locales'];

/** Every mail connector; none of them imports another. */
const MAIL_CONNECTOR_PACKAGES = ['@writehand/outlook-web', '@writehand/gmail-web'];

/** Every AI provider package; none of them imports another. */
const AI_PROVIDER_PACKAGES = [
  '@writehand/ai-openai',
  '@writehand/ai-claude-code',
  '@writehand/ai-chat-completions',
];

const deepImportBan = {
  group: ['@writehand/*/src', '@writehand/*/src/**'],
  message: "Do not reach into another package's internal files; use its exported API.",
};

function restrictImports(names, message) {
  return names.map((name) => ({ name, message }));
}

const browserGlobals = [
  'window',
  'document',
  'navigator',
  'chrome',
  'browser',
  'localStorage',
  'sessionStorage',
];

export default tseslint.config(
  {
    ignores: [
      '**/node_modules/**',
      '**/.output/**',
      '**/.wxt/**',
      '**/dist/**',
      '**/coverage/**',
      'test-results/**',
      'playwright-report/**',
    ],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  ...pluginVue.configs['flat/recommended'],
  // Formatting belongs to Prettier; ESLint only checks correctness and boundary rules.
  prettier,
  {
    files: ['**/*.vue'],
    languageOptions: {
      parserOptions: { parser: tseslint.parser, extraFileExtensions: ['.vue'] },
    },
  },
  {
    languageOptions: {
      ecmaVersion: 2023,
      sourceType: 'module',
      globals: { ...globals.browser },
    },
    rules: {
      'no-console': 'error',
      eqeqeq: ['error', 'always', { null: 'ignore' }],
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/consistent-type-imports': ['error', { fixStyle: 'inline-type-imports' }],
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
      // Email and user text are never rendered as HTML.
      'vue/no-v-html': 'error',
      'vue/max-attributes-per-line': 'off',
      'vue/singleline-html-element-content-newline': 'off',
      'vue/html-self-closing': 'off',
      'no-restricted-imports': ['error', { patterns: [deepImportBan] }],
      'no-restricted-properties': [
        'error',
        { property: 'innerHTML', message: 'Never write email or user text as HTML.' },
        { property: 'outerHTML', message: 'Never write email or user text as HTML.' },
        {
          object: 'document',
          property: 'execCommand',
          message: 'Allowed only in mail-dom/writing/editor-writer.ts.',
        },
      ],
    },
  },
  {
    // contracts: environment-agnostic types and boundary schemas.
    files: ['packages/contracts/src/**/*.ts'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          paths: restrictImports(
            ['vue', 'wxt', '#imports', ...INTERNAL_PACKAGES],
            'contracts uses only zod and its own types.',
          ),
          patterns: [
            deepImportBan,
            { group: ['wxt/*'], message: 'contracts does not know about the runtime environment.' },
          ],
        },
      ],
      'no-restricted-globals': ['error', ...browserGlobals],
    },
  },
  {
    // email-format: Markdown → email HTML; pure functions free of environment and package dependencies.
    files: ['packages/email-format/src/**/*.ts'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          paths: restrictImports(
            ['vue', 'wxt', '#imports', ...INTERNAL_PACKAGES],
            'email-format uses only zod and its own types.',
          ),
          patterns: [deepImportBan],
        },
      ],
      'no-restricted-globals': ['error', ...browserGlobals],
    },
  },
  {
    // core: knows nothing about Vue, WXT, the browser or the Outlook page.
    files: ['packages/core/src/**/*.ts'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          paths: restrictImports(
            [
              'vue',
              'wxt',
              '#imports',
              'zod',
              '@writehand/ui',
              '@writehand/outlook-web',
              '@writehand/core',
              ...APP_SHARED_PACKAGES,
            ],
            'core depends only on @writehand/contracts.',
          ),
          patterns: [
            deepImportBan,
            { group: ['wxt/*'], message: 'core does not know about the runtime environment.' },
          ],
        },
      ],
      'no-restricted-globals': ['error', ...browserGlobals],
    },
  },
  {
    // ui: does not import the mail connector, business rules or browser APIs.
    files: ['packages/ui/src/**/*.{ts,vue}'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          paths: restrictImports(
            ['wxt', '#imports', '@writehand/outlook-web', '@writehand/core', ...APP_SHARED_PACKAGES],
            'ui only receives view data and emits events.',
          ),
          patterns: [deepImportBan, { group: ['wxt/*'], message: 'ui does not use browser helpers.' }],
        },
      ],
      'no-restricted-globals': [
        'error',
        'chrome',
        'browser',
        'document',
        'navigator',
        'localStorage',
        'sessionStorage',
      ],
    },
  },
  {
    // The mail connector knows nothing about Vue components, business rules or the text service.
    // Connectors share DOM building blocks only through mail-dom; they never import each other.
    files: ['packages/mail-connectors/**/src/**/*.ts'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          paths: restrictImports(
            [
              'vue',
              'wxt',
              '#imports',
              '@writehand/ui',
              '@writehand/core',
              ...APP_SHARED_PACKAGES,
              ...MAIL_CONNECTOR_PACKAGES,
            ],
            'A connector works only with contracts, mail-dom and the DOM.',
          ),
          patterns: [
            deepImportBan,
            { group: ['wxt/*'], message: 'The connector does not know about extension APIs.' },
          ],
        },
      ],
      'no-restricted-globals': ['error', 'chrome', 'browser', 'window', 'localStorage', 'sessionStorage'],
    },
  },
  {
    // mail-dom is shared by the connectors, so it cannot depend on any of them either.
    files: ['packages/mail-connectors/mail-dom/src/**/*.ts'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          paths: restrictImports(
            [
              'vue',
              'wxt',
              '#imports',
              '@writehand/ui',
              '@writehand/core',
              '@writehand/mail-dom',
              ...APP_SHARED_PACKAGES,
              ...MAIL_CONNECTOR_PACKAGES,
            ],
            'mail-dom works only with contracts and the DOM.',
          ),
          patterns: [deepImportBan],
        },
      ],
    },
  },
  {
    // The single write path: execCommand is allowed only here.
    files: ['packages/mail-connectors/mail-dom/src/writing/editor-writer.ts'],
    rules: {
      'no-restricted-properties': ['error', { property: 'innerHTML' }, { property: 'outerHTML' }],
    },
  },
  {
    // session: the panel session both apps share. It reaches the mail page only through the
    // connector, storage only through `StorageArea`, and the AI only through `TextProcessor`.
    files: ['packages/session/src/**/*.ts'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          paths: restrictImports(
            [
              'wxt',
              '#imports',
              '@writehand/ai-connection',
              '@writehand/locales',
              '@writehand/mail-dom',
              ...MAIL_CONNECTOR_PACKAGES,
              ...AI_PROVIDER_PACKAGES,
            ],
            'session works with contracts, core, email-format, ui types and Vue only.',
          ),
          patterns: [deepImportBan, { group: ['wxt/*'], message: 'session does not use browser helpers.' }],
        },
      ],
      'no-restricted-globals': ['error', ...browserGlobals, 'Office', 'fetch'],
    },
  },
  {
    // ai-connection: the API key method. No UI, no mailbox, no page globals; keys reach only
    // their provider through the provider packages.
    files: ['packages/ai-connection/src/**/*.ts'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          paths: restrictImports(
            [
              'vue',
              'wxt',
              '#imports',
              'jose',
              '@writehand/core',
              '@writehand/ui',
              '@writehand/session',
              '@writehand/locales',
              '@writehand/mail-dom',
              ...MAIL_CONNECTOR_PACKAGES,
            ],
            'ai-connection depends only on contracts and the browser-safe provider packages.',
          ),
          patterns: [
            deepImportBan,
            { group: ['node:*'], message: 'ai-connection runs in browser pages; no Node.js modules.' },
          ],
        },
      ],
      'no-restricted-globals': ['error', ...browserGlobals, 'Office'],
    },
  },
  {
    // locales: text only; the types come from contracts and ui.
    files: ['packages/locales/src/**/*.ts'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          paths: restrictImports(
            [
              'vue',
              'wxt',
              '#imports',
              '@writehand/core',
              '@writehand/session',
              '@writehand/ai-connection',
              '@writehand/mail-dom',
              '@writehand/email-format',
              ...MAIL_CONNECTOR_PACKAGES,
              ...AI_PROVIDER_PACKAGES,
            ],
            'locales holds text; it imports only contracts and ui types.',
          ),
          patterns: [deepImportBan],
        },
      ],
      'no-restricted-globals': ['error', ...browserGlobals, 'Office'],
    },
  },
  {
    // Browser APIs in the extension are kept under platform/.
    files: ['apps/browser-extension/src/{composables,mounting,bootstrap,development}/**/*.{ts,vue}'],
    rules: {
      'no-restricted-globals': ['error', 'chrome', 'browser'],
    },
  },
  {
    files: [
      'packages/ai-openai/src/**/*.ts',
      'packages/ai-claude-code/src/**/*.ts',
      'apps/ai-companion/src/**/*.ts',
    ],
    languageOptions: { globals: { ...globals.node } },
    rules: {
      'no-restricted-globals': ['error', ...browserGlobals],
      'no-restricted-imports': [
        'error',
        {
          paths: restrictImports(
            [
              'vue',
              'wxt',
              '#imports',
              '@writehand/core',
              '@writehand/ui',
              '@writehand/outlook-web',
              ...APP_SHARED_PACKAGES,
            ],
            'AI modules do not depend on the UI or mailbox.',
          ),
          patterns: [deepImportBan],
        },
      ],
    },
  },
  {
    // OS differences live only in the helper app's platform.ts.
    files: [
      'packages/ai-openai/src/**/*.ts',
      'packages/ai-claude-code/src/**/*.ts',
      'apps/ai-companion/src/**/*.ts',
    ],
    ignores: ['apps/ai-companion/src/platform.ts'],
    rules: {
      'no-restricted-properties': [
        'error',
        ...['platform', 'arch'].map((property) => ({
          object: 'process',
          property,
          message: 'Define OS differences in apps/ai-companion/src/platform.ts.',
        })),
      ],
    },
  },
  {
    // Provider packages do not know each other; shared instructions and types live in contracts.
    files: [
      'packages/ai-openai/src/**/*.ts',
      'packages/ai-claude-code/src/**/*.ts',
      'packages/ai-chat-completions/src/**/*.ts',
    ],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          paths: restrictImports(
            [
              'vue',
              'wxt',
              '#imports',
              '@writehand/core',
              '@writehand/ui',
              '@writehand/outlook-web',
              ...AI_PROVIDER_PACKAGES,
            ],
            'AI provider packages depend only on contracts.',
          ),
          patterns: [deepImportBan],
        },
      ],
    },
  },
  {
    // Providers the extension's background uses directly: web APIs only, so they run in the
    // browser and in Node.js alike.
    files: [
      'packages/ai-chat-completions/src/**/*.ts',
      'packages/ai-openai/src/{api-key,codex,responses,errors,prompt}.ts',
    ],
    rules: {
      'no-restricted-globals': ['error', ...browserGlobals, 'process', 'Buffer'],
      'no-restricted-imports': [
        'error',
        {
          paths: restrictImports(
            [
              'vue',
              'wxt',
              '#imports',
              'jose',
              '@writehand/core',
              '@writehand/ui',
              '@writehand/outlook-web',
              ...AI_PROVIDER_PACKAGES,
            ],
            'The browser-safe providers depend only on contracts and zod.',
          ),
          patterns: [
            deepImportBan,
            { group: ['node:*'], message: 'The extension background has no Node.js modules.' },
          ],
        },
      ],
    },
  },
  {
    files: [
      'tests/**/*.{ts,mjs}',
      'scripts/**/*.{js,mjs}',
      'apps/ai-companion/scripts/*.mjs',
      '*.config.{js,ts}',
      'apps/browser-extension/*.config.ts',
    ],
    languageOptions: { globals: { ...globals.node, ...globals.browser } },
    rules: {
      'no-console': 'off',
      // Playwright fixtures declare their dependencies with an empty object pattern.
      'no-empty-pattern': 'off',
      'no-restricted-imports': 'off',
      'no-restricted-properties': 'off',
    },
  },
);
