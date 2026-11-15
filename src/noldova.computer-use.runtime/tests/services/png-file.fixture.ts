/**
 * @license
 * Copyright (c) Noldova.
 *
 * This source code is licensed under the license found in the
 * LICENSE file in the root directory of this source tree.
 */

import zlib from "node:zlib";

export interface IPngFileOptions {
  readonly width: number;
  readonly height: number;
  readonly pixels: readonly (readonly number[])[];
  readonly hasAlpha: boolean;
  readonly filters: readonly number[];
  readonly bitDepth?: number;
  readonly interlace?: number;
  readonly extraChunks?: readonly { readonly type: string; readonly data: Uint8Array }[];
  readonly dataParts?: number;
  readonly declaredWidth?: number;
  readonly declaredHeight?: number;
}

export class PngFile {
  private static readonly SIGNATURE: Uint8Array = Uint8Array.of(137, 80, 78, 71, 13, 10, 26, 10);

  public static build(options: IPngFileOptions): Uint8Array {
    const channels = options.hasAlpha ? 4 : 3;
    const stride = options.width * channels;
    const raw = Uint8Array.from(options.pixels.flat());
    const rows = new Uint8Array(options.height * (stride + 1));
    for (let y = 0; y < options.height; y++) {
      const filter = options.filters[y] ?? 0;
      rows[y * (stride + 1)] = filter;
      for (let x = 0; x < stride; x++) {
        const at = y * stride + x;
        const left = x >= channels ? raw[at - channels] ?? 0 : 0;
        const up = y > 0 ? raw[at - stride] ?? 0 : 0;
        const upLeft = x >= channels && y > 0 ? raw[at - stride - channels] ?? 0 : 0;
        rows[y * (stride + 1) + 1 + x] = ((raw[at] ?? 0) - PngFile.predict(filter, left, up, upLeft)) & 0xff;
      }
    }
    const header = new DataView(new ArrayBuffer(13));
    header.setUint32(0, options.declaredWidth ?? options.width);
    header.setUint32(4, options.declaredHeight ?? options.height);
    header.setUint8(8, options.bitDepth ?? 8);
    header.setUint8(9, options.hasAlpha ? 6 : 2);
    header.setUint8(12, options.interlace ?? 0);
    const data = zlib.deflateSync(rows);
    const parts = options.dataParts ?? 1;
    const size = Math.ceil(data.byteLength / parts);
    const dataChunks = Array.from({ length: parts }, (_, i) => PngFile.chunk("IDAT", data.subarray(i * size, (i + 1) * size)));

    return PngFile.join([
      PngFile.SIGNATURE,
      PngFile.chunk("IHDR", new Uint8Array(header.buffer)),
      ...(options.extraChunks ?? []).map(t => PngFile.chunk(t.type, t.data)),
      ...dataChunks,
      PngFile.chunk("IEND", new Uint8Array(0))
    ]);
  }

  public static chunk(type: string, data: Uint8Array): Uint8Array {
    const chunk = new Uint8Array(12 + data.byteLength);
    const view = new DataView(chunk.buffer);
    view.setUint32(0, data.byteLength);
    chunk.set(new TextEncoder().encode(type), 4);
    chunk.set(data, 8);
    view.setUint32(8 + data.byteLength, zlib.crc32(chunk.subarray(4, 8 + data.byteLength)));

    return chunk;
  }

  public static join(parts: readonly Uint8Array[]): Uint8Array {
    const joined = new Uint8Array(parts.reduce((total, t) => total + t.byteLength, 0));
    let offset = 0;
    for (const part of parts) {
      joined.set(part, offset);
      offset += part.byteLength;
    }

    return joined;
  }

  private static predict(filter: number, left: number, up: number, upLeft: number): number {
    if (filter === 1)
      return left;
    if (filter === 2)
      return up;
    if (filter === 3)
      return Math.floor((left + up) / 2);
    if (filter === 4) {
      const estimate = left + up - upLeft;
      const toLeft = Math.abs(estimate - left);
      const toUp = Math.abs(estimate - up);
      const toUpLeft = Math.abs(estimate - upLeft);
      return toLeft <= toUp && toLeft <= toUpLeft ? left : toUp <= toUpLeft ? up : upLeft;
    }

    return 0;
  }
}
