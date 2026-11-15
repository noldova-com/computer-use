/**
 * @license
 * Copyright (c) Noldova.
 *
 * This source code is licensed under the license found in the
 * LICENSE file in the root directory of this source tree.
 */

import { Resources } from "../resources.ts";

export class VersionRange {
  public readonly lowest: string;
  public readonly refused: string;

  public constructor(lowest: string, refused: string) {
    this.lowest = lowest;
    this.refused = refused;
  }

  public static parse(range: string): VersionRange | null {
    const match = Resources.peerRangePattern.exec(range);
    const lowest = match?.groups?.[Resources.lowestVersionGroup];
    const refused = match?.groups?.[Resources.refusedVersionGroup];
    return lowest === undefined || refused === undefined ? null : new VersionRange(lowest, refused);
  }

  public static isNewer(version: string, than: string): boolean {
    return VersionRange.keyOf(version) > VersionRange.keyOf(than);
  }

  public holds(version: string): boolean {
    return VersionRange.keyOf(this.lowest) <= VersionRange.keyOf(version) && VersionRange.keyOf(version) < VersionRange.keyOf(this.refused);
  }

  private static keyOf(version: string): string {
    return version.split(Resources.versionPartSeparator).map(t => t.padStart(Resources.versionPartWidth, Resources.versionPartPad)).join(Resources.versionPartSeparator);
  }
}
