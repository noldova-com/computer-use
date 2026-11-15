/**
 * @license
 * Copyright (c) Noldova.
 *
 * This source code is licensed under the license found in the
 * LICENSE file in the root directory of this source tree.
 */

import { promisify } from "node:util";
import zlib from "node:zlib";

import { PngChecksumException } from "../exceptions/png-checksum.exception.ts";
import { PngDataCorruptException } from "../exceptions/png-data-corrupt.exception.ts";
import { PngFilterUnknownException } from "../exceptions/png-filter-unknown.exception.ts";
import { PngFormatUnsupportedException } from "../exceptions/png-format-unsupported.exception.ts";
import { PngHeaderLengthException } from "../exceptions/png-header-length.exception.ts";
import { PngSignatureMissingException } from "../exceptions/png-signature-missing.exception.ts";
import { PngTooLargeException } from "../exceptions/png-too-large.exception.ts";
import { PngTruncatedException } from "../exceptions/png-truncated.exception.ts";
import { PixelImage } from "../models/pixel-image.ts";
import { Resources } from "../resources.ts";

export class PngDecoder {
  public async decodeAsync(png: Uint8Array): Promise<PixelImage> {
    if (png.byteLength < Resources.pngSignature.length || Resources.pngSignature.some((t, i) => png[i] !== t))
      throw new PngSignatureMissingException();

    const view = new DataView(png.buffer, png.byteOffset, png.byteLength);
    const data: Uint8Array[] = [];
    let header: DataView | null = null;
    let offset = Resources.pngSignature.length;
    let isEnded = false;
    while (!isEnded) {
      if (offset + Resources.pngChunkOverhead > png.byteLength)
        throw new PngTruncatedException();
      const length = view.getUint32(offset);
      if (offset + Resources.pngChunkOverhead + length > png.byteLength)
        throw new PngTruncatedException();
      const type = new TextDecoder().decode(png.subarray(offset + Resources.pngChunkTypeAt, offset + Resources.pngChunkDataAt));
      const body = png.subarray(offset + Resources.pngChunkDataAt, offset + Resources.pngChunkDataAt + length);
      if (view.getUint32(offset + Resources.pngChunkDataAt + length) !== zlib.crc32(png.subarray(offset + Resources.pngChunkTypeAt, offset + Resources.pngChunkDataAt + length)))
        throw new PngChecksumException(type);
      if (type === Resources.pngHeaderChunk && length !== Resources.pngHeaderLength)
        throw new PngHeaderLengthException(length);
      if (type === Resources.pngHeaderChunk)
        header = new DataView(body.buffer, body.byteOffset, body.byteLength);
      else if (type === Resources.pngDataChunk)
        data.push(body);
      isEnded = type === Resources.pngEndChunk;
      offset += Resources.pngChunkOverhead + length;
    }
    if (header === null)
      throw new PngTruncatedException();

    const width = header.getUint32(0);
    const height = header.getUint32(Resources.pngHeightAt);
    const colorType = header.getUint8(Resources.pngColorTypeAt);
    const isSupported = header.getUint8(Resources.pngBitDepthAt) === Resources.pngBitDepth && (colorType === Resources.pngColorTypeRgb || colorType === Resources.pngColorTypeRgba)
      && header.getUint8(Resources.pngCompressionAt) === 0 && header.getUint8(Resources.pngFilterMethodAt) === 0 && header.getUint8(Resources.pngInterlaceAt) === 0;
    if (!isSupported || width === 0 || height === 0)
      throw new PngFormatUnsupportedException();
    if (width * height > Resources.maxCapturePixels)
      throw new PngTooLargeException(width, height);

    const channels = colorType === Resources.pngColorTypeRgba ? Resources.rgbaBytesPerPixel : Resources.rgbBytesPerPixel;
    const stride = width * channels;
    const rows = new Uint8Array(await promisify(zlib.inflate)(Buffer.concat(data), { maxOutputLength: height * (stride + 1) }).catch((error: unknown) => {
      throw new PngDataCorruptException(error);
    }));
    if (rows.byteLength !== height * (stride + 1))
      throw new PngTruncatedException();

    return new PixelImage(width, height, PngDecoder.toBgra(PngDecoder.unfilter(rows, height, stride, channels), width, height, channels));
  }

  private static unfilter(rows: Uint8Array, height: number, stride: number, channels: number): Uint8Array {
    const pixels = new Uint8Array(height * stride);
    const filtered = new DataView(rows.buffer, rows.byteOffset, rows.byteLength);
    const unfiltered = new DataView(pixels.buffer, pixels.byteOffset, pixels.byteLength);
    for (let y = 0; y < height; y++) {
      const filter = filtered.getUint8(y * (stride + 1));
      const from = y * (stride + 1) + 1;
      const to = y * stride;
      if (filter === Resources.pngFilterNone) {
        pixels.set(rows.subarray(from, from + stride), to);
        continue;
      }
      for (let x = 0; x < stride; x++) {
        const left = x >= channels ? unfiltered.getUint8(to + x - channels) : 0;
        const up = y > 0 ? unfiltered.getUint8(to - stride + x) : 0;
        const upLeft = x >= channels && y > 0 ? unfiltered.getUint8(to - stride + x - channels) : 0;
        pixels[to + x] = filtered.getUint8(from + x) + PngDecoder.predict(filter, left, up, upLeft);
      }
    }

    return pixels;
  }

  private static predict(filter: number, left: number, up: number, upLeft: number): number {
    if (filter === Resources.pngFilterSub)
      return left;
    if (filter === Resources.pngFilterUp)
      return up;
    if (filter === Resources.pngFilterAverage)
      return Math.floor((left + up) / 2);
    if (filter === Resources.pngFilterPaeth) {
      const estimate = left + up - upLeft;
      const toLeft = Math.abs(estimate - left);
      const toUp = Math.abs(estimate - up);
      const toUpLeft = Math.abs(estimate - upLeft);
      return toLeft <= toUp && toLeft <= toUpLeft ? left : toUp <= toUpLeft ? up : upLeft;
    }

    throw new PngFilterUnknownException(filter);
  }

  private static toBgra(pixels: Uint8Array, width: number, height: number, channels: number): Uint8Array {
    const bgra = new Uint8Array(width * height * Resources.bytesPerPixel);
    const hasAlpha = channels === Resources.rgbaBytesPerPixel;
    const rgb = new DataView(pixels.buffer, pixels.byteOffset, pixels.byteLength);
    for (let from = 0, to = 0; to < bgra.byteLength; from += channels, to += Resources.bytesPerPixel) {
      bgra[to] = rgb.getUint8(from + 2);
      bgra[to + 1] = rgb.getUint8(from + 1);
      bgra[to + 2] = rgb.getUint8(from);
      bgra[to + 3] = hasAlpha ? rgb.getUint8(from + 3) : Resources.opaqueAlpha;
    }

    return bgra;
  }
}
