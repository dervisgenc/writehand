import { PRODUCT_NAME } from '@writehand/contracts';

import type { AddinOwnText } from './addin-text';

export const addinDe: AddinOwnText = {
  manifest: {
    description:
      'E-Mails in Outlook mit Ihrem ChatGPT- oder Claude-Plan über die Writehand-Hilfs-App oder Ihrem eigenen API-Schlüssel überarbeiten, übersetzen und schreiben. Ohne Ihre Zustimmung wird nichts in den Entwurf geschrieben.',
    groupLabel: PRODUCT_NAME,
    buttonLabel: PRODUCT_NAME,
    buttonTooltip: `${PRODUCT_NAME} öffnen, um diese E-Mail zu überarbeiten, zu übersetzen oder zu schreiben. Ohne Ihre Zustimmung wird nichts geschrieben oder gesendet.`,
  },
  pane: {
    settings: 'Einstellungen',
    back: 'Zurück',
    loading: 'Wird geladen…',
    noItem: 'Wählen Sie eine E-Mail aus oder öffnen Sie einen Entwurf, um zu beginnen.',
    outsideOutlook: `${PRODUCT_NAME} läuft in Outlook. Öffnen Sie es mit der ${PRODUCT_NAME}-Schaltfläche einer E-Mail oder eines Entwurfs.`,
    helperUnavailable:
      'Der ChatGPT- und der Claude-Plan laufen in der Writehand-Hilfs-App, die diesen Bereich bereitstellt, aber sie hat nicht geantwortet. Führen Sie writehand outlook status in einem Terminal aus oder verwenden Sie einen API-Schlüssel.',
  },
  firstRun: {
    title: `Willkommen bei ${PRODUCT_NAME}`,
    lead: 'Wählen Sie einmal in dieser Outlook-App, wie Sie sich verbinden: Ihr ChatGPT- oder Claude-Plan über die Hilfs-App oder Ihr eigener API-Schlüssel (Groq und OpenRouter bieten kostenlose Modelle).',
    steps: ['Verbindung wählen', 'Ausprobieren'],
    success:
      'Alles funktioniert. Wählen Sie eine E-Mail aus oder öffnen Sie einen Entwurf und wählen Sie, was Sie tun möchten.',
    start: 'Loslegen',
  },
  ai: {
    description:
      'Schreiben Sie E-Mails mit Ihrem ChatGPT- oder Claude-Plan über die Hilfs-App oder mit Ihrem eigenen API-Schlüssel von Groq, OpenRouter oder OpenAI.',
    apiNote: (provider) =>
      `Ihr Schlüssel wird verschlüsselt in dieser Outlook-App gespeichert und nur an ${provider} gesendet. Kostenpflichtige Nutzung rechnet ${provider} ab.`,
    keySaved: (provider) => `${provider}-Schlüssel verschlüsselt in dieser Outlook-App gespeichert.`,
    apiPrivacy: (provider) =>
      `Wenn Sie Text anfordern, werden Ihr Text, Ihre Anweisungen und der ausgewählte Kontext von dieser Outlook-App direkt an ${provider} gesendet und unterliegen den Bedingungen von ${provider}. Der Schlüssel verlässt diese Outlook-App nur zur Anmeldung bei ${provider}.`,
  },
  errors: {
    CLIPBOARD_UNAVAILABLE:
      'Outlook hat das Schreiben in die Zwischenablage nicht erlaubt. Markieren Sie den Text und drücken Sie Strg+C.',
    AI_KEY_STORAGE_FAILED:
      'Diese Outlook-App konnte den Schlüssel nicht sicher speichern oder lesen; es wurde nichts gespeichert. Versuchen Sie es erneut; schlägt es weiter fehl, behält Outlook auf diesem Computer keine Daten für Add-ins.',
    AI_HOST_UNAVAILABLE:
      'Die Writehand-Hilfs-App hat nicht geantwortet. Prüfen Sie, ob sie läuft (writehand outlook status), oder verbinden Sie einen API-Schlüssel.',
  },
  privacyPoints: [
    `Den Bereich von ${PRODUCT_NAME} stellt die Hilfs-App auf diesem Computer bereit; nur Microsofts Office.js wird aus dem Internet geladen. An Microsoft werden keine E-Mail-Inhalte oder Schlüssel gesendet.`,
    'Ihre Einstellungen und ein verschlüsselter API-Schlüssel werden nur in dieser Outlook-App auf diesem Gerät gespeichert. ChatGPT-Anmeldungen bleiben in der Hilfs-App auf diesem Computer, die auch die Browsererweiterung nutzt. In Ihrem Postfach wird nichts gespeichert.',
    `${PRODUCT_NAME} liest nur die geöffnete E-Mail oder den geöffneten Entwurf, während Sie es verwenden, und behält sie im Arbeitsspeicher.`,
    'Text wird nur gesendet, wenn Sie Überarbeiten, Übersetzen, Schreiben oder Antwort entwerfen wählen, und nur an die gewählte Methode: ChatGPT oder Claude über die Hilfs-App oder Groq, OpenRouter oder OpenAI mit Ihrem Schlüssel.',
    'Ergebnisse erscheinen zuerst als Vorschau und werden erst nach Ihrer Zustimmung in den Entwurf geschrieben.',
    `${PRODUCT_NAME} sendet nie E-Mails; eine Antwort, die es öffnet, ist ein Entwurf.`,
  ],
};
