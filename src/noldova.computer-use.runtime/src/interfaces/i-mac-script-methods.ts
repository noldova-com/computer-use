/**
 * @license
 * Copyright (c) Noldova.
 *
 * This source code is licensed under the license found in the
 * LICENSE file in the root directory of this source tree.
 */

export interface IMacScriptMethods {
  readonly checkGrants: string;
  readonly listDisplays: string;
  readonly showBorder: string;
  readonly hideBorder: string;
  readonly getForegroundWindow: string;
  readonly listWindows: string;
  readonly readWindow: string;
  readonly listApps: string;
  readonly describeBundle: string;
  readonly startWatch: string;
  readonly pollWatch: string;
  readonly stopWatch: string;
  readonly readPointer: string;
  readonly glidePointer: string;
  readonly movePointer: string;
  readonly click: string;
  readonly drag: string;
  readonly scroll: string;
  readonly typeText: string;
  readonly pressKey: string;
  readonly readControls: string;
  readonly continueControls: string;
  readonly findControl: string;
  readonly hitsControl: string;
}
