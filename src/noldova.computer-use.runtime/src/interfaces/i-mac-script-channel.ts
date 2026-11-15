/**
 * @license
 * Copyright (c) Noldova.
 *
 * This source code is licensed under the license found in the
 * LICENSE file in the root directory of this source tree.
 */

export interface IMacScriptChannel {
  callAsync(method: string, parameters: object): Promise<unknown>;
  closeAsync(): Promise<void>;
}
