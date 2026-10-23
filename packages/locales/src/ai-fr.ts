import { PRODUCT_NAME } from '@writehand/contracts';
import type { AiText } from '@writehand/ui';

export const aiFr: AiText = {
  title: 'Connexion IA',
  description:
    'Rédigez vos e-mails avec votre propre clé API Groq, OpenRouter ou OpenAI, votre forfait ChatGPT ou Claude Code sur cet ordinateur.',
  chatgpt: 'Forfait ChatGPT',
  apiKey: 'Clé API',
  claudeCode: 'Forfait Claude',
  methodHints: {
    chatgpt: 'Avec votre forfait Plus, Pro ou Business',
    'api-key': 'Groq, OpenRouter ou OpenAI ; modèles gratuits disponibles',
    'claude-code': 'Avec Claude Code sur cet ordinateur',
  },
  methodLabel: 'Méthode de connexion',
  recommended: 'Recommandé',
  experimental: 'Expérimental',
  needsHelper: 'Nécessite l’application d’assistance',
  helperRequired: `Cette méthode fonctionne dans l’application d’assistance ${PRODUCT_NAME}, qui n’est pas encore connectée. Installez-la avec l’assistant de configuration ou choisissez « Clé API », qui fonctionne sans elle.`,
  statusReady: 'Prêt',
  statusSetup: 'Installation requise',
  statusAction: 'Connexion requise',
  guide: {
    title: 'Guide de connexion',
    intro:
      'Configurez l’une des méthodes ci-dessous pour générer du texte. Chaque section indique ce qu’il vous faut et les étapes à suivre.',
    requirementsLabel: 'Il vous faut',
    stepsLabel: 'Étapes',
    notesLabel: 'Bon à savoir',
    current: 'Sélectionnée',
    methods: {
      chatgpt: {
        title: 'Forfait ChatGPT',
        summary: 'Génère du texte avec l’utilisation incluse dans votre forfait ChatGPT.',
        requirements: [
          'Un abonnement ChatGPT Plus ou Pro, ou un espace de travail Business, Enterprise ou Edu. Les comptes gratuits ne permettent pas l’utilisation du forfait.',
          `L’application d’assistance ${PRODUCT_NAME} sur cet ordinateur.`,
        ],
        steps: [
          'Choisissez « Forfait ChatGPT » comme méthode.',
          'Choisissez « Continue with ChatGPT ». Sur la page qui s’ouvre, choisissez votre compte et autorisez l’accès.',
          'Pour un espace de travail Business, Enterprise ou Edu, choisissez plutôt « Se connecter via Codex », puis l’espace de travail.',
          'Revenez sur cette page ; le compte indique « Connecté · Prêt à générer du texte ». Choisissez ensuite un modèle.',
        ],
        notes: [
          'L’utilisation est décomptée des limites de votre forfait ChatGPT. Vous pouvez la suivre dans ChatGPT → Paramètres → Usage.',
          'Si vous venez de changer de forfait, son activation peut prendre quelques minutes.',
          '« Continue with ChatGPT » prend actuellement en charge les forfaits Plus et Pro ; sur les comptes professionnels, une stratégie de l’organisation le bloque. « Se connecter via Codex » utilise à la place la connexion de l’application Codex d’OpenAI. Cette méthode est expérimentale : OpenAI ne la documente pas pour d’autres applications et peut la modifier.',
          'Avec « Se connecter via Codex », l’utilisation est décomptée des limites de votre forfait, que ChatGPT partage avec Codex et d’autres fonctions professionnelles. Dans les espaces de travail Business, des crédits permettent de continuer une fois la limite hebdomadaire atteinte ; les propriétaires de l’espace de travail les ajoutent dans les paramètres de facturation.',
          'Vous pouvez retirer l’accès à tout moment dans ChatGPT → Paramètres → Security and login → Sign in with ChatGPT.',
        ],
      },
      'api-key': {
        title: 'Clé API',
        summary:
          'Génère du texte avec votre propre clé Groq, OpenRouter ou OpenAI, directement depuis ce navigateur. Aucune application d’assistance n’est nécessaire.',
        requirements: [
          'Une clé API Groq, OpenRouter ou OpenAI. Le forfait gratuit de Groq et les modèles gratuits d’OpenRouter ne demandent aucun moyen de paiement.',
        ],
        steps: [
          'Choisissez « Clé API » comme méthode, puis le fournisseur.',
          'Créez une clé sur le site du fournisseur (liens ci-dessous) et collez-la.',
          'Choisissez « Connecter la clé » et autorisez le navigateur à se connecter au fournisseur.',
          'Choisissez un modèle. Avec Groq, le modèle ouvert gratuit d’OpenAI openai/gpt-oss-120b est sélectionné pour vous.',
        ],
        notes: [
          'Le forfait gratuit de Groq a des limites par minute et par jour. Une longue conversation peut les dépasser ; retirez quelques messages du contexte ou réessayez plus tard.',
          'Sur OpenRouter, les modèles gratuits figurent en tête de liste. Vos paramètres de confidentialité OpenRouter déterminent quels fournisseurs peuvent recevoir votre texte ; certains modèles gratuits ne sont proposés que par des fournisseurs susceptibles de conserver les requêtes.',
          'L’utilisation payante est facturée par le fournisseur, séparément de tout abonnement ChatGPT ou Claude. Les modèles OpenAI sont toujours payants : vous choisissez donc le modèle vous-même.',
          'La clé est enregistrée chiffrée dans ce navigateur et envoyée uniquement à son fournisseur. Elle n’est plus jamais affichée ; pour la changer, connectez une nouvelle clé.',
          'Toute personne pouvant utiliser votre profil de navigateur peut générer du texte avec la clé enregistrée. Préférez une clé avec une limite de dépenses et supprimez-la sur les ordinateurs partagés.',
        ],
      },
      'claude-code': {
        title: 'Forfait Claude',
        summary: 'Utilise Claude Code sur votre ordinateur avec votre propre compte Claude.',
        requirements: [
          'Un abonnement Claude Pro, Max, Team ou Enterprise.',
          'Claude Code installé sur cet ordinateur et connecté à votre compte Claude.',
          `L’application d’assistance ${PRODUCT_NAME}. Installée après Claude Code, elle le trouve automatiquement.`,
        ],
        steps: [
          'Installez Claude Code en suivant les instructions officielles d’Anthropic.',
          'Dans un terminal, exécutez `claude` et connectez-vous à votre compte Claude avec `/login`.',
          'Installez l’application d’assistance ; si elle était déjà installée, réinstallez-la après Claude Code.',
          'Choisissez « Forfait Claude » comme méthode. Votre compte et votre forfait s’affichent ici.',
        ],
        notes: [
          `${PRODUCT_NAME} ne voit ni n’enregistre votre mot de passe ou votre session Claude ; vous vous connectez et vous déconnectez via Claude Code.`,
          'L’utilisation est décomptée de la limite de votre forfait, partagée avec Claude Code.',
          'Avec les forfaits Pro et Max, le contenu peut servir à entraîner des modèles, sauf si vous l’avez désactivé dans vos paramètres de confidentialité Claude. Les forfaits Team et Enterprise relèvent des conditions commerciales.',
          'Si Claude Code est connecté avec une clé API, l’utilisation est facturée à ce compte API.',
          'Cette méthode dépend des règles d’Anthropic pour les applications tierces et est proposée à titre expérimental. Elle peut cesser de fonctionner si ces règles changent.',
        ],
        linkLabel: 'Guide d’installation de Claude Code',
      },
    },
    helper: {
      title: 'Qu’est-ce que l’application d’assistance ?',
      summary:
        'Une petite application sur votre ordinateur, nécessaire aux forfaits ChatGPT et Claude ; les clés API fonctionnent sans elle.',
      requirements: ['macOS, Linux ou Windows. Aucun autre logiciel n’est nécessaire.'],
      steps: [
        'Ouvrez l’assistant de configuration depuis Paramètres → Application d’assistance et exécutez la commande d’une ligne qu’il affiche.',
        'L’application d’assistance apparaît comme connectée en quelques secondes ; choisissez ensuite une méthode ici.',
      ],
      notes: [
        'Les informations de connexion ChatGPT sont conservées dans un fichier protégé accessible à vous seul, pas dans le navigateur.',
        'L’application d’assistance ne s’exécute que lorsque vous demandez du texte ; elle ne lit ni n’envoie jamais d’e-mails en arrière-plan.',
      ],
    },
  },
  connect: 'Continue with ChatGPT',
  codexConnect: 'Se connecter via Codex',
  codexHint:
    'Pour les espaces de travail ChatGPT Business, Enterprise et Edu. Utilise la connexion de l’application Codex d’OpenAI ; Codex n’a pas besoin d’être installé. Expérimental.',
  codexSignIn: 'Connexion Codex',
  codexConnectionHelp:
    'Cette connexion utilise la connexion Codex. L’utilisation est décomptée des limites de votre forfait partagées avec Codex ; dans les espaces de travail Business, des crédits permettent de continuer une fois ces limites atteintes. Vous pouvez mettre fin à la session en supprimant le compte ici.',
  addAccount: 'Ajouter un autre compte ou espace de travail',
  reconnect: 'Se reconnecter',
  disconnect: 'Se déconnecter',
  account: 'Compte ChatGPT',
  activeAccount: 'Compte utilisé',
  useAccount: 'Utiliser ce compte',
  savedConnection: 'Compte connecté. Choisissez « Utiliser ce compte » pour générer avec lui.',
  renameAccount: 'Renommer',
  accountName: 'Nom de la connexion',
  accountNameHint:
    'Par exemple « Personnel » ou « Travail · Nom de l’entreprise ». Le nom reste sur cet appareil ; 80 caractères au maximum.',
  saveAccountName: 'Enregistrer le nom',
  removeAccount: 'Supprimer le compte',
  removeAccountTitle: 'Supprimer cette connexion ?',
  removeAccountBody:
    'L’enregistrement du compte et ses informations de connexion seront supprimés de cet appareil ; la révocation de la session OpenAI sera tentée si elle existe. Une connexion en cours sera annulée. Ajoutez à nouveau le compte pour l’utiliser plus tard. Votre compte ChatGPT ne sera pas supprimé.',
  confirmRemoveAccount: 'Supprimer',
  savedAccountHint:
    'Sélectionnez une connexion enregistrée pour la renommer ou la supprimer. Les boutons de connexion utilisent le compte et l’espace de travail de la connexion sélectionnée. Pour connecter un autre compte, utilisez le bouton d’ajout ci-dessous.',
  model: 'Modèle',
  refresh: 'Actualiser',
  checking: 'Vérification de la connexion…',
  signingIn: 'Terminez la connexion ChatGPT dans la fenêtre du navigateur.',
  cancel: 'Annuler',
  connected: 'Connecté · Prêt à générer du texte',
  disconnected: 'Déconnecté',
  registrationIncomplete:
    'La connexion du compte est incomplète ; ses informations n’ont pas encore été vérifiées. Réessayez « Continue with ChatGPT » avec le même compte et le même espace de travail que lors de la première tentative.',
  generationUnavailable:
    'Compte vérifié et autorisation du forfait accordée ; la génération de texte n’est pas encore prête. Choisissez « Actualiser » pour recharger la liste des modèles.',
  planDisabled:
    'Compte vérifié ; la génération n’est pas autorisée. L’utilisation du forfait nécessite un compte Plus ou Pro éligible et l’autorisation d’utiliser son forfait. Se connecter avec un compte gratuit ne donne pas accès à la génération.',
  planNote:
    'Les comptes Plus et Pro éligibles peuvent utiliser l’allocation de leur forfait avec « Continue with ChatGPT ». Pour les espaces de travail Business, Enterprise et Edu, utilisez « Se connecter via Codex ».',
  apiNote: (provider) =>
    `Votre clé est enregistrée chiffrée dans ce navigateur et envoyée uniquement à ${provider}. L’utilisation payante est facturée par ${provider}, séparément de tout abonnement ChatGPT ou Claude.`,
  claudeNote: `Claude Code, installé sur cet ordinateur, s’exécute avec votre propre compte Claude ; l’utilisation est décomptée des limites de votre forfait Claude. ${PRODUCT_NAME} n’accède pas à vos identifiants Claude et ne les enregistre pas. Vous vous connectez et vous déconnectez via Claude Code.`,
  claudeAccount: 'Compte Claude Code',
  claudeNotInstalled:
    'Claude Code est introuvable sur cet ordinateur. Installez Claude Code, exécutez à nouveau la commande d’installation de l’application d’assistance, puis choisissez « Actualiser ».',
  claudeNotLoggedIn:
    'Claude Code n’est pas connecté. Exécutez claude dans un terminal, connectez-vous avec /login, puis choisissez « Actualiser ».',
  claudeApiBilling:
    'Claude Code est connecté avec une autre méthode qu’un abonnement Claude, par exemple une clé API ; l’utilisation est facturée à ce compte.',
  claudePrivacy:
    'Lorsque vous demandez une génération, votre texte, vos consignes et le contexte sélectionné sont envoyés à Anthropic via Claude Code. Claude Code s’exécute sans outils, n’a pas accès à vos fichiers et ne conserve aucune transcription de session. Les forfaits Pro et Max relèvent des conditions grand public d’Anthropic : sauf si vous avez désactivé l’entraînement des modèles dans vos paramètres de confidentialité Claude, le contenu peut servir à l’entraînement. Les forfaits Team et Enterprise relèvent des conditions commerciales.',
  provider: 'Fournisseur',
  providerHints: {
    groq: 'Rapide, avec des modèles gratuits comme GPT-OSS d’OpenAI dans son forfait gratuit.',
    openrouter: 'Des centaines de modèles de nombreux fournisseurs ; certains sont gratuits.',
    openai: 'Les modèles GPT d’OpenAI ; paiement à l’usage.',
  },
  apiKeyLabel: (provider) => `Clé API ${provider}`,
  createKey: (provider) => `Créer une clé API ${provider}`,
  saveKey: 'Connecter la clé',
  removeKey: 'Supprimer la clé',
  keySaved: (provider) => `Clé ${provider} enregistrée, chiffrée dans ce navigateur.`,
  replaceKeyHint:
    'Pour utiliser une autre clé, collez-la et choisissez « Connecter la clé » ; elle remplace celle qui est enregistrée.',
  keyFromOtherProvider: (provider) =>
    `Cela ressemble à une clé ${provider} : elle n’a donc pas été envoyée. Choisissez ${provider} ci-dessus ou collez une clé du fournisseur sélectionné.`,
  accessNeeded: (provider) =>
    `Le navigateur n’autorise pas ${PRODUCT_NAME} à se connecter à ${provider}. Autorisez l’accès pour utiliser la clé enregistrée.`,
  grantAccess: 'Autoriser l’accès',
  freeModels: 'Modèles gratuits',
  paidModels: 'Modèles payants',
  apiPrivacy: (provider) =>
    `Lorsque vous demandez une génération, votre texte, vos consignes et le contexte sélectionné sont envoyés directement de ce navigateur à ${provider}, selon les conditions de ${provider}. La clé ne quitte ce navigateur que pour l’authentification auprès de ${provider}.`,
  manageUsage: 'Gérer l’utilisation',
  connectionHelp:
    'Gérez cette connexion dans les paramètres ChatGPT, sous Security and login → Sign in with ChatGPT. Elle n’apparaît pas dans Plugins. Les comptes professionnels sont aussi soumis à la stratégie de l’organisation et à l’éligibilité du forfait.',
  welcome: 'Vous utilisez votre forfait ChatGPT',
  welcomeBody: `La génération éligible dans ${PRODUCT_NAME} utilise l’allocation de votre forfait ChatGPT ou les crédits disponibles. Gérez l’utilisation de cette application dans les paramètres ChatGPT.`,
  gotIt: 'Compris',
  privacy:
    'Lorsque vous demandez une génération, votre texte, vos consignes et le contexte sélectionné sont envoyés à OpenAI. L’extension ne les enregistre pas sur le disque. Elle n’a pas accès à l’historique de vos conversations ChatGPT.',
  usePlan: 'Forfait ChatGPT utilisé',
  useApi: (provider) => `Clé API ${provider} utilisée`,
  useClaude: 'Forfait Claude utilisé',
  openSettings: 'Paramètres IA',
  notReady: 'Connectez un compte IA pour générer du texte',
};
