import { PRODUCT_NAME } from '@writehand/contracts';

import type { AddinOwnText } from './addin-text';

export const addinEs: AddinOwnText = {
  manifest: {
    description:
      'Corrige, traduce y escribe correos en Outlook con tu plan de ChatGPT o Claude a través de la aplicación auxiliar de Writehand, o con tu propia clave de API. No se escribe nada en tu borrador sin tu aprobación.',
    groupLabel: PRODUCT_NAME,
    buttonLabel: PRODUCT_NAME,
    buttonTooltip: `Abre ${PRODUCT_NAME} para corregir, traducir o escribir este correo. No se escribe ni se envía nada sin tu aprobación.`,
  },
  pane: {
    settings: 'Configuración',
    back: 'Volver',
    loading: 'Cargando…',
    noItem: 'Selecciona un correo o abre un borrador para empezar.',
    outsideOutlook: `${PRODUCT_NAME} funciona dentro de Outlook. Ábrelo con el botón de ${PRODUCT_NAME} de un correo o un borrador.`,
    helperUnavailable:
      'Los planes de ChatGPT y Claude funcionan en la aplicación auxiliar de Writehand, que sirve este panel, pero no respondió. Ejecuta writehand outlook status en un terminal o usa una clave de API.',
  },
  firstRun: {
    title: `Te damos la bienvenida a ${PRODUCT_NAME}`,
    lead: 'Elige una sola vez en esta aplicación de Outlook cómo conectarte: tu plan de ChatGPT o Claude a través de la aplicación auxiliar, o tu propia clave de API (Groq y OpenRouter ofrecen modelos gratuitos).',
    steps: ['Elegir una conexión', 'Pruébalo'],
    success: 'Todo funciona. Selecciona un correo o abre un borrador y elige qué hacer.',
    start: 'Empezar',
  },
  ai: {
    description:
      'Escribe correos con tu plan de ChatGPT o Claude a través de la aplicación auxiliar, o con tu propia clave de API de Groq, OpenRouter u OpenAI.',
    apiNote: (provider) =>
      `Tu clave se guarda cifrada en esta aplicación de Outlook y solo se envía a ${provider}. El uso de pago lo factura ${provider}.`,
    keySaved: (provider) => `Clave de ${provider} guardada, cifrada en esta aplicación de Outlook.`,
    apiPrivacy: (provider) =>
      `Cuando pides una generación, tu texto, tus indicaciones y el contexto seleccionado se envían desde esta aplicación de Outlook directamente a ${provider}, según las condiciones de ${provider}. La clave solo sale de esta aplicación de Outlook para autenticarse con ${provider}.`,
  },
  errors: {
    CLIPBOARD_UNAVAILABLE:
      'Outlook no permitió escribir en el portapapeles. Selecciona el texto y pulsa Ctrl+C.',
    AI_KEY_STORAGE_FAILED:
      'Esta aplicación de Outlook no pudo guardar ni leer la clave de forma segura; no se guardó nada. Vuelve a intentarlo; si sigue fallando, Outlook no conserva datos de complementos en este equipo.',
    AI_HOST_UNAVAILABLE:
      'La aplicación auxiliar de Writehand no respondió. Comprueba que se está ejecutando (writehand outlook status) o conecta una clave de API.',
  },
  privacyPoints: [
    `El panel de ${PRODUCT_NAME} lo sirve su aplicación auxiliar en este ordenador; solo Office.js de Microsoft se carga desde internet. No se envían contenidos de correo ni claves a Microsoft.`,
    'Tus preferencias y una clave de API cifrada se guardan solo en esta aplicación de Outlook en este dispositivo. Los inicios de sesión de ChatGPT se quedan en la aplicación auxiliar de este ordenador, que también usa la extensión del navegador. No se guarda nada en tu buzón.',
    `${PRODUCT_NAME} solo lee el correo o el borrador abierto, mientras lo usas, y lo mantiene en memoria.`,
    'El texto solo se envía cuando eliges Corregir, Traducir, Escribir o Preparar respuesta, y solo al método que elegiste: ChatGPT o Claude a través de la aplicación auxiliar, o Groq, OpenRouter u OpenAI con tu clave.',
    'Los resultados aparecen primero como vista previa y solo se escriben en tu borrador después de que los apruebes.',
    `${PRODUCT_NAME} nunca envía correos; una respuesta que abre es un borrador.`,
  ],
};
