/**
 * The product's user-facing name and external identifiers. The extension, the helper
 * app and the installer take these values from here only. Internal package names
 * (`@writehand/*`) and the repository name are independent of the product name.
 */
export const PRODUCT_NAME = 'Writehand';

/** Native messaging name under which the local helper app is registered with browsers. */
export const NATIVE_HOST_NAME = 'com.dervisgenc.writehand';

/** Firefox (AMO) extension ID. Changing it after release breaks store updates. */
export const FIREFOX_EXTENSION_ID = 'writehand@dervisgenc.com';

/**
 * Chromium extension IDs in the stores (Chrome Web Store, Edge Add-ons). In Chromium
 * browsers the helper app accepts connections only from these IDs and from those passed
 * with `--extension-id` at install time. This is the only place to add a store ID once it
 * is assigned; then publish a new release (see docs/RELEASING.md).
 */
export const CHROMIUM_EXTENSION_IDS: readonly string[] = [];

/**
 * The Outlook add-in's ID in its manifest. It never changes once a manifest has been given out:
 * Outlook treats another ID as another add-in, which users would have to install again.
 */
export const OUTLOOK_ADDIN_ID = '065738bd-ff6b-4b84-8131-53b192cafbe9';

/**
 * Where the helper app serves the Outlook add-in on the user's computer (`writehand outlook
 * enable`). The manifest names this origin, so it never changes once a manifest has been given
 * out; Windows does not hand out ports below 49152 to other programs on its own.
 */
export const OUTLOOK_ADDIN_PORT = 41537;
export const OUTLOOK_ADDIN_ORIGIN = `https://localhost:${OUTLOOK_ADDIN_PORT}`;

/** Publisher of the Outlook add-in, shown in Outlook's add-in dialog. */
export const OUTLOOK_ADDIN_PROVIDER_NAME = 'Derviş Genç';

/** Program name of the helper app; its install and data folders use the same name. */
export const HELPER_COMMAND = 'writehand';

/** GitHub repository that hosts the source code and releases (`owner/name`). */
export const REPOSITORY = 'dervisgenc/writehand';
export const REPOSITORY_URL = `https://github.com/${REPOSITORY}`;
