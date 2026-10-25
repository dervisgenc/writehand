import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import {
  compareVersions,
  helperInstallCommand,
  helperUninstallCommand,
  NATIVE_HOST_NAME,
  runtimeRequestSchema,
  versionSchema,
} from '@writehand/contracts';
import { afterEach, describe, expect, it } from 'vitest';

import { hostPlatform, registryDefaultValue } from '../../apps/ai-companion/src/platform';
import {
  parseHostManifest,
  readRegistration,
  registeredBrowsers,
} from '../../apps/ai-companion/src/registrations';

const manifest = (path: string, extra: object = { allowed_extensions: ['writehand@dervisgenc.com'] }) =>
  JSON.stringify({ name: NATIVE_HOST_NAME, description: 'x', path, type: 'stdio', ...extra });

describe('Helper version compatibility', () => {
  it('compares release versions numerically', () => {
    expect(compareVersions('0.10.0', '0.9.9')).toBe(1);
    expect(compareVersions('1.0.0', '1.0.0')).toBe(0);
    expect(compareVersions('1.2.3', '1.10.0')).toBe(-1);
  });

  it('accepts only plain MAJOR.MINOR.PATCH versions', () => {
    for (const valid of ['0.1.0', '10.20.30']) expect(versionSchema.safeParse(valid).success).toBe(true);
    for (const invalid of ['1.0', '01.0.0', '1.0.0-beta', 'v1.0.0', '1.0.0\n'])
      expect(versionSchema.safeParse(invalid).success, invalid).toBe(false);
  });

  it('HOST_INFO is a request of its own, so an older helper answers it with AI_VERSION_MISMATCH', () => {
    const request = { protocolVersion: 1, requestId: 'r', type: 'HOST_INFO', payload: {} };
    expect(runtimeRequestSchema.safeParse(request).success).toBe(true);
  });
});

describe('Install commands', () => {
  const id = 'abcdefghijklmnopabcdefghijklmnop';
  const download = 'https://github.com/dervisgenc/writehand/releases/latest/download';

  it('install the latest release with one line on each system', () => {
    expect(helperInstallCommand('darwin', null)).toBe(`curl -fsSL ${download}/install.sh | sh`);
    expect(helperInstallCommand('linux', id)).toBe(
      `curl -fsSL ${download}/install.sh | sh -s -- --extension-id=${id}`,
    );
    expect(helperInstallCommand('windows', null)).toBe(`irm ${download}/install.ps1 | iex`);
    expect(helperInstallCommand('windows', id)).toBe(
      `$env:WRITEHAND_EXTENSION_ID='${id}'; irm ${download}/install.ps1 | iex`,
    );
  });

  it('never put anything but a Chromium extension ID into a command', () => {
    expect(helperInstallCommand('linux', "x'; rm -rf ~")).toBe(`curl -fsSL ${download}/install.sh | sh`);
    expect(helperInstallCommand('windows', 'writehand@dervisgenc.com')).toBe(
      `irm ${download}/install.ps1 | iex`,
    );
  });

  it('remove the helper app with the same scripts', () => {
    expect(helperUninstallCommand('linux')).toBe(`curl -fsSL ${download}/install.sh | sh -s -- uninstall`);
    expect(helperUninstallCommand('windows')).toBe(
      `& ([scriptblock]::Create((irm ${download}/install.ps1))) -Uninstall`,
    );
  });
});

describe('Browser registrations', () => {
  const temporary: string[] = [];
  afterEach(async () => {
    for (const directory of temporary.splice(0)) await rm(directory, { recursive: true, force: true });
  });

  it('reads only manifests of this helper', () => {
    expect(parseHostManifest(manifest('/p/writehand'))).toEqual({
      path: '/p/writehand',
      allowed: ['writehand@dervisgenc.com'],
    });
    expect(
      parseHostManifest(manifest('/p/writehand', { allowed_origins: ['chrome-extension://a/'] })),
    ).toEqual({ path: '/p/writehand', allowed: ['chrome-extension://a/'] });
    expect(parseHostManifest(JSON.stringify({ name: 'other.host', path: '/x', allowed_origins: [] }))).toBe(
      null,
    );
    expect(parseHostManifest('not json')).toBe(null);
  });

  it('reads the manifest path from reg.exe output in any display language', () => {
    const value = 'C:\\Users\\Ada\\AppData\\Local\\Programs\\writehand\\com.dervisgenc.writehand.chrome.json';
    expect(
      registryDefaultValue(
        `\r\nHKEY_CURRENT_USER\\Software\\X\r\n    (Default)    REG_SZ    ${value}\r\n\r\n`,
      ),
    ).toBe(value);
    expect(registryDefaultValue(`    (Standard)    REG_SZ    ${value}\r\n`)).toBe(value);
    expect(registryDefaultValue('')).toBe(null);
  });

  it('on Windows a manifest counts only while the registry points at it', async () => {
    const values = new Map<string, string>();
    const platform = {
      ...hostPlatform('win32', {}, 'C:\\Users\\Ada'),
      registry: {
        read: async (key: string) => values.get(key) ?? null,
        set: async () => undefined,
        remove: async () => undefined,
        readValue: async () => null,
        setValue: async () => undefined,
        removeValue: async () => undefined,
      },
    };
    // No registry value: the browser never reads the file, so it is not read either.
    expect(await readRegistration(platform, 'chrome')).toBe(null);
    values.set(platform.registration('chrome').registryKey!, 'C:\\elsewhere.json');
    expect(await readRegistration(platform, 'chrome')).toBe(null);
  });

  it.skipIf(process.platform === 'win32')(
    'lists the browsers whose manifest starts this program',
    async () => {
      const home = await mkdtemp(join(tmpdir(), 'writehand-registrations-'));
      temporary.push(home);
      const platform = hostPlatform('linux', {}, home);
      const write = async (browser: 'firefox' | 'chrome' | 'edge', content: string) => {
        const { manifest: path } = platform.registration(browser);
        await mkdir(join(path, '..'), { recursive: true });
        await writeFile(path, content);
      };
      await write('firefox', manifest('/opt/writehand'));
      await write('chrome', manifest('/old/launcher', { allowed_origins: [] }));
      await write('edge', '{');
      expect(await registeredBrowsers(platform, '/opt/writehand')).toEqual(['firefox']);
    },
  );
});
