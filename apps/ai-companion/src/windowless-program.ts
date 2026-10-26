import { copyFile, open, rename, rm } from 'node:fs/promises';

/**
 * A Windows program starts with a console window unless its PE header names the GUI subsystem.
 * The Outlook add-in server starts at sign-in and must not show one, so `writehand outlook
 * enable` runs it from a copy of the program (the helper app, or Node.js for a development
 * install) whose subsystem field says GUI (2) instead of console (3). Nothing else in the file
 * changes; Node.js runs the same way, it only has no console to write to (the server never
 * writes to one).
 */

const GUI_SUBSYSTEM = 2;
const CONSOLE_SUBSYSTEM = 3;

/** Offset of the subsystem field: after the `PE\0\0` signature and the 20-byte file header, at 68 in the optional header (PE32 and PE32+). */
export function subsystemOffset(header: Buffer): number {
  if (header.length < 0x40 || header.toString('latin1', 0, 2) !== 'MZ')
    throw new Error('Not a Windows program.');
  const pe = header.readUInt32LE(0x3c);
  if (pe + 24 + 70 > header.length || header.toString('latin1', pe, pe + 4) !== 'PE\0\0') {
    throw new Error('Not a Windows program.');
  }
  const magic = header.readUInt16LE(pe + 24);
  if (magic !== 0x10b && magic !== 0x20b) throw new Error('Not a Windows program.');
  return pe + 24 + 68;
}

/** Sets the subsystem of a program image held in memory (used by the tests and the copy below). */
export function markWindowless(header: Buffer): void {
  const offset = subsystemOffset(header);
  const current = header.readUInt16LE(offset);
  if (current !== CONSOLE_SUBSYSTEM && current !== GUI_SUBSYSTEM) throw new Error('Unexpected program type.');
  header.writeUInt16LE(GUI_SUBSYSTEM, offset);
}

/**
 * Copies `source` to `target` as a windowless program. A running copy cannot be overwritten on
 * Windows, but it can be renamed: an existing target is moved aside first and removed when
 * possible.
 */
export async function writeWindowlessCopy(source: string, target: string): Promise<void> {
  const temporary = `${target}.${process.pid}.new`;
  await copyFile(source, temporary);
  try {
    const file = await open(temporary, 'r+');
    try {
      const header = Buffer.alloc(4096);
      await file.read(header, 0, header.length, 0);
      markWindowless(header);
      const offset = subsystemOffset(header);
      await file.write(header, offset, 2, offset);
    } finally {
      await file.close();
    }
    const aside = `${target}.${process.pid}.old`;
    await rename(target, aside).then(
      () => rm(aside, { force: true }).catch(() => undefined),
      () => undefined,
    );
    await rename(temporary, target);
  } catch (caught) {
    await rm(temporary, { force: true });
    throw caught;
  }
}
