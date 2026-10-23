import { PRODUCT_NAME } from '@writehand/contracts';

import type { AddinOwnText } from './addin-text';

export const addinDe: AddinOwnText = {
  manifest: {
    description:
      'E-Mails in Outlook mit Ihrem eigenen Schlüssel von Groq, OpenRouter oder OpenAI überarbeiten, übersetzen, beantworten und schreiben. Ergebnisse erscheinen als Vorschau; ohne Ihre Zustimmung wird nichts in den Entwurf geschrieben.',
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
  },
  firstRun: {
    title: `Willkommen bei ${PRODUCT_NAME}`,
    lead: 'Verbinden Sie Ihren eigenen API-Schlüssel einmal in dieser Outlook-App. Groq und OpenRouter bieten kostenlose Modelle.',
    steps: ['API-Schlüssel verbinden', 'Ausprobieren'],
    success:
      'Alles funktioniert. Wählen Sie eine E-Mail aus oder öffnen Sie einen Entwurf und wählen Sie, was Sie tun möchten.',
    start: 'Loslegen',
  },
  ai: {
    description: 'Schreiben Sie E-Mails mit Ihrem eigenen API-Schlüssel von Groq, OpenRouter oder OpenAI.',
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
      'Der ChatGPT- und der Claude-Plan sind in Outlook noch nicht verfügbar. Verbinden Sie stattdessen einen API-Schlüssel.',
  },
  privacyPoints: [
    `Die Seite von ${PRODUCT_NAME} wird bei jedem Öffnen von ihrer Webadresse geladen, Microsofts Office.js von Microsoft. An keine der beiden werden E-Mail-Inhalte oder Schlüssel gesendet.`,
    'Ihre Einstellungen und der verschlüsselte API-Schlüssel werden nur in dieser Outlook-App auf diesem Gerät gespeichert. Sie werden nicht synchronisiert, nicht in Ihrem Postfach gespeichert und nicht mit der Browsererweiterung geteilt.',
    `${PRODUCT_NAME} liest nur die geöffnete E-Mail oder den geöffneten Entwurf, während Sie es verwenden, und behält sie im Arbeitsspeicher.`,
    'Text wird nur an den von Ihnen gewählten KI-Anbieter (Groq, OpenRouter oder OpenAI) gesendet, und nur wenn Sie Überarbeiten, Übersetzen, Schreiben oder Antwort entwerfen wählen.',
    'Ergebnisse erscheinen zuerst als Vorschau und werden erst nach Ihrer Zustimmung in den Entwurf geschrieben.',
    `${PRODUCT_NAME} sendet nie E-Mails; eine Antwort, die es öffnet, ist ein Entwurf.`,
  ],
};
