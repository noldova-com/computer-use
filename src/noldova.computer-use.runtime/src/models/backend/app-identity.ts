/**
 * @license
 * Copyright (c) Noldova.
 *
 * This source code is licensed under the license found in the
 * LICENSE file in the root directory of this source tree.
 */

import { win32 } from "node:path";

import { ArgumentOutOfRangeException } from "@noldova/context.exceptions";

import { BundleIdInvalidException } from "../../exceptions/bundle-id-invalid.exception.ts";
import { ProgramPathInvalidException } from "../../exceptions/program-path-invalid.exception.ts";
import { Resources } from "../../resources.ts";

export class AppIdentity {
  public readonly id: string;

  public constructor(id: string) {
    if (id.trim() === "")
      throw new ArgumentOutOfRangeException(Resources.idParameterName, id, Resources.emptyAppIdentity);

    this.id = id;
  }

  public static ofWindowsPath(programPath: string): AppIdentity {
    if (!AppIdentity.isWindowsPath(programPath))
      throw new ProgramPathInvalidException(programPath);

    return new AppIdentity(Array.from(win32.normalize(programPath), t => AppIdentity.toWindowsLowerCase(t)).join(""));
  }

  public static isWindowsPath(programPath: string): boolean {
    const path = win32.normalize(programPath);

    return win32.isAbsolute(path) && win32.parse(path).root.length >= Resources.minWindowsRootLength && !path.endsWith(win32.sep);
  }

  public static ofMacBundleId(bundleId: string): AppIdentity {
    if (bundleId === "" || Resources.bundleIdForbiddenPattern.test(bundleId))
      throw new BundleIdInvalidException(bundleId);

    return new AppIdentity(bundleId.toLowerCase());
  }

  private static toWindowsLowerCase(character: string): string {
    const lower = character.toLowerCase();

    return character.length === 1 && lower.length === 1 && lower.toUpperCase() === character ? lower : character;
  }
}
