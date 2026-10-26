import { PRODUCT_NAME } from '@writehand/contracts';

import { aiEs } from './ai-es';
import type { ExtensionText } from './extension-text';
import { helperEs } from './helper-es';
import { countWith } from './plural';
import { welcomeEs } from './welcome-es';

const count = countWith('es');

export const es: ExtensionText = {
  description:
    'Corrige, traduce y redacta correos en Outlook en la Web y Gmail con la IA que elijas. Primero, una vista previa; no envía correos.',
  ui: {
    locale: 'es',
    ai: aiEs,
    helper: helperEs,
    panelTitle: 'Asistente de redacción',
    close: 'Cerrar',
    threadLauncher: {
      label: 'Preparar respuesta',
      tooltip: 'Prepara una respuesta a esta conversación y revisa el contexto',
      dragHint: 'Arrástralo para moverlo.',
    },
    compose: {
      toolbarLabel: PRODUCT_NAME,
      reply: 'Escribir respuesta',
      replyTooltip: 'Escribe un borrador de respuesta a esta conversación a partir de tu indicación',
      write: 'Escribir',
      writeTooltip: 'Describe lo que quieres decir y obtén el texto del correo',
      revise: 'Corregir',
      reviseTooltip: 'Corrige el texto seleccionado o el borrador sin cambiar su sentido',
      translate: 'Traducir',
      translateTooltip: (language) => `Traducir al ${language}`,
      chooseLanguage: 'Elegir idioma de traducción',
      openPanel: 'Abrir el panel del asistente de redacción',
    },
    inline: {
      titles: {
        reply: 'Borrador de respuesta',
        revise: 'Corrección sugerida',
        translate: 'Traducción',
        compose: 'Borrador de correo',
      },
      instructionLabel: '¿Qué quieres decir?',
      instructionPlaceholder: 'p. ej., Da las gracias y di que el jueves a las 14:00 va bien',
      write: 'Escribir',
      contextChip: (n) => `Contexto · ${count(n, 'mensaje', 'mensajes')}`,
      contextReading: 'Leyendo el contexto…',
      openPanel: 'Abrir en el panel',
      translatedTo: (language) => `${language}`,
      translateLanguage: 'Idioma de destino',
      translate: 'Traducir',
      translateAgain: 'Traducir a este idioma',
    },
    operations: {
      revise: 'Corregir',
      translate: 'Traducir',
      reply: 'Preparar respuesta',
      compose: 'Escribir',
    },
    prepareButton: {
      revise: 'Corregir',
      translate: 'Traducir',
      reply: 'Preparar respuesta',
      compose: 'Escribir texto',
    },
    target: {
      label: 'Destino',
      none: 'No hay ningún borrador seleccionado: el resultado solo se puede copiar',
      composer: 'Borrador abierto',
      replyComposer: 'Borrador de respuesta abierto',
      receivedMessage: 'Mensaje recibido (solo lectura)',
      newReply: 'Nueva respuesta a este correo',
    },
    source: {
      textLabel: 'Texto',
      instructionLabel: 'Indicación para la respuesta',
      composeInstructionLabel: '¿Qué quieres escribir?',
      originLabel: 'Origen',
      origins: {
        panel: 'Texto escrito aquí',
        draft: 'Mi borrador',
        'draft-selection': 'Texto seleccionado',
        'received-message': 'Selección en el mensaje recibido',
      },
      edited: 'editado',
      placeholders: {
        revise: 'Escribe el texto que quieres corregir o tómalo del borrador',
        translate: 'Escribe el texto que quieres traducir o tómalo del borrador',
        reply: 'p. ej., Explica con calma que no es así y propón una reunión mañana',
        compose: 'p. ej., Propón al equipo una breve reunión de proyecto el jueves a las 14:00',
      },
      loadDraft: 'Tomar el borrador',
      loadSelection: 'Tomar el texto seleccionado',
      loadReceivedSelection: 'Tomar la selección del mensaje recibido',
      confirmReplace: 'Se reemplazará el texto del panel.',
      confirm: 'Reemplazar',
      cancel: 'Cancelar',
      characters: (n, limit) => `${n.toLocaleString('es-ES')} / ${limit.toLocaleString('es-ES')}`,
    },
    options: {
      targetLanguage: 'Idioma de destino',
      tone: 'Tono',
      tones: { neutral: 'Neutro', formal: 'Formal', friendly: 'Cercano' },
      useConversation: 'Usar también la conversación',
      languagePlaceholder: 'Elige o escribe un idioma',
      otherLanguage: 'Otro idioma…',
      manageLanguages: 'Editar idiomas',
    },
    context: {
      title: 'Contexto',
      summary: (included, total) => `Se usan ${included} de ${total} mensajes`,
      refresh: 'Volver a leer la conversación',
      read: 'Leer la conversación',
      reading: 'Leyendo la conversación…',
      notLoaded: 'La conversación aún no se ha leído.',
      stale: 'La conversación tiene contenido nuevo. Vuelve a leerla antes de preparar con este contexto.',
      activeLocked: 'El mensaje al que respondes no se puede quitar del contexto.',
      chooseReplyTarget:
        'Elige el mensaje al que quieres responder. No se pudo determinar con seguridad en la pantalla.',
      replyTarget: 'Responder a este mensaje',
      unknownSender: 'No se pudo leer el remitente',
      currentGroup: 'Esta conversación',
      otherGroup: (n) => `Otros correos abiertos (${n})`,
      otherHint: 'Correos que abriste en otras conversaciones. Marca uno para añadirlo al contexto.',
      includeMessage: (sender) => `Usar en el contexto el mensaje de ${sender}`,
      replyTargetBadge: 'Respuesta a',
      editedBadge: 'Editado',
      showBody: 'Mostrar texto',
      hideBody: 'Ocultar texto',
      edit: 'Editar',
      editLabel: 'Texto usado en el contexto',
      save: 'Guardar',
      cancelEdit: 'Cancelar',
      resetEdit: 'Restaurar el original',
      omittedBlock: { signature: 'Firma quitada', quote: 'Cita repetida quitada' },
      includeBlock: 'Volver a incluir',
      counted: {
        'message-count': (n) => `El contexto tiene ${count(n, 'mensaje', 'mensajes')}.`,
        'collapsed-unread': (n) =>
          `${count(n, 'mensaje está contraído', 'mensajes están contraídos')}; no se leyó el contenido.`,
        'user-excluded': (n) => `Quitaste ${count(n, 'mensaje', 'mensajes')} del contexto.`,
        'other-conversations': (n) =>
          `${count(n, 'mensaje añadido', 'mensajes añadidos')} desde otras conversaciones.`,
        'user-edited': (n) => `Editaste el texto de ${count(n, 'mensaje', 'mensajes')}.`,
        'message-limited': (n) =>
          `${count(n, 'mensaje anterior omitido', 'mensajes anteriores omitidos')} por el límite de mensajes.`,
        'size-limited': (n) =>
          `${count(n, 'mensaje anterior omitido', 'mensajes anteriores omitidos')} por el límite de longitud.`,
        'signature-removed': (n) => `${count(n, 'firma quitada', 'firmas quitadas')} del contexto.`,
        'duplicate-quote-removed': (n) =>
          `${count(n, 'cita repetida quitada', 'citas repetidas quitadas')} del contexto.`,
      },
      plain: {
        'collapsed-unknown': 'Puede que algunos mensajes estén contraídos; no se pudo determinar cuántos.',
        'coverage-unverified':
          'Solo se usan los mensajes abiertos en la pantalla; no se puede comprobar el acceso a toda la conversación.',
        'open-item-only': 'Solo se usan el correo abierto y los mensajes anteriores citados en él.',
        'virtualized-content': 'Puede que algunos mensajes aún no se hayan cargado en la pantalla.',
        'read-limit': 'Algunos mensajes no se leyeron por el límite de lectura.',
        'display-order-used':
          'Faltan las fechas; los mensajes se usan en el orden en que aparecen en la pantalla.',
      },
    },
    preview: {
      title: 'Resultado',
      regenerate: 'Volver a generar',
      sampleLabel: 'Resultado de ejemplo: modo de desarrollo',
      sampleShort: 'Ejemplo',
      stale: 'El origen cambió. Esta vista previa se puede copiar, pero no aplicar al borrador.',
      unchanged: 'No hay cambios en el texto.',
      editSource: 'Editar el origen',
      showFormatted: 'Mostrar con formato',
    },
    refine: {
      title: 'Cambiar el resultado',
      kinds: {
        table: 'Hacer una tabla',
        list: 'En viñetas',
        chart: 'Añadir un gráfico',
        shorter: 'Acortar',
        formal: 'Más formal',
        friendly: 'Más cercano',
      },
      customLabel: 'Cambio que quieres en el resultado',
      customPlaceholder: 'Pide otro cambio, p. ej., quita el último párrafo',
      customSubmit: 'Aplicar el cambio',
    },
    apply: {
      scopeLabel: 'Parte que cambiará',
      scopes: {
        'replace-selection': 'Texto seleccionado',
        'replace-body': 'El texto que escribiste (la firma y los mensajes anteriores se conservan)',
        'insert-empty': 'Área de respuesta vacía',
        'create-reply': 'Una nueva respuesta a este correo, abierta como borrador',
      },
      noTarget: 'No hay ningún borrador que se pueda cambiar directamente',
      formattingNote:
        'El resultado se inserta como texto sin formato; puede perderse el formato de la parte modificada.',
      copy: 'Copiar',
      apply: 'Aplicar al borrador',
      undo: 'Deshacer la última aplicación',
      replaceExistingReply: 'Reemplazar el texto de respuesta existente',
      useOpenComposer: 'Usar este borrador de respuesta',
      createReply: 'Abrir una respuesta con este texto',
    },
    status: {
      reading: 'Leyendo…',
      preparing: 'Preparando…',
      applying: 'Escribiendo en el borrador…',
      undoing: 'Deshaciendo…',
      applied: 'Texto insertado en el borrador. No se ha enviado; la revisión final es tuya.',
      undone: 'Se deshizo la última aplicación.',
      copied: 'Copiado al portapapeles.',
      retry: 'Reintentar',
      dismiss: 'Cerrar',
    },
    errors: {
      PAGE_UNSUPPORTED: 'Esta pantalla no es compatible.',
      PAGE_NOT_READY: 'El área de correo aún no está lista.',
      THREAD_CHANGED: 'La conversación cambió. Este resultado no se puede aplicar a la conversación abierta.',
      ACCOUNT_CHANGED: 'La cuenta cambió; se borró el trabajo anterior.',
      TARGET_MISSING: 'El borrador seleccionado se cerró o no se encuentra.',
      TARGET_CHANGED: 'El borrador cambió después de iniciar la acción. Vuelve a tomar el origen.',
      SELECTION_INVALID: 'La parte seleccionada ya no es la misma. Vuelve a seleccionarla.',
      SOURCE_EMPTY: 'El texto o la indicación está vacío.',
      SOURCE_TOO_LARGE: 'El texto es demasiado largo; selecciona una parte más pequeña.',
      CONTEXT_TOO_LARGE: 'El contexto seleccionado es demasiado largo. Quita algunos mensajes.',
      CONTEXT_REQUIRED:
        'No se determinó ningún mensaje al que responder. Lee la conversación o selecciona un mensaje.',
      CONTEXT_STALE: 'La conversación tiene contenido nuevo. Vuelve a leerla primero.',
      LANGUAGE_REQUIRED: 'Selecciona un idioma de destino.',
      RESULT_INVALID: 'El resultado no corresponde a esta acción, está vacío o es demasiado grande.',
      RESULT_UNCHANGED: 'No hay cambios en el texto.',
      PREVIEW_STALE: 'El origen cambió. La vista previa se puede copiar, pero no aplicar al borrador.',
      SETTINGS_CONFLICT: 'La configuración cambió en otra pantalla; se cargó la configuración más reciente.',
      SETTINGS_INVALID: 'No se pudo leer la configuración guardada; se usan los valores predeterminados.',
      READ_TIMEOUT: 'No se pudo leer el contenido de la página. Inténtalo de nuevo.',
      READ_CANCELLED: 'Se canceló la lectura.',
      WRITE_UNSUPPORTED:
        'No se pudo comprobar que escribir en este editor sea seguro. Puedes copiar el resultado.',
      WRITE_UNCERTAIN:
        'No se pudo comprobar que el texto se insertara. Revisa el borrador; la acción no se repitió.',
      REPLY_TOO_LARGE:
        'El resultado es demasiado largo para abrirlo como respuesta. Cópialo y pégalo en una respuesta.',
      UNDO_INVALID:
        'El borrador cambió después; se desactivó la acción de deshacer automática para proteger tu texto.',
      CLIPBOARD_UNAVAILABLE:
        'El navegador no permitió escribir en el portapapeles. Selecciona el texto y pulsa Ctrl+C.',
      EXTENSION_RELOADED: 'La extensión se actualizó. Vuelve a cargar la página para continuar.',
      PROCESSING_UNAVAILABLE:
        'El procesamiento de texto aún no está conectado. Esta versión no corrige, no traduce ni redacta respuestas.',
      AI_HOST_UNAVAILABLE:
        'La aplicación auxiliar no está conectada. Abre Configuración → Aplicación auxiliar para instalarla o conectarla.',
      AI_NOT_CONNECTED: 'Falta la sesión de IA o caducó. Vuelve a conectarte en la configuración de IA.',
      AI_AUTH_FAILED:
        'No se pudo comprobar el inicio de sesión de ChatGPT o se agotó el tiempo. Inténtalo de nuevo.',
      AI_AUTH_EXCHANGE_FAILED:
        'OpenAI no aceptó el código de inicio de sesión. Empieza un nuevo intento con “Continue with ChatGPT”; no vuelvas a cargar la pestaña de retorno anterior.',
      AI_AUTH_TOKEN_INVALID:
        'A la respuesta de OpenAI le faltan datos de sesión necesarios o tiene un formato inesperado. No se conectó la cuenta (AI_AUTH_TOKEN_INVALID).',
      AI_AUTH_IDENTITY_FAILED:
        'No se pudo comprobar de forma segura la respuesta de identidad de OpenAI. No se conectó la cuenta (AI_AUTH_IDENTITY_FAILED).',
      AI_AUTH_CANCELLED: 'Se canceló el inicio de sesión de ChatGPT.',
      AI_POLICY_DENIED:
        'Una directiva de la organización bloquea “Sign in with ChatGPT” para esta aplicación. Los espacios de trabajo ChatGPT Business no tienen por ahora ningún ajuste para permitirlo; usa en su lugar “Iniciar sesión con Codex”. En Enterprise y Edu, un administrador global puede aprobar la aplicación en OpenAI Admin Console, en External access.',
      AI_WORKSPACE_MISMATCH:
        'Esta conexión pertenece a otra cuenta o espacio de trabajo de ChatGPT. Continúa con la cuenta que la creó o elige “Añadir otra cuenta o espacio de trabajo”.',
      AI_ACCOUNT_NAME_TAKEN: 'Otra conexión ya usa este nombre. Elige un nombre distinto.',
      AI_PLAN_REQUIRED:
        'Esta conexión no tiene permiso del plan de ChatGPT. La generación requiere una cuenta Plus o Pro apta y el permiso del plan; iniciar sesión con una cuenta gratuita no es suficiente.',
      AI_NOT_ELIGIBLE:
        'OpenAI denegó el uso del plan de ChatGPT para esta cuenta (subscription_sharing_user_not_eligible). Si tu suscripción Plus o Pro está activa, contacta con el soporte de OpenAI indicando este código.',
      AI_ACCESS_DENIED:
        'El proveedor de IA denegó el acceso a esta solicitud. Revisa los permisos de la aplicación, la configuración de la conexión o las restricciones regionales; en un plan de ChatGPT, este error por sí solo no indica si la suscripción es apta.',
      AI_LIMIT_REACHED:
        'Se alcanzó el límite de uso. Para ChatGPT, abre “Administrar uso” para ver cuándo se restablece; los espacios de trabajo también pueden seguir con créditos. Con un plan de Claude, inténtalo cuando se restablezca tu límite; con una clave de API, espera un momento o revisa tus límites con el proveedor.',
      AI_CREDITS_EXHAUSTED:
        'No quedan créditos. En un espacio de trabajo de ChatGPT, sus propietarios pueden añadir créditos o subir el límite de gasto en la configuración de facturación; con una clave de API, añade crédito o sube el límite de gasto con el proveedor.',
      AI_UNAVAILABLE:
        'El servicio de IA no está disponible ahora. Tu conexión se conserva; inténtalo más tarde.',
      AI_NETWORK:
        'No se pudo conectar con el servicio de IA. Revisa tu conexión a internet e inténtalo de nuevo.',
      AI_MODEL_UNAVAILABLE:
        'El modelo seleccionado no está disponible. Actualiza los modelos en la configuración de IA.',
      AI_RESPONSE_INCOMPLETE:
        'La respuesta no se completó. No se aplicó ningún texto parcial; puedes intentarlo de nuevo.',
      AI_REVOKE_UNCONFIRMED:
        'Se cerró la sesión localmente; no se pudo confirmar la revocación en OpenAI. Desconecta la aplicación en la configuración de ChatGPT.',
      AI_BUSY: 'Hay una operación de conexión de IA en curso. Espera o cancela el inicio de sesión.',
      AI_KEY_INVALID:
        'El proveedor no aceptó esta clave de API. Comprueba que la copiaste completa y que sigue activa, o crea una nueva.',
      AI_PROVIDER_ACCESS_REQUIRED: `${PRODUCT_NAME} necesita tu permiso para conectarse al proveedor. Vuelve a elegir “Conectar clave” y permite el acceso cuando el navegador lo pida.`,
      AI_KEY_STORAGE_FAILED:
        'Este navegador no pudo guardar ni leer la clave de forma segura; no se guardó nada. Comprueba que el navegador conserva los datos de sitio de las extensiones y vuelve a intentarlo.',
      AI_REQUEST_TOO_LARGE:
        'Esta solicitud es más grande de lo que el proveedor permite para este modelo o plan. Quita algunos mensajes del contexto, acorta el texto o elige otro modelo.',
      AI_CLAUDE_NOT_INSTALLED:
        'No se encontró Claude Code. Instala Claude Code y después vuelve a ejecutar el comando de instalación de la aplicación auxiliar.',
      AI_CLAUDE_NOT_LOGGED_IN:
        'Claude Code no tiene la sesión iniciada. Ejecuta claude en un terminal e inicia sesión con /login.',
      AI_CLAUDE_UNSUPPORTED_INSTALL: `Claude Code solo se encontró como script de comandos (claude.cmd), que ${PRODUCT_NAME} no puede iniciar de forma segura. Instala Claude Code con el instalador nativo oficial y después vuelve a ejecutar el comando de instalación de la aplicación auxiliar.`,
      AI_VERSION_MISMATCH:
        'La aplicación auxiliar es más antigua que esta extensión. Actualízala en Configuración → Aplicación auxiliar.',
      HOST_UPDATE_CHECK_FAILED:
        'No se pudo comprobar si hay una versión nueva de la aplicación auxiliar. Revisa tu conexión a Internet y vuelve a intentarlo más tarde.',
      HOST_UPDATE_FAILED:
        'No se pudo descargar ni instalar la actualización; la versión instalada no cambió. Vuelve a intentarlo más tarde o ejecuta de nuevo el comando de instalación.',
      HOST_UPDATE_UNVERIFIED:
        'No se pudo verificar la actualización descargada, así que no se instaló nada. La versión instalada sigue funcionando.',
      CONTENT_SCRIPT_UNREACHABLE:
        'La extensión no puede acceder a esta pestaña. Revisa el acceso al sitio o vuelve a cargar la página.',
      MESSAGE_REJECTED: 'Se rechazó un mensaje de la extensión no válido.',
      UNEXPECTED: 'Se produjo un error inesperado. Tu texto se conserva.',
    },
  },
  popup: {
    title: PRODUCT_NAME,
    statuses: {
      ready: 'El asistente de redacción está disponible en esta página.',
      waiting: 'Cargando el área de correo…',
      unsupported: 'No se reconoció el área de correo de esta pantalla.',
      disabled: 'La extensión está desactivada en este sitio. Puedes activarla en la configuración.',
      'not-mail-site': 'Esta pestaña no es un sitio de correo compatible.',
      unreachable:
        'La extensión no puede acceder a esta pestaña. Revisa el acceso al sitio o vuelve a cargar la página.',
      checking: 'Comprobando la página…',
    },
    openPanel: 'Abrir el panel en esta página',
    openSettings: 'Configuración',
    siteAccessMissing: 'No se concedió acceso a este sitio.',
    developmentBuild: 'Versión de desarrollo',
    setupNeeded: `Elige cómo se conecta ${PRODUCT_NAME} a un proveedor de IA para empezar a escribir.`,
    finishSetup: 'Completar la configuración',
  },
  options: {
    title: `Configuración de ${PRODUCT_NAME}`,
    subtitle: 'Asistente de redacción para Outlook en la Web y Gmail',
    preferencesTitle: 'Preferencias de redacción',
    preferencesDescription: 'Idioma, tono y apariencia que se usan en los trabajos nuevos.',
    uiLanguage: 'Idioma de la interfaz',
    uiLanguageAuto: 'Automático (idioma del navegador)',
    targetLanguage: 'Idioma de traducción predeterminado',
    targetLanguageHint:
      'El botón “Traducir” traduce a este idioma. Elige de la lista o escribe el nombre de un idioma.',
    favoriteLanguages: 'Idiomas del menú Traducir',
    favoriteLanguagesHint:
      'Idiomas que puedes elegir rápidamente en el menú “Traducir”. Escribe un nombre para añadir un idioma que no esté en la lista.',
    addLanguage: 'Añadir',
    removeLanguage: (language) => `Quitar ${language}`,
    favoritesFull: 'Puedes añadir hasta 10 idiomas.',
    languagesTitle: 'Idiomas',
    languagesDescription: 'Idioma de la interfaz, idioma de traducción e idiomas del menú Traducir.',
    instructionsTitle: 'Instrucciones permanentes',
    instructionsDescription:
      'Se añaden a cada solicitud de escribir, responder, corregir y traducir. Si tu indicación para una solicitud las contradice, prevalece esa indicación.',
    instructionsLabel: 'Tus preferencias de redacción',
    instructionsPlaceholder:
      'Por ejemplo: Usa un tono formal y corporativo. Párrafos cortos. Empieza con “Estimado/a” y termina con “Saludos cordiales”.',
    instructionsExamplesLabel: 'Añadir rápido',
    instructionsExamples: [
      'Usa un tono formal y corporativo.',
      'Sé breve y directo; evita las frases de relleno al inicio.',
      'Usa un tono cercano pero profesional.',
      'Termina el correo con “Saludos cordiales”.',
      'Evita la jerga salvo que se explique.',
    ],
    instructionsCount: (count, limit) => `${count}/${limit}`,
    tone: 'Tono predeterminado',
    theme: 'Tema',
    themes: { system: 'Automático (igual que tu correo)', light: 'Claro', dark: 'Oscuro' },
    themeOptions: { system: 'Automático', light: 'Claro', dark: 'Oscuro' },
    themeHint:
      'Con Automático, el panel sigue el tema de tu página de correo y esta página sigue el tema de tu sistema.',
    siteNames: { 'outlook-web': 'Outlook en la Web', 'gmail-web': 'Gmail' },
    siteEnabled: (site) => `Mostrar el asistente de redacción en ${site}`,
    siteEnabledHint: (site) => `Si está desactivado, los botones y el panel se ocultan en ${site}.`,
    unsaved: 'Tienes cambios sin guardar.',
    save: 'Guardar',
    saved: 'Configuración guardada.',
    saving: 'Guardando…',
    defaultsNote:
      'El idioma y el tono predeterminados no cambian el trabajo abierto; se aplican al siguiente trabajo.',
    privacyTitle: 'Privacidad y datos',
    privacyDescription: `Qué hace y qué no hace ${PRODUCT_NAME} con tu correo.`,
    privacyPoints: [
      'Tus preferencias se guardan solo en este dispositivo.',
      'Los correos que abres se mantienen en memoria solo mientras la página está abierta, para sugerir contexto; nunca se escriben en el disco.',
      'El texto se envía al proveedor de IA que elegiste (OpenAI, Anthropic, Groq u OpenRouter) solo cuando eliges Corregir, Traducir o Escribir respuesta.',
      'Una clave de API conectada se guarda cifrada en este navegador y solo se envía a su proveedor.',
      'Los resultados aparecen primero como vista previa y nunca se escriben en tu borrador sin tu aprobación.',
      `${PRODUCT_NAME} nunca envía correos; enviar siempre depende de ti.`,
      'Mientras la búsqueda de actualizaciones está activada, la aplicación auxiliar consulta a GitHub el número de la última versión como máximo una vez al día; la solicitud no incluye correos ni datos de la cuenta. Puedes desactivarla en la tarjeta de la aplicación auxiliar.',
    ],
  },
  welcome: welcomeEs,
};
