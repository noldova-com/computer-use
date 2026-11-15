/**
 * @license
 * Copyright (c) Noldova.
 *
 * This source code is licensed under the license found in the
 * LICENSE file in the root directory of this source tree.
 */

import type { IMacSignatureReader } from "@noldova/computer-use.runtime/macos";

export class MacSignatureReaderDouble implements IMacSignatureReader {
  public readonly read: string[] = [];
  public readonly signers: Map<string, string> = new Map();
  public failure: unknown;
  public during: () => void = () => undefined;

  public readSignerAsync(bundlePath: string): Promise<string | null> {
    this.read.push(bundlePath);
    this.during();
    if (this.failure !== undefined)
      return Promise.reject(this.failure);

    return Promise.resolve(this.signers.get(bundlePath) ?? null);
  }
}
