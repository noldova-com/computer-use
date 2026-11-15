/**
 * @license
 * Copyright (c) Noldova.
 *
 * This source code is licensed under the license found in the
 * LICENSE file in the root directory of this source tree.
 */

import type { PngImage } from "./png-image.fixture.ts";

export class ScreenRead {
  public readonly image: PngImage;
  public readonly text: unknown;

  public constructor(image: PngImage, text: unknown) {
    this.image = image;
    this.text = text;
  }
}
