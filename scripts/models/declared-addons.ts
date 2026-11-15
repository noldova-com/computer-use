/**
 * @license
 * Copyright (c) Noldova.
 *
 * This source code is licensed under the license found in the
 * LICENSE file in the root directory of this source tree.
 */

export class DeclaredAddons {
  public readonly windows: readonly string[];
  public readonly posix: readonly string[];

  public constructor(windows: readonly string[], posix: readonly string[]) {
    this.windows = windows;
    this.posix = posix;
  }
}
