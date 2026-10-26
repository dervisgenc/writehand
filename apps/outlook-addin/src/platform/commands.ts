/**
 * The manifest's function file. The ribbon button only opens the task pane, so the add-in has
 * no function commands; Office.js still expects the page to initialize.
 */
export function initializeCommands(): void {
  if (typeof Office !== 'undefined') void Office.onReady();
}
