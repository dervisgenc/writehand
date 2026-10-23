import { PRODUCT_NAME } from '@writehand/contracts';

import type { WelcomeText } from './extension-text';

export const welcomeFr: WelcomeText = {
  title: `Bienvenue dans ${PRODUCT_NAME}`,
  subtitle: 'Prêt en trois étapes courtes',
  stepsLabel: 'Étapes de configuration',
  steps: ['Bienvenue', 'Connexion', 'Essai'],
  back: 'Retour',
  next: 'Continuer',
  intro: {
    title: 'Deux façons de se connecter',
    lead: `${PRODUCT_NAME} fonctionne dans Outlook sur le web et Gmail et rédige avec le fournisseur d’IA de votre choix. Choisissez ce qui vous convient à l’étape suivante ; vous pourrez changer à tout moment.`,
    apiKey: {
      title: 'Votre propre clé API',
      points: [
        'Fonctionne directement dans le navigateur ; rien à installer.',
        'Groq et OpenRouter proposent des modèles gratuits ; OpenAI se paie à l’usage.',
        'La clé est enregistrée chiffrée dans ce navigateur et envoyée uniquement à son fournisseur.',
      ],
    },
    plan: {
      title: 'Votre forfait ChatGPT ou Claude',
      points: [
        'Utilise l’abonnement que vous avez déjà : ChatGPT Plus ou Pro, ou Claude via Claude Code.',
        'Nécessite une petite application d’assistance sur cet ordinateur, installée en une commande et sans droits d’administrateur.',
        'Votre connexion reste sur cet ordinateur, hors du navigateur. L’application d’assistance est open source.',
      ],
    },
    source: 'Code source sur GitHub',
    doesTitle: `Ce que fait ${PRODUCT_NAME}`,
    does: [
      'Envoie le texte que vous choisissez au fournisseur que vous choisissez, uniquement à votre demande.',
      'Affiche chaque résultat d’abord en aperçu ; votre brouillon ne change qu’avec votre accord.',
    ],
    doesNotTitle: `Ce que ${PRODUCT_NAME} ne fait jamais`,
    doesNot: [
      'Envoyer des e-mails.',
      'Lire votre boîte aux lettres en arrière-plan.',
      'Envoyer quoi que ce soit à un serveur à nous : il n’y en a pas.',
    ],
  },
  install: {
    title: 'Installer l’application d’assistance',
    lead: 'Cette méthode nécessite une petite application d’assistance sur cet ordinateur. Une seule commande l’installe pour votre compte utilisateur ; aucun droit d’administrateur n’est nécessaire.',
    system: 'Votre système',
    command: 'Commande d’installation',
    terminal: {
      darwin: 'Ouvrez Terminal (Applications → Utilitaires), collez la commande et appuyez sur Retour.',
      linux: 'Ouvrez un terminal (souvent Ctrl+Alt+T), collez la commande et appuyez sur Entrée.',
      windows:
        'Ouvrez PowerShell (clic droit sur Démarrer, puis Terminal), collez la commande et appuyez sur Entrée.',
    },
    waiting:
      'En attente de l’application d’assistance… Elle apparaît ici quelques secondes après la fin de la commande.',
    connected: (version) => `Application d’assistance connectée (version ${version}).`,
    whatTitle: 'Que fait la commande ?',
    what: [
      'Télécharge le programme adapté à votre système depuis la dernière version sur GitHub.',
      'Vérifie sa somme de contrôle SHA-256 et s’arrête si elle ne correspond pas.',
      'L’installe dans votre dossier utilisateur, sans droits d’administrateur.',
      'L’enregistre dans Firefox, Chrome, Edge et Brave pour que cette extension puisse la joindre.',
    ],
  },
  tryIt: {
    title: 'Essai',
    lead: 'Corrigez un e-mail inventé pour vérifier que tout fonctionne. Le texte ne va qu’au fournisseur choisi ; aucun e-mail n’est envoyé.',
    sampleLabel: 'E-mail d’exemple',
    sample:
      'Bonjour Sam,\n\nmerci pour ton message. Je peut envoyer le rapport jeudi, mais j’ai besoin d’abord des dernier chiffres de ton équipe. Tu pourrais les partager avant mercredi ?\n\nBonne journée,\nAlex',
    run: 'Corriger l’exemple',
    running: 'Correction…',
    success:
      'Tout fonctionne. Ouvrez un brouillon dans Outlook ou Gmail ; la barre d’outils apparaît à côté.',
    resultLabel: 'Résultat',
    openOutlook: 'Ouvrir Outlook',
    personalOutlook: 'Outlook.com (personnel)',
    openGmail: 'Ouvrir Gmail',
    openSettings: 'Paramètres',
  },
};
