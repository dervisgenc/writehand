import { PRODUCT_NAME } from '@writehand/contracts';

import type { WelcomeText } from './extension-text';

export const welcomeDe: WelcomeText = {
  title: `Willkommen bei ${PRODUCT_NAME}`,
  subtitle: 'In drei kurzen Schritten eingerichtet',
  stepsLabel: 'Einrichtungsschritte',
  steps: ['Willkommen', 'Verbindung', 'Ausprobieren'],
  back: 'Zurück',
  next: 'Weiter',
  intro: {
    title: 'Zwei Wege zur Verbindung',
    lead: `${PRODUCT_NAME} arbeitet in Outlook im Web und Gmail und schreibt mit dem KI-Anbieter Ihrer Wahl. Wählen Sie im nächsten Schritt, was zu Ihnen passt; Sie können es jederzeit ändern.`,
    apiKey: {
      title: 'Ihr eigener API-Schlüssel',
      points: [
        'Funktioniert direkt im Browser; nichts muss installiert werden.',
        'Groq und OpenRouter bieten kostenlose Modelle; OpenAI wird nach Nutzung bezahlt.',
        'Der Schlüssel wird verschlüsselt in diesem Browser gespeichert und nur an seinen Anbieter gesendet.',
      ],
    },
    plan: {
      title: 'Ihr ChatGPT- oder Claude-Plan',
      points: [
        'Nutzt Ihr vorhandenes Abo: ChatGPT Plus oder Pro oder Claude über Claude Code.',
        'Benötigt eine kleine Hilfs-App auf diesem Computer, installiert mit einem Befehl und ohne Administratorrechte.',
        'Ihre Anmeldung bleibt auf diesem Computer, außerhalb des Browsers. Die Hilfs-App ist Open Source.',
      ],
    },
    source: 'Quellcode auf GitHub',
    doesTitle: `Was ${PRODUCT_NAME} tut`,
    does: [
      'Sendet den von Ihnen gewählten Text an den von Ihnen gewählten Anbieter – nur auf Ihre Anforderung.',
      'Zeigt jedes Ergebnis zuerst als Vorschau; Ihr Entwurf ändert sich nur mit Ihrer Zustimmung.',
    ],
    doesNotTitle: `Was ${PRODUCT_NAME} nie tut`,
    doesNot: [
      'E-Mails senden.',
      'Ihr Postfach im Hintergrund lesen.',
      'Daten an einen Server von uns senden – es gibt keinen.',
    ],
  },
  install: {
    title: 'Hilfs-App installieren',
    lead: 'Diese Methode benötigt eine kleine Hilfs-App auf diesem Computer. Ein Befehl installiert sie für Ihr Benutzerkonto; Administratorrechte sind nicht nötig.',
    system: 'Ihr System',
    command: 'Installationsbefehl',
    terminal: {
      darwin:
        'Öffnen Sie das Terminal (Programme → Dienstprogramme), fügen Sie den Befehl ein und drücken Sie den Zeilenschalter.',
      linux:
        'Öffnen Sie ein Terminal (oft mit Strg+Alt+T), fügen Sie den Befehl ein und drücken Sie die Eingabetaste.',
      windows:
        'Öffnen Sie PowerShell (Rechtsklick auf Start, dann Terminal), fügen Sie den Befehl ein und drücken Sie die Eingabetaste.',
    },
    waiting: 'Warten auf die Hilfs-App… Sie erscheint hier wenige Sekunden nach Abschluss des Befehls.',
    connected: (version) => `Hilfs-App verbunden (Version ${version}).`,
    whatTitle: 'Was macht der Befehl?',
    what: [
      'Lädt das passende Programm aus der neuesten Version auf GitHub herunter.',
      'Prüft die SHA-256-Prüfsumme und bricht ab, wenn sie nicht stimmt.',
      'Installiert es ohne Administratorrechte in Ihrem Benutzerordner.',
      'Registriert es in Firefox, Chrome, Edge und Brave, damit diese Erweiterung es erreicht.',
    ],
  },
  tryIt: {
    title: 'Ausprobieren',
    lead: 'Überarbeiten Sie eine erfundene E-Mail, um zu prüfen, ob alles funktioniert. Der Text geht nur an den gewählten Anbieter; es wird keine E-Mail gesendet.',
    sampleLabel: 'Beispiel-E-Mail',
    sample:
      'Hallo Sam,\n\ndanke für deine Nachricht. Den Bericht kann ich am donnerstag schicken, aber ich brauche vorher die aktuelle Zahlen von deinem Team. Kannst du sie bis Mitwoch teilen.\n\nViele Grüße\nAlex',
    run: 'Beispiel überarbeiten',
    running: 'Wird überarbeitet…',
    success:
      'Alles funktioniert. Öffnen Sie in Outlook oder Gmail einen Entwurf; die Symbolleiste erscheint daneben.',
    resultLabel: 'Ergebnis',
    openOutlook: 'Outlook öffnen',
    personalOutlook: 'Outlook.com (privat)',
    openGmail: 'Gmail öffnen',
    openSettings: 'Einstellungen',
  },
};
