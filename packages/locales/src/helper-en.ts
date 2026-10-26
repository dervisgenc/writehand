import type { HelperText } from '@writehand/ui';

export const helperEn: HelperText = {
  title: 'Helper app',
  description:
    'This small program on your computer connects your ChatGPT or Claude plan and keeps your sign-in details safe. API keys work without it.',
  states: {
    checking: 'Checking…',
    permission: 'Permission needed',
    missing: 'Not installed',
    outdated: 'Update needed',
    connected: 'Connected',
  },
  permissionBody:
    'First allow the extension to talk to the helper app on this computer. Your browser will ask you to confirm.',
  grant: 'Allow',
  missingBody:
    'The helper app is not installed or not running yet. The setup wizard installs it with one command.',
  outdatedBody:
    'The installed helper app is too old for this version of the extension. Update it to continue.',
  version: (version, system) => `Version ${version} · ${system}`,
  browsers: (names) => `Registered with: ${names}`,
  development: 'Development installation from source; it does not update itself.',
  checkUpdates: 'Check for updates',
  checkUpdatesHint:
    'At most once a day, the helper app asks GitHub for the latest version number. Nothing else is sent.',
  updateAvailable: (version) => `Version ${version} is available.`,
  upToDate: 'The helper app is up to date.',
  update: 'Update',
  updating: 'Updating…',
  updated: (version) => `Updated to version ${version}.`,
  openWizard: 'Open setup wizard',
  uninstallTitle: 'How to uninstall',
  uninstallBody: (flag) =>
    `This command removes the helper app from this computer and from all browsers. To also sign out of ChatGPT and delete its saved sign-in details, add ${flag} at the end.`,
  copy: 'Copy',
  copied: 'Copied',
};
