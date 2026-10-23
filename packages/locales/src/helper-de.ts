import type { HelperText } from '@writehand/ui';

export const helperDe: HelperText = {
  title: 'Hilfs-App',
  description:
    'Dieses kleine Programm auf Ihrem Computer verbindet Ihren ChatGPT- oder Claude-Plan und schützt Ihre Anmeldedaten. API-Schlüssel funktionieren ohne sie.',
  states: {
    checking: 'Wird geprüft…',
    permission: 'Berechtigung nötig',
    missing: 'Nicht installiert',
    outdated: 'Update nötig',
    connected: 'Verbunden',
  },
  permissionBody:
    'Erlauben Sie der Erweiterung zuerst, mit der Hilfs-App auf diesem Computer zu kommunizieren. Ihr Browser fragt nach einer Bestätigung.',
  grant: 'Erlauben',
  missingBody:
    'Die Hilfs-App ist noch nicht installiert oder läuft nicht. Der Einrichtungsassistent installiert sie mit einem Befehl.',
  outdatedBody:
    'Die installierte Hilfs-App ist für diese Version der Erweiterung zu alt. Aktualisieren Sie sie, um fortzufahren.',
  version: (version, system) => `Version ${version} · ${system}`,
  browsers: (names) => `Registriert in: ${names}`,
  development: 'Entwicklungsinstallation aus dem Quellcode; sie aktualisiert sich nicht selbst.',
  checkUpdates: 'Nach Updates suchen',
  checkUpdatesHint:
    'Höchstens einmal täglich fragt die Hilfs-App bei GitHub die neueste Versionsnummer ab. Sonst wird nichts gesendet.',
  updateAvailable: (version) => `Version ${version} ist verfügbar.`,
  upToDate: 'Die Hilfs-App ist auf dem neuesten Stand.',
  update: 'Update installieren',
  updating: 'Wird aktualisiert…',
  updated: (version) => `Auf Version ${version} aktualisiert.`,
  openWizard: 'Einrichtungsassistent öffnen',
  uninstallTitle: 'Deinstallieren',
  uninstallBody: (flag) =>
    `Dieser Befehl entfernt die Hilfs-App von diesem Computer und aus allen Browsern. Um sich zusätzlich bei ChatGPT abzumelden und die gespeicherten Anmeldedaten zu löschen, hängen Sie ${flag} an.`,
  copy: 'Kopieren',
  copied: 'Kopiert',
};
