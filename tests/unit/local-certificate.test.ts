import { X509Certificate } from 'node:crypto';
import { createServer, request } from 'node:https';
import type { AddressInfo } from 'node:net';
import { describe, expect, it } from 'vitest';

import {
  CERTIFICATE_VALIDITY_DAYS,
  createLocalCertificates,
} from '../../apps/ai-companion/src/local-certificate';

const now = new Date('2026-10-25T12:00:00Z');
const certificates = createLocalCertificates({ now, label: 'test' });
const authority = new X509Certificate(certificates.authorityPem);
const server = new X509Certificate(certificates.serverPem);

/**
 * Connects to 127.0.0.1 with only the authority as trusted root, checking the certificate for
 * `name`, and returns the server's answer or the TLS error code.
 */
function connect(name: string): Promise<string> {
  return new Promise((resolve) => {
    const tls = createServer(
      { cert: certificates.serverPem, key: certificates.serverKeyPem },
      (_, response) => response.end('ok'),
    );
    tls.listen(0, '127.0.0.1', () => {
      const { port } = tls.address() as AddressInfo;
      const done = (value: string) => {
        tls.close();
        resolve(value);
      };
      const call = request(
        {
          host: '127.0.0.1',
          port,
          path: '/',
          ca: certificates.authorityPem,
          servername: name === '127.0.0.1' ? undefined : name,
        },
        (response) => {
          let body = '';
          response.on('data', (chunk: Buffer) => (body += chunk.toString()));
          response.on('end', () => done(body));
        },
      );
      call.on('error', (error: NodeJS.ErrnoException) => done(error.code ?? error.message));
      call.end();
    });
  });
}

describe('the local Outlook add-in certificates', () => {
  it('make an authority that signs only the server certificate and is valid for 825 days', () => {
    expect(authority.ca).toBe(true);
    expect(authority.verify(authority.publicKey)).toBe(true);
    expect(server.ca).toBe(false);
    expect(server.verify(authority.publicKey)).toBe(true);
    expect(server.checkIssued(authority)).toBe(true);
    expect(server.issuer).toBe(authority.subject);
    expect(authority.subject).toContain('Writehand local Outlook add-in (test)');
    expect(new Date(server.validTo).getTime()).toBe(
      certificates.notAfter.getTime() - (certificates.notAfter.getTime() % 1000),
    );
    const days = (certificates.notAfter.getTime() - now.getTime()) / 86_400_000;
    expect(days).toBe(CERTIFICATE_VALIDITY_DAYS);
    expect(new Date(server.validFrom).getTime()).toBeLessThan(now.getTime());
  });

  it('name only the loopback addresses in the server certificate', () => {
    expect(server.subjectAltName).toBe('DNS:localhost, IP Address:127.0.0.1, IP Address:0:0:0:0:0:0:0:1');
    expect(server.checkHost('localhost')).toBe('localhost');
    expect(server.checkIP('127.0.0.1')).toBe('127.0.0.1');
    expect(server.checkHost('example.com')).toBeUndefined();
    expect(server.keyUsage).toEqual(['1.3.6.1.5.5.7.3.1']);
  });

  it('limit the authority to the loopback names (critical name constraints)', () => {
    // permittedSubtrees [0]: dNSName "localhost", 127.0.0.1/32 and ::1/128.
    const constraints = [
      '303f', // NameConstraints
      'a03d', // permittedSubtrees
      '300b82096c6f63616c686f7374', // dNSName localhost
      '300a87087f000001ffffffff', // iPAddress 127.0.0.1 / 255.255.255.255
      `30228720${'00'.repeat(15)}01${'ff'.repeat(16)}`, // iPAddress ::1 / 128
    ].join('');
    // extnID 2.5.29.30, critical, extnValue OCTET STRING of 0x41 bytes.
    const extension = Buffer.from(`0603551d1e0101ff0441${constraints}`, 'hex');
    expect(certificates.authorityDer.includes(extension)).toBe(true);
  });

  it('carry the authority thumbprint Windows shows and a PKCS #8 server key', () => {
    expect(certificates.authorityThumbprint).toBe(authority.fingerprint.replaceAll(':', ''));
    expect(certificates.serverKeyPem).toMatch(/^-----BEGIN PRIVATE KEY-----\n/);
  });

  it('let a TLS client that trusts only the authority connect to localhost and 127.0.0.1', async () => {
    expect(await connect('localhost')).toBe('ok');
    expect(await connect('127.0.0.1')).toBe('ok');
    expect(await connect('example.com')).toBe('ERR_TLS_CERT_ALTNAME_INVALID');
  });

  it('create a different authority every time', () => {
    const other = createLocalCertificates({ now, label: 'test' });
    expect(other.authorityThumbprint).not.toBe(certificates.authorityThumbprint);
    expect(new X509Certificate(other.serverPem).verify(authority.publicKey)).toBe(false);
  });
});
