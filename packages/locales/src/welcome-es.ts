import { PRODUCT_NAME } from '@writehand/contracts';

import type { WelcomeText } from './extension-text';

export const welcomeEs: WelcomeText = {
  title: `Te damos la bienvenida a ${PRODUCT_NAME}`,
  subtitle: 'Listo en tres pasos cortos',
  stepsLabel: 'Pasos de configuración',
  steps: ['Bienvenida', 'Conexión', 'Pruébalo'],
  back: 'Atrás',
  next: 'Continuar',
  intro: {
    title: 'Dos formas de conectarte',
    lead: `${PRODUCT_NAME} funciona dentro de Outlook en la Web y Gmail y escribe con el proveedor de IA que elijas. Elige lo que te convenga en el siguiente paso; puedes cambiarlo cuando quieras.`,
    apiKey: {
      title: 'Tu propia clave de API',
      points: [
        'Funciona directamente en el navegador; no hay nada que instalar.',
        'Groq y OpenRouter ofrecen modelos gratuitos; OpenAI es de pago por uso.',
        'La clave se guarda cifrada en este navegador y solo se envía a su proveedor.',
      ],
    },
    plan: {
      title: 'Tu plan de ChatGPT o Claude',
      points: [
        'Usa la suscripción que ya tienes: ChatGPT Plus o Pro, o Claude a través de Claude Code.',
        'Necesita una pequeña aplicación auxiliar en este equipo, instalada con un comando y sin permisos de administrador.',
        'Tu inicio de sesión se queda en este equipo, fuera del navegador. La aplicación auxiliar es de código abierto.',
      ],
    },
    source: 'Código fuente en GitHub',
    doesTitle: 'Qué hace',
    does: [
      'Envía el texto que eliges al proveedor que eliges, solo cuando lo pides.',
      'Muestra cada resultado primero como vista previa; tu borrador solo cambia cuando lo apruebas.',
    ],
    doesNotTitle: 'Qué no hace nunca',
    doesNot: [
      'Enviar correos.',
      'Leer tu buzón en segundo plano.',
      'Enviar nada a un servidor nuestro: no existe.',
    ],
  },
  install: {
    title: 'Instala la aplicación auxiliar',
    lead: 'Este método necesita una pequeña aplicación auxiliar en este equipo. Un solo comando la instala para tu cuenta de usuario; no necesitas permisos de administrador.',
    system: 'Tu sistema',
    command: 'Comando de instalación',
    terminal: {
      darwin: 'Abre Terminal (Aplicaciones → Utilidades), pega el comando y pulsa Retorno.',
      linux: 'Abre una terminal (a menudo Ctrl+Alt+T), pega el comando y pulsa Intro.',
      windows: 'Abre PowerShell (clic derecho en Inicio y elige Terminal), pega el comando y pulsa Intro.',
    },
    waiting:
      'Esperando a la aplicación auxiliar… Aparecerá aquí unos segundos después de que termine el comando.',
    connected: (version) => `Aplicación auxiliar conectada (versión ${version}).`,
    whatTitle: '¿Qué hace el comando?',
    what: [
      'Descarga el programa para tu sistema desde la última versión publicada en GitHub.',
      'Comprueba su suma SHA-256 y se detiene si no coincide.',
      'Lo instala en tu carpeta de usuario, sin permisos de administrador.',
      'Lo registra en Firefox, Chrome, Edge y Brave para que esta extensión pueda comunicarse con él.',
    ],
  },
  tryIt: {
    title: 'Pruébalo',
    lead: 'Corrige un correo inventado para comprobar que todo funciona. El texto solo va al proveedor que elegiste; no se envía ningún correo.',
    sampleLabel: 'Correo de ejemplo',
    sample:
      'Hola Sam:\n\ngracias por tu mensage. Puedo enviar el informe el jueves, pero antes nesecito las últimas cifras de tu equipo. ¿Podrías compartirlas asta el miércoles?\n\nSaludos,\nAlex',
    run: 'Corregir el ejemplo',
    running: 'Corrigiendo…',
    success:
      'Todo funciona. Abre un borrador en Outlook o Gmail; la barra de herramientas aparece junto a él.',
    resultLabel: 'Resultado',
    openOutlook: 'Abrir Outlook',
    personalOutlook: 'Outlook.com (personal)',
    openGmail: 'Abrir Gmail',
    openSettings: 'Configuración',
  },
};
