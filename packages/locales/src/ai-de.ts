import { PRODUCT_NAME } from '@writehand/contracts';
import type { AiText } from '@writehand/ui';

export const aiDe: AiText = {
  title: 'KI-Verbindung',
  description:
    'Schreiben Sie E-Mails mit Ihrem eigenen API-Schlüssel von Groq, OpenRouter oder OpenAI, Ihrem ChatGPT-Plan oder Claude Code auf diesem Computer.',
  chatgpt: 'ChatGPT-Plan',
  apiKey: 'API-Schlüssel',
  claudeCode: 'Claude-Plan',
  methodHints: {
    chatgpt: 'Mit Ihrem Plus-, Pro- oder Business-Plan',
    'api-key': 'Groq, OpenRouter oder OpenAI; auch kostenlose Modelle',
    'claude-code': 'Mit Claude Code auf diesem Computer',
  },
  methodLabel: 'Verbindungsmethode',
  recommended: 'Empfohlen',
  experimental: 'Experimentell',
  needsHelper: 'Benötigt die Hilfs-App',
  helperRequired: `Diese Methode läuft in der ${PRODUCT_NAME}-Hilfs-App, die noch nicht verbunden ist. Installieren Sie sie mit dem Einrichtungsassistenten oder wählen Sie „API-Schlüssel“, das ohne sie funktioniert.`,
  statusReady: 'Bereit',
  statusSetup: 'Einrichtung nötig',
  statusAction: 'Verbindung nötig',
  guide: {
    title: 'Verbindungsanleitung',
    intro:
      'Richten Sie eine der folgenden Methoden ein, um Text zu erstellen. Jeder Abschnitt nennt, was Sie brauchen und welche Schritte nötig sind.',
    requirementsLabel: 'Sie brauchen',
    stepsLabel: 'Schritte',
    notesLabel: 'Gut zu wissen',
    current: 'Ausgewählt',
    methods: {
      chatgpt: {
        title: 'ChatGPT-Plan',
        summary: 'Erstellt Text mit der Nutzung, die in Ihrem ChatGPT-Plan enthalten ist.',
        requirements: [
          'Ein ChatGPT-Plus- oder -Pro-Abo oder ein Business-, Enterprise- oder Edu-Arbeitsbereich. Kostenlose Konten unterstützen keine Plannutzung.',
          `Die ${PRODUCT_NAME}-Hilfs-App auf diesem Computer.`,
        ],
        steps: [
          'Wählen Sie „ChatGPT-Plan“ als Methode.',
          'Wählen Sie „Continue with ChatGPT“. Wählen Sie auf der geöffneten Seite Ihr Konto und erlauben Sie den Zugriff.',
          'Bei einem Business-, Enterprise- oder Edu-Arbeitsbereich wählen Sie stattdessen „Über Codex anmelden“ und dann den Arbeitsbereich.',
          'Kehren Sie zu dieser Seite zurück; beim Konto steht „Verbunden · Bereit zur Texterstellung“. Wählen Sie dann ein Modell.',
        ],
        notes: [
          'Die Nutzung wird auf die Limits Ihres ChatGPT-Plans angerechnet. Sie können sie unter ChatGPT → Einstellungen → Usage verfolgen.',
          'Wenn Sie Ihren Plan gerade erst hochgestuft haben, kann die Aktivierung einige Minuten dauern.',
          '„Continue with ChatGPT“ unterstützt derzeit Plus- und Pro-Pläne; bei Arbeitskonten blockiert eine Organisationsrichtlinie die Verbindung. „Über Codex anmelden“ verwendet stattdessen die Anmeldung der Codex-App von OpenAI. Diese Methode ist experimentell: OpenAI dokumentiert sie nicht für andere Apps und kann sie ändern.',
          'Mit „Über Codex anmelden“ wird die Nutzung auf die Limits Ihres Plans angerechnet, die ChatGPT mit Codex und anderen Arbeitsfunktionen teilt. In Business-Arbeitsbereichen können Credits die Nutzung fortsetzen, wenn das Wochenlimit erreicht ist; Inhaber des Arbeitsbereichs fügen sie in den Abrechnungseinstellungen hinzu.',
          'Sie können den Zugriff jederzeit unter ChatGPT → Einstellungen → Security and login → Sign in with ChatGPT entfernen.',
        ],
      },
      'api-key': {
        title: 'API-Schlüssel',
        summary:
          'Erstellt Text mit Ihrem eigenen Schlüssel von Groq, OpenRouter oder OpenAI, direkt aus diesem Browser. Eine Hilfs-App ist nicht nötig.',
        requirements: [
          'Ein API-Schlüssel von Groq, OpenRouter oder OpenAI. Der kostenlose Plan von Groq und die kostenlosen Modelle von OpenRouter brauchen keine Zahlungsmethode.',
        ],
        steps: [
          'Wählen Sie „API-Schlüssel“ als Methode und dann den Anbieter.',
          'Erstellen Sie auf der Website des Anbieters einen Schlüssel (Links unten) und fügen Sie ihn ein.',
          'Wählen Sie „Schlüssel verbinden“ und erlauben Sie dem Browser die Verbindung zum Anbieter.',
          'Wählen Sie ein Modell. Bei Groq wird OpenAIs kostenloses Open-Weight-Modell openai/gpt-oss-120b für Sie ausgewählt.',
        ],
        notes: [
          'Der kostenlose Plan von Groq hat Limits pro Minute und pro Tag. Ein langer E-Mail-Verlauf kann sie überschreiten; entfernen Sie einige Kontextnachrichten oder versuchen Sie es später erneut.',
          'Bei OpenRouter stehen kostenlose Modelle oben in der Liste. Ihre OpenRouter-Datenschutzeinstellungen bestimmen, welche Anbieter Ihren Text erhalten dürfen; manche kostenlosen Modelle bieten nur Anbieter an, die Eingaben speichern können.',
          'Kostenpflichtige Nutzung rechnet der Anbieter ab, getrennt von einem ChatGPT- oder Claude-Abo. OpenAI-Modelle sind immer kostenpflichtig, daher wählen Sie das Modell selbst.',
          'Der Schlüssel wird verschlüsselt in diesem Browser gespeichert und nur an seinen Anbieter gesendet. Er wird nie wieder angezeigt; um ihn zu ändern, verbinden Sie einen neuen Schlüssel.',
          'Wer Ihr Browserprofil nutzen kann, kann mit dem gespeicherten Schlüssel Text erstellen. Verwenden Sie am besten einen Schlüssel mit Ausgabenlimit und entfernen Sie ihn auf gemeinsam genutzten Computern.',
        ],
      },
      'claude-code': {
        title: 'Claude-Plan',
        summary: 'Verwendet Claude Code auf Ihrem Computer mit Ihrem eigenen Claude-Konto.',
        requirements: [
          'Ein Claude-Pro-, -Max-, -Team- oder -Enterprise-Abo.',
          'Claude Code auf diesem Computer installiert und mit Ihrem Claude-Konto angemeldet.',
          `Die ${PRODUCT_NAME}-Hilfs-App. Nach Claude Code installiert, findet sie Claude Code automatisch.`,
        ],
        steps: [
          'Installieren Sie Claude Code nach der offiziellen Anleitung von Anthropic.',
          'Führen Sie in einem Terminal `claude` aus und melden Sie sich mit `/login` bei Ihrem Claude-Konto an.',
          'Installieren Sie die Hilfs-App; wenn sie schon installiert war, installieren Sie sie nach Claude Code erneut.',
          'Wählen Sie „Claude-Plan“ als Methode. Ihr Konto und Ihr Plan erscheinen hier.',
        ],
        notes: [
          `${PRODUCT_NAME} sieht und speichert weder Ihr Claude-Passwort noch Ihre Sitzung; Sie melden sich über Claude Code an und ab.`,
          'Die Nutzung wird auf das Limit Ihres Plans angerechnet, das Sie mit Claude Code teilen.',
          'Bei Pro- und Max-Plänen können Inhalte zum Training von Modellen verwendet werden, sofern Sie dies nicht in Ihren Claude-Datenschutzeinstellungen ausgeschaltet haben. Team- und Enterprise-Pläne unterliegen den geschäftlichen Bedingungen.',
          'Ist Claude Code mit einem API-Schlüssel angemeldet, wird die Nutzung diesem API-Konto berechnet.',
          'Diese Methode hängt von Anthropics Regeln für Drittanbieter-Apps ab und wird als experimentell angeboten. Sie kann aufhören zu funktionieren, wenn sich diese Regeln ändern.',
        ],
        linkLabel: 'Einrichtungsanleitung für Claude Code',
      },
    },
    helper: {
      title: 'Was ist die Hilfs-App?',
      summary:
        'Eine kleine App auf Ihrem Computer, die der ChatGPT- und der Claude-Plan benötigen; API-Schlüssel funktionieren ohne sie.',
      requirements: ['macOS, Linux oder Windows. Weitere Software ist nicht nötig.'],
      steps: [
        'Öffnen Sie über Einstellungen → Hilfs-App den Einrichtungsassistenten und führen Sie den angezeigten einzeiligen Befehl aus.',
        'Nach wenigen Sekunden erscheint die Hilfs-App als verbunden; wählen Sie dann hier eine Methode.',
      ],
      notes: [
        'ChatGPT-Anmeldedaten liegen in einer geschützten Datei, auf die nur Sie zugreifen können, nicht im Browser.',
        'Die Hilfs-App läuft nur, wenn Sie Text anfordern; sie liest oder sendet nie im Hintergrund E-Mails.',
      ],
    },
  },
  connect: 'Continue with ChatGPT',
  codexConnect: 'Über Codex anmelden',
  codexHint:
    'Für ChatGPT-Business-, -Enterprise- und -Edu-Arbeitsbereiche. Verwendet die Anmeldung der Codex-App von OpenAI; Codex muss nicht installiert sein. Experimentell.',
  codexSignIn: 'Codex-Anmeldung',
  codexConnectionHelp:
    'Diese Verbindung verwendet die Codex-Anmeldung. Die Nutzung wird auf die mit Codex geteilten Limits Ihres Plans angerechnet; in Business-Arbeitsbereichen können Credits die Nutzung danach fortsetzen. Sie beenden die Sitzung, indem Sie das Konto hier entfernen.',
  addAccount: 'Anderes Konto oder anderen Arbeitsbereich hinzufügen',
  reconnect: 'Neu verbinden',
  disconnect: 'Trennen',
  account: 'ChatGPT-Konto',
  activeAccount: 'Verwendetes Konto',
  useAccount: 'Dieses Konto verwenden',
  savedConnection: 'Konto verbunden. Wählen Sie „Dieses Konto verwenden“, um damit Text zu erstellen.',
  renameAccount: 'Umbenennen',
  accountName: 'Name der Verbindung',
  accountNameHint:
    'Zum Beispiel „Privat“ oder „Arbeit · Firmenname“. Der Name gilt nur auf diesem Gerät; bis zu 80 Zeichen.',
  saveAccountName: 'Namen speichern',
  removeAccount: 'Konto entfernen',
  removeAccountTitle: 'Diese Verbindung entfernen?',
  removeAccountBody:
    'Der Kontoeintrag und die Anmeldedaten werden von diesem Gerät entfernt; falls vorhanden, wird versucht, die OpenAI-Sitzung zu widerrufen. Eine laufende Anmeldung wird abgebrochen. Fügen Sie das Konto erneut hinzu, um es später zu verwenden. Ihr ChatGPT-Konto wird nicht gelöscht.',
  confirmRemoveAccount: 'Entfernen',
  savedAccountHint:
    'Wählen Sie eine gespeicherte Verbindung, um sie umzubenennen oder zu entfernen. Die Anmeldeschaltflächen verwenden Konto und Arbeitsbereich der ausgewählten Verbindung. Für ein weiteres Konto verwenden Sie die Schaltfläche zum Hinzufügen unten.',
  model: 'Modell',
  refresh: 'Aktualisieren',
  checking: 'Verbindung wird geprüft…',
  signingIn: 'Schließen Sie die ChatGPT-Anmeldung im Browserfenster ab.',
  cancel: 'Abbrechen',
  connected: 'Verbunden · Bereit zur Texterstellung',
  disconnected: 'Abgemeldet',
  registrationIncomplete:
    'Die Kontoverbindung ist unvollständig; die Kontodaten wurden noch nicht bestätigt. Versuchen Sie „Continue with ChatGPT“ erneut mit demselben Konto und Arbeitsbereich wie beim ersten Versuch.',
  generationUnavailable:
    'Konto bestätigt und Planberechtigung erteilt; die Texterstellung ist noch nicht bereit. Wählen Sie „Aktualisieren“, um die Modellliste neu zu laden.',
  planDisabled:
    'Konto bestätigt; die Texterstellung ist nicht berechtigt. Die Plannutzung erfordert ein berechtigtes Plus- oder Pro-Konto und die Erlaubnis, dessen Plan zu verwenden. Die Anmeldung mit einem kostenlosen Konto gewährt keinen Zugang zur Texterstellung.',
  planNote:
    'Berechtigte Plus- und Pro-Konten können ihr Plankontingent mit „Continue with ChatGPT“ nutzen. Für Business-, Enterprise- und Edu-Arbeitsbereiche verwenden Sie „Über Codex anmelden“.',
  apiNote: (provider) =>
    `Ihr Schlüssel wird verschlüsselt in diesem Browser gespeichert und nur an ${provider} gesendet. Kostenpflichtige Nutzung rechnet ${provider} ab, getrennt von einem ChatGPT- oder Claude-Abo.`,
  claudeNote: `Das auf diesem Computer installierte Claude Code läuft mit Ihrem eigenen Claude-Konto; die Nutzung wird auf die Limits Ihres Claude-Plans angerechnet. ${PRODUCT_NAME} greift nicht auf Ihre Claude-Anmeldedaten zu und speichert sie nicht. Sie melden sich über Claude Code an und ab.`,
  claudeAccount: 'Claude Code-Konto',
  claudeNotInstalled:
    'Claude Code wurde auf diesem Computer nicht gefunden. Installieren Sie Claude Code, führen Sie den Installationsbefehl der Hilfs-App erneut aus und wählen Sie dann „Aktualisieren“.',
  claudeNotLoggedIn:
    'Claude Code ist nicht angemeldet. Führen Sie claude in einem Terminal aus, melden Sie sich mit /login an und wählen Sie dann „Aktualisieren“.',
  claudeApiBilling:
    'Claude Code ist mit einer anderen Methode als einem Claude-Abo angemeldet, etwa einem API-Schlüssel; die Nutzung wird diesem Konto berechnet.',
  claudePrivacy:
    'Wenn Sie Text anfordern, werden Ihr Text, Ihre Anweisungen und der ausgewählte Kontext über Claude Code an Anthropic gesendet. Claude Code läuft ohne Werkzeuge, hat keinen Zugriff auf Ihre Dateien und speichert kein Sitzungsprotokoll. Pro- und Max-Pläne unterliegen den Verbraucherbedingungen von Anthropic: Sofern Sie das Modelltraining nicht in Ihren Claude-Datenschutzeinstellungen ausgeschaltet haben, können Inhalte zum Training verwendet werden. Team- und Enterprise-Pläne unterliegen den geschäftlichen Bedingungen.',
  provider: 'Anbieter',
  providerHints: {
    groq: 'Schnell, mit kostenlosen Modellen wie OpenAIs GPT-OSS im kostenlosen Plan.',
    openrouter: 'Hunderte Modelle vieler Anbieter; einige sind kostenlos.',
    openai: 'GPT-Modelle von OpenAI; Bezahlung nach Nutzung.',
  },
  apiKeyLabel: (provider) => `${provider}-API-Schlüssel`,
  createKey: (provider) => `${provider}-API-Schlüssel erstellen`,
  saveKey: 'Schlüssel verbinden',
  removeKey: 'Schlüssel entfernen',
  keySaved: (provider) => `${provider}-Schlüssel verschlüsselt in diesem Browser gespeichert.`,
  replaceKeyHint:
    'Um einen anderen Schlüssel zu verwenden, fügen Sie ihn ein und wählen Sie „Schlüssel verbinden“; er ersetzt den gespeicherten.',
  keyFromOtherProvider: (provider) =>
    `Das sieht nach einem ${provider}-Schlüssel aus, daher wurde er nicht gesendet. Wählen Sie oben ${provider} oder fügen Sie einen Schlüssel des gewählten Anbieters ein.`,
  accessNeeded: (provider) =>
    `Der Browser erlaubt ${PRODUCT_NAME} keine Verbindung zu ${provider}. Erlauben Sie den Zugriff, um den gespeicherten Schlüssel zu verwenden.`,
  grantAccess: 'Zugriff erlauben',
  freeModels: 'Kostenlose Modelle',
  paidModels: 'Kostenpflichtige Modelle',
  apiPrivacy: (provider) =>
    `Wenn Sie Text anfordern, werden Ihr Text, Ihre Anweisungen und der ausgewählte Kontext von diesem Browser direkt an ${provider} gesendet und unterliegen den Bedingungen von ${provider}. Der Schlüssel verlässt diesen Browser nur zur Anmeldung bei ${provider}.`,
  manageUsage: 'Nutzung verwalten',
  connectionHelp:
    'Verwalten Sie diese Verbindung in den ChatGPT-Einstellungen unter Security and login → Sign in with ChatGPT. Sie erscheint nicht unter Plugins. Für Arbeitskonten gelten zusätzlich Organisationsrichtlinie und Planberechtigung.',
  welcome: 'Sie verwenden Ihren ChatGPT-Plan',
  welcomeBody: `Die berechtigte Texterstellung in ${PRODUCT_NAME} nutzt das Kontingent Ihres ChatGPT-Plans oder verfügbare Guthaben. Die Nutzung dieser App verwalten Sie in den ChatGPT-Einstellungen.`,
  gotIt: 'Verstanden',
  privacy:
    'Wenn Sie Text anfordern, werden Ihr Text, Ihre Anweisungen und der ausgewählte Kontext an OpenAI gesendet. Die Erweiterung speichert sie nicht auf der Festplatte. Sie hat keinen Zugriff auf Ihren ChatGPT-Chatverlauf.',
  usePlan: 'ChatGPT-Plan wird verwendet',
  useApi: (provider) => `${provider}-API-Schlüssel wird verwendet`,
  useClaude: 'Claude-Plan wird verwendet',
  openSettings: 'KI-Einstellungen',
  notReady: 'Verbinden Sie ein KI-Konto, um Text zu erstellen',
};
