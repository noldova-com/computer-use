/**
 * @license
 * Copyright (c) Noldova.
 *
 * This source code is licensed under the license found in the
 * LICENSE file in the root directory of this source tree.
 */

import { IconColor } from "./icon-color.ts";
import { PngImage } from "./png-image.ts";

export class IconShape {
  public static readonly APP: IconShape = new IconShape(true, true, false);
  public static readonly IDLE: IconShape = new IconShape(false, true, false);
  public static readonly RUNNING: IconShape = new IconShape(true, true, false);
  public static readonly UNREAD: IconShape = new IconShape(false, true, true);
  public static readonly BOTH: IconShape = new IconShape(true, true, true);

  private static readonly RING_OUTER: number = 0.44;
  private static readonly RING_INNER: number = 0.32;
  private static readonly DISC: number = 0.2;
  private static readonly BADGE_CENTRE: number = 0.8;
  private static readonly BADGE: number = 0.16;

  private readonly hasDisc: boolean;
  private readonly hasRing: boolean;
  private readonly hasBadge: boolean;

  private constructor(hasDisc: boolean, hasRing: boolean, hasBadge: boolean) {
    this.hasDisc = hasDisc;
    this.hasRing = hasRing;
    this.hasBadge = hasBadge;
  }

  public draw(size: number, color: IconColor): PngImage {
    const image = new PngImage(size);
    for (let y = 0; y < size; y++)
      for (let x = 0; x < size; x++)
        image.paint(x, y, this.isInked((x + 0.5) / size, (y + 0.5) / size) ? color : IconColor.CLEAR);
    return image;
  }

  private isInked(x: number, y: number): boolean {
    const centre = Math.hypot(x - 0.5, y - 0.5);
    const badge = Math.hypot(x - IconShape.BADGE_CENTRE, y - (1 - IconShape.BADGE_CENTRE));
    return (this.hasRing && centre <= IconShape.RING_OUTER && centre >= IconShape.RING_INNER)
      || (this.hasDisc && centre <= IconShape.DISC)
      || (this.hasBadge && badge <= IconShape.BADGE);
  }
}
