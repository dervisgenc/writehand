import {
  API_PROVIDERS,
  appError,
  err,
  ok,
  type AiInput,
  type AiModel,
  type ApiKeyStatus,
  type ApiProvider,
  type AppError,
  type Result,
} from '@writehand/contracts';

import type { AiConnectionPreferences, AiConnectionStore } from './ai-connection-store';
import type { SecretVault } from './secret-vault';

/** One provider reached with the user's own API key. */
export interface ApiKeyProvider {
  /** Checks the key and lists the models it can use; never generates text. */
  listModels(apiKey: string): Promise<Result<AiModel[], AppError>>;
  /** The model used until the user chooses one: one that is free to use, or none. */
  defaultModel(models: readonly AiModel[]): string | null;
  generate(
    input: AiInput,
    model: string,
    apiKey: string,
    signal: AbortSignal,
  ): Promise<Result<string, AppError>>;
}

/**
 * Whether the page may reach a provider: the extension's optional host permission. The add-in's
 * Content Security Policy always allows the three providers.
 */
export type ProviderAccess = (provider: ApiProvider) => Promise<boolean>;

/** Ready to generate: a saved key, access to its provider and a chosen model. */
export function apiKeyReady(status: ApiKeyStatus): boolean {
  return status.savedKeys.includes(status.provider) && status.access && status.selectedModel !== null;
}

/**
 * The API key method, run where the keys are kept (the extension's background, the add-in's task
 * pane): no helper app is involved. Keys are kept in the vault and sent only to their own
 * provider; the UI learns only which providers have one.
 */
export function createApiKeyConnection(deps: {
  store: AiConnectionStore;
  vault: SecretVault;
  providers: Readonly<Record<ApiProvider, ApiKeyProvider>>;
  access: ProviderAccess;
}) {
  // Model lists loaded with the saved keys while the page runs; never persisted.
  const catalogs = new Map<ApiProvider, AiModel[]>();

  const vaultStep = async <T>(step: () => Promise<T>): Promise<Result<T, AppError>> => {
    try {
      return ok(await step());
    } catch {
      return err(appError('AI_KEY_STORAGE_FAILED'));
    }
  };

  /** The saved choice while the provider still offers it, otherwise the provider's free default. */
  const modelFor = (provider: ApiProvider, models: readonly AiModel[], chosen: string | undefined) =>
    chosen !== undefined && models.some((model) => model.id === chosen)
      ? chosen
      : (deps.providers[provider].defaultModel(models) ?? undefined);

  /** Sets the provider's model to what `pick` makes of the current choice, in one step. */
  const updateModel = (provider: ApiProvider, pick: (chosen: string | undefined) => string | undefined) =>
    deps.store.update((current) => {
      const { [provider]: chosen, ...others } = current.models;
      const model = pick(chosen);
      return { models: model === undefined ? others : { ...others, [provider]: model } };
    });

  /** Loads the provider's models with its saved key and keeps the model choice valid. */
  const loadModels = async (provider: ApiProvider): Promise<Result<void, AppError>> => {
    const key = await vaultStep(() => deps.vault.read(provider));
    if (!key.ok) return key;
    if (key.value === null) return ok(undefined);
    if (!(await deps.access(provider))) return err(appError('AI_PROVIDER_ACCESS_REQUIRED'));
    const models = await deps.providers[provider].listModels(key.value);
    if (!models.ok) return models;
    catalogs.set(provider, models.value);
    await updateModel(provider, (chosen) => modelFor(provider, models.value, chosen));
    return ok(undefined);
  };

  return {
    async status(preferences: AiConnectionPreferences): Promise<ApiKeyStatus> {
      const { provider } = preferences;
      // A vault that cannot be read reports no keys; saving one reports the failure.
      const saved = await deps.vault.names().catch((): string[] => []);
      return {
        provider,
        savedKeys: API_PROVIDERS.filter((name) => saved.includes(name)),
        access: await deps.access(provider),
        models: catalogs.get(provider) ?? [],
        selectedModel: preferences.models[provider] ?? null,
      };
    },

    async selectProvider(provider: ApiProvider): Promise<Result<void, AppError>> {
      await deps.store.update(() => ({ provider }));
      return catalogs.has(provider) ? ok(undefined) : loadModels(provider);
    },

    /**
     * Saves a key only after the provider accepted it by listing its models. The page asks for
     * the provider's host permission first, inside the user's click.
     */
    async saveKey(provider: ApiProvider, apiKey: string): Promise<Result<void, AppError>> {
      if (!(await deps.access(provider))) return err(appError('AI_PROVIDER_ACCESS_REQUIRED'));
      const models = await deps.providers[provider].listModels(apiKey);
      if (!models.ok) return models;
      const saved = await vaultStep(() => deps.vault.write(provider, apiKey));
      if (!saved.ok) return saved;
      catalogs.set(provider, models.value);
      await deps.store.update(() => ({ provider }));
      await updateModel(provider, (chosen) => modelFor(provider, models.value, chosen));
      return ok(undefined);
    },

    async removeKey(provider: ApiProvider): Promise<Result<void, AppError>> {
      const removed = await vaultStep(() => deps.vault.remove(provider));
      if (!removed.ok) return removed;
      catalogs.delete(provider);
      await updateModel(provider, () => undefined);
      return ok(undefined);
    },

    refreshModels: async (): Promise<Result<void, AppError>> =>
      loadModels((await deps.store.read()).provider),

    async setModel(model: string): Promise<Result<void, AppError>> {
      const { provider } = await deps.store.read();
      if (!catalogs.has(provider)) {
        const loaded = await loadModels(provider);
        if (!loaded.ok) return loaded;
      }
      if (!catalogs.get(provider)?.some((item) => item.id === model))
        return err(appError('AI_MODEL_UNAVAILABLE'));
      await updateModel(provider, () => model);
      return ok(undefined);
    },

    /** Uses the saved model without loading the list again; the provider refuses one it dropped. */
    async generate(input: AiInput, signal: AbortSignal): Promise<Result<string, AppError>> {
      const { provider, models } = await deps.store.read();
      if (!(await deps.access(provider))) return err(appError('AI_PROVIDER_ACCESS_REQUIRED'));
      const key = await vaultStep(() => deps.vault.read(provider));
      if (!key.ok) return key;
      if (key.value === null) return err(appError('AI_NOT_CONNECTED'));
      const model = models[provider];
      if (model === undefined) return err(appError('AI_MODEL_UNAVAILABLE'));
      if (signal.aborted) return err(appError('READ_CANCELLED'));
      return deps.providers[provider].generate(input, model, key.value, signal);
    },
  };
}

export type ApiKeyConnection = ReturnType<typeof createApiKeyConnection>;
