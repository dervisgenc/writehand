import { API_PROVIDER_DETAILS, API_PROVIDERS, OUTLOOK_ADDIN_ORIGIN } from '@writehand/contracts';

/** Where the task pane is served during development (`pnpm addin:dev`, `pnpm addin:serve`). */
export const DEV_PORT = 3000;
export const DEV_ORIGIN = `https://localhost:${DEV_PORT}`;

/** Where the helper app serves the task pane (`writehand outlook enable`), the origin of its manifest. */
export const HELPER_ORIGIN = OUTLOOK_ADDIN_ORIGIN;

/** Office.js from the CDN endpoint Microsoft recommends since October 2026. */
export const OFFICE_JS_URL = 'https://officeapis.public.onecdn.static.microsoft/1/office.js';
export const OFFICE_JS_ORIGIN = new URL(OFFICE_JS_URL).origin;

/** The API key providers' origins: the only addresses the task pane sends requests to. */
export const PROVIDER_ORIGINS: readonly string[] = API_PROVIDERS.map(
  (provider) => new URL(API_PROVIDER_DETAILS[provider].permission.replace(/\*$/, '')).origin,
);

/**
 * The task pane's Content Security Policy, set as a `<meta>` tag (a static host sets no
 * headers). Scripts come only from the add-in's origin and Office.js's CDN; requests go only to
 * the three providers and Office.js's CDN. Style attributes are allowed (the panel's colors
 * and the formatted preview use them), `<style>` elements only from the add-in's own files. The
 * development server also needs its websocket and inline style elements for hot reload.
 */
export function contentSecurityPolicy(options: { readonly dev: boolean }): string {
  const directives: readonly (readonly [string, readonly string[]])[] = [
    ['default-src', ["'none'"]],
    ['script-src', ["'self'", OFFICE_JS_ORIGIN]],
    [
      'connect-src',
      [
        "'self'",
        ...PROVIDER_ORIGINS,
        OFFICE_JS_ORIGIN,
        ...(options.dev ? [`wss://localhost:${DEV_PORT}`] : []),
      ],
    ],
    ['style-src', ["'self'", ...(options.dev ? ["'unsafe-inline'"] : [])]],
    ['style-src-attr', ["'unsafe-inline'"]],
    ['img-src', ["'self'", 'data:']],
    ['font-src', ["'self'"]],
    ['object-src', ["'none'"]],
    ['base-uri', ["'none'"]],
    ['form-action', ["'none'"]],
  ];
  return directives.map(([name, values]) => `${name} ${values.join(' ')}`).join('; ');
}
