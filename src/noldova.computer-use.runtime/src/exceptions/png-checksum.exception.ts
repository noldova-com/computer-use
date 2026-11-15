/**
 * @license
 * Copyright (c) Noldova.
 *
 * This source code is licensed under the license found in the
 * LICENSE file in the root directory of this source tree.
 */

import { Resources } from "../resources.ts";
import { BackendValueException } from "./backend-value.exception.ts";

export class PngChecksumException extends BackendValueException {
  public readonly chunkType: string;

  public constructor(chunkType: string) {
    super(Resources.formatPngBadChunk(chunkType));

    this.chunkType = chunkType;
  }
}
