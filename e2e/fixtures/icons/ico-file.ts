/**
 * @license
 * Copyright (c) Noldova.
 *
 * This source code is licensed under the license found in the
 * LICENSE file in the root directory of this source tree.
 */

import type { PngImage } from "./png-image.ts";

export class IcoFile {
  private static readonly HEADER_BYTES: number = 6;
  private static readonly ENTRY_BYTES: number = 16;
  private static readonly ICON_TYPE: number = 1;
  private static readonly PLANES: number = 1;
  private static readonly BITS_PER_PIXEL: number = 32;
  private static readonly LARGEST_SIDE: number = 256;

  public static encode(images: readonly PngImage[]): Buffer {
    const encoded = images.map(t => t.encode());
    const header = Buffer.alloc(IcoFile.HEADER_BYTES + IcoFile.ENTRY_BYTES * images.length);
    header.writeUInt16LE(0, 0);
    header.writeUInt16LE(IcoFile.ICON_TYPE, 2);
    header.writeUInt16LE(images.length, 4);
    let offset = header.length;
    images.forEach((image, index) => {
      const entry = IcoFile.HEADER_BYTES + IcoFile.ENTRY_BYTES * index;
      const side = image.size >= IcoFile.LARGEST_SIDE ? 0 : image.size;
      const bytes = encoded[index]?.length ?? 0;
      header.set([side, side, 0, 0], entry);
      header.writeUInt16LE(IcoFile.PLANES, entry + 4);
      header.writeUInt16LE(IcoFile.BITS_PER_PIXEL, entry + 6);
      header.writeUInt32LE(bytes, entry + 8);
      header.writeUInt32LE(offset, entry + 12);
      offset += bytes;
    });
    return Buffer.concat([header, ...encoded]);
  }
}
