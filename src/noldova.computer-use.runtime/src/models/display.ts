/**
 * @license
 * Copyright (c) Noldova.
 *
 * This source code is licensed under the license found in the
 * LICENSE file in the root directory of this source tree.
 */

import { DisplayIdEmptyException } from "../exceptions/display-id-empty.exception.ts";
import { DisplayOriginInvalidException } from "../exceptions/display-origin-invalid.exception.ts";
import { DisplayScaleInvalidException } from "../exceptions/display-scale-invalid.exception.ts";
import { DisplaySizeInvalidException } from "../exceptions/display-size-invalid.exception.ts";
import type { IDisplayJson } from "../interfaces/i-display-json.ts";

export class Display {
  public readonly height: number;
  public readonly id: string;
  public readonly isPrimary: boolean;
  public readonly scaleFactor: number;
  public readonly width: number;
  public readonly x: number;
  public readonly y: number;

  public constructor(id: string, x: number, y: number, width: number, height: number, scaleFactor: number, isPrimary: boolean) {
    if (id === "")
      throw new DisplayIdEmptyException();
    if (!Number.isInteger(x) || !Number.isInteger(y))
      throw new DisplayOriginInvalidException(id);
    if (!Number.isInteger(width) || width <= 0 || !Number.isInteger(height) || height <= 0)
      throw new DisplaySizeInvalidException(id);
    if (!Number.isFinite(scaleFactor) || scaleFactor <= 0)
      throw new DisplayScaleInvalidException(id);

    this.height = height;
    this.id = id;
    this.isPrimary = isPrimary;
    this.scaleFactor = scaleFactor;
    this.width = width;
    this.x = x;
    this.y = y;
  }

  public toJson(): IDisplayJson {
    return { id: this.id, x: this.x, y: this.y, width: this.width, height: this.height, scaleFactor: this.scaleFactor, isPrimary: this.isPrimary };
  }
}
