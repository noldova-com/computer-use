/**
 * @license
 * Copyright (c) Noldova.
 *
 * This source code is licensed under the license found in the
 * LICENSE file in the root directory of this source tree.
 */

import type { IScreenFrameJson } from "../interfaces/i-screen-frame-json.ts";
import type { Capture } from "./backend/capture.ts";
import type { CaptureLayout } from "./backend/capture-layout.ts";
import { DesktopPoint } from "./backend/desktop-point.ts";
import { DesktopRect } from "./backend/desktop-rect.ts";
import { ImagePoint } from "./image-point.ts";
import { ImageRect } from "./image-rect.ts";

export class ScreenFrame {
  public readonly displayId: string;
  public readonly frame: DesktopRect;
  public readonly height: number;
  public readonly id: string;
  public readonly width: number;

  public constructor(id: string, displayId: string, frame: DesktopRect, width: number, height: number) {
    this.displayId = displayId;
    this.frame = frame;
    this.height = height;
    this.id = id;
    this.width = width;
  }

  public get scale(): number {
    return this.width / this.frame.width;
  }

  public isFrameOf(capture: Capture): boolean {
    return this.isAt(capture.displayId, capture.frame);
  }

  public isLayoutOf(layout: CaptureLayout): boolean {
    return this.isAt(layout.displayId, layout.frame);
  }

  public isSameAs(other: ScreenFrame): boolean {
    return this.isAt(other.displayId, other.frame) && other.width === this.width && other.height === this.height;
  }

  public holdsPoint(x: number, y: number): boolean {
    return x >= 0 && y >= 0 && x < this.width && y < this.height;
  }

  public toDesktopPoint(x: number, y: number): DesktopPoint {
    return new DesktopPoint(this.frame.x + Math.floor((x + 0.5) * this.frame.width / this.width), this.frame.y + Math.floor((y + 0.5) * this.frame.height / this.height));
  }

  public toImagePoint(point: DesktopPoint): ImagePoint | null {
    const x = Math.floor((point.x - this.frame.x) * this.width / this.frame.width);
    const y = Math.floor((point.y - this.frame.y) * this.height / this.frame.height);

    return this.holdsPoint(x, y) ? new ImagePoint(x, y) : null;
  }

  public toImageRect(rect: DesktopRect): ImageRect | null {
    const left = Math.max(0, Math.floor((rect.x - this.frame.x) * this.width / this.frame.width));
    const top = Math.max(0, Math.floor((rect.y - this.frame.y) * this.height / this.frame.height));
    const right = Math.min(this.width, Math.ceil((rect.x + rect.width - this.frame.x) * this.width / this.frame.width));
    const bottom = Math.min(this.height, Math.ceil((rect.y + rect.height - this.frame.y) * this.height / this.frame.height));

    return left < right && top < bottom ? new ImageRect(left, top, right - left, bottom - top) : null;
  }

  public holds(left: number, top: number, right: number, bottom: number): boolean {
    return left >= 0 && top >= 0 && left < right && top < bottom && right <= this.width && bottom <= this.height;
  }

  public toDesktopRect(left: number, top: number, right: number, bottom: number): DesktopRect {
    const x = this.frame.x + Math.floor(left * this.frame.width / this.width);
    const y = this.frame.y + Math.floor(top * this.frame.height / this.height);
    const endX = this.frame.x + Math.ceil(right * this.frame.width / this.width);
    const endY = this.frame.y + Math.ceil(bottom * this.frame.height / this.height);

    return new DesktopRect(x, y, endX - x, endY - y);
  }

  public toJson(): IScreenFrameJson {
    return { id: this.id, display: this.displayId, width: this.width, height: this.height, scale: this.scale };
  }

  private isAt(displayId: string, frame: DesktopRect): boolean {
    return displayId === this.displayId && frame.x === this.frame.x && frame.y === this.frame.y && frame.width === this.frame.width && frame.height === this.frame.height;
  }
}
