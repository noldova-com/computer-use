/**
 * @license
 * Copyright (c) Noldova.
 *
 * This source code is licensed under the license found in the
 * LICENSE file in the root directory of this source tree.
 */

import type { Capture } from "../models/backend/capture.ts";
import type { DesktopRect } from "../models/backend/desktop-rect.ts";
import { ImageSize } from "../models/image-size.ts";
import { PixelImage } from "../models/pixel-image.ts";
import { Resources } from "../resources.ts";

export class ImageScaler {
  public static fit(width: number, height: number, scale: number): ImageSize {
    const factor = scale * Math.min(1, Resources.maxImageLongEdge / Math.max(width, height), Math.sqrt(Resources.maxImagePixels / (width * height)));

    return new ImageSize(Math.max(1, Math.floor(width * factor)), Math.max(1, Math.floor(height * factor)));
  }

  public static crop(capture: Capture, rect: DesktopRect): PixelImage {
    const scaleX = capture.width / capture.frame.width;
    const scaleY = capture.height / capture.frame.height;
    const left = Math.max(0, Math.floor((rect.x - capture.frame.x) * scaleX));
    const top = Math.max(0, Math.floor((rect.y - capture.frame.y) * scaleY));
    const right = Math.min(capture.width, Math.ceil((rect.x + rect.width - capture.frame.x) * scaleX));
    const bottom = Math.min(capture.height, Math.ceil((rect.y + rect.height - capture.frame.y) * scaleY));
    const width = right - left;
    const bgra = new Uint8Array(width * (bottom - top) * PixelImage.bytesPerPixel);
    for (let y = top; y < bottom; y++) {
      const from = (y * capture.width + left) * PixelImage.bytesPerPixel;
      bgra.set(capture.bgra.subarray(from, from + width * PixelImage.bytesPerPixel), (y - top) * width * PixelImage.bytesPerPixel);
    }

    return new PixelImage(width, bottom - top, bgra);
  }

  public static shrink(image: PixelImage, width: number, height: number): PixelImage {
    if (width === image.width && height === image.height)
      return image;

    const source = new DataView(image.bgra.buffer, image.bgra.byteOffset, image.bgra.byteLength);
    const bgra = new Uint8Array(width * height * PixelImage.bytesPerPixel);
    let to = 0;
    for (let y = 0; y < height; y++) {
      const top = Math.floor(y * image.height / height);
      const bottom = Math.floor((y + 1) * image.height / height);
      for (let x = 0; x < width; x++) {
        const left = Math.floor(x * image.width / width);
        const right = Math.floor((x + 1) * image.width / width);
        let blue = 0;
        let green = 0;
        let red = 0;
        for (let sourceY = top; sourceY < bottom; sourceY++)
          for (let from = (sourceY * image.width + left) * PixelImage.bytesPerPixel; from < (sourceY * image.width + right) * PixelImage.bytesPerPixel; from += PixelImage.bytesPerPixel) {
            blue += source.getUint8(from);
            green += source.getUint8(from + 1);
            red += source.getUint8(from + 2);
          }
        const count = (right - left) * (bottom - top);
        bgra[to] = Math.round(blue / count);
        bgra[to + 1] = Math.round(green / count);
        bgra[to + 2] = Math.round(red / count);
        bgra[to + 3] = Resources.opaqueAlpha;
        to += PixelImage.bytesPerPixel;
      }
    }

    return new PixelImage(width, height, bgra);
  }
}
