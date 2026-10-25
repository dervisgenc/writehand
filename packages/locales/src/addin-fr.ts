import { PRODUCT_NAME } from '@writehand/contracts';

import type { AddinOwnText } from './addin-text';

export const addinFr: AddinOwnText = {
  manifest: {
    description:
      'Corrigez, traduisez et rédigez vos e-mails dans Outlook avec votre forfait ChatGPT ou Claude via l’application d’assistance Writehand, ou votre propre clé API. Rien n’est écrit dans votre brouillon sans votre accord.',
    groupLabel: PRODUCT_NAME,
    buttonLabel: PRODUCT_NAME,
    buttonTooltip: `Ouvrez ${PRODUCT_NAME} pour corriger, traduire ou rédiger cet e-mail. Rien n’est écrit ni envoyé sans votre accord.`,
  },
  pane: {
    settings: 'Paramètres',
    back: 'Retour',
    loading: 'Chargement…',
    noItem: 'Sélectionnez un e-mail ou ouvrez un brouillon pour commencer.',
    outsideOutlook: `${PRODUCT_NAME} fonctionne dans Outlook. Ouvrez-le avec le bouton ${PRODUCT_NAME} d’un e-mail ou d’un brouillon.`,
    helperUnavailable:
      'Les forfaits ChatGPT et Claude fonctionnent dans l’application d’assistance Writehand, qui fournit ce volet, mais elle n’a pas répondu. Exécutez writehand outlook status dans un terminal, ou utilisez une clé API.',
  },
  firstRun: {
    title: `Bienvenue dans ${PRODUCT_NAME}`,
    lead: 'Choisissez une seule fois dans cette application Outlook comment vous connecter : votre forfait ChatGPT ou Claude via l’application d’assistance, ou votre propre clé API (Groq et OpenRouter proposent des modèles gratuits).',
    steps: ['Choisir une connexion', 'Essai'],
    success: 'Tout fonctionne. Sélectionnez un e-mail ou ouvrez un brouillon, puis choisissez quoi faire.',
    start: 'Commencer',
  },
  ai: {
    description:
      'Rédigez vos e-mails avec votre forfait ChatGPT ou Claude via l’application d’assistance, ou avec votre propre clé API Groq, OpenRouter ou OpenAI.',
    apiNote: (provider) =>
      `Votre clé est enregistrée chiffrée dans cette application Outlook et envoyée uniquement à ${provider}. L’utilisation payante est facturée par ${provider}.`,
    keySaved: (provider) => `Clé ${provider} enregistrée, chiffrée dans cette application Outlook.`,
    apiPrivacy: (provider) =>
      `Lorsque vous demandez une génération, votre texte, vos consignes et le contexte sélectionné sont envoyés directement de cette application Outlook à ${provider}, selon les conditions de ${provider}. La clé ne quitte cette application Outlook que pour l’authentification auprès de ${provider}.`,
  },
  errors: {
    CLIPBOARD_UNAVAILABLE:
      'Outlook n’a pas autorisé l’écriture dans le Presse-papiers. Sélectionnez le texte et appuyez sur Ctrl+C.',
    AI_KEY_STORAGE_FAILED:
      'Cette application Outlook n’a pas pu enregistrer ou lire la clé de façon sécurisée ; rien n’a été enregistré. Réessayez ; si l’erreur persiste, Outlook ne conserve pas de données pour les compléments sur cet ordinateur.',
    AI_HOST_UNAVAILABLE:
      'L’application d’assistance Writehand n’a pas répondu. Vérifiez qu’elle fonctionne (writehand outlook status), ou connectez une clé API.',
  },
  privacyPoints: [
    `Le volet de ${PRODUCT_NAME} est fourni par son application d’assistance sur cet ordinateur ; seul Office.js de Microsoft est chargé depuis Internet. Aucun contenu d’e-mail ni aucune clé n’est envoyé à Microsoft.`,
    'Vos préférences et une clé API chiffrée sont enregistrées uniquement dans cette application Outlook sur cet appareil. Les connexions ChatGPT restent dans l’application d’assistance de cet ordinateur, que l’extension de navigateur utilise aussi. Rien n’est enregistré dans votre boîte aux lettres.',
    `${PRODUCT_NAME} lit uniquement l’e-mail ou le brouillon ouvert, pendant que vous l’utilisez, et le garde en mémoire.`,
    'Le texte n’est envoyé que lorsque vous choisissez Corriger, Traduire, Rédiger ou Préparer une réponse, et uniquement à la méthode choisie : ChatGPT ou Claude via l’application d’assistance, ou Groq, OpenRouter ou OpenAI avec votre clé.',
    'Les résultats s’affichent d’abord en aperçu et ne sont écrits dans votre brouillon qu’après votre accord.',
    `${PRODUCT_NAME} n’envoie jamais d’e-mail ; une réponse qu’il ouvre est un brouillon.`,
  ],
};
