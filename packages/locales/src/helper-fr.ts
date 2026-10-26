import type { HelperText } from '@writehand/ui';

export const helperFr: HelperText = {
  title: 'Application d’assistance',
  description:
    'Ce petit programme sur votre ordinateur connecte votre forfait ChatGPT ou Claude et protège vos informations de connexion. Les clés API fonctionnent sans lui.',
  states: {
    checking: 'Vérification…',
    permission: 'Autorisation requise',
    missing: 'Non installée',
    outdated: 'Mise à jour requise',
    connected: 'Connectée',
  },
  permissionBody:
    'Autorisez d’abord l’extension à communiquer avec l’application d’assistance sur cet ordinateur. Votre navigateur vous demandera de confirmer.',
  grant: 'Autoriser',
  missingBody:
    'L’application d’assistance n’est pas encore installée ou ne fonctionne pas. L’assistant de configuration l’installe en une seule commande.',
  outdatedBody:
    'L’application d’assistance installée est trop ancienne pour cette version de l’extension. Mettez-la à jour pour continuer.',
  version: (version, system) => `Version ${version} · ${system}`,
  browsers: (names) => `Enregistrée dans : ${names}`,
  development: 'Installation de développement depuis le code source ; elle ne se met pas à jour elle-même.',
  checkUpdates: 'Rechercher les mises à jour',
  checkUpdatesHint:
    'Au plus une fois par jour, l’application d’assistance demande à GitHub le dernier numéro de version. Rien d’autre n’est envoyé.',
  updateAvailable: (version) => `La version ${version} est disponible.`,
  upToDate: 'L’application d’assistance est à jour.',
  update: 'Mettre à jour',
  updating: 'Mise à jour…',
  updated: (version) => `Mise à jour vers la version ${version} effectuée.`,
  openWizard: 'Ouvrir l’assistant de configuration',
  uninstallTitle: 'Comment la désinstaller',
  uninstallBody: (flag) =>
    `Cette commande supprime l’application d’assistance de cet ordinateur et de tous les navigateurs. Pour aussi vous déconnecter de ChatGPT et supprimer les informations de connexion enregistrées, ajoutez ${flag} à la fin.`,
  copy: 'Copier',
  copied: 'Copié',
};
