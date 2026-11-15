/**
 * @license
 * Copyright (c) Noldova.
 *
 * This source code is licensed under the license found in the
 * LICENSE file in the root directory of this source tree.
 */

import type { ComputerUseWindowPart } from "@noldova/computer-use.window";

/**
 * The module's window part, which Noldova Desktop activates in each window of an app that lists the module: while a session controls the
 * screen, the status bar shows it with the stop control. It is built with Noldova Desktop's window package's own classes.
 *
 * @example
 * ```ts
 * import type { IWindowPartContext } from "@noldova/desktop.window";
 * import { windowPart } from "@noldova/computer-use/window";
 *
 * export async function startAsync(context: IWindowPartContext): Promise<void> {
 *   await windowPart.activateAsync(context);
 * }
 * ```
 */
export declare const windowPart: ComputerUseWindowPart;
