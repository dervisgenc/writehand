import { randomUUID } from 'node:crypto';
import { chmod, mkdir, readFile, rename, rm, rmdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { lock } from 'proper-lockfile';
import { AI_MODES, HELPER_AI_MODES } from '@writehand/contracts';
import { z } from 'zod';

const credentialsSchema = z
  .object({
    accessToken: z.string(),
    refreshToken: z.string().optional(),
    idToken: z.string().optional(),
    expiresAt: z.number(),
    scopes: z.array(z.string()),
  })
  .strict();
const accountSchema = z
  .object({
    clientId: z.string(),
    /**
     * Added with the Codex sign-in. Codex sign-ins share one client, so each gets its own ID
     * and keeps the ChatGPT account (workspace) its tokens belong to. Sign in with ChatGPT
     * registrations have none: their client ID identifies them.
     */
    codex: z.object({ id: z.string(), workspaceId: z.string() }).strict().optional(),
    subject: z.string().nullable(),
    email: z.string().nullable(),
    label: z.string(),
    customLabel: z.boolean().optional(),
    credentials: credentialsSchema.nullable(),
    model: z.string().nullable(),
    welcomed: z.boolean(),
  })
  .strict();
/**
 * The file format. Helper app 0.1.0 also kept an OpenAI API key here (`api-key` mode); API keys
 * now live in the browser extension. The two fields are still written, always empty, so that
 * an earlier helper app can read the file after a downgrade.
 */
const fileSchema = z
  .object({
    version: z.literal(1),
    hostId: z.string(),
    accounts: z.array(accountSchema).max(100),
    activeAccountId: z.string().nullable(),
    mode: z.enum(AI_MODES),
    apiKey: z.string().nullable(),
    apiModel: z.string().nullable(),
    // Added with Claude Code support; files written earlier do not have it.
    claudeModel: z.string().nullable().optional(),
  })
  .strict();
const stateSchema = fileSchema
  .omit({ apiKey: true, apiModel: true })
  .extend({ mode: z.enum(HELPER_AI_MODES) })
  .strict();
export type Credentials = z.infer<typeof credentialsSchema>;
export type Account = z.infer<typeof accountSchema>;
export type CredentialState = z.infer<typeof stateSchema>;

/** A key saved by helper app 0.1.0 is dropped: nothing in the helper app uses it any more. */
function fromFile({ apiKey: _apiKey, apiModel: _apiModel, mode, ...state }: z.infer<typeof fileSchema>) {
  return { ...state, mode: mode === 'api-key' ? ('chatgpt' as const) : mode };
}

export interface CredentialStore {
  read(): Promise<CredentialState>;
  update<T>(operation: (state: CredentialState) => Promise<T> | T): Promise<T>;
}

const errorCode = (error: unknown) => (error instanceof Error && 'code' in error ? error.code : undefined);

/**
 * Replaces the credential file in one step. Windows briefly refuses to replace a file that
 * another program (antivirus, search indexing) has just opened; the store's lock is held,
 * so trying again is safe.
 */
async function replaceFile(source: string, target: string): Promise<void> {
  for (let attempt = 1; ; attempt++) {
    try {
      await rename(source, target);
      return;
    } catch (error) {
      const code = errorCode(error);
      if (attempt >= 8 || (code !== 'EPERM' && code !== 'EACCES' && code !== 'EBUSY')) throw error;
      await new Promise((resolve) => setTimeout(resolve, attempt * 50));
    }
  }
}

/**
 * Creates the helper's private data folder if needed, readable only by the user: mode 0700, and
 * on Windows an ACL for the user and the system (`restrictDirectory`). A folder that could not
 * be restricted is removed again, so a later attempt starts over.
 */
export async function preparePrivateDirectory(
  directory: string,
  restrictDirectory: ((directory: string) => Promise<void>) | null,
): Promise<void> {
  const created = await mkdir(directory, { recursive: true, mode: 0o700 });
  if (created !== undefined && restrictDirectory) {
    try {
      await restrictDirectory(directory);
    } catch (error) {
      // Never keep an unprotected directory: the next attempt creates and restricts it again.
      await rmdir(directory).catch(() => undefined);
      throw error;
    }
  }
  await chmod(directory, 0o700);
}

/** Private runtime storage, atomic replacement and a cross-process lock for rotating refresh tokens. */
export function createCredentialStore(
  directory: string,
  options: {
    /** Limits a newly created directory to its owner where mode bits cannot (Windows ACL). */
    restrictDirectory?: ((directory: string) => Promise<void>) | null;
  } = {},
): CredentialStore {
  const file = join(directory, 'credentials.json');
  const prepare = () => preparePrivateDirectory(directory, options.restrictDirectory ?? null);
  const readState = async (): Promise<CredentialState> => {
    try {
      return fromFile(fileSchema.parse(JSON.parse(await readFile(file, 'utf8'))));
    } catch (error) {
      if (errorCode(error) !== 'ENOENT') throw error;
      return {
        version: 1,
        hostId: `urn:uuid:${randomUUID()}`,
        accounts: [],
        activeAccountId: null,
        mode: 'chatgpt',
      };
    }
  };
  const update = async <T>(operation: (state: CredentialState) => Promise<T> | T): Promise<T> => {
    await prepare();
    const release = await lock(directory, {
      stale: 60_000,
      retries: { retries: 30, minTimeout: 100, maxTimeout: 1_000 },
    });
    const temporary = join(directory, `.credentials-${randomUUID()}.tmp`);
    try {
      const state = await readState();
      const result = await operation(state);
      const contents = { ...stateSchema.parse(state), apiKey: null, apiModel: null };
      await writeFile(temporary, JSON.stringify(fileSchema.parse(contents)), { mode: 0o600, flag: 'wx' });
      await replaceFile(temporary, file);
      return result;
    } finally {
      await rm(temporary, { force: true });
      await release();
    }
  };
  return {
    // Even the first read persists the host ID exactly once under the lock.
    read: () => update((state) => structuredClone(state)),
    update,
  };
}
