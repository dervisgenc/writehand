import type { HelperText } from '@writehand/ui';

export const helperEs: HelperText = {
  title: 'Aplicación auxiliar',
  description:
    'Este pequeño programa de tu equipo conecta tu plan de ChatGPT o Claude y protege tus datos de inicio de sesión. Las claves de API funcionan sin él.',
  states: {
    checking: 'Comprobando…',
    permission: 'Permiso necesario',
    missing: 'No instalada',
    outdated: 'Actualización necesaria',
    connected: 'Conectada',
  },
  permissionBody:
    'Primero permite que la extensión se comunique con la aplicación auxiliar de este equipo. Tu navegador te pedirá que lo confirmes.',
  grant: 'Permitir',
  missingBody:
    'La aplicación auxiliar aún no está instalada o no se está ejecutando. El asistente de configuración la instala con un solo comando.',
  outdatedBody:
    'La aplicación auxiliar instalada es demasiado antigua para esta versión de la extensión. Actualízala para continuar.',
  version: (version, system) => `Versión ${version} · ${system}`,
  browsers: (names) => `Registrada en: ${names}`,
  development: 'Instalación de desarrollo desde el código fuente; no se actualiza sola.',
  checkUpdates: 'Buscar actualizaciones',
  checkUpdatesHint:
    'Como máximo una vez al día, la aplicación auxiliar consulta a GitHub el número de la última versión. No se envía nada más.',
  updateAvailable: (version) => `La versión ${version} está disponible.`,
  upToDate: 'La aplicación auxiliar está actualizada.',
  update: 'Instalar actualización',
  updating: 'Actualizando…',
  updated: (version) => `Actualizada a la versión ${version}.`,
  openWizard: 'Abrir el asistente de configuración',
  uninstallTitle: 'Cómo desinstalarla',
  uninstallBody: (flag) =>
    `Este comando quita la aplicación auxiliar de este equipo y de todos los navegadores. Para cerrar también las sesiones de ChatGPT y borrar los datos de inicio de sesión guardados, añade ${flag} al final.`,
  copy: 'Copiar',
  copied: 'Copiado',
};
