/**
 * @license
 * Copyright (c) Noldova.
 *
 * This source code is licensed under the license found in the
 * LICENSE file in the root directory of this source tree.
 */

import type { IWindowPart, IWindowPartContext } from "@noldova/desktop.window";

/**
 * The module's window part. While a session controls the screen, the status bar shows "Controlling the screen" on its right, whose click runs
 * `computer-use.stopControl`; that command stops control through the runtime part, which stops every module's agent tools through Noldova Desktop.
 * Noldova Desktop's tray, stop key and Resume bar do the rest, so the part offers no resume. As it activates and reconnects, the part reads the
 * status the runtime part holds, so a window that opens while a session controls the screen shows the item; a change that arrives during the
 * read wins over the read's answer. It builds its command and item with Noldova Desktop's own window classes, from `@noldova/desktop.window`.
 *
 * @example
 * ```ts
 * import type { IWindowPartContext } from "@noldova/desktop.window";
 * import { ComputerUseWindowPart } from "@noldova/computer-use.window";
 *
 * export async function startAsync(context: IWindowPartContext): Promise<ComputerUseWindowPart> {
 *   const part = new ComputerUseWindowPart();
 *   await part.activateAsync(context);
 *   return part;
 * }
 * ```
 */
export declare class ComputerUseWindowPart implements IWindowPart {
  /**
   * The module's id, `computer-use`.
   */
  public readonly moduleId: string;

  /**
   * Creates the part. It takes no arguments and no type parameters, since it builds its command and status bar item with Noldova
   * Desktop's own window classes.
   */
  public constructor();

  /**
   * Adds the stop command and the status bar item, listens for status changes, and reads the status.
   *
   * @param context Noldova Desktop's window part context.
   * @returns Once the status is read.
   * @throws {JsonException} When the runtime part's answer isn't a session status's wire form.
   * @throws {ProtocolException} When the answer's fields break a session status's rules.
   */
  public activateAsync(context: IWindowPartContext): Promise<void>;

  /**
   * Reads the status again after the runtime part starts again.
   *
   * @returns False when the part isn't active, else true once the status is read.
   * @throws {JsonException} When the runtime part's answer isn't a session status's wire form.
   * @throws {ProtocolException} When the answer's fields break a session status's rules.
   */
  public reconnectAsync(): Promise<boolean>;

  /**
   * Stops listening for status changes and hides the item.
   *
   * @returns At once.
   */
  public deactivateAsync(): Promise<void>;
}
