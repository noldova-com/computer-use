/**
 * @license
 * Copyright (c) Noldova.
 *
 * This source code is licensed under the license found in the
 * LICENSE file in the root directory of this source tree.
 */

import assert from "node:assert/strict";
import zlib from "node:zlib";

export class PngImage {
  private static readonly SIGNATURE: readonly number[] = [137, 80, 78, 71, 13, 10, 26, 10];
  public readonly channels: number;
  public readonly height: number;
  public readonly width: number;
  private readonly samples: Uint8Array;

  private constructor(width: number, height: number, channels: number, samples: Uint8Array) {
    this.channels = channels;
    this.height = height;
    this.samples = samples;
    this.width = width;
  }

  public static read(png: Uint8Array): PngImage {
    return PngImage.readAs(png, true);
  }

  public static readSystem(png: Uint8Array): PngImage {
    return PngImage.readAs(png, false);
  }

  private static readAs(png: Uint8Array, isModules: boolean): PngImage {
    assert.deepEqual([...png.subarray(0, 8)], PngImage.SIGNATURE);
    const view = new DataView(png.buffer, png.byteOffset, png.byteLength);
    const types: string[] = [];
    const data: Uint8Array[] = [];
    let width = 0;
    let height = 0;
    let channels = 0;
    for (let offset = 8; offset < png.byteLength;) {
      const length = view.getUint32(offset);
      const type = new TextDecoder().decode(png.subarray(offset + 4, offset + 8));
      const body = png.subarray(offset + 8, offset + 8 + length);
      assert.equal(view.getUint32(offset + 8 + length), zlib.crc32(png.subarray(offset + 4, offset + 8 + length)));
      types.push(type);
      if (type === "IHDR") {
        width = view.getUint32(offset + 8);
        height = view.getUint32(offset + 12);
        assert.ok(body[9] === 2 || body[9] === 6, `colour type ${body[9]}`);
        assert.deepEqual([...body.subarray(8)], [8, body[9], 0, 0, 0]);
        channels = body[9] === 6 ? 4 : 3;
      }
      if (type === "IDAT")
        data.push(body);
      offset += 12 + length;
    }
    const critical = isModules ? types : types.filter(t => t[0] !== t[0]?.toLowerCase()).filter((t, index, all) => t !== "IDAT" || all[index - 1] !== "IDAT");
    assert.deepEqual(critical, ["IHDR", "IDAT", "IEND"]);
    const rows = zlib.inflateSync(Buffer.concat(data));
    const stride = width * channels + 1;
    assert.equal(rows.byteLength, height * stride);
    const samples = new Uint8Array(width * height * channels);
    for (let y = 0; y < height; y++) {
      const filter = rows[y * stride] ?? Number.NaN;
      if (isModules)
        assert.equal(filter, 0);
      const line = rows.subarray(y * stride + 1, (y + 1) * stride);
      const row = y * width * channels;
      if (filter === 0) {
        samples.set(line, row);
        continue;
      }
      for (let index = 0; index < line.length; index++) {
        const left = index >= channels ? samples[row + index - channels] ?? 0 : 0;
        const up = y > 0 ? samples[row - width * channels + index] ?? 0 : 0;
        const upLeft = y > 0 && index >= channels ? samples[row - width * channels + index - channels] ?? 0 : 0;
        samples[row + index] = ((line[index] ?? 0) + PngImage.predict(filter, left, up, upLeft)) & 0xff;
      }
    }

    return new PngImage(width, height, channels, samples);
  }

  private static predict(filter: number, left: number, up: number, upLeft: number): number {
    switch (filter) {
      case 0: return 0;
      case 1: return left;
      case 2: return up;
      case 3: return Math.floor((left + up) / 2);
      case 4: {
        const estimate = left + up - upLeft;
        const [toLeft, toUp, toUpLeft] = [Math.abs(estimate - left), Math.abs(estimate - up), Math.abs(estimate - upLeft)];
        return toLeft <= toUp && toLeft <= toUpLeft ? left : toUp <= toUpLeft ? up : upLeft;
      }
      default: throw new assert.AssertionError({ message: `filter ${filter}` });
    }
  }

  public pixel(x: number, y: number): readonly number[] {
    const at = (y * this.width + x) * this.channels;

    return [...this.samples.subarray(at, at + this.channels)];
  }

  public rows(): readonly (readonly (readonly number[])[])[] {
    return Array.from({ length: this.height }, (_, y) => Array.from({ length: this.width }, (_unused, x) => this.pixel(x, y)));
  }
}
