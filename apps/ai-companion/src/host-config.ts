import { z } from 'zod';

import { CLAUDE_PATH_VARIABLE } from './platform';

/**
 * What the installation recorded about this computer, kept next to the program
 * (config.json). Browsers start the host with a minimal environment; these values let the
 * optional Claude Code method run the same installation and account as the installing
 * terminal. Unknown fields (from a newer version) are ignored and a damaged file falls back
 * to the defaults, so the host always starts.
 */
const hostConfigSchema = z.object({
  /** Installed with `install --dev`: runs the bundled script on Node.js and never updates itself. */
  development: z.boolean().default(false),
  claudePath: z.string().min(1).nullable().default(null),
  claudeConfigDir: z.string().min(1).nullable().default(null),
  /** The folder of the Node.js that an npm-installed Claude Code runs on. */
  nodeDirectory: z.string().min(1).nullable().default(null),
  /**
   * Set by `writehand outlook enable`: the Outlook add-in server is on, and this certificate
   * authority (SHA-1 thumbprint) is in the user's trusted roots until the date it expires.
   */
  outlook: z
    .object({ authorityThumbprint: z.string().regex(/^[0-9A-F]{40}$/), notAfter: z.string().datetime() })
    .nullable()
    .default(null),
});
export type HostConfig = z.output<typeof hostConfigSchema>;

export const DEFAULT_HOST_CONFIG: HostConfig = Object.freeze(hostConfigSchema.parse({}));

export function parseHostConfig(text: string | null): HostConfig {
  if (text === null) return DEFAULT_HOST_CONFIG;
  try {
    return hostConfigSchema.parse(JSON.parse(text));
  } catch {
    return DEFAULT_HOST_CONFIG;
  }
}

export function serializeHostConfig(config: HostConfig): string {
  return `${JSON.stringify(hostConfigSchema.parse(config), null, 2)}\n`;
}

/** Variables the host adds to its own environment before anything else runs. */
export function hostEnvironment(
  env: Readonly<Record<string, string | undefined>>,
  config: HostConfig,
  options: { readonly user: string | undefined; readonly delimiter: string },
): Record<string, string> {
  const additions: Record<string, string> = {};
  if (config.claudePath) additions[CLAUDE_PATH_VARIABLE] = config.claudePath;
  if (config.claudeConfigDir) additions.CLAUDE_CONFIG_DIR = config.claudeConfigDir;
  if (config.nodeDirectory)
    additions.PATH = [config.nodeDirectory, env.PATH].filter(Boolean).join(options.delimiter);
  // Claude Code finds its macOS Keychain sign-in by user name; browsers may leave USER unset.
  if (!env.USER && options.user) additions.USER = options.user;
  return additions;
}
