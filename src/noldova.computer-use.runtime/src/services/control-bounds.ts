/**
 * @license
 * Copyright (c) Noldova.
 *
 * This source code is licensed under the license found in the
 * LICENSE file in the root directory of this source tree.
 */

import { DesktopRect } from "../models/backend/desktop-rect.ts";

export class ControlBounds {
  private readonly clips: Map<string, DesktopRect | null> = new Map();

  public cut(handle: string, parentHandle: string | null, rect: { readonly x: number; readonly y: number; readonly width: number; readonly height: number }): DesktopRect | null {
    const clip = parentHandle === null ? undefined : this.clips.get(parentHandle);
    const bounds = clip === null ? null : ControlBounds.inside(rect, clip);
    this.clips.set(handle, bounds);

    return bounds;
  }

  private static inside(rect: { readonly x: number; readonly y: number; readonly width: number; readonly height: number }, clip: DesktopRect | undefined): DesktopRect | null {
    const left = Math.max(rect.x, clip?.x ?? rect.x);
    const top = Math.max(rect.y, clip?.y ?? rect.y);
    const right = Math.min(rect.x + rect.width, clip === undefined ? rect.x + rect.width : clip.x + clip.width);
    const bottom = Math.min(rect.y + rect.height, clip === undefined ? rect.y + rect.height : clip.y + clip.height);

    return right > left && bottom > top ? new DesktopRect(left, top, right - left, bottom - top) : null;
  }
}
