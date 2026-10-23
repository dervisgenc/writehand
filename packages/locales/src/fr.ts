import { PRODUCT_NAME } from '@writehand/contracts';

import { aiFr } from './ai-fr';
import type { ExtensionText } from './extension-text';
import { helperFr } from './helper-fr';
import { countWith } from './plural';
import { welcomeFr } from './welcome-fr';

const count = countWith('fr');

export const fr: ExtensionText = {
  description:
    'Corrigez, traduisez et rédigez vos e-mails dans Outlook sur le web et Gmail avec l’IA choisie. Aperçu d’abord ; rien n’est envoyé.',
  ui: {
    locale: 'fr',
    ai: aiFr,
    helper: helperFr,
    panelTitle: 'Assistant de rédaction',
    close: 'Fermer',
    threadLauncher: {
      label: 'Préparer une réponse',
      tooltip: 'Préparer une réponse à cette conversation et vérifier le contexte',
      dragHint: 'Faites glisser pour le déplacer.',
    },
    compose: {
      toolbarLabel: PRODUCT_NAME,
      reply: 'Rédiger la réponse',
      replyTooltip: 'Rédiger un brouillon de réponse à cette conversation à partir de votre consigne',
      write: 'Rédiger',
      writeTooltip: 'Décrivez ce que vous voulez dire et obtenez le texte de l’e-mail',
      revise: 'Corriger',
      reviseTooltip: 'Corriger le texte sélectionné ou le brouillon sans en changer le sens',
      translate: 'Traduire',
      translateTooltip: (language) => `Traduire en ${language}`,
      chooseLanguage: 'Choisir la langue de traduction',
      openPanel: 'Ouvrir le volet de l’assistant de rédaction',
    },
    inline: {
      titles: {
        reply: 'Brouillon de réponse',
        revise: 'Correction proposée',
        translate: 'Traduction',
        compose: 'Brouillon d’e-mail',
      },
      instructionLabel: 'Que voulez-vous dire ?',
      instructionPlaceholder: 'Ex. : remerciez et dites que jeudi à 14 h convient',
      write: 'Rédiger',
      contextChip: (n) => `Contexte · ${count(n, 'message', 'messages')}`,
      contextReading: 'Lecture du contexte…',
      openPanel: 'Ouvrir dans le volet',
      translatedTo: (language) => `${language}`,
      translateLanguage: 'Langue cible',
      translate: 'Traduire',
      translateAgain: 'Traduire dans cette langue',
    },
    operations: {
      revise: 'Corriger',
      translate: 'Traduire',
      reply: 'Préparer une réponse',
      compose: 'Rédiger',
    },
    prepareButton: {
      revise: 'Corriger',
      translate: 'Traduire',
      reply: 'Préparer une réponse',
      compose: 'Rédiger le texte',
    },
    target: {
      label: 'Cible',
      none: 'Aucun brouillon sélectionné — le résultat peut seulement être copié',
      composer: 'Brouillon ouvert',
      replyComposer: 'Brouillon de réponse ouvert',
      receivedMessage: 'Message reçu (lecture seule)',
      newReply: 'Nouvelle réponse à cet e-mail',
    },
    source: {
      textLabel: 'Texte',
      instructionLabel: 'Consigne de réponse',
      composeInstructionLabel: 'Que voulez-vous écrire ?',
      originLabel: 'Source',
      origins: {
        panel: 'Texte saisi ici',
        draft: 'Mon brouillon',
        'draft-selection': 'Texte sélectionné',
        'received-message': 'Sélection dans le message reçu',
      },
      edited: 'modifié',
      placeholders: {
        revise: 'Saisissez le texte à corriger ou reprenez-le du brouillon',
        translate: 'Saisissez le texte à traduire ou reprenez-le du brouillon',
        reply: 'Ex. : expliquez calmement que ce n’est pas le cas et proposez une réunion demain',
        compose: 'Ex. : proposez à l’équipe une courte réunion de projet jeudi à 14 h',
      },
      loadDraft: 'Reprendre le brouillon',
      loadSelection: 'Reprendre le texte sélectionné',
      loadReceivedSelection: 'Reprendre la sélection du message reçu',
      confirmReplace: 'Le texte du volet sera remplacé.',
      confirm: 'Remplacer',
      cancel: 'Annuler',
      characters: (n, limit) => `${n.toLocaleString('fr-FR')} / ${limit.toLocaleString('fr-FR')}`,
    },
    options: {
      targetLanguage: 'Langue cible',
      tone: 'Ton',
      tones: { neutral: 'Neutre', formal: 'Formel', friendly: 'Amical' },
      useConversation: 'Utiliser aussi la conversation',
      languagePlaceholder: 'Choisissez ou saisissez une langue',
      otherLanguage: 'Autre langue…',
      manageLanguages: 'Modifier les langues',
    },
    context: {
      title: 'Contexte',
      summary: (included, total) => `${count(included, 'message utilisé', 'messages utilisés')} sur ${total}`,
      refresh: 'Relire la conversation',
      read: 'Lire la conversation',
      reading: 'Lecture de la conversation…',
      notLoaded: 'La conversation n’a pas encore été lue.',
      stale: 'La conversation contient du nouveau contenu. Relisez-la avant de préparer avec ce contexte.',
      activeLocked: 'Le message auquel vous répondez ne peut pas être retiré du contexte.',
      chooseReplyTarget:
        'Choisissez le message auquel répondre. Il n’a pas pu être déterminé de façon fiable à l’écran.',
      replyTarget: 'Répondre à ce message',
      unknownSender: 'L’expéditeur n’a pas pu être lu',
      currentGroup: 'Cette conversation',
      otherGroup: (n) => `Autres e-mails ouverts (${n})`,
      otherHint: 'E-mails ouverts dans d’autres conversations. Cochez-en un pour l’ajouter au contexte.',
      includeMessage: (sender) => `Utiliser le message de ${sender} dans le contexte`,
      replyTargetBadge: 'Réponse à',
      editedBadge: 'Modifié',
      showBody: 'Afficher le texte',
      hideBody: 'Masquer le texte',
      edit: 'Modifier',
      editLabel: 'Texte utilisé dans le contexte',
      save: 'Enregistrer',
      cancelEdit: 'Annuler',
      resetEdit: 'Rétablir l’original',
      omittedBlock: { signature: 'Signature retirée', quote: 'Citation répétée retirée' },
      includeBlock: 'Inclure à nouveau',
      counted: {
        'message-count': (n) => `Le contexte contient ${count(n, 'message', 'messages')}.`,
        'collapsed-unread': (n) =>
          `${count(n, 'message est réduit', 'messages sont réduits')} ; le contenu n’a pas été lu.`,
        'user-excluded': (n) => `Vous avez retiré ${count(n, 'message', 'messages')} du contexte.`,
        'other-conversations': (n) =>
          `${count(n, 'message a été ajouté', 'messages ont été ajoutés')} depuis d’autres conversations.`,
        'user-edited': (n) => `Vous avez modifié le texte de ${count(n, 'message', 'messages')}.`,
        'message-limited': (n) =>
          `${count(n, 'message plus ancien a été omis', 'messages plus anciens ont été omis')} en raison de la limite de messages.`,
        'size-limited': (n) =>
          `${count(n, 'message plus ancien a été omis', 'messages plus anciens ont été omis')} en raison de la limite de longueur.`,
        'signature-removed': (n) =>
          `${count(n, 'signature a été retirée', 'signatures ont été retirées')} du contexte.`,
        'duplicate-quote-removed': (n) =>
          `${count(n, 'citation répétée a été retirée', 'citations répétées ont été retirées')} du contexte.`,
      },
      plain: {
        'collapsed-unknown':
          'Certains messages sont peut-être réduits ; leur nombre n’a pas pu être déterminé.',
        'coverage-unverified':
          'Seuls les messages ouverts à l’écran sont utilisés ; l’accès à toute la conversation ne peut pas être vérifié.',
        'open-item-only': 'Seuls l’e-mail ouvert et les messages précédents qu’il cite sont utilisés.',
        'virtualized-content': 'Certains messages ne sont peut-être pas encore chargés à l’écran.',
        'read-limit': 'Certains messages n’ont pas été lus en raison de la limite de lecture.',
        'display-order-used':
          'Les dates manquent ; les messages sont utilisés dans l’ordre affiché à l’écran.',
      },
    },
    preview: {
      title: 'Résultat',
      regenerate: 'Régénérer',
      sampleLabel: 'Exemple de résultat — mode développement',
      sampleShort: 'Exemple',
      stale: 'La source a changé. Cet aperçu peut être copié, mais pas appliqué au brouillon.',
      unchanged: 'Aucune modification du texte.',
      editSource: 'Modifier la source',
      showFormatted: 'Afficher la mise en forme',
    },
    refine: {
      title: 'Modifier le résultat',
      kinds: {
        table: 'En tableau',
        list: 'En liste à puces',
        chart: 'Ajouter un graphique',
        shorter: 'Raccourcir',
        formal: 'Plus formel',
        friendly: 'Plus chaleureux',
      },
      customLabel: 'Modification à apporter au résultat',
      customPlaceholder: 'Demandez une autre modification, ex. : supprimer le dernier paragraphe',
      customSubmit: 'Appliquer la modification',
    },
    apply: {
      scopeLabel: 'Partie qui sera modifiée',
      scopes: {
        'replace-selection': 'Texte sélectionné',
        'replace-body': 'Votre texte rédigé (la signature et les messages précédents sont conservés)',
        'insert-empty': 'Zone de réponse vide',
        'create-reply': 'Une nouvelle réponse à cet e-mail, ouverte en brouillon',
      },
      noTarget: 'Aucun brouillon ne peut être modifié directement',
      formattingNote:
        'Le résultat est inséré en texte brut ; la mise en forme de la partie modifiée peut être perdue.',
      copy: 'Copier',
      apply: 'Appliquer au brouillon',
      undo: 'Annuler la dernière application',
      replaceExistingReply: 'Remplacer le texte de réponse existant',
      useOpenComposer: 'Utiliser ce brouillon de réponse',
      createReply: 'Ouvrir une réponse avec ce texte',
    },
    status: {
      reading: 'Lecture…',
      preparing: 'Préparation…',
      applying: 'Écriture dans le brouillon…',
      undoing: 'Annulation…',
      applied: 'Texte inséré dans le brouillon. Non envoyé ; la vérification finale vous revient.',
      undone: 'La dernière application a été annulée.',
      copied: 'Copié dans le Presse-papiers.',
      retry: 'Réessayer',
      dismiss: 'Fermer',
    },
    errors: {
      PAGE_UNSUPPORTED: 'Cet écran n’est pas pris en charge.',
      PAGE_NOT_READY: 'La zone de messagerie n’est pas encore prête.',
      THREAD_CHANGED:
        'La conversation a changé. Ce résultat ne peut pas être appliqué à la conversation ouverte.',
      ACCOUNT_CHANGED: 'Le compte a changé ; le travail précédent a été effacé.',
      TARGET_MISSING: 'Le brouillon sélectionné a été fermé ou est introuvable.',
      TARGET_CHANGED: 'Le brouillon a changé après le début de l’action. Reprenez la source.',
      SELECTION_INVALID: 'La partie sélectionnée n’est plus la même. Sélectionnez-la à nouveau.',
      SOURCE_EMPTY: 'Le texte ou la consigne est vide.',
      SOURCE_TOO_LARGE: 'Le texte est trop long ; sélectionnez une partie plus courte.',
      CONTEXT_TOO_LARGE: 'Le contexte sélectionné est trop long. Retirez quelques messages.',
      CONTEXT_REQUIRED:
        'Aucun message auquel répondre n’a été déterminé. Lisez la conversation ou sélectionnez un message.',
      CONTEXT_STALE: 'La conversation contient du nouveau contenu. Relisez-la d’abord.',
      LANGUAGE_REQUIRED: 'Sélectionnez une langue cible.',
      RESULT_INVALID: 'Le résultat n’appartient pas à cette action, est vide ou est trop volumineux.',
      RESULT_UNCHANGED: 'Aucune modification du texte.',
      PREVIEW_STALE: 'La source a changé. L’aperçu peut être copié, mais pas appliqué au brouillon.',
      SETTINGS_CONFLICT:
        'Les paramètres ont été modifiés dans un autre écran ; les paramètres les plus récents ont été chargés.',
      SETTINGS_INVALID:
        'Les paramètres enregistrés n’ont pas pu être lus ; les valeurs par défaut sont utilisées.',
      READ_TIMEOUT: 'Le contenu de la page n’a pas pu être lu. Réessayez.',
      READ_CANCELLED: 'La lecture a été annulée.',
      WRITE_UNSUPPORTED:
        'L’écriture sécurisée dans cet éditeur n’a pas pu être vérifiée. Vous pouvez copier le résultat.',
      WRITE_UNCERTAIN:
        'Impossible de vérifier que le texte a été inséré. Vérifiez le brouillon ; l’action n’a pas été répétée.',
      REPLY_TOO_LARGE:
        'Le résultat est trop long pour être ouvert comme réponse. Copiez-le et collez-le dans une réponse.',
      UNDO_INVALID:
        'Le brouillon a été modifié ensuite ; l’annulation automatique a été désactivée pour protéger votre texte.',
      CLIPBOARD_UNAVAILABLE:
        'Le navigateur n’a pas autorisé l’écriture dans le Presse-papiers. Sélectionnez le texte et appuyez sur Ctrl+C.',
      EXTENSION_RELOADED: 'L’extension a été mise à jour. Rechargez la page pour continuer.',
      PROCESSING_UNAVAILABLE:
        'Le traitement du texte n’est pas encore connecté. Cette version ne corrige, ne traduit et ne rédige rien.',
      AI_HOST_UNAVAILABLE:
        'L’application d’assistance n’est pas connectée. Ouvrez Paramètres → Application d’assistance pour l’installer ou la connecter.',
      AI_NOT_CONNECTED: 'La session IA est absente ou expirée. Reconnectez-vous dans les paramètres IA.',
      AI_AUTH_FAILED: 'La connexion ChatGPT n’a pas pu être vérifiée ou a expiré. Réessayez.',
      AI_AUTH_EXCHANGE_FAILED:
        'OpenAI n’a pas accepté le code de connexion. Lancez une nouvelle tentative avec « Continue with ChatGPT » ; ne rechargez pas l’ancien onglet de retour.',
      AI_AUTH_TOKEN_INVALID:
        'La réponse d’OpenAI ne contient pas les données de session requises ou a un format inattendu. Le compte n’a pas été connecté (AI_AUTH_TOKEN_INVALID).',
      AI_AUTH_IDENTITY_FAILED:
        'La réponse d’identité d’OpenAI n’a pas pu être vérifiée de façon sûre. Le compte n’a pas été connecté (AI_AUTH_IDENTITY_FAILED).',
      AI_AUTH_CANCELLED: 'La connexion ChatGPT a été annulée.',
      AI_POLICY_DENIED:
        'Une stratégie de l’organisation bloque « Sign in with ChatGPT » pour cette application. Les espaces de travail ChatGPT Business n’ont actuellement aucun paramètre pour l’autoriser ; utilisez plutôt « Se connecter via Codex ». Avec Enterprise et Edu, un administrateur global peut approuver l’application dans l’OpenAI Admin Console, sous External access.',
      AI_WORKSPACE_MISMATCH:
        'Cette connexion appartient à un autre compte ou espace de travail ChatGPT. Continuez avec le compte qui l’a créée ou choisissez « Ajouter un autre compte ou espace de travail ».',
      AI_ACCOUNT_NAME_TAKEN: 'Une autre connexion utilise déjà ce nom. Choisissez un nom distinct.',
      AI_PLAN_REQUIRED:
        'Cette connexion n’a pas l’autorisation du forfait ChatGPT. La génération nécessite un compte Plus ou Pro éligible et l’autorisation du forfait ; se connecter avec un compte gratuit ne suffit pas.',
      AI_NOT_ELIGIBLE:
        'OpenAI a refusé l’utilisation du forfait ChatGPT pour ce compte (subscription_sharing_user_not_eligible). Si votre abonnement Plus ou Pro est actif, contactez l’assistance OpenAI avec ce code.',
      AI_ACCESS_DENIED:
        'Le fournisseur d’IA a refusé l’accès à cette requête. Vérifiez les autorisations de l’application, la configuration de la connexion ou les restrictions régionales ; pour un forfait ChatGPT, cette erreur seule ne prouve rien sur l’éligibilité de l’abonnement.',
      AI_LIMIT_REACHED:
        'Limite d’utilisation atteinte. Pour ChatGPT, ouvrez « Gérer l’utilisation » pour voir quand elle est réinitialisée ; les espaces de travail peuvent aussi continuer avec des crédits. Avec un forfait Claude, réessayez quand votre limite est réinitialisée ; pour une clé API, patientez un instant ou vérifiez vos limites auprès du fournisseur.',
      AI_CREDITS_EXHAUSTED:
        'Plus aucun crédit. Pour un espace de travail ChatGPT, ses propriétaires peuvent ajouter des crédits ou relever la limite de dépenses dans les paramètres de facturation ; avec une clé API, ajoutez des crédits ou relevez la limite de dépenses auprès du fournisseur.',
      AI_UNAVAILABLE:
        'Le service d’IA est actuellement indisponible. Votre connexion est conservée ; réessayez plus tard.',
      AI_NETWORK: 'Impossible de joindre le service d’IA. Vérifiez votre connexion Internet et réessayez.',
      AI_MODEL_UNAVAILABLE:
        'Le modèle sélectionné est indisponible. Actualisez les modèles dans les paramètres IA.',
      AI_RESPONSE_INCOMPLETE:
        'La réponse n’a pas abouti. Aucun texte partiel n’a été appliqué ; vous pouvez réessayer.',
      AI_REVOKE_UNCONFIRMED:
        'Déconnecté localement ; la révocation chez OpenAI n’a pas pu être confirmée. Déconnectez l’application dans les paramètres ChatGPT.',
      AI_BUSY: 'Une opération de connexion IA est en cours. Patientez ou annulez la connexion.',
      AI_KEY_INVALID:
        'Le fournisseur n’a pas accepté cette clé API. Vérifiez que vous l’avez copiée en entier et qu’elle est toujours active, ou créez-en une nouvelle.',
      AI_PROVIDER_ACCESS_REQUIRED: `${PRODUCT_NAME} a besoin de votre autorisation pour se connecter au fournisseur. Choisissez de nouveau « Connecter la clé » et autorisez l’accès quand le navigateur le demande.`,
      AI_KEY_STORAGE_FAILED:
        'Ce navigateur n’a pas pu enregistrer ou lire la clé de façon sécurisée ; rien n’a été enregistré. Vérifiez que le navigateur conserve les données de site des extensions, puis réessayez.',
      AI_REQUEST_TOO_LARGE:
        'Cette requête dépasse ce que le fournisseur autorise pour ce modèle ou ce forfait. Retirez quelques messages du contexte, raccourcissez le texte ou choisissez un autre modèle.',
      AI_CLAUDE_NOT_INSTALLED:
        'Claude Code est introuvable. Installez Claude Code, puis exécutez à nouveau la commande d’installation de l’application d’assistance.',
      AI_CLAUDE_NOT_LOGGED_IN:
        'Claude Code n’est pas connecté. Exécutez claude dans un terminal et connectez-vous avec /login.',
      AI_CLAUDE_UNSUPPORTED_INSTALL: `Claude Code n’a été trouvé que sous forme de script de commandes (claude.cmd), que ${PRODUCT_NAME} ne peut pas lancer en toute sécurité. Installez Claude Code avec le programme d’installation natif officiel, puis exécutez à nouveau la commande d’installation de l’application d’assistance.`,
      AI_VERSION_MISMATCH:
        'L’application d’assistance est plus ancienne que cette extension. Mettez-la à jour dans Paramètres → Application d’assistance.',
      HOST_UPDATE_CHECK_FAILED:
        'Impossible de vérifier si une nouvelle version de l’application d’assistance existe. Vérifiez votre connexion Internet et réessayez plus tard.',
      HOST_UPDATE_FAILED:
        'La mise à jour n’a pas pu être téléchargée ou installée ; la version installée n’a pas changé. Réessayez plus tard ou exécutez à nouveau la commande d’installation.',
      HOST_UPDATE_UNVERIFIED:
        'La mise à jour téléchargée n’a pas pu être vérifiée ; rien n’a été installé. La version installée continue de fonctionner.',
      CONTENT_SCRIPT_UNREACHABLE:
        'L’extension ne peut pas atteindre cet onglet. Vérifiez l’accès au site ou rechargez la page.',
      MESSAGE_REJECTED: 'Un message d’extension non valide a été refusé.',
      UNEXPECTED: 'Une erreur inattendue s’est produite. Votre texte est conservé.',
    },
  },
  popup: {
    title: PRODUCT_NAME,
    statuses: {
      ready: 'L’assistant de rédaction est disponible sur cette page.',
      waiting: 'Chargement de la zone de messagerie…',
      unsupported: 'La zone de messagerie de cet écran n’a pas été reconnue.',
      disabled: 'L’extension est désactivée pour ce site. Vous pouvez l’activer dans les paramètres.',
      'not-mail-site': 'Cet onglet n’est pas un site de messagerie pris en charge.',
      unreachable:
        'L’extension ne peut pas atteindre cet onglet. Vérifiez l’accès au site ou rechargez la page.',
      checking: 'Vérification de la page…',
    },
    openPanel: 'Ouvrir le volet sur cette page',
    openSettings: 'Paramètres',
    siteAccessMissing: 'L’accès à ce site n’a pas été accordé.',
    developmentBuild: 'Version de développement',
    setupNeeded: `Choisissez comment ${PRODUCT_NAME} se connecte à un fournisseur d’IA pour commencer à écrire.`,
    finishSetup: 'Terminer la configuration',
  },
  options: {
    title: `Paramètres de ${PRODUCT_NAME}`,
    subtitle: 'Assistant de rédaction pour Outlook sur le web et Gmail',
    preferencesTitle: 'Préférences de rédaction',
    preferencesDescription: 'Langue, ton et apparence utilisés pour les nouveaux travaux.',
    uiLanguage: 'Langue de l’interface',
    uiLanguageAuto: 'Automatique (langue du navigateur)',
    targetLanguage: 'Langue de traduction par défaut',
    targetLanguageHint:
      'Le bouton « Traduire » traduit dans cette langue. Choisissez dans la liste ou saisissez le nom d’une langue.',
    favoriteLanguages: 'Langues du menu Traduire',
    favoriteLanguagesHint:
      'Langues que vous pouvez choisir rapidement dans le menu « Traduire ». Saisissez un nom pour ajouter une langue absente de la liste.',
    addLanguage: 'Ajouter',
    removeLanguage: (language) => `Retirer ${language}`,
    favoritesFull: 'Vous pouvez ajouter jusqu’à 10 langues.',
    languagesTitle: 'Langues',
    languagesDescription: 'Langue de l’interface, langue de traduction et langues du menu Traduire.',
    instructionsTitle: 'Consignes permanentes',
    instructionsDescription:
      'Ajoutées à chaque demande de rédaction, de réponse, de correction et de traduction. Si votre consigne pour une demande les contredit, c’est elle qui l’emporte.',
    instructionsLabel: 'Vos préférences de rédaction',
    instructionsPlaceholder:
      'Par exemple : adopter un ton formel et professionnel. Paragraphes courts. Commencer par « Madame, Monsieur » et terminer par « Cordialement ».',
    instructionsExamplesLabel: 'Ajout rapide',
    instructionsExamples: [
      'Adopter un ton formel et professionnel.',
      'Être bref et direct ; éviter les formules d’introduction inutiles.',
      'Adopter un ton aimable mais professionnel.',
      'Terminer l’e-mail par « Cordialement ».',
      'Éviter le jargon, sauf s’il est expliqué.',
    ],
    instructionsCount: (count, limit) => `${count}/${limit}`,
    tone: 'Ton par défaut',
    theme: 'Thème',
    themes: { system: 'Automatique (comme votre messagerie)', light: 'Clair', dark: 'Sombre' },
    themeOptions: { system: 'Automatique', light: 'Clair', dark: 'Sombre' },
    themeHint:
      'En mode Automatique, le volet suit le thème de votre messagerie et cette page suit le thème de votre système.',
    siteNames: { 'outlook-web': 'Outlook sur le web', 'gmail-web': 'Gmail' },
    siteEnabled: (site) => `Afficher l’assistant de rédaction dans ${site}`,
    siteEnabledHint: (site) => `Désactivé, les boutons et le volet sont masqués dans ${site}.`,
    unsaved: 'Vous avez des modifications non enregistrées.',
    save: 'Enregistrer',
    saved: 'Paramètres enregistrés.',
    saving: 'Enregistrement…',
    defaultsNote:
      'La langue et le ton par défaut ne modifient pas le travail en cours ; ils s’appliquent au travail suivant.',
    privacyTitle: 'Confidentialité et données',
    privacyDescription: `Ce que ${PRODUCT_NAME} fait et ne fait pas avec vos e-mails.`,
    privacyPoints: [
      'Vos préférences sont enregistrées uniquement sur cet appareil.',
      'Les e-mails que vous ouvrez restent en mémoire uniquement tant que la page est ouverte, pour suggérer du contexte ; ils ne sont jamais écrits sur le disque.',
      'Le texte est envoyé au fournisseur d’IA choisi (OpenAI, Anthropic, Groq ou OpenRouter) uniquement quand vous choisissez Corriger, Traduire ou Rédiger la réponse.',
      'Une clé API connectée est enregistrée chiffrée dans ce navigateur et envoyée uniquement à son fournisseur.',
      'Les résultats s’affichent d’abord en aperçu et ne sont jamais écrits dans votre brouillon sans votre accord.',
      `${PRODUCT_NAME} n’envoie jamais d’e-mail ; l’envoi reste toujours votre décision.`,
      'Tant que la recherche de mises à jour est active, l’application d’assistance demande à GitHub le dernier numéro de version au plus une fois par jour ; la requête ne contient ni e-mail ni informations de compte. Vous pouvez la désactiver sur la carte de l’application d’assistance.',
    ],
  },
  welcome: welcomeFr,
};
