/**
 * @license
 * Copyright (c) Noldova.
 *
 * This source code is licensed under the license found in the
 * LICENSE file in the root directory of this source tree.
 */

import { promisify } from "node:util";
import zlib from "node:zlib";

import { Resources } from "../resources.ts";

export class PngEncoder {
  private static readonly ALPHA_SHIFT: number = 24;
  private static readonly BLUE_MASK: number = 0xff;
  private static readonly BYTE_BITS: number = 8;
  private static readonly RED_GREEN_MASK: number = 0xffff;

  public async encodeBgraAsync(width: number, height: number, bgra: Uint8Array): Promise<Uint8Array> {
    return await PngEncoder.encodeAsync(width, height, Resources.pngColorTypeRgb, PngEncoder.toRows(width, height, bgra, Resources.rgbBytesPerPixel));
  }

  public async encodeBgraWithAlphaAsync(width: number, height: number, bgra: Uint8Array): Promise<Uint8Array> {
    return await PngEncoder.encodeAsync(width, height, Resources.pngColorTypeRgba, PngEncoder.toRows(width, height, bgra, Resources.rgbaBytesPerPixel));
  }

  private static async encodeAsync(width: number, height: number, colorType: number, rows: Uint8Array): Promise<Uint8Array> {
    const header = new DataView(new ArrayBuffer(Resources.pngHeaderLength));
    header.setUint32(0, width);
    header.setUint32(Resources.pngHeightAt, height);
    header.setUint8(Resources.pngBitDepthAt, Resources.pngBitDepth);
    header.setUint8(Resources.pngColorTypeAt, colorType);
    const pixels = await promisify(zlib.deflate)(rows);
    const chunks = [
      Uint8Array.from(Resources.pngSignature),
      PngEncoder.toChunk(Resources.pngHeaderChunk, new Uint8Array(header.buffer)),
      PngEncoder.toChunk(Resources.pngDataChunk, pixels),
      PngEncoder.toChunk(Resources.pngEndChunk, new Uint8Array(0))
    ];
    const png = new Uint8Array(chunks.reduce((total, t) => total + t.byteLength, 0));
    let offset = 0;
    for (const chunk of chunks) {
      png.set(chunk, offset);
      offset += chunk.byteLength;
    }

    return png;
  }

  private static toRows(width: number, height: number, bgra: Uint8Array, bytesPerPixel: number): Uint8Array {
    const rowLength = width * bytesPerPixel + 1;
    const rows = new Uint8Array(rowLength * height);
    const hasAlpha = bytesPerPixel === Resources.rgbaBytesPerPixel;
    const pixels = new DataView(bgra.buffer, bgra.byteOffset, bgra.byteLength);
    const output = new DataView(rows.buffer);
    let from = 0;
    for (let y = 0; y < height; y++) {
      let to = y * rowLength + 1;
      for (let x = 0; x < width; x++) {
        const pixel = pixels.getUint32(from, true);
        if (hasAlpha)
          output.setUint32(to, ((pixel << PngEncoder.BYTE_BITS) | (pixel >>> PngEncoder.ALPHA_SHIFT)) >>> 0);
        else {
          output.setUint16(to, (pixel >>> PngEncoder.BYTE_BITS) & PngEncoder.RED_GREEN_MASK);
          output.setUint8(to + 2, pixel & PngEncoder.BLUE_MASK);
        }
        from += Resources.bytesPerPixel;
        to += bytesPerPixel;
      }
    }

    return rows;
  }

  private static toChunk(type: string, data: Uint8Array): Uint8Array {
    const chunk = new Uint8Array(Resources.pngChunkOverhead + data.byteLength);
    const view = new DataView(chunk.buffer);
    view.setUint32(0, data.byteLength);
    chunk.set(new TextEncoder().encode(type), Resources.pngChunkTypeAt);
    chunk.set(data, Resources.pngChunkDataAt);
    view.setUint32(Resources.pngChunkDataAt + data.byteLength, zlib.crc32(chunk.subarray(Resources.pngChunkTypeAt, Resources.pngChunkDataAt + data.byteLength)));

    return chunk;
  }
}
