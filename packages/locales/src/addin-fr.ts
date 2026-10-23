import { PRODUCT_NAME } from '@writehand/contracts';

import type { AddinOwnText } from './addin-text';

export const addinFr: AddinOwnText = {
  manifest: {
    description:
      'Corrigez, traduisez, répondez et rédigez vos e-mails dans Outlook avec votre propre clé Groq, OpenRouter ou OpenAI. Les résultats s’affichent d’abord en aperçu ; rien n’est écrit dans votre brouillon sans votre accord.',
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
  },
  firstRun: {
    title: `Bienvenue dans ${PRODUCT_NAME}`,
    lead: 'Connectez votre propre clé API une seule fois dans cette application Outlook. Groq et OpenRouter proposent des modèles gratuits.',
    steps: ['Connecter une clé API', 'Essai'],
    success: 'Tout fonctionne. Sélectionnez un e-mail ou ouvrez un brouillon, puis choisissez quoi faire.',
    start: 'Commencer',
  },
  ai: {
    description: 'Rédigez vos e-mails avec votre propre clé API Groq, OpenRouter ou OpenAI.',
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
      'Les forfaits ChatGPT et Claude ne sont pas encore disponibles dans Outlook. Connectez plutôt une clé API.',
  },
  privacyPoints: [
    `La page de ${PRODUCT_NAME} est chargée depuis son adresse web à chaque ouverture, et Office.js depuis Microsoft. Aucun contenu d’e-mail ni aucune clé n’y est envoyé.`,
    'Vos préférences et la clé API chiffrée sont enregistrées uniquement dans cette application Outlook sur cet appareil. Elles ne sont ni synchronisées, ni enregistrées dans votre boîte aux lettres, ni partagées avec l’extension de navigateur.',
    `${PRODUCT_NAME} lit uniquement l’e-mail ou le brouillon ouvert, pendant que vous l’utilisez, et le garde en mémoire.`,
    'Le texte est envoyé au fournisseur d’IA que vous avez choisi (Groq, OpenRouter ou OpenAI) uniquement lorsque vous choisissez Corriger, Traduire, Rédiger ou Préparer une réponse.',
    'Les résultats s’affichent d’abord en aperçu et ne sont écrits dans votre brouillon qu’après votre accord.',
    `${PRODUCT_NAME} n’envoie jamais d’e-mail ; une réponse qu’il ouvre est un brouillon.`,
  ],
};
