/**
 * @license
 * Copyright (c) Noldova.
 *
 * This source code is licensed under the license found in the
 * LICENSE file in the root directory of this source tree.
 */

import { readFile } from "node:fs/promises";
import zlib from "node:zlib";

import { ArchiveEntryMalformedException } from "../exceptions/archive-entry-malformed.exception.ts";
import { ArchiveUnreadableException } from "../exceptions/archive-unreadable.exception.ts";
import { Resources } from "../resources.ts";

export class ArchiveReader {
  public async readAsync(archive: string): Promise<ReadonlyMap<string, Buffer>> {
    let tar: Buffer;
    try {
      tar = zlib.gunzipSync(await readFile(archive));
    }
    catch (error) {
      if (!(error instanceof Error && Resources.errorCodeField in error && Resources.archiveUnreadableCodes.includes(String(error[Resources.errorCodeField]))))
        throw error;
      throw new ArchiveUnreadableException(archive, error);
    }

    const block = Resources.tarBlockSize;
    const files = new Map<string, Buffer>();
    let extendedName: string | null = null;
    for (let offset = 0; offset + block <= tar.length && tar[offset] !== 0;) {
      const header = tar.subarray(offset, offset + block);
      const size = Number.parseInt(ArchiveReader.readField(header, Resources.tarSizeStart, Resources.tarSizeEnd).trim(), Resources.tarSizeRadix);
      if (!Number.isInteger(size) || offset + block + size > tar.length)
        throw new ArchiveEntryMalformedException(archive, offset);
      const content = tar.subarray(offset + block, offset + block + size);
      const type = header.toString(Resources.tarHeaderEncoding, Resources.tarTypeAt, Resources.tarTypeAt + 1);
      if (type === Resources.tarExtendedType)
        extendedName = Resources.tarPathRecordPattern.exec(content.toString(Resources.textEncoding))?.[1] ?? null;
      else {
        if (Resources.tarFileTypes.includes(type))
          files.set(extendedName ?? ArchiveReader.readName(header), Buffer.from(content));
        extendedName = null;
      }
      offset += block * (1 + Math.ceil(size / block));
    }
    return files;
  }

  private static readName(header: Buffer): string {
    const name = ArchiveReader.readField(header, 0, Resources.tarNameEnd);
    const prefix = ArchiveReader.readField(header, Resources.tarPrefixStart, Resources.tarPrefixEnd);
    return prefix.length > 0 ? `${prefix}${Resources.pathSeparator}${name}` : name;
  }

  private static readField(header: Buffer, start: number, end: number): string {
    return header.toString(Resources.textEncoding, start, end).replace(Resources.tarFieldEndPattern, "");
  }
}
