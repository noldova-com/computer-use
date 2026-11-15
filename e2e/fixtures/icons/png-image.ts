/**
 * @license
 * Copyright (c) Noldova.
 *
 * This source code is licensed under the license found in the
 * LICENSE file in the root directory of this source tree.
 */

import { crc32, deflateSync } from "node:zlib";

import type { IconColor } from "./icon-color.ts";

export class PngImage {
  private static readonly SIGNATURE: Buffer = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  private static readonly BIT_DEPTH: number = 8;
  private static readonly RGBA_COLOR_TYPE: number = 6;
  private static readonly CHANNELS: number = 4;
  private static readonly NO_FILTER: number = 0;

  public readonly size: number;
  private readonly pixels: Buffer;

  public constructor(size: number) {
    this.size = size;
    this.pixels = Buffer.alloc(size * size * PngImage.CHANNELS);
  }

  public paint(x: number, y: number, color: IconColor): void {
    this.pixels.set([color.red, color.green, color.blue, color.alpha], (y * this.size + x) * PngImage.CHANNELS);
  }

  public encode(): Buffer {
    const header = Buffer.alloc(13);
    header.writeUInt32BE(this.size, 0);
    header.writeUInt32BE(this.size, 4);
    header.set([PngImage.BIT_DEPTH, PngImage.RGBA_COLOR_TYPE, 0, 0, 0], 8);
    const row = this.size * PngImage.CHANNELS;
    const rows = Buffer.alloc((row + 1) * this.size);
    for (let y = 0; y < this.size; y++) {
      rows[y * (row + 1)] = PngImage.NO_FILTER;
      this.pixels.copy(rows, y * (row + 1) + 1, y * row, (y + 1) * row);
    }
    return Buffer.concat([PngImage.SIGNATURE, PngImage.chunk("IHDR", header), PngImage.chunk("IDAT", deflateSync(rows)), PngImage.chunk("IEND", Buffer.alloc(0))]);
  }

  private static chunk(type: string, data: Buffer): Buffer {
    const name = Buffer.from(type, "ascii");
    const length = Buffer.alloc(4);
    length.writeUInt32BE(data.length, 0);
    const check = Buffer.alloc(4);
    check.writeUInt32BE(crc32(data, crc32(name)), 0);
    return Buffer.concat([length, name, data, check]);
  }
}
