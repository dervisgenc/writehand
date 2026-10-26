import type { HostInfo } from '@writehand/contracts';
import { tr } from '@writehand/locales';
import { HelperCard, type HelperView } from '@writehand/ui';
import { mount } from '@vue/test-utils';
import { describe, expect, it } from 'vitest';

const info: HostInfo = {
  version: '0.2.0',
  os: 'darwin',
  arch: 'arm64',
  browsers: ['firefox', 'chrome'],
  development: false,
};
const text = tr.ui.helper;
const render = (view: HelperView, extra: Record<string, unknown> = {}) =>
  mount(HelperCard, {
    props: {
      view,
      text,
      update: null,
      updating: false,
      updatedTo: null,
      error: null,
      checkUpdates: true,
      uninstallCommand: 'curl … | sh -s -- uninstall',
      uninstallFlag: '--delete-data',
      copied: false,
      ...extra,
    },
  });
const button = (wrapper: ReturnType<typeof render>, label: string) =>
  wrapper.findAll('button').find((item) => item.text().includes(label));

describe('Helper app card', () => {
  it('asks for the permission first and leads to the wizard while the helper is missing', async () => {
    const permission = render({ kind: 'permission' });
    expect(permission.get('.ew-status-pill').text()).toBe(text.states.permission);
    await button(permission, text.grant)!.trigger('click');
    expect(permission.emitted('grant')).toHaveLength(1);

    const missing = render({ kind: 'missing' });
    expect(missing.text()).toContain(text.missingBody);
    const wizard = button(missing, text.openWizard)!;
    expect(wizard.classes()).toContain('ew-btn--primary');
    await wizard.trigger('click');
    expect(missing.emitted('open-wizard')).toHaveLength(1);
  });

  it('shows the version, system and browsers, and offers a newer release', async () => {
    const wrapper = render(
      { kind: 'connected', info },
      { update: { current: '0.2.0', latest: '0.3.0', available: true } },
    );
    expect(wrapper.text()).toContain('Sürüm 0.2.0 · macOS (arm64)');
    expect(wrapper.text()).toContain('Kayıtlı tarayıcılar: Firefox, Chrome');
    expect(wrapper.text()).toContain(text.updateAvailable('0.3.0'));
    await button(wrapper, text.update)!.trigger('click');
    expect(wrapper.emitted('update')).toHaveLength(1);

    await wrapper.setProps({ updating: true });
    expect(button(wrapper, text.updating)!.attributes('disabled')).toBeDefined();
    await wrapper.setProps({ updating: false, updatedTo: '0.3.0', update: null });
    expect(wrapper.text()).toContain(text.updated('0.3.0'));
  });

  it('turns update checks off and on', async () => {
    const wrapper = render(
      { kind: 'connected', info },
      { update: { current: '0.2.0', latest: '0.2.0', available: false } },
    );
    expect(wrapper.text()).toContain(text.upToDate);
    await wrapper.get('input[role=switch]').setValue(false);
    expect(wrapper.emitted('toggle-updates')).toEqual([[false]]);
  });

  it('a development installation has no update controls', () => {
    const wrapper = render({ kind: 'connected', info: { ...info, development: true } });
    expect(wrapper.text()).toContain(text.development);
    expect(wrapper.find('input[role=switch]').exists()).toBe(false);
    expect(button(wrapper, text.update)).toBeUndefined();
  });

  it('an outdated helper that reports its version can update itself; an older one goes through the wizard', () => {
    expect(button(render({ kind: 'outdated', version: '0.1.0' }), text.update)).toBeDefined();
    const legacy = render({ kind: 'outdated', version: null });
    expect(button(legacy, text.update)).toBeUndefined();
    expect(button(legacy, text.openWizard)!.classes()).toContain('ew-btn--primary');
  });

  it('explains removal with a command to copy', async () => {
    const wrapper = render({ kind: 'missing' });
    expect(wrapper.text()).toContain(text.uninstallBody('--delete-data'));
    await button(wrapper, text.copy)!.trigger('click');
    expect(wrapper.emitted('copy')).toEqual([['curl … | sh -s -- uninstall']]);
    await wrapper.setProps({ copied: true });
    expect(wrapper.text()).toContain(text.copied);
  });
});
