/**
 * @license
 * Copyright (c) Noldova.
 *
 * This source code is licensed under the license found in the
 * LICENSE file in the root directory of this source tree.
 */

export interface ITestWindow {
  isTestWindowApp(identity: string): boolean;
  bringToFrontAsync(): Promise<void>;
  waitForSaveAsync(): Promise<void>;
  closeAsync(): Promise<void>;
}
