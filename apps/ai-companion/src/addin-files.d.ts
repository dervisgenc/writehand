/**
 * The Outlook add-in's built task pane, put into the program by the build (scripts/addin-files.mjs)
 * as `[published path, base64]` pairs. Empty in a development build made before the add-in.
 */
declare module 'writehand:addin-files' {
  const files: readonly (readonly [string, string])[];
  export default files;
}
