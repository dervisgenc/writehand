import { PRODUCT_NAME } from '@writehand/contracts';

import { aiDe } from './ai-de';
import type { ExtensionText } from './extension-text';
import { helperDe } from './helper-de';
import { countWith } from './plural';
import { welcomeDe } from './welcome-de';

const count = countWith('de');

export const de: ExtensionText = {
  description:
    'E-Mails in Outlook im Web und Gmail mit KI Ihrer Wahl überarbeiten, übersetzen und schreiben. Erst Vorschau; kein E-Mail-Versand.',
  ui: {
    locale: 'de',
    ai: aiDe,
    helper: helperDe,
    panelTitle: 'Schreibassistent',
    close: 'Schließen',
    threadLauncher: {
      label: 'Antwort entwerfen',
      tooltip: 'Eine Antwort auf diese Unterhaltung entwerfen und den Kontext prüfen',
      dragHint: 'Zum Verschieben ziehen.',
    },
    compose: {
      toolbarLabel: PRODUCT_NAME,
      reply: 'Antwort schreiben',
      replyTooltip: 'Aus Ihrer Anweisung einen Antwortentwurf für diese Unterhaltung schreiben',
      write: 'Schreiben',
      writeTooltip: 'Beschreiben Sie, was Sie sagen möchten, und erhalten Sie den E-Mail-Text',
      revise: 'Überarbeiten',
      reviseTooltip: 'Den markierten Text oder den Entwurf überarbeiten, ohne die Aussage zu ändern',
      translate: 'Übersetzen',
      translateTooltip: (language) => `Übersetzen: ${language}`,
      chooseLanguage: 'Übersetzungssprache wählen',
      openPanel: 'Bereich des Schreibassistenten öffnen',
    },
    inline: {
      titles: {
        reply: 'Antwortentwurf',
        revise: 'Überarbeitungsvorschlag',
        translate: 'Übersetzung',
        compose: 'E-Mail-Entwurf',
      },
      instructionLabel: 'Was möchten Sie sagen?',
      instructionPlaceholder: 'z. B. Bedanken Sie sich und sagen Sie, dass Donnerstag 14 Uhr passt',
      write: 'Schreiben',
      contextChip: (n) => `Kontext · ${count(n, 'Nachricht', 'Nachrichten')}`,
      contextReading: 'Kontext wird gelesen…',
      openPanel: 'Im Bereich öffnen',
      translatedTo: (language) => `${language}`,
      translateLanguage: 'Zielsprache',
      translate: 'Übersetzen',
      translateAgain: 'In diese Sprache übersetzen',
    },
    operations: {
      revise: 'Überarbeiten',
      translate: 'Übersetzen',
      reply: 'Antwort entwerfen',
      compose: 'Schreiben',
    },
    prepareButton: {
      revise: 'Überarbeiten',
      translate: 'Übersetzen',
      reply: 'Antwort entwerfen',
      compose: 'Text schreiben',
    },
    target: {
      label: 'Ziel',
      none: 'Kein Entwurf ausgewählt – das Ergebnis kann nur kopiert werden',
      composer: 'Geöffneter Entwurf',
      replyComposer: 'Geöffneter Antwortentwurf',
      receivedMessage: 'Empfangene Nachricht (schreibgeschützt)',
      newReply: 'Neue Antwort auf diese E-Mail',
    },
    source: {
      textLabel: 'Text',
      instructionLabel: 'Anweisung für die Antwort',
      composeInstructionLabel: 'Was möchten Sie schreiben?',
      originLabel: 'Quelle',
      origins: {
        panel: 'Hier eingegebener Text',
        draft: 'Mein Entwurf',
        'draft-selection': 'Markierter Text',
        'received-message': 'Markierung in empfangener Nachricht',
      },
      edited: 'bearbeitet',
      placeholders: {
        revise: 'Geben Sie den zu überarbeitenden Text ein oder übernehmen Sie ihn aus dem Entwurf',
        translate: 'Geben Sie den zu übersetzenden Text ein oder übernehmen Sie ihn aus dem Entwurf',
        reply: 'z. B. Ruhig erklären, dass das nicht zutrifft, und ein Treffen morgen vorschlagen',
        compose: 'z. B. Dem Team ein kurzes Projekttreffen am Donnerstag um 14 Uhr vorschlagen',
      },
      loadDraft: 'Entwurf übernehmen',
      loadSelection: 'Markierten Text übernehmen',
      loadReceivedSelection: 'Markierung aus empfangener Nachricht übernehmen',
      confirmReplace: 'Der Text im Bereich wird ersetzt.',
      confirm: 'Ersetzen',
      cancel: 'Abbrechen',
      characters: (n, limit) => `${n.toLocaleString('de-DE')} / ${limit.toLocaleString('de-DE')}`,
    },
    options: {
      targetLanguage: 'Zielsprache',
      tone: 'Ton',
      tones: { neutral: 'Neutral', formal: 'Förmlich', friendly: 'Freundlich' },
      useConversation: 'Auch die Unterhaltung verwenden',
      languagePlaceholder: 'Sprache wählen oder eingeben',
      otherLanguage: 'Andere Sprache…',
      manageLanguages: 'Sprachen bearbeiten',
    },
    context: {
      title: 'Kontext',
      summary: (included, total) => `Verwendet: ${included} von ${total} Nachrichten`,
      refresh: 'Unterhaltung erneut lesen',
      read: 'Unterhaltung lesen',
      reading: 'Unterhaltung wird gelesen…',
      notLoaded: 'Die Unterhaltung wurde noch nicht gelesen.',
      stale:
        'Die Unterhaltung enthält neue Inhalte. Lesen Sie sie erneut, bevor Sie mit diesem Kontext arbeiten.',
      activeLocked: 'Die Nachricht, auf die geantwortet wird, kann nicht aus dem Kontext entfernt werden.',
      chooseReplyTarget:
        'Wählen Sie die Nachricht, auf die Sie antworten möchten. Sie ließ sich am Bildschirm nicht sicher bestimmen.',
      replyTarget: 'Auf diese Nachricht antworten',
      unknownSender: 'Absender konnte nicht gelesen werden',
      currentGroup: 'Diese Unterhaltung',
      otherGroup: (n) => `Andere geöffnete E-Mails (${n})`,
      otherHint:
        'E-Mails, die Sie in anderen Unterhaltungen geöffnet haben. Aktivieren Sie eine, um sie dem Kontext hinzuzufügen.',
      includeMessage: (sender) => `Nachricht von ${sender} im Kontext verwenden`,
      replyTargetBadge: 'Antwort auf',
      editedBadge: 'Bearbeitet',
      showBody: 'Text anzeigen',
      hideBody: 'Text ausblenden',
      edit: 'Bearbeiten',
      editLabel: 'Im Kontext verwendeter Text',
      save: 'Speichern',
      cancelEdit: 'Abbrechen',
      resetEdit: 'Original wiederherstellen',
      omittedBlock: { signature: 'Signatur entfernt', quote: 'Wiederholtes Zitat entfernt' },
      includeBlock: 'Wieder einbeziehen',
      counted: {
        'message-count': (n) => `Der Kontext enthält ${count(n, 'Nachricht', 'Nachrichten')}.`,
        'collapsed-unread': (n) =>
          `${count(n, 'Nachricht ist', 'Nachrichten sind')} eingeklappt; der Inhalt wurde nicht gelesen.`,
        'user-excluded': (n) => `Sie haben ${count(n, 'Nachricht', 'Nachrichten')} aus dem Kontext entfernt.`,
        'other-conversations': (n) =>
          `${count(n, 'Nachricht wurde', 'Nachrichten wurden')} aus anderen Unterhaltungen hinzugefügt.`,
        'user-edited': (n) => `Sie haben den Text von ${count(n, 'Nachricht', 'Nachrichten')} bearbeitet.`,
        'message-limited': (n) =>
          `${count(n, 'ältere Nachricht wurde', 'ältere Nachrichten wurden')} wegen der Nachrichtengrenze ausgelassen.`,
        'size-limited': (n) =>
          `${count(n, 'ältere Nachricht wurde', 'ältere Nachrichten wurden')} wegen der Längenbegrenzung ausgelassen.`,
        'signature-removed': (n) =>
          `${count(n, 'Signatur wurde', 'Signaturen wurden')} aus dem Kontext entfernt.`,
        'duplicate-quote-removed': (n) =>
          `${count(n, 'wiederholtes Zitat wurde', 'wiederholte Zitate wurden')} aus dem Kontext entfernt.`,
      },
      plain: {
        'collapsed-unknown':
          'Einige Nachrichten sind möglicherweise eingeklappt; ihre Anzahl ließ sich nicht bestimmen.',
        'coverage-unverified':
          'Es werden nur am Bildschirm geöffnete Nachrichten verwendet; der Zugriff auf die ganze Unterhaltung lässt sich nicht prüfen.',
        'open-item-only':
          'Es werden nur die geöffnete E-Mail und die darin zitierten früheren Nachrichten verwendet.',
        'virtualized-content': 'Einige Nachrichten sind am Bildschirm möglicherweise noch nicht geladen.',
        'read-limit': 'Einige Nachrichten wurden wegen der Lesegrenze nicht gelesen.',
        'display-order-used':
          'Datumsangaben fehlen; die Nachrichten werden in der Reihenfolge am Bildschirm verwendet.',
      },
    },
    preview: {
      title: 'Ergebnis',
      regenerate: 'Neu erstellen',
      sampleLabel: 'Beispielergebnis – Entwicklungsmodus',
      sampleShort: 'Beispiel',
      stale:
        'Die Quelle hat sich geändert. Diese Vorschau kann kopiert, aber nicht auf den Entwurf angewendet werden.',
      unchanged: 'Keine Änderungen am Text.',
      editSource: 'Quelle bearbeiten',
      showFormatted: 'Formatiert anzeigen',
    },
    refine: {
      title: 'Ergebnis ändern',
      kinds: {
        table: 'Als Tabelle',
        list: 'Als Aufzählung',
        chart: 'Diagramm hinzufügen',
        shorter: 'Kürzen',
        formal: 'Förmlicher',
        friendly: 'Freundlicher',
      },
      customLabel: 'Gewünschte Änderung am Ergebnis',
      customPlaceholder: 'Andere Änderung anfordern, z. B. den letzten Absatz entfernen',
      customSubmit: 'Änderung anwenden',
    },
    apply: {
      scopeLabel: 'Bereich, der sich ändert',
      scopes: {
        'replace-selection': 'Markierter Text',
        'replace-body': 'Ihr geschriebener Text (Signatur und frühere Nachrichten bleiben erhalten)',
        'insert-empty': 'Leerer Antwortbereich',
        'create-reply': 'Eine neue Antwort auf diese E-Mail, als Entwurf geöffnet',
      },
      noTarget: 'Es gibt keinen Entwurf, der direkt geändert werden kann',
      formattingNote:
        'Das Ergebnis wird als reiner Text eingefügt; Formatierungen im geänderten Bereich können verloren gehen.',
      copy: 'Kopieren',
      apply: 'Auf Entwurf anwenden',
      undo: 'Letzte Anwendung rückgängig machen',
      replaceExistingReply: 'Vorhandenen Antworttext ersetzen',
      useOpenComposer: 'Diesen Antwortentwurf verwenden',
      createReply: 'Antwort mit diesem Text öffnen',
    },
    status: {
      reading: 'Wird gelesen…',
      preparing: 'Wird vorbereitet…',
      applying: 'Wird in den Entwurf geschrieben…',
      undoing: 'Wird rückgängig gemacht…',
      applied: 'Text in den Entwurf eingefügt. Nicht gesendet; die letzte Prüfung liegt bei Ihnen.',
      undone: 'Die letzte Anwendung wurde rückgängig gemacht.',
      copied: 'In die Zwischenablage kopiert.',
      retry: 'Erneut versuchen',
      dismiss: 'Schließen',
    },
    errors: {
      PAGE_UNSUPPORTED: 'Diese Ansicht wird nicht unterstützt.',
      PAGE_NOT_READY: 'Der E-Mail-Bereich ist noch nicht bereit.',
      THREAD_CHANGED:
        'Die Unterhaltung hat sich geändert. Dieses Ergebnis kann nicht auf die geöffnete Unterhaltung angewendet werden.',
      ACCOUNT_CHANGED: 'Das Konto hat sich geändert; die bisherige Arbeit wurde gelöscht.',
      TARGET_MISSING: 'Der ausgewählte Entwurf wurde geschlossen oder ist nicht auffindbar.',
      TARGET_CHANGED:
        'Der Entwurf hat sich nach Beginn der Aktion geändert. Übernehmen Sie die Quelle erneut.',
      SELECTION_INVALID: 'Der markierte Bereich ist nicht mehr derselbe. Bitte markieren Sie ihn erneut.',
      SOURCE_EMPTY: 'Der Text oder die Anweisung ist leer.',
      SOURCE_TOO_LARGE: 'Der Text ist zu lang; markieren Sie einen kleineren Teil.',
      CONTEXT_TOO_LARGE: 'Der ausgewählte Kontext ist zu lang. Entfernen Sie einige Nachrichten.',
      CONTEXT_REQUIRED:
        'Es wurde keine Nachricht zum Beantworten bestimmt. Lesen Sie die Unterhaltung oder wählen Sie eine Nachricht.',
      CONTEXT_STALE: 'Die Unterhaltung enthält neue Inhalte. Lesen Sie sie zuerst erneut.',
      LANGUAGE_REQUIRED: 'Wählen Sie eine Zielsprache.',
      RESULT_INVALID: 'Das Ergebnis gehört nicht zu dieser Aktion, ist leer oder zu groß.',
      RESULT_UNCHANGED: 'Keine Änderungen am Text.',
      PREVIEW_STALE:
        'Die Quelle hat sich geändert. Die Vorschau kann kopiert, aber nicht auf den Entwurf angewendet werden.',
      SETTINGS_CONFLICT:
        'Die Einstellungen wurden an anderer Stelle geändert; die neuesten Einstellungen wurden geladen.',
      SETTINGS_INVALID:
        'Die gespeicherten Einstellungen konnten nicht gelesen werden; es werden die Standardwerte verwendet.',
      READ_TIMEOUT: 'Der Seiteninhalt konnte nicht gelesen werden. Versuchen Sie es erneut.',
      READ_CANCELLED: 'Das Lesen wurde abgebrochen.',
      WRITE_UNSUPPORTED:
        'Sicheres Schreiben in diesen Editor ließ sich nicht bestätigen. Sie können das Ergebnis kopieren.',
      WRITE_UNCERTAIN:
        'Es ließ sich nicht bestätigen, dass der Text eingefügt wurde. Bitte prüfen Sie den Entwurf; die Aktion wurde nicht wiederholt.',
      REPLY_TOO_LARGE:
        'Das Ergebnis ist zu lang, um es als Antwort zu öffnen. Kopieren Sie es und fügen Sie es in eine Antwort ein.',
      UNDO_INVALID:
        'Der Entwurf wurde danach geändert; das automatische Rückgängigmachen wurde zum Schutz Ihres Textes deaktiviert.',
      CLIPBOARD_UNAVAILABLE:
        'Der Browser hat das Schreiben in die Zwischenablage nicht erlaubt. Markieren Sie den Text und drücken Sie Strg+C.',
      EXTENSION_RELOADED: 'Die Erweiterung wurde aktualisiert. Laden Sie die Seite neu, um fortzufahren.',
      PROCESSING_UNAVAILABLE:
        'Die Textverarbeitung ist noch nicht verbunden. Diese Version überarbeitet, übersetzt und beantwortet nichts.',
      AI_HOST_UNAVAILABLE:
        'Die Hilfs-App ist nicht verbunden. Öffnen Sie Einstellungen → Hilfs-App, um sie zu installieren oder zu verbinden.',
      AI_NOT_CONNECTED:
        'Die KI-Sitzung fehlt oder ist abgelaufen. Verbinden Sie sich in den KI-Einstellungen neu.',
      AI_AUTH_FAILED:
        'Die ChatGPT-Anmeldung konnte nicht bestätigt werden oder ist abgelaufen. Versuchen Sie es erneut.',
      AI_AUTH_EXCHANGE_FAILED:
        'OpenAI hat den Anmeldecode nicht akzeptiert. Starten Sie mit „Continue with ChatGPT“ einen neuen Versuch; laden Sie den alten Rückleitungs-Tab nicht neu.',
      AI_AUTH_TOKEN_INVALID:
        'In der OpenAI-Antwort fehlen nötige Sitzungsdaten oder das Format ist unerwartet. Das Konto wurde nicht verbunden (AI_AUTH_TOKEN_INVALID).',
      AI_AUTH_IDENTITY_FAILED:
        'Die Identitätsantwort von OpenAI ließ sich nicht sicher prüfen. Das Konto wurde nicht verbunden (AI_AUTH_IDENTITY_FAILED).',
      AI_AUTH_CANCELLED: 'Die ChatGPT-Anmeldung wurde abgebrochen.',
      AI_POLICY_DENIED:
        'Eine Organisationsrichtlinie blockiert „Sign in with ChatGPT“ für diese App. ChatGPT-Business-Arbeitsbereiche haben derzeit keine Einstellung, um es zu erlauben; verwenden Sie stattdessen „Über Codex anmelden“. Bei Enterprise und Edu kann eine globale Administration die App in der OpenAI Admin Console unter „External access“ genehmigen.',
      AI_WORKSPACE_MISMATCH:
        'Diese Verbindung gehört zu einem anderen ChatGPT-Konto oder Arbeitsbereich. Fahren Sie mit dem Konto fort, das sie erstellt hat, oder wählen Sie „Anderes Konto oder anderen Arbeitsbereich hinzufügen“.',
      AI_ACCOUNT_NAME_TAKEN:
        'Eine andere Verbindung verwendet diesen Namen bereits. Wählen Sie einen eindeutigen Namen.',
      AI_PLAN_REQUIRED:
        'Diese Verbindung hat keine ChatGPT-Planberechtigung. Für die Texterstellung sind ein berechtigtes Plus- oder Pro-Konto und die Planberechtigung nötig; die Anmeldung mit einem kostenlosen Konto genügt nicht.',
      AI_NOT_ELIGIBLE:
        'OpenAI hat die Nutzung des ChatGPT-Plans für dieses Konto abgelehnt (subscription_sharing_user_not_eligible). Wenn Ihr Plus- oder Pro-Abo aktiv ist, wenden Sie sich mit diesem Code an den OpenAI-Support.',
      AI_ACCESS_DENIED:
        'Der KI-Anbieter hat den Zugriff auf diese Anfrage verweigert. Prüfen Sie App-Berechtigungen, Verbindungseinstellungen oder regionale Einschränkungen; beim ChatGPT-Plan sagt dieser Fehler allein nichts über die Abo-Berechtigung aus.',
      AI_LIMIT_REACHED:
        'Nutzungsgrenze erreicht. Bei ChatGPT sehen Sie unter „Nutzung verwalten“, wann sie zurückgesetzt wird; Arbeitsbereiche können auch mit Credits weitermachen. Beim Claude-Plan versuchen Sie es nach dem Zurücksetzen der Grenze erneut; bei einem API-Schlüssel warten Sie kurz oder prüfen Ihre Limits beim Anbieter.',
      AI_CREDITS_EXHAUSTED:
        'Keine Credits mehr. In einem ChatGPT-Arbeitsbereich können dessen Inhaber in den Abrechnungseinstellungen Credits hinzufügen oder das Ausgabenlimit erhöhen; bei einem API-Schlüssel laden Sie beim Anbieter Guthaben auf oder erhöhen das Ausgabenlimit.',
      AI_UNAVAILABLE:
        'Der KI-Dienst ist derzeit nicht verfügbar. Ihre Verbindung bleibt bestehen; versuchen Sie es später erneut.',
      AI_NETWORK:
        'Der KI-Dienst war nicht erreichbar. Prüfen Sie Ihre Internetverbindung und versuchen Sie es erneut.',
      AI_MODEL_UNAVAILABLE:
        'Das ausgewählte Modell ist nicht verfügbar. Aktualisieren Sie die Modelle in den KI-Einstellungen.',
      AI_RESPONSE_INCOMPLETE:
        'Die Antwort wurde nicht vollständig erstellt. Es wurde kein Teiltext angewendet; Sie können es erneut versuchen.',
      AI_REVOKE_UNCONFIRMED:
        'Lokal abgemeldet; der Widerruf bei OpenAI ließ sich nicht bestätigen. Trennen Sie die App in den ChatGPT-Einstellungen.',
      AI_BUSY: 'Ein Vorgang der KI-Verbindung läuft. Warten Sie oder brechen Sie die Anmeldung ab.',
      AI_KEY_INVALID:
        'Der Anbieter hat diesen API-Schlüssel nicht akzeptiert. Prüfen Sie, ob Sie ihn vollständig kopiert haben und ob er noch aktiv ist, oder erstellen Sie einen neuen.',
      AI_PROVIDER_ACCESS_REQUIRED: `${PRODUCT_NAME} braucht Ihre Erlaubnis, um sich mit dem Anbieter zu verbinden. Wählen Sie erneut „Schlüssel verbinden“ und erlauben Sie den Zugriff, wenn der Browser fragt.`,
      AI_KEY_STORAGE_FAILED:
        'Dieser Browser konnte den Schlüssel nicht sicher speichern oder lesen; es wurde nichts gespeichert. Prüfen Sie, ob der Browser Websitedaten für Erweiterungen behält, und versuchen Sie es erneut.',
      AI_REQUEST_TOO_LARGE:
        'Diese Anfrage ist größer, als der Anbieter für dieses Modell oder diesen Plan erlaubt. Entfernen Sie einige Kontextnachrichten, kürzen Sie den Text oder wählen Sie ein anderes Modell.',
      AI_CLAUDE_NOT_INSTALLED:
        'Claude Code wurde nicht gefunden. Installieren Sie Claude Code und führen Sie danach den Installationsbefehl der Hilfs-App erneut aus.',
      AI_CLAUDE_NOT_LOGGED_IN:
        'Claude Code ist nicht angemeldet. Führen Sie claude in einem Terminal aus und melden Sie sich mit /login an.',
      AI_CLAUDE_UNSUPPORTED_INSTALL: `Claude Code wurde nur als Befehlsskript (claude.cmd) gefunden, das ${PRODUCT_NAME} nicht sicher starten kann. Installieren Sie Claude Code mit dem offiziellen nativen Installationsprogramm und führen Sie danach den Installationsbefehl der Hilfs-App erneut aus.`,
      AI_VERSION_MISMATCH:
        'Die Hilfs-App ist älter als diese Erweiterung. Aktualisieren Sie sie unter Einstellungen → Hilfs-App.',
      HOST_UPDATE_CHECK_FAILED:
        'Die neueste Version der Hilfs-App konnte nicht geprüft werden. Prüfen Sie Ihre Internetverbindung und versuchen Sie es später erneut.',
      HOST_UPDATE_FAILED:
        'Das Update konnte nicht heruntergeladen oder installiert werden; die installierte Version ist unverändert. Versuchen Sie es später erneut oder führen Sie den Installationsbefehl erneut aus.',
      HOST_UPDATE_UNVERIFIED:
        'Das heruntergeladene Update konnte nicht verifiziert werden; es wurde nichts installiert. Die installierte Version funktioniert weiter.',
      CONTENT_SCRIPT_UNREACHABLE:
        'Die Erweiterung erreicht diesen Tab nicht. Prüfen Sie den Websitezugriff oder laden Sie die Seite neu.',
      MESSAGE_REJECTED: 'Eine ungültige Nachricht der Erweiterung wurde abgelehnt.',
      UNEXPECTED: 'Ein unerwarteter Fehler ist aufgetreten. Ihr Text bleibt erhalten.',
    },
  },
  popup: {
    title: PRODUCT_NAME,
    statuses: {
      ready: 'Der Schreibassistent ist auf dieser Seite verfügbar.',
      waiting: 'Der E-Mail-Bereich wird geladen…',
      unsupported: 'Der E-Mail-Bereich in dieser Ansicht wurde nicht erkannt.',
      disabled:
        'Die Erweiterung ist für diese Website ausgeschaltet. Sie können sie in den Einstellungen aktivieren.',
      'not-mail-site': 'Dieser Tab ist keine unterstützte E-Mail-Website.',
      unreachable:
        'Die Erweiterung erreicht diesen Tab nicht. Prüfen Sie den Websitezugriff oder laden Sie die Seite neu.',
      checking: 'Seite wird geprüft…',
    },
    openPanel: 'Bereich auf dieser Seite öffnen',
    openSettings: 'Einstellungen',
    siteAccessMissing: 'Für diese Website wurde kein Websitezugriff gewährt.',
    developmentBuild: 'Entwicklungsversion',
    setupNeeded: `Wählen Sie, wie sich ${PRODUCT_NAME} mit einem KI-Anbieter verbindet, um mit dem Schreiben zu beginnen.`,
    finishSetup: 'Einrichtung abschließen',
  },
  options: {
    title: `${PRODUCT_NAME} – Einstellungen`,
    subtitle: 'Schreibassistent für Outlook im Web und Gmail',
    preferencesTitle: 'Schreibeinstellungen',
    preferencesDescription: 'Sprache, Ton und Darstellung für neue Arbeiten.',
    uiLanguage: 'Sprache der Oberfläche',
    uiLanguageAuto: 'Automatisch (Browsersprache)',
    targetLanguage: 'Standard-Übersetzungssprache',
    targetLanguageHint:
      'Die Schaltfläche „Übersetzen“ übersetzt in diese Sprache. Wählen Sie aus der Liste oder geben Sie einen Sprachnamen ein.',
    favoriteLanguages: 'Sprachen im Übersetzen-Menü',
    favoriteLanguagesHint:
      'Sprachen, die Sie im Menü „Übersetzen“ schnell auswählen können. Geben Sie einen Namen ein, um eine nicht aufgeführte Sprache hinzuzufügen.',
    addLanguage: 'Hinzufügen',
    removeLanguage: (language) => `${language} entfernen`,
    favoritesFull: 'Sie können bis zu 10 Sprachen hinzufügen.',
    languagesTitle: 'Sprachen',
    languagesDescription: 'Sprache der Oberfläche, Übersetzungssprache und die Sprachen im Übersetzen-Menü.',
    instructionsTitle: 'Dauerhafte Anweisungen',
    instructionsDescription:
      'Werden jeder Anfrage zum Schreiben, Antworten, Überarbeiten und Übersetzen hinzugefügt. Widerspricht ihnen Ihre Anweisung für eine Anfrage, gilt diese Anweisung.',
    instructionsLabel: 'Ihre Schreibvorlieben',
    instructionsPlaceholder:
      'Zum Beispiel: Förmlich und geschäftlich schreiben. Kurze Absätze. Mit „Sehr geehrte Damen und Herren“ beginnen und mit „Mit freundlichen Grüßen“ enden.',
    instructionsExamplesLabel: 'Schnell hinzufügen',
    instructionsExamples: [
      'Förmlich und geschäftlich schreiben.',
      'Kurz und direkt; keine Floskeln zu Beginn.',
      'Freundlich, aber professionell schreiben.',
      'Die E-Mail mit „Mit freundlichen Grüßen“ beenden.',
      'Fachbegriffe vermeiden oder erklären.',
    ],
    instructionsCount: (count, limit) => `${count}/${limit}`,
    tone: 'Standardton',
    theme: 'Design',
    themes: { system: 'Automatisch (wie Ihr E-Mail-Dienst)', light: 'Hell', dark: 'Dunkel' },
    themeOptions: { system: 'Automatisch', light: 'Hell', dark: 'Dunkel' },
    themeHint:
      'Bei „Automatisch“ folgt der Bereich dem Design Ihrer E-Mail-Seite und diese Seite dem Design Ihres Systems.',
    siteNames: { 'outlook-web': 'Outlook im Web', 'gmail-web': 'Gmail' },
    siteEnabled: (site) => `Schreibassistent in ${site} anzeigen`,
    siteEnabledHint: (site) =>
      `Wenn ausgeschaltet, sind die Schaltflächen und der Bereich in ${site} ausgeblendet.`,
    unsaved: 'Sie haben ungespeicherte Änderungen.',
    save: 'Speichern',
    saved: 'Einstellungen gespeichert.',
    saving: 'Wird gespeichert…',
    defaultsNote:
      'Standardsprache und -ton ändern laufende Arbeiten nicht; sie gelten für die nächste Arbeit.',
    privacyTitle: 'Datenschutz und Daten',
    privacyDescription: `Was ${PRODUCT_NAME} mit Ihren E-Mails tut und was nicht.`,
    privacyPoints: [
      'Ihre Einstellungen werden nur auf diesem Gerät gespeichert.',
      'Geöffnete E-Mails bleiben nur, solange die Seite offen ist, im Arbeitsspeicher, um Kontext vorzuschlagen; sie werden nie auf die Festplatte geschrieben.',
      'Text wird nur dann an den gewählten KI-Anbieter (OpenAI, Anthropic, Groq oder OpenRouter) gesendet, wenn Sie „Überarbeiten“, „Übersetzen“ oder „Antwort schreiben“ wählen.',
      'Ein verbundener API-Schlüssel wird verschlüsselt in diesem Browser gespeichert und nur an seinen Anbieter gesendet.',
      'Ergebnisse erscheinen zuerst als Vorschau und werden nie ohne Ihre Zustimmung in Ihren Entwurf geschrieben.',
      `${PRODUCT_NAME} sendet nie E-Mails; das Senden bleibt immer Ihnen überlassen.`,
      'Solange die Update-Prüfung aktiv ist, fragt die Hilfs-App höchstens einmal täglich bei GitHub die neueste Versionsnummer ab; die Anfrage enthält keine E-Mails oder Kontodaten. Sie können sie auf der Karte der Hilfs-App ausschalten.',
    ],
  },
  welcome: welcomeDe,
};
