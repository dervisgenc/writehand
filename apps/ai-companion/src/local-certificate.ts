import { createHash, generateKeyPairSync, randomBytes, sign, type KeyObject } from 'node:crypto';

/**
 * The certificates of the local Outlook add-in server. Office loads an add-in only over HTTPS
 * with a trusted certificate, so `writehand outlook enable` creates a certificate authority that
 * may only vouch for this computer's loopback names (name constraints: `localhost`, `127.0.0.1`
 * and `::1`), issues the server certificate with it and then forgets the authority's private
 * key: it exists only in memory while this function runs and is never written anywhere. Only
 * the authority's certificate is added to the user's trusted roots; nobody can issue another
 * certificate with it, and even its server certificate is valid for loopback addresses only.
 *
 * The certificates are built here in DER (ECDSA P-256, SHA-256) so the helper needs no
 * certificate library; `X509Certificate` checks them in the tests.
 */

/** Apple refuses TLS server certificates valid for longer, so the same limit is used everywhere. */
export const CERTIFICATE_VALIDITY_DAYS = 825;
export const LOOPBACK_NAMES = Object.freeze({ dns: 'localhost', ipv4: '127.0.0.1', ipv6: '::1' });

export interface LocalCertificates {
  /** The authority's certificate, for the user's trusted roots. */
  readonly authorityPem: string;
  readonly authorityDer: Buffer;
  /** SHA-1 thumbprint of the authority's certificate (upper-case hex), as Windows lists it. */
  readonly authorityThumbprint: string;
  /** The server certificate followed by nothing else: the authority is trusted directly. */
  readonly serverPem: string;
  /** The server's private key (PKCS #8 PEM); it stays in the helper's data folder. */
  readonly serverKeyPem: string;
  readonly notAfter: Date;
}

// ---- DER encoding -------------------------------------------------------------------------

function length(size: number): Buffer {
  if (size < 0x80) return Buffer.from([size]);
  const bytes: number[] = [];
  for (let rest = size; rest > 0; rest = Math.floor(rest / 256)) bytes.unshift(rest & 0xff);
  return Buffer.from([0x80 | bytes.length, ...bytes]);
}

const tlv = (tag: number, ...content: Buffer[]): Buffer => {
  const body = Buffer.concat(content);
  return Buffer.concat([Buffer.from([tag]), length(body.length), body]);
};

const sequence = (...items: Buffer[]) => tlv(0x30, ...items);
const set = (...items: Buffer[]) => tlv(0x31, ...items);
const octetString = (value: Buffer) => tlv(0x04, value);
const utf8String = (value: string) => tlv(0x0c, Buffer.from(value, 'utf8'));
const booleanTrue = () => tlv(0x01, Buffer.from([0xff]));
/** Context-specific tag `[n]`, constructed (EXPLICIT or a constructed IMPLICIT type). */
const explicit = (n: number, ...content: Buffer[]) => tlv(0xa0 | n, ...content);
/** Context-specific tag `[n]`, primitive (IMPLICIT). */
const implicit = (n: number, value: Buffer) => tlv(0x80 | n, value);

function integer(value: Buffer): Buffer {
  let bytes = value;
  while (bytes.length > 1 && bytes[0] === 0 && (bytes[1]! & 0x80) === 0) bytes = bytes.subarray(1);
  // A leading 0x00 keeps a value with its high bit set positive.
  return tlv(0x02, (bytes[0]! & 0x80) !== 0 ? Buffer.concat([Buffer.from([0]), bytes]) : bytes);
}

function objectId(dotted: string): Buffer {
  const [first = 0, second = 0, ...rest] = dotted.split('.').map(Number);
  const bytes = [40 * first + second];
  for (const part of rest) {
    const chunk = [part & 0x7f];
    for (let value = Math.floor(part / 128); value > 0; value = Math.floor(value / 128)) {
      chunk.unshift(0x80 | (value & 0x7f));
    }
    bytes.push(...chunk);
  }
  return tlv(0x06, Buffer.from(bytes));
}

/** A BIT STRING of whole bytes (signatures, key usage) with the count of unused trailing bits. */
const bitString = (value: Buffer, unusedBits = 0) => tlv(0x03, Buffer.from([unusedBits]), value);

function time(date: Date): Buffer {
  const iso = date.toISOString().replace(/[-:T]/g, '').slice(0, 14);
  // RFC 5280: UTCTime through 2049, GeneralizedTime from 2050.
  return date.getUTCFullYear() < 2050
    ? tlv(0x17, Buffer.from(`${iso.slice(2)}Z`, 'ascii'))
    : tlv(0x18, Buffer.from(`${iso}Z`, 'ascii'));
}

// ---- Certificate structure ------------------------------------------------------------------

const OID = {
  commonName: '2.5.4.3',
  organization: '2.5.4.10',
  ecdsaWithSha256: '1.2.840.10045.4.3.2',
  subjectKeyIdentifier: '2.5.29.14',
  keyUsage: '2.5.29.15',
  subjectAltName: '2.5.29.17',
  basicConstraints: '2.5.29.19',
  nameConstraints: '2.5.29.30',
  authorityKeyIdentifier: '2.5.29.35',
  extendedKeyUsage: '2.5.29.37',
  serverAuth: '1.3.6.1.5.5.7.3.1',
} as const;

const signatureAlgorithm = () => sequence(objectId(OID.ecdsaWithSha256));

const name = (commonName: string) =>
  sequence(
    set(sequence(objectId(OID.organization), utf8String('Writehand'))),
    set(sequence(objectId(OID.commonName), utf8String(commonName))),
  );

const extension = (id: string, critical: boolean, value: Buffer) =>
  critical
    ? sequence(objectId(id), booleanTrue(), octetString(value))
    : sequence(objectId(id), octetString(value));

const IPV4_LOOPBACK = Buffer.from([127, 0, 0, 1]);
const IPV6_LOOPBACK = Buffer.from([...new Array<number>(15).fill(0), 1]);

/** The loopback names as GeneralNames: dNSName [2] and iPAddress [7]. */
const loopbackNames = () => [
  implicit(2, Buffer.from(LOOPBACK_NAMES.dns, 'ascii')),
  implicit(7, IPV4_LOOPBACK),
  implicit(7, IPV6_LOOPBACK),
];

/** permittedSubtrees for exactly the loopback names; an iPAddress subtree is address and mask. */
const loopbackConstraints = () =>
  sequence(
    explicit(
      0,
      sequence(implicit(2, Buffer.from(LOOPBACK_NAMES.dns, 'ascii'))),
      sequence(implicit(7, Buffer.concat([IPV4_LOOPBACK, Buffer.alloc(4, 0xff)]))),
      sequence(implicit(7, Buffer.concat([IPV6_LOOPBACK, Buffer.alloc(16, 0xff)]))),
    ),
  );

function keyIdentifier(publicKey: KeyObject): Buffer {
  return createHash('sha1')
    .update(publicKey.export({ type: 'spki', format: 'der' }))
    .digest();
}

function serialNumber(): Buffer {
  const serial = randomBytes(16);
  serial[0] = (serial[0]! & 0x7f) | 0x01;
  return serial;
}

interface CertificateFields {
  readonly subject: string;
  readonly issuer: string;
  readonly publicKey: KeyObject;
  readonly signingKey: KeyObject;
  readonly notBefore: Date;
  readonly notAfter: Date;
  readonly extensions: readonly Buffer[];
}

function certificate(fields: CertificateFields): Buffer {
  const tbs = sequence(
    explicit(0, integer(Buffer.from([2]))),
    integer(serialNumber()),
    signatureAlgorithm(),
    name(fields.issuer),
    sequence(time(fields.notBefore), time(fields.notAfter)),
    name(fields.subject),
    fields.publicKey.export({ type: 'spki', format: 'der' }),
    explicit(3, sequence(...fields.extensions)),
  );
  // For EC keys `sign` returns the DER `ECDSA-Sig-Value` X.509 expects.
  const signature = sign('sha256', tbs, fields.signingKey);
  return sequence(tbs, signatureAlgorithm(), bitString(signature));
}

const pem = (label: string, der: Buffer) =>
  `-----BEGIN ${label}-----\n${der.toString('base64').replace(/.{1,64}/g, '$&\n')}-----END ${label}-----\n`;

/**
 * Creates the authority and the server certificate. `label` makes the authority recognizable in
 * the user's certificate store (for example the computer's user name); it is not a secret.
 */
export function createLocalCertificates(options: {
  readonly now: Date;
  readonly label: string;
}): LocalCertificates {
  const notBefore = new Date(options.now.getTime() - 60 * 60 * 1000);
  const notAfter = new Date(options.now.getTime() + CERTIFICATE_VALIDITY_DAYS * 24 * 60 * 60 * 1000);
  const authorityName = `Writehand local Outlook add-in (${options.label})`;

  const authority = generateKeyPairSync('ec', { namedCurve: 'P-256' });
  const server = generateKeyPairSync('ec', { namedCurve: 'P-256' });
  const authorityKeyId = keyIdentifier(authority.publicKey);

  const authorityDer = certificate({
    subject: authorityName,
    issuer: authorityName,
    publicKey: authority.publicKey,
    signingKey: authority.privateKey,
    notBefore,
    notAfter,
    extensions: [
      // CA, and no intermediate authority below it.
      extension(OID.basicConstraints, true, sequence(booleanTrue(), integer(Buffer.from([0])))),
      // keyCertSign (bit 5) and cRLSign (bit 6): 0b0000011x, one unused bit.
      extension(OID.keyUsage, true, bitString(Buffer.from([0x06]), 1)),
      extension(OID.nameConstraints, true, loopbackConstraints()),
      extension(OID.subjectKeyIdentifier, false, octetString(authorityKeyId)),
    ],
  });

  const serverDer = certificate({
    subject: LOOPBACK_NAMES.dns,
    issuer: authorityName,
    publicKey: server.publicKey,
    signingKey: authority.privateKey,
    notBefore,
    notAfter,
    extensions: [
      extension(OID.basicConstraints, true, sequence()),
      // digitalSignature (bit 0): 0b1xxxxxxx, seven unused bits.
      extension(OID.keyUsage, true, bitString(Buffer.from([0x80]), 7)),
      extension(OID.extendedKeyUsage, false, sequence(objectId(OID.serverAuth))),
      extension(OID.subjectAltName, false, sequence(...loopbackNames())),
      extension(OID.subjectKeyIdentifier, false, octetString(keyIdentifier(server.publicKey))),
      extension(OID.authorityKeyIdentifier, false, sequence(implicit(0, authorityKeyId))),
    ],
  });

  return {
    authorityPem: pem('CERTIFICATE', authorityDer),
    authorityDer,
    authorityThumbprint: createHash('sha1').update(authorityDer).digest('hex').toUpperCase(),
    serverPem: pem('CERTIFICATE', serverDer),
    serverKeyPem: server.privateKey.export({ type: 'pkcs8', format: 'pem' }).toString(),
    notAfter,
  };
}
