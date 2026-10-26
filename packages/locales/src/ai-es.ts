import { PRODUCT_NAME } from '@writehand/contracts';
import type { AiText } from '@writehand/ui';

export const aiEs: AiText = {
  title: 'Conexión de IA',
  description:
    'Escribe correos con tu propia clave de API de Groq, OpenRouter u OpenAI, tu plan de ChatGPT o Claude Code en este equipo.',
  chatgpt: 'Plan de ChatGPT',
  apiKey: 'Clave de API',
  claudeCode: 'Plan de Claude',
  methodHints: {
    chatgpt: 'Con tu plan Plus, Pro o Business',
    'api-key': 'Groq, OpenRouter u OpenAI; también modelos gratuitos',
    'claude-code': 'Con Claude Code en este equipo',
  },
  methodLabel: 'Método de conexión',
  recommended: 'Recomendado',
  experimental: 'Experimental',
  needsHelper: 'Necesita la aplicación auxiliar',
  helperRequired: `Este método funciona en la aplicación auxiliar de ${PRODUCT_NAME}, que aún no está conectada. Instálala con el asistente de configuración o elige “Clave de API”, que funciona sin ella.`,
  statusReady: 'Listo',
  statusSetup: 'Falta la instalación',
  statusAction: 'Falta la conexión',
  guide: {
    title: 'Guía de conexión',
    intro:
      'Configura uno de los métodos siguientes para generar texto. Cada sección indica lo que necesitas y los pasos que debes seguir.',
    requirementsLabel: 'Necesitas',
    stepsLabel: 'Pasos',
    notesLabel: 'Conviene saber',
    current: 'Seleccionado',
    methods: {
      chatgpt: {
        title: 'Plan de ChatGPT',
        summary: 'Genera texto con el uso incluido en tu plan de ChatGPT.',
        requirements: [
          'Una suscripción ChatGPT Plus o Pro, o un espacio de trabajo Business, Enterprise o Edu. Las cuentas gratuitas no permiten usar el plan.',
          `La aplicación auxiliar de ${PRODUCT_NAME} en este equipo.`,
        ],
        steps: [
          'Elige “Plan de ChatGPT” como método.',
          'Elige “Continue with ChatGPT”. En la página que se abre, elige tu cuenta y permite el acceso.',
          'En un espacio de trabajo Business, Enterprise o Edu, elige en su lugar “Iniciar sesión con Codex” y después el espacio de trabajo.',
          'Vuelve a esta página; la cuenta muestra “Conectado · Listo para generar texto”. Después elige un modelo.',
        ],
        notes: [
          'El uso se descuenta de los límites de tu plan de ChatGPT. Puedes seguirlo en ChatGPT → Configuración → Usage.',
          'Si acabas de mejorar tu plan, puede tardar unos minutos en activarse.',
          '“Continue with ChatGPT” admite por ahora los planes Plus y Pro; en cuentas de trabajo, una directiva de la organización lo bloquea. “Iniciar sesión con Codex” usa en su lugar el inicio de sesión de la aplicación Codex de OpenAI. Es experimental: OpenAI no lo documenta para otras aplicaciones y puede cambiarlo.',
          'Con “Iniciar sesión con Codex”, el uso se descuenta de los límites de tu plan, que ChatGPT comparte con Codex y otras funciones de trabajo. En los espacios de trabajo Business, los créditos permiten seguir cuando se alcanza el límite semanal; sus propietarios los añaden en la configuración de facturación.',
          'Puedes quitar el acceso cuando quieras en ChatGPT → Configuración → Security and login → Sign in with ChatGPT.',
        ],
      },
      'api-key': {
        title: 'Clave de API',
        summary:
          'Genera texto con tu propia clave de Groq, OpenRouter u OpenAI, directamente desde este navegador. No necesitas la aplicación auxiliar.',
        requirements: [
          'Una clave de API de Groq, OpenRouter u OpenAI. El plan gratuito de Groq y los modelos gratuitos de OpenRouter no piden método de pago.',
        ],
        steps: [
          'Elige “Clave de API” como método y después el proveedor.',
          'Crea una clave en el sitio del proveedor (enlaces abajo) y pégala.',
          'Elige “Conectar clave” y permite que el navegador se conecte al proveedor.',
          'Elige un modelo. Con Groq se selecciona por ti el modelo abierto gratuito de OpenAI openai/gpt-oss-120b.',
        ],
        notes: [
          'El plan gratuito de Groq tiene límites por minuto y por día. Una conversación larga puede superarlos; quita algunos mensajes del contexto o vuelve a intentarlo más tarde.',
          'En OpenRouter, los modelos gratuitos aparecen primero. Tu configuración de privacidad de OpenRouter decide qué proveedores pueden recibir tu texto; algunos modelos gratuitos solo los ofrecen proveedores que pueden guardar las solicitudes.',
          'El uso de pago lo factura el proveedor, aparte de cualquier suscripción de ChatGPT o Claude. Los modelos de OpenAI siempre son de pago, así que eliges tú el modelo.',
          'La clave se guarda cifrada en este navegador y solo se envía a su proveedor. No se vuelve a mostrar; para cambiarla, conecta una clave nueva.',
          'Cualquiera que pueda usar tu perfil del navegador puede generar texto con la clave guardada. Mejor usa una clave con límite de gasto y quítala en equipos compartidos.',
        ],
      },
      'claude-code': {
        title: 'Plan de Claude',
        summary: 'Usa Claude Code en tu equipo con tu propia cuenta de Claude.',
        requirements: [
          'Una suscripción Claude Pro, Max, Team o Enterprise.',
          'Claude Code instalado en este equipo y con la sesión iniciada en tu cuenta de Claude.',
          `La aplicación auxiliar de ${PRODUCT_NAME}. Si la instalas después de Claude Code, lo encuentra automáticamente.`,
        ],
        steps: [
          'Instala Claude Code siguiendo las instrucciones oficiales de Anthropic.',
          'En un terminal, ejecuta `claude` e inicia sesión en tu cuenta de Claude con `/login`.',
          'Instala la aplicación auxiliar; si ya la tenías instalada, vuelve a instalarla después de Claude Code.',
          'Elige “Plan de Claude” como método. Aquí aparecerán tu cuenta y tu plan.',
        ],
        notes: [
          `${PRODUCT_NAME} nunca ve ni guarda tu contraseña ni tu sesión de Claude; inicias y cierras sesión a través de Claude Code.`,
          'El uso se descuenta del límite de tu plan, que compartes con Claude Code.',
          'En los planes Pro y Max, el contenido puede usarse para entrenar modelos, salvo que lo hayas desactivado en tu configuración de privacidad de Claude. Los planes Team y Enterprise se rigen por las condiciones comerciales.',
          'Si Claude Code tiene la sesión iniciada con una clave de API, el uso se factura a esa cuenta de API.',
          'Este método depende de las normas de Anthropic para aplicaciones de terceros y se ofrece como experimental. Puede dejar de funcionar si esas normas cambian.',
        ],
        linkLabel: 'Guía de instalación de Claude Code',
      },
    },
    helper: {
      title: '¿Qué es la aplicación auxiliar?',
      summary:
        'Una pequeña aplicación en tu equipo que necesitan los planes de ChatGPT y Claude; las claves de API funcionan sin ella.',
      requirements: ['macOS, Linux o Windows. No necesitas ningún otro programa.'],
      steps: [
        'Abre el asistente de configuración desde Configuración → Aplicación auxiliar y ejecuta el comando de una línea que muestra.',
        'En unos segundos la aplicación auxiliar aparece como conectada; después elige un método aquí.',
      ],
      notes: [
        'Los datos de inicio de sesión de ChatGPT se guardan en un archivo protegido al que solo tú puedes acceder, no en el navegador.',
        'La aplicación auxiliar solo se ejecuta cuando pides texto; nunca lee ni envía correos en segundo plano.',
      ],
    },
  },
  connect: 'Continue with ChatGPT',
  codexConnect: 'Iniciar sesión con Codex',
  codexHint:
    'Para espacios de trabajo ChatGPT Business, Enterprise y Edu. Usa el inicio de sesión de la aplicación Codex de OpenAI; no hace falta tener Codex instalado. Experimental.',
  codexSignIn: 'Inicio de sesión con Codex',
  codexConnectionHelp:
    'Esta conexión usa el inicio de sesión de Codex. El uso se descuenta de los límites de tu plan compartidos con Codex; en los espacios de trabajo Business, los créditos permiten seguir cuando se agotan. Puedes cerrar la sesión quitando la cuenta aquí.',
  codexWarningTitle: 'Antes de iniciar sesión con Codex',
  codexWarning: [
    'Úsalo solo para un espacio de trabajo ChatGPT Business, Enterprise o Edu, donde una directiva de la organización bloquea Continue with ChatGPT. Para Plus y Pro, usa Continue with ChatGPT.',
    `${PRODUCT_NAME} inicia sesión con el inicio de sesión de la aplicación Codex de OpenAI. OpenAI no ha publicado este inicio de sesión para otras aplicaciones: puede cambiar o dejar de funcionar en cualquier momento, y OpenAI puede restringir las cuentas que lo usen así.`,
    'Se aplican las directivas de tu espacio de trabajo. Si no sabes si puedes usarlo, consulta antes al administrador de tu espacio de trabajo.',
  ],
  codexWarningContinue: 'Entendido, continuar',
  addAccount: 'Añadir otra cuenta o espacio de trabajo',
  reconnect: 'Volver a conectar',
  disconnect: 'Desconectar',
  account: 'Cuenta de ChatGPT',
  activeAccount: 'Cuenta en uso',
  useAccount: 'Usar esta cuenta',
  savedConnection: 'Cuenta conectada. Elige “Usar esta cuenta” para generar con ella.',
  renameAccount: 'Cambiar nombre',
  accountName: 'Nombre de la conexión',
  accountNameHint:
    'Por ejemplo, “Personal” o “Trabajo · Nombre de la empresa”. El nombre solo se guarda en este dispositivo; hasta 80 caracteres.',
  saveAccountName: 'Guardar nombre',
  removeAccount: 'Quitar cuenta',
  removeAccountTitle: '¿Quitar esta conexión?',
  removeAccountBody:
    'Se quitarán de este dispositivo el registro de la cuenta y sus credenciales; si existe una sesión de OpenAI, se intentará revocarla. Se cancelará cualquier inicio de sesión pendiente. Vuelve a añadir la cuenta para usarla más adelante. Tu cuenta de ChatGPT no se eliminará.',
  confirmRemoveAccount: 'Quitar',
  savedAccountHint:
    'Selecciona una conexión guardada para cambiarle el nombre o quitarla. Los botones de inicio de sesión usan la cuenta y el espacio de trabajo de la conexión seleccionada. Para conectar otra cuenta, usa el botón de añadir de abajo.',
  model: 'Modelo',
  refresh: 'Actualizar',
  checking: 'Comprobando la conexión…',
  signingIn: 'Completa el inicio de sesión de ChatGPT en la ventana del navegador.',
  cancel: 'Cancelar',
  connected: 'Conectado · Listo para generar texto',
  disconnected: 'Sesión cerrada',
  registrationIncomplete:
    'La conexión de la cuenta está incompleta; sus datos aún no se han comprobado. Vuelve a probar “Continue with ChatGPT” con la misma cuenta y el mismo espacio de trabajo que en el primer intento.',
  generationUnavailable:
    'Cuenta comprobada y permiso del plan concedido; la generación de texto aún no está lista. Elige “Actualizar” para volver a cargar la lista de modelos.',
  planDisabled:
    'Cuenta comprobada; la generación no está autorizada. Usar el plan requiere una cuenta Plus o Pro apta y permiso para usar su plan. Iniciar sesión con una cuenta gratuita no da acceso a la generación.',
  planNote:
    'Las cuentas Plus y Pro aptas pueden usar la asignación de su plan con “Continue with ChatGPT”. Para espacios de trabajo Business, Enterprise y Edu, usa “Iniciar sesión con Codex”.',
  apiNote: (provider) =>
    `Tu clave se guarda cifrada en este navegador y solo se envía a ${provider}. El uso de pago lo factura ${provider}, aparte de cualquier suscripción de ChatGPT o Claude.`,
  claudeNote: `Claude Code, instalado en este equipo, se ejecuta con tu propia cuenta de Claude; el uso se descuenta de los límites de tu plan de Claude. ${PRODUCT_NAME} no accede a tus credenciales de Claude ni las guarda. Inicias y cierras sesión a través de Claude Code.`,
  claudeAccount: 'Cuenta de Claude Code',
  claudeNotInstalled:
    'No se encontró Claude Code en este equipo. Instala Claude Code, vuelve a ejecutar el comando de instalación de la aplicación auxiliar y después elige “Actualizar”.',
  claudeNotLoggedIn:
    'Claude Code no tiene la sesión iniciada. Ejecuta claude en un terminal, inicia sesión con /login y después elige “Actualizar”.',
  claudeApiBilling:
    'Claude Code tiene la sesión iniciada con un método distinto de una suscripción de Claude, como una clave de API; el uso se factura a esa cuenta.',
  claudePrivacy:
    'Cuando pides una generación, tu texto, tus indicaciones y el contexto seleccionado se envían a Anthropic a través de Claude Code. Claude Code se ejecuta sin herramientas, no puede acceder a tus archivos y no guarda transcripciones de sesión. Los planes Pro y Max se rigen por las condiciones para consumidores de Anthropic: salvo que hayas desactivado el entrenamiento de modelos en tu configuración de privacidad de Claude, el contenido puede usarse para entrenar. Los planes Team y Enterprise se rigen por las condiciones comerciales.',
  provider: 'Proveedor',
  providerHints: {
    groq: 'Rápido, con modelos gratuitos como GPT-OSS de OpenAI en su plan gratuito.',
    openrouter: 'Cientos de modelos de muchos proveedores; algunos son gratuitos.',
    openai: 'Los modelos GPT de OpenAI; pago por uso.',
  },
  apiKeyLabel: (provider) => `Clave de API de ${provider}`,
  createKey: (provider) => `Crear una clave de API de ${provider}`,
  saveKey: 'Conectar clave',
  removeKey: 'Quitar clave',
  keySaved: (provider) => `Clave de ${provider} guardada, cifrada en este navegador.`,
  replaceKeyHint: 'Para usar otra clave, pégala y elige “Conectar clave”; sustituye a la guardada.',
  keyFromOtherProvider: (provider) =>
    `Parece una clave de ${provider}, así que no se envió. Elige ${provider} arriba o pega una clave del proveedor seleccionado.`,
  accessNeeded: (provider) =>
    `El navegador no permite que ${PRODUCT_NAME} se conecte a ${provider}. Permite el acceso para usar la clave guardada.`,
  grantAccess: 'Permitir acceso',
  freeModels: 'Modelos gratuitos',
  paidModels: 'Modelos de pago',
  apiPrivacy: (provider) =>
    `Cuando pides una generación, tu texto, tus indicaciones y el contexto seleccionado se envían desde este navegador directamente a ${provider}, según las condiciones de ${provider}. La clave solo sale de este navegador para autenticarse con ${provider}.`,
  manageUsage: 'Administrar uso',
  connectionHelp:
    'Administra esta conexión en la configuración de ChatGPT, en Security and login → Sign in with ChatGPT. No aparece en Plugins. Las cuentas de trabajo también dependen de la directiva de la organización y de la idoneidad del plan.',
  welcome: 'Estás usando tu plan de ChatGPT',
  welcomeBody: `La generación apta en ${PRODUCT_NAME} usa la asignación de tu plan de ChatGPT o los créditos disponibles. Administra el uso de esta aplicación en la configuración de ChatGPT.`,
  gotIt: 'Entendido',
  privacy:
    'Cuando pides una generación, tu texto, tus indicaciones y el contexto seleccionado se envían a OpenAI. La extensión no los guarda en el disco. No tiene acceso a tu historial de conversaciones de ChatGPT.',
  usePlan: 'Usando el plan de ChatGPT',
  useApi: (provider) => `Usando la clave de API de ${provider}`,
  useClaude: 'Usando el plan de Claude',
  openSettings: 'Configuración de IA',
  notReady: 'Conecta una cuenta de IA para generar texto',
};
