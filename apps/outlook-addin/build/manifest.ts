import {
  OUTLOOK_ADDIN_ID,
  OUTLOOK_ADDIN_PROVIDER_NAME,
  PRODUCT_NAME,
  REPOSITORY_URL,
  type UiLanguage,
} from '@writehand/contracts';
import { addinTextFor, type AddinOwnText } from '@writehand/locales';

type ManifestText = AddinOwnText['manifest'];

/**
 * Outlook picks a manifest translation by the exact locale, so the main regions of each language
 * get one ("a bare `de` isn't supported across all combinations").
 */
export const MANIFEST_LOCALES: Readonly<Record<Exclude<UiLanguage, 'en'>, readonly string[]>> = {
  tr: ['tr-TR'],
  de: ['de-DE', 'de-AT', 'de-CH'],
  fr: ['fr-FR', 'fr-BE', 'fr-CA', 'fr-CH'],
  es: ['es-ES', 'es-MX', 'es-US'],
};

/** Mailbox 1.5: the floor for a pinnable task pane and `ItemChanged`; newer APIs are detected at run time. */
export const MINIMUM_MAILBOX_VERSION = '1.5';

export interface ManifestOptions {
  /** The task pane's HTTPS origin, without a path. */
  readonly origin: string;
  /** The release version `x.y.z`; the manifest version is `x.y.z.0`. */
  readonly version: string;
}

function escapeXml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

export function manifestVersion(version: string): string {
  if (!/^\d{1,5}\.\d{1,5}\.\d{1,5}$/.test(version)) throw new Error(`Not an x.y.z version: ${version}`);
  return `${version}.0`;
}

/** Each translated language's text for every locale Outlook may ask for. */
function overrides(pick: (text: ManifestText) => string, tag: 'Override' | 'bt:Override'): string {
  return Object.entries(MANIFEST_LOCALES)
    .flatMap(([language, locales]) => {
      const value = escapeXml(pick(addinTextFor(language as UiLanguage).addin.manifest));
      return locales.map((locale) => `<${tag} Locale="${locale}" Value="${value}"/>`);
    })
    .join('');
}

function commandSurface(surface: 'Read' | 'Compose', pinning: boolean): string {
  const point = surface === 'Read' ? 'MessageReadCommandSurface' : 'MessageComposeCommandSurface';
  return `
          <ExtensionPoint xsi:type="${point}">
            <OfficeTab id="TabDefault">
              <Group id="writehand.${surface}.Group">
                <Label resid="GroupLabel"/>
                <Control xsi:type="Button" id="writehand.${surface}.OpenPane">
                  <Label resid="ButtonLabel"/>
                  <Supertip>
                    <Title resid="ButtonLabel"/>
                    <Description resid="ButtonTooltip"/>
                  </Supertip>
                  <Icon>
                    <bt:Image size="16" resid="Icon.16x16"/>
                    <bt:Image size="32" resid="Icon.32x32"/>
                    <bt:Image size="80" resid="Icon.80x80"/>
                  </Icon>
                  <Action xsi:type="ShowTaskpane">
                    <SourceLocation resid="Taskpane.Url"/>${pinning ? '\n                    <SupportsPinning>true</SupportsPinning>' : ''}
                  </Action>
                </Control>
              </Group>
            </OfficeTab>
          </ExtensionPoint>`;
}

/** The command and resources of one `VersionOverrides` level; only v1.1 knows `SupportsPinning`. */
function overridesBody(url: (path: string) => string, pinning: boolean): string {
  const en = addinTextFor('en').addin.manifest;
  return `
      <Requirements>
        <bt:Sets DefaultMinVersion="${MINIMUM_MAILBOX_VERSION}">
          <bt:Set Name="Mailbox"/>
        </bt:Sets>
      </Requirements>
      <Hosts>
        <Host xsi:type="MailHost">
          <DesktopFormFactor>
            <FunctionFile resid="Commands.Url"/>${commandSurface('Read', pinning)}${commandSurface('Compose', pinning)}
          </DesktopFormFactor>
        </Host>
      </Hosts>
      <Resources>
        <bt:Images>
          <bt:Image id="Icon.16x16" DefaultValue="${url('assets/icon-16.png')}"/>
          <bt:Image id="Icon.32x32" DefaultValue="${url('assets/icon-32.png')}"/>
          <bt:Image id="Icon.80x80" DefaultValue="${url('assets/icon-80.png')}"/>
        </bt:Images>
        <bt:Urls>
          <bt:Url id="Taskpane.Url" DefaultValue="${url('taskpane.html')}"/>
          <bt:Url id="Commands.Url" DefaultValue="${url('commands.html')}"/>
        </bt:Urls>
        <bt:ShortStrings>
          <bt:String id="GroupLabel" DefaultValue="${escapeXml(en.groupLabel)}">${overrides((text) => text.groupLabel, 'bt:Override')}</bt:String>
          <bt:String id="ButtonLabel" DefaultValue="${escapeXml(en.buttonLabel)}">${overrides((text) => text.buttonLabel, 'bt:Override')}</bt:String>
        </bt:ShortStrings>
        <bt:LongStrings>
          <bt:String id="ButtonTooltip" DefaultValue="${escapeXml(en.buttonTooltip)}">${overrides((text) => text.buttonTooltip, 'bt:Override')}</bt:String>
        </bt:LongStrings>
      </Resources>`;
}

/**
 * The add-in only (XML) manifest: one ribbon button that opens the task pane on messages in
 * read and compose mode, pinnable, with `ReadWriteItem` and nothing else. No event-based
 * activation and no on-send handlers.
 */
export function createManifest(options: ManifestOptions): string {
  const origin = new URL(options.origin).origin;
  const url = (path: string) => `${origin}/${path}`;
  const en = addinTextFor('en').addin.manifest;
  return `<?xml version="1.0" encoding="UTF-8"?>
<OfficeApp xmlns="http://schemas.microsoft.com/office/appforoffice/1.1" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns:bt="http://schemas.microsoft.com/office/officeappbasictypes/1.0" xmlns:mailappor="http://schemas.microsoft.com/office/mailappversionoverrides/1.0" xsi:type="MailApp">
  <Id>${OUTLOOK_ADDIN_ID}</Id>
  <Version>${manifestVersion(options.version)}</Version>
  <ProviderName>${escapeXml(OUTLOOK_ADDIN_PROVIDER_NAME)}</ProviderName>
  <DefaultLocale>en-US</DefaultLocale>
  <DisplayName DefaultValue="${escapeXml(PRODUCT_NAME)}"/>
  <Description DefaultValue="${escapeXml(en.description)}">${overrides((text) => text.description, 'Override')}</Description>
  <IconUrl DefaultValue="${url('assets/icon-64.png')}"/>
  <HighResolutionIconUrl DefaultValue="${url('assets/icon-128.png')}"/>
  <SupportUrl DefaultValue="${REPOSITORY_URL}"/>
  <Hosts>
    <Host Name="Mailbox"/>
  </Hosts>
  <Requirements>
    <Sets>
      <Set Name="Mailbox" MinVersion="${MINIMUM_MAILBOX_VERSION}"/>
    </Sets>
  </Requirements>
  <FormSettings>
    <Form xsi:type="ItemRead">
      <DesktopSettings>
        <SourceLocation DefaultValue="${url('taskpane.html')}"/>
        <RequestedHeight>250</RequestedHeight>
      </DesktopSettings>
    </Form>
    <Form xsi:type="ItemEdit">
      <DesktopSettings>
        <SourceLocation DefaultValue="${url('taskpane.html')}"/>
      </DesktopSettings>
    </Form>
  </FormSettings>
  <Permissions>ReadWriteItem</Permissions>
  <Rule xsi:type="RuleCollection" Mode="Or">
    <Rule xsi:type="ItemIs" ItemType="Message" FormType="Read"/>
    <Rule xsi:type="ItemIs" ItemType="Message" FormType="Edit"/>
  </Rule>
  <DisableEntityHighlighting>true</DisableEntityHighlighting>
  <VersionOverrides xmlns="http://schemas.microsoft.com/office/mailappversionoverrides" xsi:type="VersionOverridesV1_0">${overridesBody(url, false)}
    <VersionOverrides xmlns="http://schemas.microsoft.com/office/mailappversionoverrides/1.1" xsi:type="VersionOverridesV1_1">${overridesBody(url, true)}
    </VersionOverrides>
  </VersionOverrides>
</OfficeApp>
`;
}
