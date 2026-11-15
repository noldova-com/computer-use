/**
 * @license
 * Copyright (c) Noldova.
 *
 * This source code is licensed under the license found in the
 * LICENSE file in the root directory of this source tree.
 */

import assert from "node:assert/strict";
import { after, describe, it } from "node:test";

import { BackendValueException } from "@noldova/computer-use.runtime";
import {
  PngChecksumException,
  PngDataCorruptException,
  PngFilterUnknownException,
  PngFormatUnsupportedException,
  PngHeaderLengthException,
  PngSignatureMissingException,
  PngTooLargeException,
  PngTruncatedException
} from "@noldova/computer-use.runtime/macos";

import { HangGuard } from "./hang-guard.fixture.ts";
import { MacBackendHarness } from "./mac-backend-harness.fixture.ts";
import { type IPngFileOptions, PngFile } from "./png-file.fixture.ts";

const WINDOW = MacBackendHarness.window;
const SHOWN_JSON = MacBackendHarness.shownJson;

after(() => {
  MacBackendHarness.removeStops();
});

function pixels(hasAlpha: boolean): readonly (readonly number[])[] {
  const values = [[200, 10, 30, 255], [40, 250, 60, 128], [70, 80, 0, 0], [255, 1, 99, 64]];

  return values.map(t => hasAlpha ? t : t.slice(0, 3));
}

async function captureAsync(options: Partial<IPngFileOptions>): Promise<readonly number[]> {
  const { channel, capturer, backend } = MacBackendHarness.start();
  channel.answers.set("readWindow", SHOWN_JSON);
  capturer.png = PngFile.build({ width: 2, height: 2, pixels: pixels(options.hasAlpha ?? false), hasAlpha: false, filters: [0, 0], ...options });

  return [...(await backend.capture.captureWindowAsync(WINDOW, HangGuard.signal()))?.bgra ?? []];
}

describe("the PNG decoder of the macOS backend's captures", () => {
  const unreadable: readonly { readonly name: string; readonly png: Uint8Array; readonly message: string; readonly exception: new (...args: never[]) => BackendValueException }[] = [
    { name: "a file too short for a PNG", png: Uint8Array.of(137, 80), message: "The capture isn't a PNG file.", exception: PngSignatureMissingException },
    { name: "a file that isn't a PNG", png: new TextEncoder().encode("GIF89a, then more"), message: "The capture isn't a PNG file.", exception: PngSignatureMissingException },
    { name: "a file that ends before its last chunk", png: PngFile.build({ width: 1, height: 1, pixels: [[1, 2, 3]], hasAlpha: false, filters: [0] }).subarray(0, 33), message: "The capture's PNG file is cut short.", exception: PngTruncatedException },
    { name: "a chunk longer than the file", png: PngFile.build({ width: 1, height: 1, pixels: [[1, 2, 3]], hasAlpha: false, filters: [0] }).subarray(0, 45), message: "The capture's PNG file is cut short.", exception: PngTruncatedException },
    { name: "a file without a header", png: PngFile.join([Uint8Array.of(137, 80, 78, 71, 13, 10, 26, 10), PngFile.chunk("IEND", new Uint8Array(0))]), message: "The capture's PNG file is cut short.", exception: PngTruncatedException },
    { name: "rows that don't fill the image", png: PngFile.build({ width: 1, height: 1, pixels: [[1, 2, 3]], hasAlpha: false, filters: [0], declaredHeight: 2 }), message: "The capture's PNG file is cut short.", exception: PngTruncatedException },
    { name: "16-bit pixels", png: PngFile.build({ width: 1, height: 1, pixels: [[1, 2, 3]], hasAlpha: false, filters: [0], bitDepth: 16 }), message: "The capture's PNG file isn't 8-bit RGB or RGBA without interlacing.", exception: PngFormatUnsupportedException },
    { name: "interlaced rows", png: PngFile.build({ width: 1, height: 1, pixels: [[1, 2, 3]], hasAlpha: false, filters: [0], interlace: 1 }), message: "The capture's PNG file isn't 8-bit RGB or RGBA without interlacing.", exception: PngFormatUnsupportedException },
    { name: "an empty image", png: PngFile.build({ width: 0, height: 1, pixels: [], hasAlpha: false, filters: [0] }), message: "The capture's PNG file isn't 8-bit RGB or RGBA without interlacing.", exception: PngFormatUnsupportedException },
    { name: "an image no rows high", png: PngFile.build({ width: 1, height: 0, pixels: [], hasAlpha: false, filters: [] }), message: "The capture's PNG file isn't 8-bit RGB or RGBA without interlacing.", exception: PngFormatUnsupportedException },
    { name: "an image larger than a capture can be", png: PngFile.build({ width: 1, height: 1, pixels: [[1, 2, 3]], hasAlpha: false, filters: [0], declaredWidth: 8193, declaredHeight: 8192 }), message: "The capture's PNG file is 8193 by 8192 pixels, more than the 67108864 pixels a capture can have.", exception: PngTooLargeException },
    { name: "an image as large as a capture can be, declared but cut short", png: PngFile.build({ width: 1, height: 1, pixels: [[1, 2, 3]], hasAlpha: false, filters: [0], declaredWidth: 8192, declaredHeight: 8192 }), message: "The capture's PNG file is cut short.", exception: PngTruncatedException },
    { name: "a header of the wrong length", png: PngFile.join([Uint8Array.of(137, 80, 78, 71, 13, 10, 26, 10), PngFile.chunk("IHDR", Uint8Array.of(0, 0, 0, 1, 0, 0, 0, 1, 8, 2, 0, 0)), PngFile.chunk("IEND", new Uint8Array(0))]), message: "The capture's PNG header holds 12 bytes, not 13.", exception: PngHeaderLengthException },
    { name: "pixel data that inflates past the image", png: PngFile.build({ width: 2, height: 2, pixels: pixels(false), hasAlpha: false, filters: [0, 0], declaredHeight: 1 }), message: "The capture's PNG pixel data can't be inflated.", exception: PngDataCorruptException },
    { name: "a row filter PNG doesn't define", png: PngFile.build({ width: 1, height: 1, pixels: [[1, 2, 3]], hasAlpha: false, filters: [5] }), message: "The capture's PNG file uses the unknown row filter 5.", exception: PngFilterUnknownException },
    {
      name: "pixel data that doesn't inflate",
      png: PngFile.join([Uint8Array.of(137, 80, 78, 71, 13, 10, 26, 10), PngFile.chunk("IHDR", Uint8Array.of(0, 0, 0, 1, 0, 0, 0, 1, 8, 2, 0, 0, 0)), PngFile.chunk("IDAT", Uint8Array.of(1, 2, 3, 4)), PngFile.chunk("IEND", new Uint8Array(0))]),
      message: "The capture's PNG pixel data can't be inflated.",
      exception: PngDataCorruptException
    }
  ];

  for (const filters of [[0, 1], [2, 3], [4, 4], [1, 4], [3, 2]])
    for (const hasAlpha of [false, true])
      it(`reads ${hasAlpha ? "RGBA" : "RGB"} rows filtered ${filters.join(" and ")} into the pixels`, async () => {
        const expected = pixels(true).flatMap(t => [t[2], t[1], t[0], hasAlpha ? t[3] : 255]);

        assert.deepEqual(await captureAsync({ hasAlpha, filters }), expected);
      });

  it("skips the chunks it doesn't need and joins the data split across chunks", async () => {
    const profile = { type: "iCCP", data: new TextEncoder().encode("profile") };

    assert.deepEqual(await captureAsync({ extraChunks: [profile], dataParts: 3, filters: [4, 2] }), pixels(false).flatMap(t => [t[2], t[1], t[0], 255]));
  });

  for (const { name, png, message, exception } of unreadable)
    it(`fails on ${name}`, async () => {
      const { channel, capturer, backend } = MacBackendHarness.start();
      channel.answers.set("readWindow", SHOWN_JSON);
      capturer.png = png;

      const capturing = backend.capture.captureWindowAsync(WINDOW, HangGuard.signal());

      await assert.rejects(capturing, exception);
      await assert.rejects(capturing, BackendValueException);
      await assert.rejects(capturing, { message });
    });

  it("fails on a chunk whose checksum doesn't match", async () => {
    const { channel, capturer, backend } = MacBackendHarness.start();
    channel.answers.set("readWindow", SHOWN_JSON);
    const png = PngFile.build({ width: 1, height: 1, pixels: [[1, 2, 3]], hasAlpha: false, filters: [0] });
    png[29] = (png[29] ?? 0) ^ 0xff;
    capturer.png = png;

    await assert.rejects(backend.capture.captureWindowAsync(WINDOW, HangGuard.signal()), PngChecksumException);
    await assert.rejects(backend.capture.captureWindowAsync(WINDOW, HangGuard.signal()), BackendValueException);
    await assert.rejects(backend.capture.captureWindowAsync(WINDOW, HangGuard.signal()), { message: "The capture's PNG chunk IHDR fails its checksum.", chunkType: "IHDR" });
  });
});
