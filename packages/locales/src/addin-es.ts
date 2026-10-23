import { PRODUCT_NAME } from '@writehand/contracts';

import type { AddinOwnText } from './addin-text';

export const addinEs: AddinOwnText = {
  manifest: {
    description:
      'Corrige, traduce, responde y escribe correos en Outlook con tu propia clave de Groq, OpenRouter u OpenAI. Los resultados aparecen primero como vista previa; no se escribe nada en tu borrador sin tu aprobación.',
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
  },
  firstRun: {
    title: `Te damos la bienvenida a ${PRODUCT_NAME}`,
    lead: 'Conecta tu propia clave de API una sola vez en esta aplicación de Outlook. Groq y OpenRouter ofrecen modelos gratuitos.',
    steps: ['Conectar una clave de API', 'Pruébalo'],
    success: 'Todo funciona. Selecciona un correo o abre un borrador y elige qué hacer.',
    start: 'Empezar',
  },
  ai: {
    description: 'Escribe correos con tu propia clave de API de Groq, OpenRouter u OpenAI.',
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
      'Los planes de ChatGPT y Claude aún no están disponibles en Outlook. Conecta una clave de API en su lugar.',
  },
  privacyPoints: [
    `La página de ${PRODUCT_NAME} se carga desde su dirección web cada vez que se abre, y Office.js desde Microsoft. A ninguna de las dos se envían contenidos de correo ni claves.`,
    'Tus preferencias y la clave de API cifrada se guardan solo en esta aplicación de Outlook en este dispositivo. No se sincronizan, no se guardan en tu buzón y no se comparten con la extensión del navegador.',
    `${PRODUCT_NAME} solo lee el correo o el borrador abierto, mientras lo usas, y lo mantiene en memoria.`,
    'El texto se envía al proveedor de IA que elegiste (Groq, OpenRouter u OpenAI) solo cuando eliges Corregir, Traducir, Escribir o Preparar respuesta.',
    'Los resultados aparecen primero como vista previa y solo se escriben en tu borrador después de que los apruebes.',
    `${PRODUCT_NAME} nunca envía correos; una respuesta que abre es un borrador.`,
  ],
};
