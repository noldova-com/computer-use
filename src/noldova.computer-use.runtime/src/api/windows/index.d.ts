/**
 * @license
 * Copyright (c) Noldova.
 *
 * This source code is licensed under the license found in the
 * LICENSE file in the root directory of this source tree.
 */

import type { ExceptionOptions } from "@noldova/context.exceptions";

import type {
  ComputerUseException,
  IAppBackend,
  IBorderBackend,
  ICaptureBackend,
  IControlBackend,
  IDisplayBackend,
  IInputBackend,
  IOperatingSystemBackend,
  IPhysicalInputMonitor,
  IWindowBackend
} from "../index.d.ts";

/**
 * Thrown when the Windows addon can't be loaded, or lacks a function the module calls; each way has its own subclass. The addon loads on
 * the first call that needs it, so the call that loads it throws this, synchronously, and the backend's promise rejects with it.
 *
 * @example
 * ```ts
 * import { AddonLoadException, WindowsBackend } from "@noldova/computer-use.runtime/windows";
 *
 * try {
 *   await WindowsBackend.load().displays.listDisplaysAsync(AbortSignal.timeout(1000));
 * }
 * catch (error) {
 *   console.log(error instanceof AddonLoadException);
 * }
 * ```
 */
export declare abstract class AddonLoadException extends ComputerUseException {
  /**
   * Creates the exception with its message, for a subclass.
   *
   * @param message What went wrong.
   * @param options The underlying error, if any.
   */
  protected constructor(message: string, options?: ExceptionOptions);
}

/**
 * Thrown when there is no addon build for the platform and processor.
 *
 * @example
 * ```ts
 * import { AddonMissingException } from "@noldova/computer-use.runtime/windows";
 *
 * console.log(new AddonMissingException("windows-desktop.node", "win32-arm64").target);
 * ```
 */
export declare class AddonMissingException extends AddonLoadException {
  /**
   * The addon's file.
   */
  public readonly file: string;

  /**
   * The platform and processor, such as `win32-x64`.
   */
  public readonly target: string;

  /**
   * Creates the exception, with its message from the facts.
   *
   * @param file The addon's file.
   * @param target The platform and processor, such as `win32-x64`.
   */
  public constructor(file: string, target: string);
}

/**
 * Thrown when Node can't load the addon, with Node's error as its cause.
 *
 * @example
 * ```ts
 * import { AddonLoadFailedException } from "@noldova/computer-use.runtime/windows";
 *
 * console.log(new AddonLoadFailedException("windows-desktop.node", new Error("Not a valid Win32 application.")).cause);
 * ```
 */
export declare class AddonLoadFailedException extends AddonLoadException {
  /**
   * The addon's file.
   */
  public readonly file: string;

  /**
   * Creates the exception, with its message from the facts.
   *
   * @param file The addon's file.
   * @param cause Node's error.
   */
  public constructor(file: string, cause: unknown);
}

/**
 * Thrown when the addon lacks a function the module calls.
 *
 * @example
 * ```ts
 * import { AddonIncompleteException } from "@noldova/computer-use.runtime/windows";
 *
 * console.log(new AddonIncompleteException("windows-desktop.node").file);
 * ```
 */
export declare class AddonIncompleteException extends AddonLoadException {
  /**
   * The addon's file.
   */
  public readonly file: string;

  /**
   * Creates the exception, with its message from the facts.
   *
   * @param file The addon's file.
   */
  public constructor(file: string);
}

/**
 * The programs the addon finds: the host's own, those with a visible window, and those Windows registers as installed.
 */
export interface IWindowsAppPathsJson {
  /**
   * The full path of the program the module runs in.
   */
  readonly host: string;

  /**
   * The full paths of the programs that own a visible, unowned, uncloaked window that isn't a tool window, each once, in the order of
   * their windows from front to back.
   */
  readonly running: readonly string[];

  /**
   * The full paths Windows registers under App Paths, for the machine and for the person, that exist on disk.
   */
  readonly installed: readonly string[];
}

/**
 * The functions of the Windows addon, which every Windows backend calls; a double of it drives the backends in tests.
 *
 * @remarks
 * Positions and sizes are desktop coordinates in physical pixels, since the module is aware of per-monitor scaling.
 * Each input function checks its target in the same call, before it sends anything, and reports a refusal as its outcome rather than
 * throwing it. Every function runs synchronously on the calling thread.
 *
 * The addon throws its errors synchronously, each with `code` set to `"ERR_WINDOWS_DESKTOP"`: a `TypeError` for an argument of the wrong
 * kind, a `RangeError` for a value out of range, and an `Error` for a Windows failure, its message naming the Windows error.
 * {@link WindowsBackend.load}'s addon throws {@link AddonLoadException} from the first call instead, when the addon can't be loaded.
 *
 * @example
 * ```ts
 * import type { IWindowsDesktopApi } from "@noldova/computer-use.runtime/windows";
 *
 * function findPrimaryDisplay(api: IWindowsDesktopApi): string | undefined {
 *   return api.listDisplays().find(t => t.isPrimary)?.id;
 * }
 * ```
 */
export interface IWindowsDesktopApi {
  /**
   * Lists the displays.
   *
   * @returns Every display attached to the desktop, in the order Windows enumerates them; a new array on each call.
   * @throws {Error} Throws when Windows can't list the displays.
   * @throws {AddonLoadException} Throws on the first call when the addon can't be loaded.
   *
   * @example
   * ```ts
   * import type { IWindowsDesktopApi } from "@noldova/computer-use.runtime/windows";
   *
   * declare const api: IWindowsDesktopApi;
   * console.log(api.listDisplays().length);
   * ```
   */
  listDisplays(): readonly IWindowsDisplayJson[];

  /**
   * Has a listed window draw itself, through `PrintWindow` with `PW_RENDERFULLCONTENT`, and keeps the part inside its frame:
   * only the window's own pixels, whatever lies in front of it on the screen.
   *
   * @remarks
   * The window's own thread draws it, so the drawing runs on a thread of its own, and the call waits for it on a thread of
   * Node's pool, never on the JavaScript thread. A drawing that doesn't end by the timeout is left to end on its own, and
   * the window has no image until it does.
   *
   * @param windowId The window's handle, as a decimal number, as {@link IWindowsDesktopApi.listWindows} gives it.
   * @param x The frame's left edge, as the list gave it.
   * @param y The frame's top edge, as the list gave it.
   * @param width The frame's width in pixels, from 1 to 32768.
   * @param height The frame's height in pixels, from 1 to 32768.
   * @param timeoutMs How long the window may take to draw itself, from 1 to 60000 milliseconds.
   * @returns The frame's pixels, in a new buffer the caller owns; `null` when the window has gone, no longer shows, doesn't
   * respond, no longer lies at the frame, still draws for an earlier capture, can't be drawn, or isn't drawn in time.
   * @throws {TypeError} Throws when the window ID isn't a decimal handle.
   * @throws {RangeError} Throws when the width, the height or the timeout is out of range.
   * @throws {AddonLoadException} Throws on the first call when the addon can't be loaded.
   *
   * @example
   * ```ts
   * import type { IWindowsDesktopApi } from "@noldova/computer-use.runtime/windows";
   *
   * declare const api: IWindowsDesktopApi;
   * const [window] = api.listWindows().windows;
   * const image = window === undefined ? null : await api.captureWindow(window.windowId, window.x, window.y, window.width, window.height, 500);
   * console.log(image?.bgra.byteLength);
   * ```
   */
  captureWindow(windowId: string, x: number, y: number, width: number, height: number, timeoutMs: number): Promise<IWindowsImageJson | null>;

  /**
   * Reads the top-level window in front.
   *
   * @returns The window in front, or `null` when none is or it can't be read, for example while the secure desktop shows.
   * @throws {AddonLoadException} Throws on the first call when the addon can't be loaded.
   *
   * @example
   * ```ts
   * import type { IWindowsDesktopApi } from "@noldova/computer-use.runtime/windows";
   *
   * declare const api: IWindowsDesktopApi;
   * console.log(api.getForegroundWindow()?.imagePath ?? "no window in front");
   * ```
   */
  getForegroundWindow(): IWindowsWindowJson | null;

  /**
   * Lists the top-level windows that may show on the screen, from the front, in desktop coordinates and physical pixels:
   * visible ones that aren't minimized, and cloaked ones only when their cloaking can't be read.
   *
   * @returns The windows, and whether the list holds each of them; a window whose frame can't be read makes it incomplete.
   * @throws {Error} Throws when Windows can't list the windows.
   * @throws {AddonLoadException} Throws on the first call when the addon can't be loaded.
   *
   * @example
   * ```ts
   * import type { IWindowsDesktopApi } from "@noldova/computer-use.runtime/windows";
   *
   * declare const api: IWindowsDesktopApi;
   * console.log(api.listWindows().windows.length);
   * ```
   */
  listWindows(): IWindowsWindowListJson;

  /**
   * Reads where the pointer is, in desktop coordinates and physical pixels.
   *
   * @returns The pointer's position.
   * @throws {Error} Throws when Windows can't read the pointer, as while another desktop, such as the sign-in screen, is in front.
   * @throws {AddonLoadException} Throws on the first call when the addon can't be loaded.
   *
   * @example
   * ```ts
   * import type { IWindowsDesktopApi } from "@noldova/computer-use.runtime/windows";
   *
   * declare const api: IWindowsDesktopApi;
   * console.log(api.readPointer().x);
   * ```
   */
  readPointer(): IWindowsPointJson;

  /**
   * Glides the pointer along a path's steps, each at its time, off the JavaScript thread, so the person can follow where the next input
   * goes. Before each step it checks the target and the input's points as the input does, and that the person's own input hasn't
   * arrived since the call; a failed check stops the glide, with no input sent, since its moves only show the way. A step whose time
   * has passed gives way to the latest one due.
   *
   * @param target The window the input is meant for.
   * @param steps The glide's steps in time order, at most 64, each due at most 1,000 ms after the call.
   * @param points The input's points, one or two, which must lie inside the target's window and be uncovered; the steps need not.
   * @returns Settles once the pointer is at the last step, or a check stopped it.
   * @throws {TypeError} Throws, without gliding, when the target's `windowId` isn't a decimal window handle, or the steps or points aren't lists.
   * @throws {RangeError} Throws, without gliding, when there are too many steps or points, or the steps aren't in time order.
   * @throws {Error} Rejects when Windows doesn't insert a move.
   * @throws {AddonLoadException} Throws on the first call when the addon can't be loaded.
   *
   * @example
   * ```ts
   * import type { IWindowsDesktopApi, IWindowsTargetJson } from "@noldova/computer-use.runtime/windows";
   *
   * declare const api: IWindowsDesktopApi;
   * declare const target: IWindowsTargetJson;
   * const outcome = await api.glidePointer(target, [{ x: 350, y: 300, atMs: 16 }, { x: 400, y: 300, atMs: 32 }], [{ x: 400, y: 300 }]);
   * console.log(outcome.status);
   * ```
   */
  glidePointer(target: IWindowsTargetJson, steps: readonly IWindowsGlideStepJson[], points: readonly IWindowsPointJson[]): Promise<IWindowsOutcomeJson>;

  /**
   * Moves the pointer to a point of the target's window.
   *
   * @param target The window the input is meant for.
   * @param x The point's horizontal position, in desktop coordinates.
   * @param y The point's vertical position, in desktop coordinates.
   * @returns Whether the input was sent, or why it was refused.
   * @throws {TypeError} Throws when the target's `windowId` isn't a decimal window handle.
   * @throws {Error} Throws when Windows inserts only part of the input; the addon then releases what it pressed.
   * @throws {AddonLoadException} Throws on the first call when the addon can't be loaded.
   *
   * @example
   * ```ts
   * import type { IWindowsDesktopApi, IWindowsTargetJson } from "@noldova/computer-use.runtime/windows";
   *
   * declare const api: IWindowsDesktopApi;
   * declare const target: IWindowsTargetJson;
   * console.log(api.movePointer(target, 400, 300).status);
   * ```
   */
  movePointer(target: IWindowsTargetJson, x: number, y: number): IWindowsOutcomeJson;

  /**
   * Clicks a point of the target's window with a button, a number of times, holding the modifiers.
   *
   * @param target The window the input is meant for.
   * @param x The point's horizontal position, in desktop coordinates.
   * @param y The point's vertical position, in desktop coordinates.
   * @param button `"Left"`, `"Right"` or `"Middle"`.
   * @param count 1, 2 or 3.
   * @param modifiers Each of `"Shift"`, `"Control"`, `"Alt"` and `"Meta"` at most once, pressed in this order and released in reverse.
   * @returns Whether the input was sent, or why it was refused.
   * @throws {TypeError} Throws when the target's `windowId` isn't a decimal window handle, or the modifiers aren't a list.
   * @throws {RangeError} Throws when the button, the count or a modifier isn't one of those named.
   * @throws {Error} Throws when Windows inserts only part of the input; the addon then releases what it pressed.
   * @throws {AddonLoadException} Throws on the first call when the addon can't be loaded.
   *
   * @example
   * ```ts
   * import type { IWindowsDesktopApi, IWindowsTargetJson } from "@noldova/computer-use.runtime/windows";
   *
   * declare const api: IWindowsDesktopApi;
   * declare const target: IWindowsTargetJson;
   * const outcome = api.click(target, 400, 300, "Left", 2, ["Control"]);
   * console.log(outcome.status === "refused" ? outcome.reason : "clicked");
   * ```
   */
  click(target: IWindowsTargetJson, x: number, y: number, button: string, count: number, modifiers: readonly string[]): IWindowsOutcomeJson;

  /**
   * Presses a button at one point of the target's window, glides to another along the steps and releases it there, holding the
   * modifiers, off the JavaScript thread. Before each step it checks the target and the point where the button comes up as
   * {@link IWindowsDesktopApi.glidePointer} does; a failed check releases the button and the modifiers where the pointer is.
   *
   * @param target The window the input is meant for.
   * @param fromX Where the button goes down, horizontally, in desktop coordinates.
   * @param fromY Where the button goes down, vertically, in desktop coordinates.
   * @param toX Where the button comes up, horizontally, in desktop coordinates.
   * @param toY Where the button comes up, vertically, in desktop coordinates.
   * @param steps The glide's steps from one point to the other, in time order, as {@link IWindowsDesktopApi.glidePointer} takes them.
   * @param button `"Left"`, `"Right"` or `"Middle"`.
   * @param modifiers Each of `"Shift"`, `"Control"`, `"Alt"` and `"Meta"` at most once, pressed in this order and released in reverse.
   * @param stop A one-element `Int32Array` over a `SharedArrayBuffer`: setting its element to a value other than 0 stops the drag
   *   before its next step, releasing the button and the modifiers where the pointer is, and the drag settles as `"stopped"`.
   * @returns Settles with whether the input was sent, why it was refused, or that its stop ended it.
   * @throws {TypeError} Throws when the target's `windowId` isn't a decimal window handle, the steps or modifiers aren't lists, or
   *   the stop isn't an `Int32Array`.
   * @throws {RangeError} Throws when the button or a modifier isn't one of those named, or the steps are refused.
   * @throws {Error} Rejects when Windows inserts only part of the input; the addon then releases what it pressed.
   * @throws {AddonLoadException} Throws on the first call when the addon can't be loaded.
   *
   * @example
   * ```ts
   * import type { IWindowsDesktopApi, IWindowsTargetJson } from "@noldova/computer-use.runtime/windows";
   *
   * declare const api: IWindowsDesktopApi;
   * declare const target: IWindowsTargetJson;
   * const stop = new Int32Array(new SharedArrayBuffer(4));
   * console.log((await api.drag(target, 100, 100, 300, 200, [{ x: 250, y: 175, atMs: 16 }, { x: 300, y: 200, atMs: 32 }], "Left", [], stop)).status);
   * ```
   */
  drag(target: IWindowsTargetJson, fromX: number, fromY: number, toX: number, toY: number, steps: readonly IWindowsGlideStepJson[], button: string, modifiers: readonly string[], stop: Int32Array): Promise<IWindowsOutcomeJson>;

  /**
   * Scrolls the wheel at a point of the target's window by whole notches, holding the modifiers.
   *
   * @param target The window the input is meant for.
   * @param x The point's horizontal position, in desktop coordinates.
   * @param y The point's vertical position, in desktop coordinates.
   * @param deltaX Notches to the right, or to the left when negative; 0 for none.
   * @param deltaY Notches down, or up when negative; 0 for none.
   * @param modifiers Each of `"Shift"`, `"Control"`, `"Alt"` and `"Meta"` at most once, pressed in this order and released in reverse.
   * @returns Whether the input was sent, or why it was refused.
   * @throws {TypeError} Throws when the target's `windowId` isn't a decimal window handle, or the modifiers aren't a list.
   * @throws {RangeError} Throws when a modifier isn't one of those named.
   * @throws {Error} Throws when Windows inserts only part of the input; the addon then releases what it pressed.
   * @throws {AddonLoadException} Throws on the first call when the addon can't be loaded.
   *
   * @example
   * ```ts
   * import type { IWindowsDesktopApi, IWindowsTargetJson } from "@noldova/computer-use.runtime/windows";
   *
   * declare const api: IWindowsDesktopApi;
   * declare const target: IWindowsTargetJson;
   * console.log(api.scroll(target, 400, 300, 0, 3, []).status);
   * ```
   */
  scroll(target: IWindowsTargetJson, x: number, y: number, deltaX: number, deltaY: number, modifiers: readonly string[]): IWindowsOutcomeJson;

  /**
   * Types one chunk of text into the target's focused field, as text rather than key presses; a line break, a line feed, a carriage
   * return or the pair of them, presses Enter once and a tab presses Tab.
   *
   * @param target The window the input is meant for.
   * @param text From 1 to 256 UTF-16 code units.
   * @param focusMs How long the focus check waits for UI Automation, from 1 to 60,000 milliseconds, holding the calling thread.
   * @returns Whether the input was sent, or why it was refused, including a password field with focus.
   * @throws {TypeError} Throws when the target's `windowId` isn't a decimal window handle.
   * @throws {RangeError} Throws when the text is empty or longer than 256 code units, or the focus budget is out of range.
   * @throws {Error} Throws when Windows inserts only part of the input.
   * @throws {AddonLoadException} Throws on the first call when the addon can't be loaded.
   *
   * @example
   * ```ts
   * import type { IWindowsDesktopApi, IWindowsTargetJson } from "@noldova/computer-use.runtime/windows";
   *
   * declare const api: IWindowsDesktopApi;
   * declare const target: IWindowsTargetJson;
   * console.log(api.typeText(target, "Hello", 500).status);
   * ```
   */
  typeText(target: IWindowsTargetJson, text: string, focusMs: number): IWindowsOutcomeJson;

  /**
   * Presses and releases a key in the target's window, holding the modifiers.
   *
   * @param target The window the input is meant for.
   * @param key A key name the module knows, such as `"Enter"`, `"Escape"` or `"PageDown"`.
   * @param modifiers Each of `"Shift"`, `"Control"`, `"Alt"` and `"Meta"` at most once, pressed in this order and released in reverse.
   * @param focusMs How long the focus check waits for UI Automation, from 1 to 60,000 milliseconds, holding the calling thread.
   * @returns Whether the input was sent, or why it was refused, including a password field with focus.
   * @throws {TypeError} Throws when the target's `windowId` isn't a decimal window handle, or the modifiers aren't a list.
   * @throws {RangeError} Throws when the key or a modifier isn't one the addon knows, or the focus budget is out of range.
   * @throws {Error} Throws when Windows inserts only part of the input; the addon then releases what it pressed.
   * @throws {AddonLoadException} Throws on the first call when the addon can't be loaded.
   *
   * @example
   * ```ts
   * import type { IWindowsDesktopApi, IWindowsTargetJson } from "@noldova/computer-use.runtime/windows";
   *
   * declare const api: IWindowsDesktopApi;
   * declare const target: IWindowsTargetJson;
   * console.log(api.pressKey(target, "Tab", ["Shift"], 500).status);
   * ```
   */
  pressKey(target: IWindowsTargetJson, key: string, modifiers: readonly string[], focusMs: number): IWindowsOutcomeJson;

  /**
   * Starts the low-level pointer and keyboard hooks on a thread of their own, which report the person's input and beat at the interval.
   *
   * @param onPhysicalInput Called on the JavaScript thread with 0 for the pointer or 1 for the keyboard, at most once per kind until the
   * call before it has run; input the module sends doesn't call it. For the keyboard, the second value is the process whose window was in
   * front at each key event since the last call, read in the hook as the key came in, or 0 when no window was in front or the keys went to
   * more than one process; for the pointer it is 0.
   * @param onHeartbeat Called on the JavaScript thread with a sequence number that grows by one each interval while the hook thread runs.
   * @param intervalMs The heartbeat's interval, in milliseconds, of at least 10.
   * @throws {Error} Throws when the monitor already runs, or Windows can't install the hooks.
   * @throws {RangeError} Throws when the interval is too short.
   * @throws {AddonLoadException} Throws on the first call when the addon can't be loaded.
   *
   * @example
   * ```ts
   * import type { IWindowsDesktopApi } from "@noldova/computer-use.runtime/windows";
   *
   * declare const api: IWindowsDesktopApi;
   * api.startMonitor((kind, processId) => console.log(kind === 0 ? "pointer" : `keyboard to ${processId}`), sequence => console.log(sequence), 500);
   * ```
   */
  startMonitor(onPhysicalInput: (kind: number, processId: number) => void, onHeartbeat: (sequence: number) => void, intervalMs: number): void;

  /**
   * Stops the hooks and waits up to 5 seconds for their thread to end; nothing happens when the monitor isn't running.
   *
   * @throws {Error} Throws when the thread doesn't end in time; the monitor then still counts as running, and a later call waits again.
   * @throws {AddonLoadException} Throws on the first call when the addon can't be loaded.
   *
   * @example
   * ```ts
   * import type { IWindowsDesktopApi } from "@noldova/computer-use.runtime/windows";
   *
   * declare const api: IWindowsDesktopApi;
   * api.stopMonitor();
   * ```
   */
  stopMonitor(): void;

  /**
   * Shows the border, four windows along the edges of each frame, in place of the border shown, and waits until it shows.
   *
   * @remarks
   * The windows belong to a thread of the addon's own, in the per-monitor DPI context, and {@link IWindowsDesktopApi.listWindows} leaves
   * out that thread's windows. They are layered, transparent to input, so the target checks' hit tests pass through them, tool windows
   * that never activate, and topmost. The same frames and colour again only bring them back above other topmost windows.
   *
   * @param frames At most 16 frames, in physical pixels.
   * @param rgb The colour, as `0xRRGGBB`.
   * @throws {TypeError} Throws when a frame isn't an object of integers.
   * @throws {RangeError} Throws for more than 16 frames, or a thickness that doesn't fit twice into its frame.
   * @throws {Error} Throws when Windows refuses a window, or the thread doesn't answer in 5 seconds.
   * @throws {AddonLoadException} Throws on the first call when the addon can't be loaded.
   *
   * @example
   * ```ts
   * import type { IWindowsDesktopApi } from "@noldova/computer-use.runtime/windows";
   *
   * declare const api: IWindowsDesktopApi;
   * api.showBorder([{ x: 0, y: 0, width: 3840, height: 2160, thickness: 8 }], 0x005FB8);
   * ```
   */
  showBorder(frames: readonly IWindowsBorderFrameJson[], rgb: number): void;

  /**
   * Hides the border; does nothing when none shows.
   *
   * @throws {Error} Throws when the thread doesn't answer in 5 seconds.
   * @throws {AddonLoadException} Throws on the first call when the addon can't be loaded.
   *
   * @example
   * ```ts
   * import type { IWindowsDesktopApi } from "@noldova/computer-use.runtime/windows";
   *
   * declare const api: IWindowsDesktopApi;
   * api.hideBorder();
   * ```
   */
  hideBorder(): void;

  /**
   * Lists the programs' paths.
   *
   * @returns The host's path and the running and installed programs' paths, in new arrays.
   * @throws {Error} Throws when Windows can't read the host program's path.
   * @throws {AddonLoadException} Throws on the first call when the addon can't be loaded.
   *
   * @example
   * ```ts
   * import type { IWindowsDesktopApi } from "@noldova/computer-use.runtime/windows";
   *
   * declare const api: IWindowsDesktopApi;
   * console.log(api.listAppPaths().running.length);
   * ```
   */
  listAppPaths(): IWindowsAppPathsJson;

  /**
   * Reads a program's description from its version resource, and the signer that Windows verifies for the file.
   *
   * @remarks
   * Verifying the signature hashes the whole file, so a large program takes a while.
   *
   * @param programPath The program's full path.
   * @returns The program's description and signer, each `null` when the file has none.
   * @throws {RangeError} Throws when the path is empty or too long.
   * @throws {AddonLoadException} Throws on the first call when the addon can't be loaded.
   *
   * @example
   * ```ts
   * import type { IWindowsDesktopApi } from "@noldova/computer-use.runtime/windows";
   *
   * declare const api: IWindowsDesktopApi;
   * console.log(api.describeProgram("C:\\Windows\\notepad.exe").description);
   * ```
   */
  describeProgram(programPath: string): IWindowsProgramJson;

  /**
   * Reads the first icon a program's file holds, as Explorer shows it, drawn at the size asked.
   *
   * @remarks
   * An icon with no alpha, as older programs have, takes its transparency from its mask.
   *
   * @param programPath The program's full path.
   * @param size The icon's side in pixels, from 1 to 1024.
   * @returns The icon, or `null` when the file holds none or Windows can't read it.
   * @throws {RangeError} Throws when the path is empty or too long, or the size is out of range.
   * @throws {AddonLoadException} Throws on the first call when the addon can't be loaded.
   *
   * @example
   * ```ts
   * import type { IWindowsDesktopApi } from "@noldova/computer-use.runtime/windows";
   *
   * declare const api: IWindowsDesktopApi;
   * console.log(api.readProgramIcon("C:\\Windows\\notepad.exe", 64)?.width);
   * ```
   */
  readProgramIcon(programPath: string, size: number): IWindowsImageJson | null;

  /**
   * Reads the controls of a window through UI Automation's control view, breadth first, on the addon's control thread.
   *
   * @remarks
   * A whole read lists the window's controls, then each window of its process in front of it, such as a menu or a popup, with its
   * controls; a read under a control lists only the controls under it. A whole read frees the references every earlier read kept,
   * and a read under a control those of the read under a control before it. The read takes at most 200 controls under one control,
   * 50 levels and 2,000 controls; a control off screen, with no area, outside the window or of a process whose program can't be read
   * is left out with everything under it, and each control left out adds one to `leftOut`. A password field's value is never read;
   * another text control's value is read to its first 402 UTF-16 units, and every other value and name is cut there once it arrives.
   * The time limit is checked before each request to UI Automation; one that runs out answers with what was read by then, while the
   * control thread finishes the blocked request and drops its answer.
   *
   * @param target The window to read, which must be the one in front.
   * @param underHandle The handle of a control of the latest whole read, or `null` for the whole window.
   * @param timeoutMs The read's time limit, in milliseconds.
   * @returns The controls, each after the control it lies in, how many were left out, and whether the time ran out.
   * @throws {Error} Rejects when the window isn't the target's, the handle isn't one of the latest read's, UI Automation fails, or the
   * control thread is still blocked by an earlier request when the time runs out.
   * @throws {AddonLoadException} Throws on the first call when the addon can't be loaded.
   *
   * @example
   * ```ts
   * import type { IWindowsDesktopApi } from "@noldova/computer-use.runtime/windows";
   *
   * declare const api: IWindowsDesktopApi;
   * const tree = await api.readControls({ windowId: "100", processId: 42, imagePath: "c:\\apps\\notes.exe" }, null, 2000);
   * console.log(tree.controls.length, tree.leftOut, tree.timedOut);
   * ```
   */
  readControls(target: IWindowsTargetJson, underHandle: string | null, timeoutMs: number): Promise<IWindowsControlTreeJson>;

  /**
   * Finds a control of the latest read again, by the reference the read kept, on the addon's control thread.
   *
   * @param target The window the control was read from.
   * @param handle The handle the read gave the control.
   * @param timeoutMs The search's time limit, in milliseconds.
   * @returns The control as it is now, or `null` when it is gone, its reference was freed, or it is another process's control that the read
   * listed by its app only.
   * @throws {Error} Rejects when UI Automation fails or the time runs out.
   * @throws {AddonLoadException} Throws on the first call when the addon can't be loaded.
   *
   * @example
   * ```ts
   * import type { IWindowsDesktopApi } from "@noldova/computer-use.runtime/windows";
   *
   * declare const api: IWindowsDesktopApi;
   * console.log(await api.findControl({ windowId: "100", processId: 42, imagePath: "c:\\apps\\notes.exe" }, "1.4", 1000));
   * ```
   */
  findControl(target: IWindowsTargetJson, handle: string, timeoutMs: number): Promise<IWindowsControlSpotJson | null>;

  /**
   * Tells whether the element UI Automation finds at a point is a control of the latest read, or lies in it.
   *
   * @param target The window the control was read from.
   * @param handle The handle the read gave the control.
   * @param x The point's horizontal position, in desktop coordinates and physical pixels.
   * @param y The point's vertical position.
   * @param timeoutMs The check's time limit, in milliseconds.
   * @returns `true` when the element at the point is the control or one of its descendants; `false` otherwise, or when the
   * control's reference was freed.
   * @throws {Error} Rejects when UI Automation fails or the time runs out.
   * @throws {AddonLoadException} Throws on the first call when the addon can't be loaded.
   *
   * @example
   * ```ts
   * import type { IWindowsDesktopApi } from "@noldova/computer-use.runtime/windows";
   *
   * declare const api: IWindowsDesktopApi;
   * console.log(await api.hitsControl({ windowId: "100", processId: 42, imagePath: "c:\\apps\\notes.exe" }, "1.4", 120, 80, 1000));
   * ```
   */
  hitsControl(target: IWindowsTargetJson, handle: string, x: number, y: number, timeoutMs: number): Promise<boolean>;
}

/**
 * One control of a window, as the addon reads it through UI Automation.
 */
export interface IWindowsControlJson {
  /**
   * The handle by which the addon finds the control again, while its read's references are kept.
   */
  readonly handle: string;

  /**
   * The handle of the control it lies in, or `null` at the top of the read.
   */
  readonly parentHandle: string | null;

  /**
   * The ID of the process the control belongs to.
   */
  readonly processId: number;

  /**
   * The full path of that process's program.
   */
  readonly imagePath: string;

  /**
   * UI Automation's control type ID, such as 50000 for a button.
   */
  readonly controlType: number;

  /**
   * The control's name, cut to 402 UTF-16 units.
   */
  readonly name: string;

  /**
   * The control's value, cut to 402 UTF-16 units; `null` for a control without one, and always for a password field.
   */
  readonly value: string | null;

  /**
   * Whether the control takes input.
   */
  readonly isEnabled: boolean;

  /**
   * Whether the control has the keyboard focus.
   */
  readonly hasFocus: boolean;

  /**
   * Whether UI Automation reports the control as a password field.
   */
  readonly isPassword: boolean;

  /**
   * Whether the control's value can't be changed, as its value pattern reports.
   */
  readonly isReadOnly: boolean;

  /**
   * Whether the control is selected, as its selection item pattern reports.
   */
  readonly isSelected: boolean;

  /**
   * UI Automation's toggle state: 0 off, 1 on, 2 indeterminate, or -1 for a control without the toggle pattern.
   */
  readonly toggleState: number;

  /**
   * UI Automation's expand state: 0 collapsed, 1 expanded, 2 partly expanded, 3 a leaf, or -1 for a control without the pattern.
   */
  readonly expandState: number;

  /**
   * The left edge of the control's bounding rectangle, in desktop coordinates and physical pixels.
   */
  readonly x: number;

  /**
   * The top edge of the control's bounding rectangle.
   */
  readonly y: number;

  /**
   * The bounding rectangle's width, more than zero.
   */
  readonly width: number;

  /**
   * The bounding rectangle's height, more than zero.
   */
  readonly height: number;
}

/**
 * The controls a read gave, how many it left out, and whether its time ran out.
 */
export interface IWindowsControlTreeJson {
  /**
   * The controls, breadth first, each after the control it lies in.
   */
  readonly controls: readonly IWindowsControlJson[];

  /**
   * How many controls the read reached and left out.
   */
  readonly leftOut: number;

  /**
   * Whether the read's time ran out before it was done.
   */
  readonly timedOut: boolean;
}

/**
 * A control the addon found again, as it is now.
 */
export interface IWindowsControlSpotJson {
  /**
   * UI Automation's control type ID.
   */
  readonly controlType: number;

  /**
   * The control's name, cut to 402 UTF-16 units.
   */
  readonly name: string;

  /**
   * Whether the control takes input.
   */
  readonly isEnabled: boolean;

  /**
   * Whether UI Automation reports the control off screen.
   */
  readonly isOffscreen: boolean;

  /**
   * The horizontal position of the control's clickable point, or of its bounding rectangle's centre when it gives none.
   */
  readonly x: number;

  /**
   * The vertical position of that point.
   */
  readonly y: number;
}

/**
 * One display's border, as {@link IWindowsDesktopApi.showBorder} draws it, in physical pixels.
 */
export interface IWindowsBorderFrameJson {
  /**
   * The display's left edge.
   */
  readonly x: number;

  /**
   * The display's top edge.
   */
  readonly y: number;

  /**
   * The display's width.
   */
  readonly width: number;

  /**
   * The display's height.
   */
  readonly height: number;

  /**
   * The border's thickness along each edge.
   */
  readonly thickness: number;
}

/**
 * A display, as the addon reports it, in desktop coordinates and physical pixels.
 */
export interface IWindowsDisplayJson {
  /**
   * The display's device name, such as `\\.\DISPLAY1`, which stays the same while it is attached.
   */
  readonly id: string;

  /**
   * The display's left edge.
   */
  readonly x: number;

  /**
   * The display's top edge.
   */
  readonly y: number;

  /**
   * The display's width in pixels.
   */
  readonly width: number;

  /**
   * The display's height in pixels.
   */
  readonly height: number;

  /**
   * The display's dots per inch; 96 is a scale of 1.
   */
  readonly dpi: number;

  /**
   * Whether the display is the primary one, whose top-left corner is the desktop's origin.
   */
  readonly isPrimary: boolean;
}

/**
 * A captured window or a program's icon: its size in pixels and its pixels.
 */
export interface IWindowsImageJson {
  /**
   * The image's width in pixels.
   */
  readonly width: number;

  /**
   * The image's height in pixels.
   */
  readonly height: number;

  /**
   * The pixels, row by row from the top, four bytes each in blue, green, red and alpha order; `width * height * 4` bytes.
   */
  readonly bgra: ArrayBuffer;
}

/**
 * The outcome of an input function: done, or refused with a reason and whether any input was already sent.
 */
export interface IWindowsOutcomeJson {
  /**
   * `"done"` when the input was sent and the checks after it passed, `"refused"`, or `"stopped"` when a drag's stop ended it.
   */
  readonly status: "done" | "refused" | "stopped";

  /**
   * Why the input was refused, present only when it was: `"NotForeground"`, `"OtherWindowAtPoint"`, `"ElevatedTarget"`,
   * `"TargetRightsUnknown"`, `"PasswordField"`, `"FocusOutsideTarget"`, `"FocusUnknown"`, `"ForegroundChanged"` or `"PhysicalInput"`.
   */
  readonly reason?: string;

  /**
   * Present only on a refusal or a stop: `true` when the input was already sent, so its effect is uncertain.
   */
  readonly inputSent?: boolean;
}

/**
 * One step of a glide, as the addon takes it: where the pointer moves, in desktop coordinates and physical pixels, and when.
 */
export interface IWindowsGlideStepJson {
  /**
   * The step's horizontal position.
   */
  readonly x: number;

  /**
   * The step's vertical position.
   */
  readonly y: number;

  /**
   * When the move is due, in whole milliseconds after the call.
   */
  readonly atMs: number;
}

/**
 * A point, as the addon reports it, in desktop coordinates and physical pixels.
 */
export interface IWindowsPointJson {
  /**
   * The point's horizontal position.
   */
  readonly x: number;

  /**
   * The point's vertical position.
   */
  readonly y: number;
}

/**
 * A program's description and verified signer.
 */
export interface IWindowsProgramJson {
  /**
   * The file description from the program's version resource, or `null` when it has none.
   */
  readonly description: string | null;

  /**
   * The name on the certificate that signs the file, when Windows verifies the signature, or `null` when the file isn't signed or the
   * signature doesn't verify.
   */
  readonly signer: string | null;
}

/**
 * The window an input is meant for, which the addon checks before it sends.
 */
export interface IWindowsTargetJson {
  /**
   * The top-level window's handle, as a decimal number.
   */
  readonly windowId: string;

  /**
   * The ID of the process that owns the window.
   */
  readonly processId: number;

  /**
   * The full path of the process's program, compared without regard to case.
   */
  readonly imagePath: string;
}

/**
 * A window that may show on the screen, as the addon lists it, in desktop coordinates and physical pixels.
 */
export interface IWindowsStackedWindowJson {
  /**
   * The window's class name, which tells File Explorer's folder windows from its other windows.
   */
  readonly className: string;

  /**
   * The full path of the program of the window's process; empty when Windows won't read it.
   */
  readonly imagePath: string;

  /**
   * The top-level window's handle, as a decimal number.
   */
  readonly windowId: string;

  /**
   * The window's left edge.
   */
  readonly x: number;

  /**
   * The window's top edge.
   */
  readonly y: number;

  /**
   * The window's width in pixels, frame included.
   */
  readonly width: number;

  /**
   * The window's height in pixels, frame included.
   */
  readonly height: number;
}

/**
 * The window in front, as the addon reports it, in desktop coordinates and physical pixels.
 */
export interface IWindowsWindowJson {
  /**
   * The top-level window's handle, as a decimal number.
   */
  readonly windowId: string;

  /**
   * The ID of the process that owns the window.
   */
  readonly processId: number;

  /**
   * The full path of the process's program.
   */
  readonly imagePath: string;

  /**
   * The window's class name, which tells File Explorer's folder windows from its other windows.
   */
  readonly className: string;

  /**
   * The window's left edge.
   */
  readonly x: number;

  /**
   * The window's top edge.
   */
  readonly y: number;

  /**
   * The window's width in pixels, frame included.
   */
  readonly width: number;

  /**
   * The window's height in pixels, frame included.
   */
  readonly height: number;

  /**
   * Whether the window's process runs with higher rights than the module's, which refuses input to it.
   */
  readonly isElevated: boolean;
}

/**
 * The windows that may show on the screen, as the addon lists them.
 */
export interface IWindowsWindowListJson {
  /**
   * Whether the list holds every such window; false when the frame of one couldn't be read.
   */
  readonly isComplete: boolean;

  /**
   * The windows, from the front.
   */
  readonly windows: readonly IWindowsStackedWindowJson[];
}

/**
 * The Windows backend: every part over one addon.
 *
 * @example
 * ```ts
 * import { WindowsBackend } from "@noldova/computer-use.runtime/windows";
 *
 * const backend = WindowsBackend.load();
 * console.log((await backend.displays.listDisplaysAsync(AbortSignal.timeout(1000))).length);
 * ```
 */
export declare class WindowsBackend implements IOperatingSystemBackend {
  /**
   * The addon that {@link WindowsBackend.load} loads by default: the build for this process's platform and architecture,
   * `native/<platform>-<arch>/windows-desktop.node` in the runtime package, such as `native/win32-arm64/windows-desktop.node`.
   */
  public static readonly addonFile: string;

  /**
   * Lists the running and installed apps, reading each program's description and signer once.
   */
  public readonly apps: IAppBackend;

  /**
   * Draws the border in layered, input-transparent, topmost tool windows on a thread of the addon's own, which the window list leaves out.
   */
  public readonly border: IBorderBackend;

  /**
   * Captures single windows, each drawing itself through `PrintWindow`, and measures a display in physical pixels.
   */
  public readonly capture: ICaptureBackend;

  /**
   * Reads the window's controls through the addon's UI Automation control view, in physical pixels, on the addon's control thread;
   * it finds a control again by its handle at its clickable point, or else the centre of its bounds, and tells whether the element
   * at a point is the control or lies in it.
   */
  public readonly controls: IControlBackend;

  /**
   * Lists the displays, with each one's scale from its dots per inch.
   */
  public readonly displays: IDisplayBackend;

  /**
   * Sends input to a checked target, refusing it with the addon's reason.
   */
  public readonly input: IInputBackend;

  /**
   * Reports the person's own pointer and keyboard input, and the hooks' heartbeat every 500 milliseconds.
   */
  public readonly physicalInput: IPhysicalInputMonitor;

  /**
   * Reads the window in front.
   */
  public readonly windows: IWindowBackend;

  /**
   * Builds the backend over an addon, or over a double of it.
   *
   * @param api The addon's functions, which every part shares.
   *
   * @example
   * ```ts
   * import { type IWindowsDesktopApi, WindowsBackend } from "@noldova/computer-use.runtime/windows";
   *
   * declare const double: IWindowsDesktopApi;
   * const backend = new WindowsBackend(double);
   * console.log(await backend.windows.getForegroundWindowAsync(AbortSignal.timeout(1000)));
   * ```
   */
  public constructor(api: IWindowsDesktopApi);

  /**
   * Builds the backend over an addon file, which loads on the first call that needs it.
   *
   * @param addonFile The addon's path; by default, {@link WindowsBackend.addonFile}.
   * @returns A backend whose first call loads the addon, and fails with {@link AddonLoadException} when it can't,
   * naming the platform and architecture when the file is missing.
   *
   * @example
   * ```ts
   * import { WindowsBackend } from "@noldova/computer-use.runtime/windows";
   *
   * const backend = WindowsBackend.load();
   * await backend.physicalInput.startAsync(AbortSignal.timeout(1000));
   * ```
   */
  public static load(addonFile?: string): WindowsBackend;
}
