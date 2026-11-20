/**
 * @license
 * Copyright (c) Noldova.
 *
 * This source code is licensed under the license found in the
 * LICENSE file in the root directory of this source tree.
 */

import type { JsonObject } from "@noldova/computer-use.protocol";
import { type ArgumentException, Exception, type ExceptionOptions } from "@noldova/context.exceptions";
import type {
  IPermissionDetail,
  IPermissionRequest,
  IRuntimePart,
  IRuntimePartContext,
  IModuleLog,
  IToolDescriptor,
  OwnedProcess,
  PermissionDetailKind,
  PermissionOutcome,
  ProcessRequest,
  ToolResult
} from "@noldova/desktop.runtime";

/**
 * The base of every exception the runtime part throws: callers catch this one for every failure of computer use's own.
 *
 * @example
 * ```ts
 * import { ComputerUseException, RefusalReason } from "@noldova/computer-use.runtime";
 *
 * try {
 *   RefusalReason.parse("notForeground");
 * }
 * catch (error) {
 *   console.log(error instanceof ComputerUseException);
 * }
 * ```
 */
export declare abstract class ComputerUseException extends Exception {
  /**
   * Creates the exception with its message, for a subclass.
   *
   * @param message What went wrong.
   * @param options The underlying error, if any.
   */
  protected constructor(message: string, options?: ExceptionOptions);
}

/**
 * Thrown when an operating-system backend reports a value the module can't use, such as a refusal reason it doesn't know; each condition
 * has its own subclass.
 *
 * @example
 * ```ts
 * import { BackendValueException, RefusalReason } from "@noldova/computer-use.runtime";
 *
 * try {
 *   RefusalReason.parse("notForeground");
 * }
 * catch (error) {
 *   console.log(error instanceof BackendValueException);
 * }
 * ```
 */
export declare abstract class BackendValueException extends ComputerUseException {
  /**
   * Creates the exception with its message, for a subclass.
   *
   * @param message What went wrong.
   * @param options The underlying error, if any.
   */
  protected constructor(message: string, options?: ExceptionOptions);
}

/**
 * Thrown when the macOS backend reports a bundle identifier that is empty or holds a space or a slash.
 *
 * @example
 * ```ts
 * import { AppIdentity, BundleIdInvalidException } from "@noldova/computer-use.runtime";
 *
 * try {
 *   AppIdentity.ofMacBundleId("com.example app");
 * }
 * catch (error) {
 *   console.log(error instanceof BundleIdInvalidException && error.bundleId);
 * }
 * ```
 */
export declare class BundleIdInvalidException extends BackendValueException {
  /**
   * The bundle identifier refused.
   */
  public readonly bundleId: string;

  /**
   * Creates the exception, with its message from the facts.
   *
   * @param bundleId The bundle identifier refused.
   */
  public constructor(bundleId: string);
}

/**
 * Thrown when the Windows backend reports a program path that isn't a full path to a file, from a drive or a network share.
 *
 * @example
 * ```ts
 * import { AppIdentity, ProgramPathInvalidException } from "@noldova/computer-use.runtime";
 *
 * try {
 *   AppIdentity.ofWindowsPath("sample.exe");
 * }
 * catch (error) {
 *   console.log(error instanceof ProgramPathInvalidException && error.programPath);
 * }
 * ```
 */
export declare class ProgramPathInvalidException extends BackendValueException {
  /**
   * The path refused.
   */
  public readonly programPath: string;

  /**
   * Creates the exception, with its message from the facts.
   *
   * @param programPath The path refused.
   */
  public constructor(programPath: string);
}

/**
 * Thrown when a backend refuses an input with a reason the module doesn't know.
 *
 * @example
 * ```ts
 * import { RefusalReason, RefusalReasonUnknownException } from "@noldova/computer-use.runtime";
 *
 * try {
 *   RefusalReason.parse("notForeground");
 * }
 * catch (error) {
 *   console.log(error instanceof RefusalReasonUnknownException && error.value);
 * }
 * ```
 */
export declare class RefusalReasonUnknownException extends BackendValueException {
  /**
   * The reason's value as the backend gave it.
   */
  public readonly value: string;

  /**
   * Creates the exception, with its message from the facts.
   *
   * @param value The reason's value as the backend gave it.
   */
  public constructor(value: string);
}

/**
 * Thrown when an operating-system backend answers with a value a model refuses, such as a window in front with no size; the model's
 * refusal is its cause.
 *
 * @example
 * ```ts
 * import { BackendAnswerInvalidException, type IWindowBackend } from "@noldova/computer-use.runtime";
 *
 * export async function hasUnusableWindowAsync(windows: IWindowBackend): Promise<boolean> {
 *   try {
 *     await windows.getForegroundWindowAsync(AbortSignal.timeout(1000));
 *     return false;
 *   }
 *   catch (error) {
 *     return error instanceof BackendAnswerInvalidException;
 *   }
 * }
 * ```
 */
export declare class BackendAnswerInvalidException extends BackendValueException {
  /**
   * The backend's call that answered, such as `"getForegroundWindow"`.
   */
  public readonly answer: string;

  /**
   * The value the backend answered, as it gave it.
   */
  public readonly value: unknown;

  /**
   * Creates the exception, with its message from the facts.
   *
   * @param answer The backend's call that answered, such as `"getForegroundWindow"`.
   * @param value The value the backend answered, as it gave it.
   * @param cause The model's refusal of the value.
   */
  public constructor(answer: string, value: unknown, cause: ArgumentException);
}

/**
 * Thrown when a {@link Display} is built from values that don't describe a display; each value has its own subclass.
 *
 * @example
 * ```ts
 * import { Display, DisplayException } from "@noldova/computer-use.runtime";
 *
 * try {
 *   new Display("display-1", 0, 0, 0, 1080, 1, true);
 * }
 * catch (error) {
 *   console.log(error instanceof DisplayException);
 * }
 * ```
 */
export declare abstract class DisplayException extends ComputerUseException {
  /**
   * Creates the exception with its message, for a subclass.
   *
   * @param message What went wrong.
   * @param options The underlying error, if any.
   */
  protected constructor(message: string, options?: ExceptionOptions);
}

/**
 * Thrown when a {@link Display}'s ID is empty.
 *
 * @example
 * ```ts
 * import { Display, DisplayIdEmptyException } from "@noldova/computer-use.runtime";
 *
 * try {
 *   new Display("", 0, 0, 1920, 1080, 1, true);
 * }
 * catch (error) {
 *   console.log(error instanceof DisplayIdEmptyException);
 * }
 * ```
 */
export declare class DisplayIdEmptyException extends DisplayException {
  /**
   * Creates the exception, with its message from the facts.
   */
  public constructor();
}

/**
 * Thrown when a {@link Display}'s origin isn't whole pixels.
 *
 * @example
 * ```ts
 * import { Display, DisplayOriginInvalidException } from "@noldova/computer-use.runtime";
 *
 * try {
 *   new Display("display-1", 0.5, 0, 1920, 1080, 1, true);
 * }
 * catch (error) {
 *   console.log(error instanceof DisplayOriginInvalidException && error.displayId);
 * }
 * ```
 */
export declare class DisplayOriginInvalidException extends DisplayException {
  /**
   * The display's ID.
   */
  public readonly displayId: string;

  /**
   * Creates the exception, with its message from the facts.
   *
   * @param displayId The display's ID.
   */
  public constructor(displayId: string);
}

/**
 * Thrown when a {@link Display}'s size isn't whole pixels above zero.
 *
 * @example
 * ```ts
 * import { Display, DisplaySizeInvalidException } from "@noldova/computer-use.runtime";
 *
 * try {
 *   new Display("display-1", 0, 0, 0, 1080, 1, true);
 * }
 * catch (error) {
 *   console.log(error instanceof DisplaySizeInvalidException && error.displayId);
 * }
 * ```
 */
export declare class DisplaySizeInvalidException extends DisplayException {
  /**
   * The display's ID.
   */
  public readonly displayId: string;

  /**
   * Creates the exception, with its message from the facts.
   *
   * @param displayId The display's ID.
   */
  public constructor(displayId: string);
}

/**
 * Thrown when a {@link Display}'s scale factor isn't a finite number above zero.
 *
 * @example
 * ```ts
 * import { Display, DisplayScaleInvalidException } from "@noldova/computer-use.runtime";
 *
 * try {
 *   new Display("display-1", 0, 0, 1920, 1080, 0, true);
 * }
 * catch (error) {
 *   console.log(error instanceof DisplayScaleInvalidException && error.displayId);
 * }
 * ```
 */
export declare class DisplayScaleInvalidException extends DisplayException {
  /**
   * The display's ID.
   */
  public readonly displayId: string;

  /**
   * Creates the exception, with its message from the facts.
   *
   * @param displayId The display's ID.
   */
  public constructor(displayId: string);
}

/**
 * Thrown when a physical input monitor is started again while it runs.
 *
 * @example
 * ```ts
 * import { MonitorRunningException } from "@noldova/computer-use.runtime";
 *
 * const failure = new MonitorRunningException();
 * console.log(failure.message);
 * ```
 */
export declare class MonitorRunningException extends ComputerUseException {
  /**
   * Creates the exception, with its message from the facts.
   */
  public constructor();
}

/**
 * Thrown by an operating-system backend that refuses a capture or an input, with the reason.
 * The backend checks its target in the same call as the input, so a refusal before sending leaves the target untouched.
 *
 * @example
 * ```ts
 * import { RefusalException, RefusalReason } from "@noldova/computer-use.runtime";
 *
 * const refusal = new RefusalException(RefusalReason.NotForeground, false);
 * console.log(refusal.reason === RefusalReason.NotForeground, refusal.isInputSent);
 * ```
 */
export declare class RefusalException extends ComputerUseException {
  /**
   * Whether the backend had started sending the input before it found the reason.
   * When `true`, some of the input may have reached the target, so the action's outcome is uncertain and the screen has to be read again.
   */
  public readonly isInputSent: boolean;

  /**
   * Why the backend refused.
   */
  public readonly reason: RefusalReason;

  /**
   * Creates the refusal, with the reason's text as its message, and a note that the outcome is uncertain when the input was already sent.
   *
   * @param reason Why the backend refused.
   * @param isInputSent Whether the backend had started sending the input.
   */
  public constructor(reason: RefusalReason, isInputSent: boolean);
}

/**
 * Lists the apps, for the platform's backend. It reports facts only; the runtime classifies the apps and sets their tiers.
 */
export interface IAppBackend {
  /**
   * Lists the apps installed or running, each once.
   *
   * @param signal Aborted when the call that asked is cancelled.
   * @returns The apps, in no particular order, including the app the module runs in, marked by {@link AppInfo.isHost}.
   */
  listAppsAsync(signal: AbortSignal): Promise<readonly AppInfo[]>;

  /**
   * Reads an installed app by its identity, as the person knows it: its name, its publisher and its icon.
   *
   * @param identity The app's identity, as a remembered grant names it.
   * @param iconSize The icon's side in pixels, from 1 to 1024.
   * @param signal Aborted when the call that asked is cancelled; an abort rejects.
   * @returns The app, or `null` when no installed app has the identity.
   */
  describeAppAsync(identity: AppIdentity, iconSize: number, signal: AbortSignal): Promise<AppDescription | null>;
}

/**
 * Captures single windows, for the platform's backend: never the screen, so a screenshot holds only the pixels of the windows
 * it may show, and no other window's or the desktop's.
 */
export interface ICaptureBackend {
  /**
   * Measures one display as it is now, for a capture composed of its windows.
   *
   * @param displayId The {@link Display.id} of a current display.
   * @param signal Aborted when the call that asked is cancelled; an abort before the call starts rejects.
   * @returns The display's frame on the desktop, its scale and the size in pixels its capture has.
   * @throws {RefusalException} Rejects with {@link RefusalReason.OutsideDisplays} when no current display has the ID, and on macOS with
   * {@link RefusalReason.DesktopOnlyCapture} when the Screen Recording grant is missing.
   */
  measureDisplayAsync(displayId: string, signal: AbortSignal): Promise<CaptureLayout>;

  /**
   * Captures one window as it draws itself, whatever lies in front of it on the screen.
   *
   * @param window A window of the latest {@link IWindowBackend.listStackAsync} list.
   * @param signal Aborted when the call that asked is cancelled; an abort before the capture starts rejects and captures nothing.
   * @returns The window's own pixels over its frame, at the pixels of the display it lies on; `null` when the window has gone,
   * no longer shows, or no longer lies at the frame the list gave, so the screenshot covers it.
   * @throws {RefusalException} Rejects on macOS with {@link RefusalReason.DesktopOnlyCapture} when the Screen Recording grant is missing.
   */
  captureWindowAsync(window: StackedWindow, signal: AbortSignal): Promise<WindowImage | null>;
}

/**
 * Reads a window's controls through the platform's accessibility API, and finds one again by the handle a read gave it, for the
 * platform's backend.
 *
 * @remarks
 * The backend keeps a reference for each control a read gives, which {@link IControlBackend.findControlAsync} finds it by: a read of the
 * whole window frees every reference kept before it once it finds the window, and a read under a control frees only those of the read under
 * a control before it.
 * A password field's value is never read.
 */
export interface IControlBackend {
  /**
   * Reads the controls of a window, or of the part under one of its controls, breadth first.
   *
   * @param target The window to read, which must be the one in front.
   * @param underHandle The handle of a control of the latest whole read, to read only the controls under it, or `null` for the whole window.
   * @param signal Aborted when the call that asked is cancelled; the read then stops and rejects.
   * @returns The controls, each after the control it lies in, with those at the top of the read having no parent; how many it left out at
   * its limits; and whether it ran out of time.
   * @throws {Error} Rejects when the window or the control under which to read can't be read.
   */
  readControlsAsync(target: InputTarget, underHandle: string | null, signal: AbortSignal): Promise<ControlTree>;

  /**
   * Finds a control of the latest read again, as it is now.
   *
   * @param target The window the control was read from.
   * @param handle The handle the read gave the control.
   * @param signal Aborted when the call that asked is cancelled.
   * @returns The control's role, name, state and point now, or `null` when it is gone, its reference was freed, or it is another app's control
   * that the read listed by its app only.
   * @throws {Error} Rejects when the platform's accessibility API fails.
   */
  findControlAsync(target: InputTarget, handle: string, signal: AbortSignal): Promise<ControlSpot | null>;

  /**
   * Tells whether the control at a point, as the platform's hit test gives it, is a control of the latest read or one under it.
   *
   * @param target The window the control was read from.
   * @param handle The handle the read gave the control.
   * @param at The point, in desktop pixels.
   * @param signal Aborted when the call that asked is cancelled.
   * @returns `true` when the control at the point is the control or lies in it; `false` when another control is there, or the
   * control is gone or its reference was freed.
   * @throws {Error} Rejects when the platform's accessibility API fails.
   */
  isControlAtAsync(target: InputTarget, handle: string, at: DesktopPoint, signal: AbortSignal): Promise<boolean>;
}

/**
 * Sends pointer and keyboard input to one checked target, for the platform's backend.
 *
 * @remarks
 * In the same call as each input, the backend checks that the window in front is the target's window in the target's process, that the
 * window under each point is the target's (or another window of its process, such as its menu), that the target doesn't run with higher
 * rights than the module, and, for keys and text, that the focused field isn't a password field. Then it sends the whole input at once, and
 * checks again that the target is in front and that the person didn't use the pointer or the keyboard meanwhile.
 *
 * Before a move, a click, a scroll and each end of a drag, the pointer glides there from where it is along a {@link GlidePath}, so the
 * person can follow where the input goes. Each of the glide's moves comes after the input's own check, at the input's points, and a check
 * that fails stops the glide and rejects with {@link RefusalException.isInputSent} `false`, since the moves only show the way; a check
 * that fails during a drag's glide, with the button down, releases the button and the modifiers where the pointer is and rejects with
 * `true`. A pointer the backend can't read has no glide.
 *
 * A refusal found before sending leaves the target untouched, and rejects with {@link RefusalException.isInputSent} `false`. A refusal
 * found after sending started rejects with `true`: the outcome is uncertain, and the runtime reads the screen again before the next action.
 *
 * An abort before the check rejects with an `AbortError` and sends nothing; an abort during a glide lets the glide end, at most
 * {@link GlidePath.maxDurationMs} later, and then rejects the same way. Once sending starts, the call completes; whatever happens, the
 * backend releases every button and modifier it pressed before it settles, so a stop never leaves input held.
 *
 * On Windows, keyboard input goes only where UI Automation answers within the backend's focus budget, half a second by default,
 * that the focused element is the target process's and no password field, and where no classic edit control with the
 * `ES_PASSWORD` style has the focus. On macOS, keyboard input goes only where the system-wide Accessibility element names the
 * target's app, or no app, as the one with the keyboard focus, and the app answers that no element has the focus, or names its
 * focused element and that element's subrole isn't `AXSecureTextField`, a password field's, each within half a second. On both,
 * typing stops after the first Tab or Enter and refuses the rest.
 * Secure keyboard entry ({@link RefusalReason.SecureInput}) exists only on macOS.
 */
export interface IInputBackend {
  /**
   * The most UTF-16 code units one {@link IInputBackend.typeTextAsync} call takes. The runtime splits longer text and calls once per chunk,
   * so a change of focus stops the text at a chunk's end.
   */
  readonly maxTextChunkLength: number;

  /**
   * Reads where the pointer is. It sends no input, so it needs no target and makes no check.
   *
   * @param signal Aborted when the call that asked is cancelled.
   * @returns The pointer's position in desktop coordinates, to the nearest whole unit.
   * @throws {Error} Rejects when the system can't report the pointer.
   */
  readPointerAsync(signal: AbortSignal): Promise<DesktopPoint>;

  /**
   * Glides the pointer from where it is to a point along a {@link GlidePath}, with the input's check at its points before each
   * move, and sends nothing else. An input on a control glides first, so the runtime can find the control again once the pointer
   * is there; the input's own glide then has no way left to go.
   *
   * @param target The window the input goes to.
   * @param to Where the glide ends, in desktop coordinates.
   * @param points The input's points, which the check before each move covers.
   * @param signal Aborted when the call that asked is cancelled; the glide then sends no more moves.
   * @throws {RefusalException} Rejects when a check fails, with {@link RefusalException.isInputSent} `false`.
   * @throws {Error} Rejects when the system can't move the pointer.
   */
  glidePointerAsync(target: InputTarget, to: DesktopPoint, points: readonly DesktopPoint[], signal: AbortSignal): Promise<void>;

  /**
   * Moves the pointer to a point inside the target.
   *
   * @param target The app and window the input may touch.
   * @param to Where the pointer goes, in desktop coordinates.
   * @param signal Aborted when the call that asked is cancelled.
   * @returns Settles once the input is sent and checked.
   * @throws {RefusalException} Rejects when a check fails, before or after sending.
   */
  movePointerAsync(target: InputTarget, to: DesktopPoint, signal: AbortSignal): Promise<void>;

  /**
   * Clicks once, twice or three times at a point inside the target, holding the modifiers.
   *
   * @param target The app and window the input may touch.
   * @param at Where to click, in desktop coordinates.
   * @param button The button to click.
   * @param count How many clicks, sent close enough together to count as one double or triple click.
   * @param modifiers The keys held during the clicks, pressed in this order and released in reverse; empty for none.
   * @param signal Aborted when the call that asked is cancelled.
   * @returns Settles once the input is sent and checked.
   * @throws {RefusalException} Rejects when a check fails, before or after sending.
   */
  clickAsync(target: InputTarget, at: DesktopPoint, button: PointerButton, count: ClickCount, modifiers: readonly ModifierKey[], signal: AbortSignal): Promise<void>;

  /**
   * Presses a button at one point, glides to another, and releases it there, holding the modifiers. Both points must lie inside the
   * target.
   *
   * @param target The app and window the input may touch.
   * @param from Where the button goes down, in desktop coordinates.
   * @param to Where the button comes up, in desktop coordinates.
   * @param button The button to hold.
   * @param modifiers The keys held during the drag; empty for none.
   * @param signal Aborted when the call that asked is cancelled.
   * @returns Settles once the input is sent and checked.
   * @throws {RefusalException} Rejects when a check fails, before or after sending.
   */
  dragAsync(target: InputTarget, from: DesktopPoint, to: DesktopPoint, button: PointerButton, modifiers: readonly ModifierKey[], signal: AbortSignal): Promise<void>;

  /**
   * Scrolls the wheel at a point inside the target, holding the modifiers.
   *
   * @param target The app and window the input may touch.
   * @param at Where the pointer is while it scrolls, in desktop coordinates.
   * @param amount How many notches each way.
   * @param modifiers The keys held during the scroll; empty for none.
   * @param signal Aborted when the call that asked is cancelled.
   * @returns Settles once the input is sent and checked.
   * @throws {RefusalException} Rejects when a check fails, before or after sending.
   */
  scrollAsync(target: InputTarget, at: DesktopPoint, amount: ScrollAmount, modifiers: readonly ModifierKey[], signal: AbortSignal): Promise<void>;

  /**
   * Types one chunk of text into the target's focused field, as text rather than key presses, so the keyboard layout doesn't change it.
   * A line break, a line feed, a carriage return or the pair of them, presses Enter once, Return on macOS, and a tab presses Tab.
   *
   * @param target The app and window the input may touch.
   * @param chunk From 1 to {@link IInputBackend.maxTextChunkLength} UTF-16 code units.
   * @param signal Aborted when the call that asked is cancelled.
   * @returns Settles once the input is sent and checked.
   * @throws {ArgumentOutOfRangeException} Rejects when the chunk is empty or too long, before any check.
   * @throws {RefusalException} Rejects when a check fails, before or after sending.
   */
  typeTextAsync(target: InputTarget, chunk: string, signal: AbortSignal): Promise<void>;

  /**
   * Presses and releases one key, holding the modifiers, such as Control and C.
   *
   * @param target The app and window the input may touch.
   * @param key The key to press.
   * @param modifiers The keys held while it's pressed, pressed in this order and released in reverse; empty for none.
   * @param signal Aborted when the call that asked is cancelled.
   * @returns Settles once the input is sent and checked.
   * @throws {RefusalException} Rejects when a check fails, before or after sending.
   */
  pressKeyAsync(target: InputTarget, key: KeyName, modifiers: readonly ModifierKey[], signal: AbortSignal): Promise<void>;

  /**
   * Says whether the operating system handles a key combination rather than the app in front, such as switching or closing apps,
   * opening the start menu or system search, or locking the screen. The runtime then raises its own request, which the person answers.
   *
   * @param key The key pressed.
   * @param modifiers The keys held while it's pressed, in any order; empty for none.
   * @returns True for a combination the operating system handles.
   */
  isSystemCombination(key: KeyName, modifiers: readonly ModifierKey[]): boolean;
}

/**
 * Everything one platform's backend offers the runtime.
 */
export interface IOperatingSystemBackend {
  /**
   * Lists the apps.
   */
  readonly apps: IAppBackend;

  /**
   * Reads the displays.
   */
  readonly displays: IDisplayBackend;

  /**
   * Reads the window in front.
   */
  readonly windows: IWindowBackend;

  /**
   * Captures displays.
   */
  readonly capture: ICaptureBackend;

  /**
   * Reads the controls of the window in front.
   */
  readonly controls: IControlBackend;

  /**
   * Sends checked input.
   */
  readonly input: IInputBackend;

  /**
   * Reports the person's own pointer and keyboard use.
   */
  readonly physicalInput: IPhysicalInputMonitor;

  /**
   * Shows the border around the displays while a session controls the screen.
   */
  readonly border: IBorderBackend;
}

/**
 * Shows a border along the edges of the displays, so the person sees that an agent uses the computer.
 *
 * @remarks
 * The border's windows take no click, no key and no focus, and stay out of the taskbar, the Dock and the window switcher. The backend's
 * own window lists leave them out by their handles on Windows and their window numbers on macOS, so the agent's screenshots never hold
 * them and they never cover a window there; every other capture, such as a recording or a screen share, shows them.
 *
 * The runtime shows the border again every second while it shows, over the displays as they are then. A border shown again with the same
 * frames and colour only comes back to the front.
 *
 * @example
 * ```ts
 * import { BorderFrame, DesktopRect, type IBorderBackend } from "@noldova/computer-use.runtime";
 *
 * declare const border: IBorderBackend;
 * await border.showAsync([new BorderFrame(new DesktopRect(0, 0, 1920, 1080), 4)], "#005FB8", AbortSignal.timeout(1000));
 * ```
 */
export interface IBorderBackend {
  /**
   * The desktop units a CSS pixel spans on a display.
   *
   * @param display The display.
   * @returns Its scale factor on Windows, whose units are physical pixels; 1 on macOS, whose units are points.
   */
  unitsPerPixel(display: Display): number;

  /**
   * Shows a border along each frame, in place of the border shown.
   *
   * @param frames One frame for each display.
   * @param color The colour, as `#RRGGBB`.
   * @param signal Aborted when the runtime part ends.
   * @returns Settles once the border shows.
   * @throws {Error} Rejects when the operating system refuses a window, or the signal is aborted.
   */
  showAsync(frames: readonly BorderFrame[], color: string, signal: AbortSignal): Promise<void>;

  /**
   * Hides the border; does nothing when none shows.
   *
   * @param signal Aborted when the runtime part ends.
   * @returns Settles once the border is gone.
   * @throws {Error} Rejects when the signal is aborted, or the backend's process fails.
   */
  hideAsync(signal: AbortSignal): Promise<void>;
}

/**
 * Reports when the person uses the real pointer or keyboard, apart from the input the module sends, and beats while it is alive.
 *
 * @remarks
 * On Windows, low-level mouse and keyboard hooks run on their own thread, which skips injected events, flags physical ones and posts them,
 * nothing more. On macOS, the backend polls the pointer and compares it with the position the module set last; it sees no key presses,
 * since a key hook needs the Input Monitoring grant.
 *
 * The runtime runs it only while a tool sends input. Physical input stops control, and so do three missed heartbeats in a row,
 * which mean a lost monitor.
 */
export interface IPhysicalInputMonitor {
  /**
   * How often the monitor beats while it runs, in milliseconds.
   */
  readonly heartbeatIntervalMs: number;

  /**
   * Starts watching; the first heartbeat follows at once.
   *
   * @param signal Aborted when the start is cancelled; the monitor then doesn't run.
   * @returns Settles once the monitor runs.
   * @throws {MonitorRunningException} Rejects when the monitor is already running.
   * @throws {Error} Rejects when the operating system refuses it.
   */
  startAsync(signal: AbortSignal): Promise<void>;

  /**
   * Stops watching; no listener is called after it settles.
   *
   * @returns Settles once the monitor has stopped; settles at once when it isn't running.
   */
  stopAsync(): Promise<void>;

  /**
   * Listens for the person's input.
   *
   * @param listener Called with each report; reports of one kind don't queue up while one is pending.
   * @returns Stops the listener when disposed.
   */
  onPhysicalInput(listener: (input: PhysicalInput) => void): Disposable;

  /**
   * Listens for the monitor's heartbeat.
   *
   * @param listener Called with each beat.
   * @returns Stops the listener when disposed.
   */
  onHeartbeat(listener: (heartbeat: Heartbeat) => void): Disposable;
}

/**
 * Reads the windows, for the platform's backend.
 */
export interface IWindowBackend {
  /**
   * Reads the window in front, as the operating system reports it.
   *
   * @param signal Aborted when the call that asked is cancelled.
   * @returns The window in front, or `null` when no window is in front, such as on the desktop or a locked screen, or when
   * the window in front belongs to no app, such as the Windows taskbar.
   */
  getForegroundWindowAsync(signal: AbortSignal): Promise<WindowInfo | null>;

  /**
   * Lists the windows that may show on the screen, from the front, so a screenshot shows only granted apps' windows.
   *
   * @param signal Aborted when the call that asked is cancelled.
   * @returns The windows, marked incomplete when one couldn't be placed.
   */
  listStackAsync(signal: AbortSignal): Promise<WindowStack>;
}

/**
 * One of the module's tools, which the runtime part runs inside its controls for each call the base's registry hands it.
 *
 * @example
 * ```ts
 * import type { IComputerTool, IToolCallContext } from "@noldova/computer-use.runtime";
 * import { ToolResult } from "@noldova/desktop.runtime";
 *
 * const tool: IComputerTool = {
 *   handleAsync: async (_input, context: IToolCallContext) => new ToolResult([], { scope: context.scope })
 * };
 * ```
 */
export interface IComputerTool {
  /**
   * Runs one call.
   *
   * @param input The call's arguments, which the registry has checked against the tool's input schema.
   * @param context The call's session, scope and signal, and its ways to ask the person and to report sending.
   * @returns The tool's result.
   * @throws {ToolFailureException} The base's exception, with the failure the call ends with.
   */
  handleAsync(input: JsonObject, context: IToolCallContext): Promise<ToolResult>;
}

/**
 * Reads the displays of the machine the runtime runs on, for the platform's backend.
 */
export interface IDisplayBackend {
  /**
   * Lists the displays.
   *
   * @param signal Aborted when the call that asked is cancelled.
   * @returns The displays, in the platform's order.
   */
  listDisplaysAsync(signal: AbortSignal): Promise<readonly Display[]>;
}

/**
 * The wire form of a {@link Display}.
 */
export interface IDisplayJson {
  readonly [key: string]: string | number | boolean;

  /**
   * The display's ID.
   */
  readonly id: string;

  /**
   * The left edge on the virtual desktop, in desktop units: physical pixels on Windows, points on macOS.
   */
  readonly x: number;

  /**
   * The top edge on the virtual desktop, in desktop units: physical pixels on Windows, points on macOS.
   */
  readonly y: number;

  /**
   * The width, in desktop units: physical pixels on Windows, points on macOS.
   */
  readonly width: number;

  /**
   * The height, in desktop units: physical pixels on Windows, points on macOS.
   */
  readonly height: number;

  /**
   * The display's UI scale: physical pixels per logical unit of the operating system's own scaling. On Windows it is the DPI over 96,
   * and desktop coordinates are physical pixels; on macOS it is the backing scale factor, and desktop coordinates are points.
   */
  readonly scaleFactor: number;

  /**
   * Whether this is the primary display.
   */
  readonly isPrimary: boolean;
}

/**
 * Starts a program for the macOS backend; the runtime part's context is one. The program runs as a child of the runtime, so macOS
 * checks its grants for the runtime's responsible process, which Noldova Desktop makes the runtime itself, the app, also when a
 * terminal started the app.
 */
export interface IProgramStarter {
  /**
   * The module's log, where the backend writes a failure it can't report to a call, such as a program that wouldn't stop.
   */
  readonly log: IModuleLog;

  /**
   * Starts the program.
   *
   * @param request The program, its arguments, its folder and environment, and the signal that stops it.
   * @returns The running program, which the base stops when the module is switched off.
   */
  startProcessAsync(request: ProcessRequest): Promise<OwnedProcess>;
}

/**
 * What a tool reads of its call, from the base's registry, with the signal that also ends when the module is switched off.
 */
export interface IToolCallContext {
  /**
   * The scope the app names for the session, such as its conversation, which remembered permission answers are kept under.
   */
  readonly scope: string;

  /**
   * The agent session that called.
   */
  readonly sessionId: string;

  /**
   * Aborted, with the base's abort reason, when the call is cancelled, stopped, reaches its deadline or its session ends, or
   * when the module is switched off.
   */
  readonly signal: AbortSignal;

  /**
   * Asks through the base's permission contract, which keeps one request of the call waiting at a time.
   *
   * @param request The action, subject, title, details, risk and options.
   * @returns The decision; it never rejects.
   */
  requestPermissionAsync(request: IPermissionRequest): Promise<PermissionOutcome>;

  /**
   * Reports the call's point of no return, just before its first input, so the base fails it as uncertain from then on.
   *
   * @throws {ToolAbortReason} The signal's reason, when the call has already been aborted.
   */
  markSending(): void;
}

/**
 * The operating system's identity of an app, which per-app grants and input targets name: on Windows the full path of the process's
 * program in the one form {@link AppIdentity.ofWindowsPath} gives; on macOS the bundle identifier in the form {@link AppIdentity.ofMacBundleId}
 * gives. Never the app's display name.
 *
 * A remembered grant matches its subject exactly, so the app list, app requests, the window in front and every input request carry
 * the same string for one app.
 *
 * @example
 * ```ts
 * import { AppIdentity } from "@noldova/computer-use.runtime";
 *
 * console.log(new AppIdentity("com.example.notes").id);
 * console.log(AppIdentity.ofWindowsPath("C:/Program Files/Notes/Notes.exe").id); // c:\program files\notes\notes.exe
 * console.log(AppIdentity.ofMacBundleId("com.Example.Notes").id); // com.example.notes
 * ```
 */
export declare class AppIdentity {
  /**
   * The identity, not blank.
   */
  public readonly id: string;

  /**
   * Creates the identity as given.
   *
   * @param id The bundle identifier on macOS; on Windows, an id {@link AppIdentity.ofWindowsPath} gave.
   * @throws {ArgumentOutOfRangeException} When the identity is blank.
   */
  public constructor(id: string);

  /**
   * Creates a Windows identity in its one form: the path normalized, with backslashes and without `.` or `..` parts, then with the
   * ASCII capitals `A` to `Z` in lower case and every other character as given, such as `İ`, `Ö` or a Cherokee capital, since only
   * ASCII folds the same in every Windows version's case table, by which Windows compares paths and opens files.
   * The Windows backend reports every app this way, from the long path the system gives for the program.
   *
   * @param programPath The program's full path, from a drive or a network share.
   * @returns The identity.
   * @throws {ProgramPathInvalidException} When the path isn't a full path to a file.
   */
  public static ofWindowsPath(programPath: string): AppIdentity;

  /**
   * Whether a path is one {@link AppIdentity.ofWindowsPath} takes: a full path to a file, from a drive or a network share.
   *
   * @param programPath The path to check.
   * @returns `true` when the path is a full path to a file.
   */
  public static isWindowsPath(programPath: string): boolean;

  /**
   * Creates a macOS identity in its one form: the bundle identifier in lower case, since macOS compares bundle identifiers without case.
   * The macOS backend reports every app this way.
   *
   * @param bundleId The app's bundle identifier, such as `com.apple.TextEdit`.
   * @returns The identity.
   * @throws {BundleIdInvalidException} When the identifier is empty or holds a space or a slash.
   */
  public static ofMacBundleId(bundleId: string): AppIdentity;
}

/**
 * An installed app as the person knows it, for another module's eyes: its name, its publisher and its icon.
 *
 * @example
 * ```ts
 * import { AppDescription, AppIdentity } from "@noldova/computer-use.runtime";
 *
 * const app = new AppDescription(new AppIdentity("com.example.notes"), "Notes", null, null);
 * console.log(app.name, app.icon === null);
 * ```
 */
export declare class AppDescription {
  /**
   * The app's icon as a PNG of a square of the size asked, with alpha, or `null` when the system gives none.
   */
  public readonly icon: Uint8Array | null;

  /**
   * The app's identity.
   */
  public readonly identity: AppIdentity;

  /**
   * The app's name, for the person's eyes; never for a decision.
   */
  public readonly name: string;

  /**
   * The app's publisher, as the certificate that signed it names it, or `null` when it isn't signed, its certificate names no
   * publisher, such as the App Store's on macOS, the signer couldn't be read, or the platform reads none.
   */
  public readonly publisher: string | null;

  /**
   * Creates the description.
   *
   * @param identity The app's identity.
   * @param name The app's name, not blank.
   * @param publisher The publisher's name, not blank, or `null` for none.
   * @param icon The icon as a PNG, or `null` for none.
   * @throws {ArgumentOutOfRangeException} When the name or the publisher is blank.
   */
  public constructor(identity: AppIdentity, name: string, publisher: string | null, icon: Uint8Array | null);
}

/**
 * The service the runtime part publishes as `computer-use.apps` while it runs: it describes an installed app for another module's
 * eyes, with its icon at 64 pixels a side, so the module shows an app the person granted as they know it.
 *
 * @remarks
 * The call takes the identity as text, so it needs no class of this package; `getService` checks the service against
 * `AppsService` as a value, so the lookup below does. Noldova Desktop's optional dependencies settle the lookup with
 * `findService` and a type guard, importing `AppsService` as a type only.
 *
 * @example
 * ```ts
 * import { AppsService } from "@noldova/computer-use.runtime";
 * import type { IRuntimePartContext } from "@noldova/desktop.runtime";
 *
 * export async function nameOfAsync(context: IRuntimePartContext, subject: string): Promise<string> {
 *   const app = await context.getService("computer-use.apps", AppsService).describeAsync(subject, AbortSignal.timeout(10_000));
 *   return app?.name ?? subject;
 * }
 * ```
 */
export declare class AppsService {
  /**
   * The side of the icon's square, in pixels.
   */
  public static readonly iconSize: number;

  /**
   * Creates the service; the runtime part creates the one it publishes.
   *
   * @param backendOf Gives the platform's app backend while computer use is on, and `null` while it's off or the platform has none.
   * @param write Writes a line to the module's log: the kind of a backend failure, or the time limit passed, never the app.
   */
  public constructor(backendOf: () => IAppBackend | null, write: (line: string) => void);

  /**
   * Describes the app. It describes one app at a time, since on macOS the descriptions share the input process's channel with every
   * other call and can't be stopped once sent: the next call waits for the backend's read to end, even when this call's answer came
   * at the time limit of 5 seconds, which starts at the call's turn; a call whose signal ends while it waits rejects at once, never read.
   * An icon that can't be read leaves the description without one. When the backend fails or the time limit passes, it writes the kind of failure to the log but nothing about the app, as an app the person uses is theirs.
   *
   * @param identity The app's identity as text, such as a remembered grant's subject: a program's path in lowercase on Windows, such as
   * `c:\windows\notepad.exe`, or a bundle identifier in lowercase on macOS, such as `com.apple.textedit`.
   * @param signal Ends the call.
   * @returns The description, or `null` while computer use is off or on a platform it doesn't support, for a blank identity, when no
   * installed app has the identity, when the backend fails, or past the time limit.
   * @throws {unknown} The signal's reason when the signal ends the call, or a failure that isn't the backend's own, such as a defect, as it is.
   */
  public describeAsync(identity: string, signal: AbortSignal): Promise<AppDescription | null>;
}

/**
 * An app installed or running on the machine, as the operating system reports it.
 *
 * @example
 * ```ts
 * import { AppIdentity, AppInfo } from "@noldova/computer-use.runtime";
 *
 * const app = new AppInfo(new AppIdentity("com.example.notes"), "Notes", null, true, false);
 * console.log(app.name, app.publisher);
 * ```
 */
export declare class AppInfo {
  /**
   * The app's identity, which grants and targets name.
   */
  public readonly identity: AppIdentity;

  /**
   * Whether this is the app the module runs in, which the module never drives.
   */
  public readonly isHost: boolean;

  /**
   * Whether the app runs now.
   */
  public readonly isRunning: boolean;

  /**
   * The app's name, for the person's eyes; never for a decision.
   */
  public readonly name: string;

  /**
   * The name of the app's signer, or `null` when it isn't signed or the signer couldn't be read.
   */
  public readonly publisher: string | null;

  /**
   * Creates the description.
   *
   * @param identity The app's identity.
   * @param name The app's name, not blank.
   * @param publisher The signer's name, not blank, or `null` for none.
   * @param isRunning Whether the app runs now.
   * @param isHost Whether this is the app the module runs in.
   * @throws {ArgumentOutOfRangeException} When the name or the publisher is blank.
   */
  public constructor(identity: AppIdentity, name: string, publisher: string | null, isRunning: boolean, isHost: boolean);
}

/**
 * One capture of a display: its image, composed of the windows a screenshot may show on a fill, and where the display lies on the desktop.
 *
 * @example
 * ```ts
 * import { Capture, DesktopRect } from "@noldova/computer-use.runtime";
 *
 * const capture = new Capture("display-1", new DesktopRect(0, 0, 1440, 900), 2, 2880, 1800, new Uint8Array(2880 * 1800 * 4));
 * console.log(capture.toDesktopPoint(2000, 900));
 * ```
 */
export declare class Capture {
  /**
   * How many bytes each pixel takes in {@link Capture.bgra}: 4.
   */
  public static readonly bytesPerPixel: number;

  /**
   * The image's pixels, rows from the top, each pixel blue, green, red and an unused byte.
   */
  public readonly bgra: Uint8Array;

  /**
   * The {@link Display.id} of the captured display.
   */
  public readonly displayId: string;

  /**
   * The display's frame, in desktop coordinates.
   */
  public readonly frame: DesktopRect;

  /**
   * The image's height, in physical pixels.
   */
  public readonly height: number;

  /**
   * The display's UI scale, as {@link Display.scaleFactor} describes it: the DPI over 96 on Windows, the backing scale factor on macOS.
   * The image itself is in physical pixels. The scale describes the display to the model; mapping a
   * point uses {@link Capture.toDesktopPoint}.
   */
  public readonly scaleFactor: number;

  /**
   * The image's width, in physical pixels.
   */
  public readonly width: number;

  /**
   * Creates the capture.
   *
   * @param displayId The captured display's ID, not empty.
   * @param frame The display's frame, in desktop coordinates.
   * @param scaleFactor The display's UI scale, finite and above zero.
   * @param width The image's width, in whole pixels above zero.
   * @param height The image's height, in whole pixels above zero.
   * @param bgra The pixels, 4 bytes for each, blue, green, red and an unused byte. The capture keeps this array, without copying it.
   * @throws {ArgumentOutOfRangeException} When a value is refused.
   * @throws {ArgumentException} When the pixels don't match the size.
   */
  public constructor(displayId: string, frame: DesktopRect, scaleFactor: number, width: number, height: number, bgra: Uint8Array);

  /**
   * Maps a pixel of the image to the desktop point at the centre of the area it shows.
   *
   * @param imageX The pixel's column, from 0 to {@link Capture.width} − 1.
   * @param imageY The pixel's row, from 0 to {@link Capture.height} − 1.
   * @returns The desktop point the input backend takes.
   * @throws {ArgumentOutOfRangeException} When the pixel lies outside the image.
   *
   * @example
   * ```ts
   * import { Capture, DesktopRect } from "@noldova/computer-use.runtime";
   *
   * const capture = new Capture("display-2", new DesktopRect(-1920, 0, 1920, 1080), 1, 1920, 1080, new Uint8Array(1920 * 1080 * 4));
   * console.log(capture.toDesktopPoint(0, 0));
   * // @ts-expect-error The pixel must be a number.
   * capture.toDesktopPoint("0", 0);
   * ```
   */
  public toDesktopPoint(imageX: number, imageY: number): DesktopPoint;
}

/**
 * Where a display lies on the desktop, its scale, and the size in pixels its capture has, as
 * {@link ICaptureBackend.measureDisplayAsync} measures it for a capture composed of the display's windows.
 *
 * @example
 * ```ts
 * import { CaptureLayout, DesktopRect } from "@noldova/computer-use.runtime";
 *
 * const layout = new CaptureLayout("display-1", new DesktopRect(0, 0, 1440, 900), 2, 2880, 1800);
 * console.log(layout.width / layout.frame.width);
 * ```
 */
export declare class CaptureLayout {
  /**
   * The {@link Display.id} of the measured display.
   */
  public readonly displayId: string;

  /**
   * The display's frame, in desktop coordinates.
   */
  public readonly frame: DesktopRect;

  /**
   * The capture's height, in physical pixels.
   */
  public readonly height: number;

  /**
   * The display's UI scale, as {@link Capture.scaleFactor} describes it.
   */
  public readonly scaleFactor: number;

  /**
   * The capture's width, in physical pixels.
   */
  public readonly width: number;

  /**
   * Creates the layout.
   *
   * @param displayId The display's ID, not empty.
   * @param frame The display's frame, in desktop coordinates.
   * @param scaleFactor The display's UI scale, finite and above zero.
   * @param width The capture's width, in whole pixels above zero.
   * @param height The capture's height, in whole pixels above zero.
   * @throws {ArgumentOutOfRangeException} When a value is refused.
   */
  public constructor(displayId: string, frame: DesktopRect, scaleFactor: number, width: number, height: number);
}

/**
 * How many clicks one click action sends.
 *
 * @example
 * ```ts
 * import { ClickCount } from "@noldova/computer-use.runtime";
 *
 * console.log(ClickCount.Double.count);
 * ```
 */
export declare class ClickCount {
  /**
   * One click.
   */
  public static readonly Single: ClickCount;

  /**
   * Two clicks, close enough together to count as a double click.
   */
  public static readonly Double: ClickCount;

  /**
   * Three clicks, close enough together to count as a triple click.
   */
  public static readonly Triple: ClickCount;

  /**
   * The number of clicks: 1, 2 or 3.
   */
  public readonly count: number;

  /**
   * The count's value: `"Single"`, `"Double"` or `"Triple"`.
   */
  public readonly value: string;

  private constructor();
}

/**
 * One control of a window, as {@link IControlBackend.readControlsAsync} read it.
 *
 * @example
 * ```ts
 * import { AppIdentity, ControlInfo, ControlRole, ControlState, DesktopRect } from "@noldova/computer-use.runtime";
 *
 * const app = AppIdentity.ofWindowsPath("C:/Windows/notepad.exe");
 * const control = new ControlInfo("7", null, app, ControlRole.Button, "Save", null, [ControlState.Focused], new DesktopRect(1100, 790, 80, 24));
 * console.log(control.isSilentContainer);
 * ```
 */
export declare class ControlInfo {
  /**
   * The app whose process the control belongs to, which may be another than the window's, such as a web view's.
   */
  public readonly app: AppIdentity;

  /**
   * The control's visible bounds, in desktop coordinates, or `null` when none of it shows.
   */
  public readonly bounds: DesktopRect | null;

  /**
   * The handle by which {@link IControlBackend.findControlAsync} finds the control again.
   */
  public readonly handle: string;

  /**
   * The control's name, or `""` when it has none.
   */
  public readonly name: string;

  /**
   * The handle of the control it lies in, or `null` for one at the top of the read.
   */
  public readonly parentHandle: string | null;

  /**
   * The control's role.
   */
  public readonly role: ControlRole;

  /**
   * The states that hold.
   */
  public readonly states: readonly ControlState[];

  /**
   * The control's value, or `null` when it has none or is a password field.
   */
  public readonly value: string | null;

  /**
   * Creates the control.
   *
   * @param handle The handle the backend finds it again by.
   * @param parentHandle The handle of the control it lies in, or `null`.
   * @param app The app whose process it belongs to.
   * @param role Its role.
   * @param name Its name, or `""`.
   * @param value Its value, or `null`.
   * @param states The states that hold. The control keeps this array, without copying it.
   * @param bounds Its visible bounds, or `null`.
   * @throws {ArgumentOutOfRangeException} When a handle is empty.
   * @throws {ArgumentException} When a password field has a value.
   */
  public constructor(handle: string, parentHandle: string | null, app: AppIdentity, role: ControlRole, name: string, value: string | null, states: readonly ControlState[], bounds: DesktopRect | null);

  /**
   * Whether the control only holds others and says nothing of its own, a group or a pane with no name and no value, so a read lists
   * its controls in its place.
   */
  public get isSilentContainer(): boolean;
}

/**
 * What a control is, in one list for every platform, to which each backend maps its own roles.
 *
 * @example
 * ```ts
 * import { ControlRole } from "@noldova/computer-use.runtime";
 *
 * console.log(ControlRole.CheckBox.value);
 * ```
 */
export declare class ControlRole {
  /**
   * A window.
   */
  public static readonly Window: ControlRole;

  /**
   * A dialog.
   */
  public static readonly Dialog: ControlRole;

  /**
   * A menu bar.
   */
  public static readonly MenuBar: ControlRole;

  /**
   * A menu.
   */
  public static readonly Menu: ControlRole;

  /**
   * An item of a menu or a menu bar.
   */
  public static readonly MenuItem: ControlRole;

  /**
   * A toolbar.
   */
  public static readonly Toolbar: ControlRole;

  /**
   * A button.
   */
  public static readonly Button: ControlRole;

  /**
   * A check box.
   */
  public static readonly CheckBox: ControlRole;

  /**
   * A radio button.
   */
  public static readonly Radio: ControlRole;

  /**
   * A combo box or a pop-up button.
   */
  public static readonly ComboBox: ControlRole;

  /**
   * A field that takes text.
   */
  public static readonly Edit: ControlRole;

  /**
   * Text the person can't edit.
   */
  public static readonly Text: ControlRole;

  /**
   * A link.
   */
  public static readonly Link: ControlRole;

  /**
   * An image.
   */
  public static readonly Image: ControlRole;

  /**
   * A list.
   */
  public static readonly List: ControlRole;

  /**
   * An item of a list.
   */
  public static readonly ListItem: ControlRole;

  /**
   * A tree.
   */
  public static readonly Tree: ControlRole;

  /**
   * An item of a tree.
   */
  public static readonly TreeItem: ControlRole;

  /**
   * A table or a grid.
   */
  public static readonly Table: ControlRole;

  /**
   * A row of a table.
   */
  public static readonly Row: ControlRole;

  /**
   * A cell of a table.
   */
  public static readonly Cell: ControlRole;

  /**
   * A header of a table, or one of its column or row headers.
   */
  public static readonly Header: ControlRole;

  /**
   * A tab.
   */
  public static readonly Tab: ControlRole;

  /**
   * A list of tabs.
   */
  public static readonly TabList: ControlRole;

  /**
   * A slider.
   */
  public static readonly Slider: ControlRole;

  /**
   * A progress bar.
   */
  public static readonly ProgressBar: ControlRole;

  /**
   * A scroll bar.
   */
  public static readonly ScrollBar: ControlRole;

  /**
   * A group of controls.
   */
  public static readonly Group: ControlRole;

  /**
   * A pane of controls.
   */
  public static readonly Pane: ControlRole;

  /**
   * A document.
   */
  public static readonly Document: ControlRole;

  /**
   * A control of no other role.
   */
  public static readonly Other: ControlRole;

  /**
   * The role's value, such as `"CheckBox"`; a read lists it in lowercase.
   */
  public readonly value: string;

  private constructor();

  /**
   * Whether the role only holds other controls: a group or a pane.
   */
  public get isContainer(): boolean;
}

/**
 * A control {@link IControlBackend.findControlAsync} found again.
 *
 * @example
 * ```ts
 * import { ControlRole, ControlSpot, DesktopPoint } from "@noldova/computer-use.runtime";
 *
 * console.log(new ControlSpot(ControlRole.Button, "Save", true, true, new DesktopPoint(1140, 802)).point.x);
 * ```
 */
export declare class ControlSpot {
  /**
   * Whether the control takes input.
   */
  public readonly isEnabled: boolean;

  /**
   * Whether the platform reports the control on screen.
   */
  public readonly isOnScreen: boolean;

  /**
   * The control's name now, or `""`.
   */
  public readonly name: string;

  /**
   * The point an input on the control goes to, in desktop coordinates: the clickable point the platform gives, or else the centre of
   * its visible bounds.
   */
  public readonly point: DesktopPoint;

  /**
   * The control's role now.
   */
  public readonly role: ControlRole;

  /**
   * Creates the found control.
   *
   * @param role Its role.
   * @param name Its name, or `""`.
   * @param isEnabled Whether it takes input.
   * @param isOnScreen Whether it is on screen.
   * @param point The point an input on it goes to.
   */
  public constructor(role: ControlRole, name: string, isEnabled: boolean, isOnScreen: boolean, point: DesktopPoint);
}

/**
 * A state a control is in; a read lists only the states that hold.
 *
 * @example
 * ```ts
 * import { ControlState } from "@noldova/computer-use.runtime";
 *
 * console.log(ControlState.Expanded.value);
 * ```
 */
export declare class ControlState {
  /**
   * The control has the keyboard focus.
   */
  public static readonly Focused: ControlState;

  /**
   * The control doesn't take input.
   */
  public static readonly Disabled: ControlState;

  /**
   * The control's value can't be changed.
   */
  public static readonly ReadOnly: ControlState;

  /**
   * The control is checked or on.
   */
  public static readonly Checked: ControlState;

  /**
   * The control is partly checked.
   */
  public static readonly Mixed: ControlState;

  /**
   * The control is selected.
   */
  public static readonly Selected: ControlState;

  /**
   * The control shows the controls under it.
   */
  public static readonly Expanded: ControlState;

  /**
   * The control hides the controls under it.
   */
  public static readonly Collapsed: ControlState;

  /**
   * The control is a password field, whose value is never read.
   */
  public static readonly Password: ControlState;

  /**
   * The state's value, such as `"ReadOnly"`; a read lists it in lowercase.
   */
  public readonly value: string;

  private constructor();
}

/**
 * The controls {@link IControlBackend.readControlsAsync} read.
 *
 * @example
 * ```ts
 * import { ControlTree } from "@noldova/computer-use.runtime";
 *
 * console.log(new ControlTree([], 0, false).controls.length);
 * ```
 */
export declare class ControlTree {
  /**
   * The controls, breadth first, each after the control it lies in.
   */
  public readonly controls: readonly ControlInfo[];

  /**
   * Whether the read ran out of time before it was done.
   */
  public readonly isTimedOut: boolean;

  /**
   * How many controls the read left out at its limits.
   */
  public readonly leftOut: number;

  /**
   * Creates the tree.
   *
   * @param controls The controls, each after the control it lies in. The tree keeps this array, without copying it.
   * @param leftOut How many controls the read left out, a whole number from zero.
   * @param isTimedOut Whether the read ran out of time.
   * @throws {ArgumentOutOfRangeException} When leftOut isn't a whole number from zero.
   * @throws {ArgumentException} When a handle is repeated, or a control comes before the control it lies in.
   */
  public constructor(controls: readonly ControlInfo[], leftOut: number, isTimedOut: boolean);
}

/**
 * A point on the desktop: in physical pixels on Windows, in points on macOS, with the origin at the top-left corner of the primary
 * display, so displays to its left or above it have negative coordinates.
 *
 * @example
 * ```ts
 * import { DesktopPoint } from "@noldova/computer-use.runtime";
 *
 * console.log(new DesktopPoint(-1920, 40).x);
 * ```
 */
export declare class DesktopPoint {
  /**
   * The column, in whole desktop units.
   */
  public readonly x: number;

  /**
   * The row, in whole desktop units.
   */
  public readonly y: number;

  /**
   * Creates the point.
   *
   * @param x The column, a safe integer.
   * @param y The row, a safe integer.
   * @throws {ArgumentOutOfRangeException} When a coordinate isn't a safe integer.
   */
  public constructor(x: number, y: number);
}

/**
 * A rectangle on the desktop, in the units of {@link DesktopPoint}.
 *
 * @example
 * ```ts
 * import { DesktopRect } from "@noldova/computer-use.runtime";
 *
 * console.log(new DesktopRect(0, 0, 1920, 1080).width);
 * ```
 */
export declare class DesktopRect {
  /**
   * The height, in whole desktop units above zero.
   */
  public readonly height: number;

  /**
   * The width, in whole desktop units above zero.
   */
  public readonly width: number;

  /**
   * The left edge.
   */
  public readonly x: number;

  /**
   * The top edge.
   */
  public readonly y: number;

  /**
   * Creates the rectangle.
   *
   * @param x The left edge, a safe integer.
   * @param y The top edge, a safe integer.
   * @param width The width, a safe integer above zero.
   * @param height The height, a safe integer above zero.
   * @throws {ArgumentOutOfRangeException} When a value is refused.
   */
  public constructor(x: number, y: number, width: number, height: number);
}

/**
 * One display's border: the display's bounds and the border's thickness along each edge, both in desktop units.
 *
 * @example
 * ```ts
 * import { BorderFrame, Display } from "@noldova/computer-use.runtime";
 *
 * console.log(BorderFrame.of(new Display("display-1", 0, 0, 2880, 1800, 2, true), 2).thickness);
 * ```
 */
export declare class BorderFrame {
  /**
   * The display's bounds.
   */
  public readonly bounds: DesktopRect;

  /**
   * The border's thickness along each edge, in whole desktop units above zero.
   */
  public readonly thickness: number;

  /**
   * Creates the frame.
   *
   * @param bounds The display's bounds.
   * @param thickness The thickness, a safe integer above zero that fits twice into the bounds' width and height.
   * @throws {ArgumentOutOfRangeException} When the thickness is refused.
   */
  public constructor(bounds: DesktopRect, thickness: number);

  /**
   * The border along a display's edges, 0.25rem wide: 4 CSS pixels at the display's units for one, rounded to whole units and at
   * least one.
   *
   * @param display The display.
   * @param unitsPerPixel The desktop units a CSS pixel spans on it, from {@link IBorderBackend.unitsPerPixel}.
   * @returns The frame.
   * @throws {ArgumentOutOfRangeException} When the border doesn't fit twice into the display.
   */
  public static of(display: Display, unitsPerPixel: number): BorderFrame;
}

/**
 * The pointer's glide to a point an input acts on, so the person can follow where it goes. The path is straight and eased out, with
 * steps {@link GlidePath.stepMs} apart. Its planned time grows with the distance, from 40 ms for 20 desktop units to
 * {@link GlidePath.maxDurationMs} from about 600 units; a step that rounds to the point already reached is left out, so a glide
 * can end a step early, as one of 20 units does at 32 ms. The backends send each step after the input's own check.
 *
 * @example
 * ```ts
 * import { DesktopPoint, GlidePath } from "@noldova/computer-use.runtime";
 *
 * const path = GlidePath.between(new DesktopPoint(0, 0), new DesktopPoint(300, 0));
 * console.log(path.durationMs, path.steps.at(-1)?.point.x);
 * ```
 */
export declare class GlidePath {
  /**
   * The time between steps, in milliseconds: one frame of a 60 Hz display.
   */
  public static readonly stepMs: number;

  /**
   * The longest glide, in milliseconds.
   */
  public static readonly maxDurationMs: number;

  /**
   * When the last step is due, in milliseconds after the glide starts; 0 for a glide with no steps.
   */
  public readonly durationMs: number;

  /**
   * The steps in time order, each at a different point, the last at the glide's end; none when the pointer is already there.
   */
  public readonly steps: readonly GlideStep[];

  private constructor();

  /**
   * Plans the glide from one point to another.
   *
   * @param from Where the pointer is.
   * @param to The point the input acts on.
   * @returns The glide, whose steps lie at the eased share of the time gone, rounded to whole desktop units.
   */
  public static between(from: DesktopPoint, to: DesktopPoint): GlidePath;
}

/**
 * One step of a {@link GlidePath}: where the pointer moves, and when.
 */
export declare class GlideStep {
  /**
   * When the move is due, in milliseconds after the glide starts.
   */
  public readonly atMs: number;

  /**
   * Where the pointer moves, in desktop coordinates.
   */
  public readonly point: DesktopPoint;

  /**
   * Creates the step.
   *
   * @param point Where the pointer moves.
   * @param atMs When the move is due, in milliseconds after the glide starts.
   */
  public constructor(point: DesktopPoint, atMs: number);
}

/**
 * One beat of the physical-input monitor, which shows that it still runs.
 *
 * @example
 * ```ts
 * import { Heartbeat } from "@noldova/computer-use.runtime";
 *
 * console.log(new Heartbeat(1, Date.now()).sequence);
 * ```
 */
export declare class Heartbeat {
  /**
   * When it beat, in milliseconds since the Unix epoch.
   */
  public readonly at: number;

  /**
   * The beat's number since the monitor started, from 1.
   */
  public readonly sequence: number;

  /**
   * Creates the beat.
   *
   * @param sequence The beat's number, a safe integer above zero.
   * @param at When it beat, in milliseconds since the Unix epoch.
   * @throws {ArgumentOutOfRangeException} When a value is refused.
   */
  public constructor(sequence: number, at: number);
}

/**
 * What one input may touch: the app, its window and its process. The input backend checks all three in the same call as the input.
 *
 * @example
 * ```ts
 * import { AppIdentity, InputTarget } from "@noldova/computer-use.runtime";
 *
 * const target = new InputTarget(new AppIdentity("com.example.notes"), "4211", 812);
 * console.log(target.windowId);
 * ```
 */
export declare class InputTarget {
  /**
   * The app the window belongs to.
   */
  public readonly app: AppIdentity;

  /**
   * The ID of the window's process.
   */
  public readonly processId: number;

  /**
   * The window's ID, as a decimal number: the top-level window handle on Windows, the window number on macOS.
   */
  public readonly windowId: string;

  /**
   * Creates the target.
   *
   * @param app The app the window belongs to.
   * @param windowId The window's ID, a decimal number above zero without leading zeros.
   * @param processId The ID of the window's process, a safe integer above zero.
   * @throws {ArgumentOutOfRangeException} When the window or process ID is refused.
   */
  public constructor(app: AppIdentity, windowId: string, processId: number);
}

/**
 * A key the input backend presses by name: the editing and navigation keys, F1 to F12, the letters and the digits. Text goes through
 * {@link IInputBackend.typeTextAsync} instead.
 *
 * @example
 * ```ts
 * import { KeyName } from "@noldova/computer-use.runtime";
 *
 * console.log(KeyName.parse("PageDown") === KeyName.PageDown);
 * ```
 */
export declare class KeyName {
  /**
   * The Enter key.
   */
  public static readonly Enter: KeyName;

  /**
   * The Tab key.
   */
  public static readonly Tab: KeyName;

  /**
   * The Escape key.
   */
  public static readonly Escape: KeyName;

  /**
   * The Backspace key.
   */
  public static readonly Backspace: KeyName;

  /**
   * The Delete key.
   */
  public static readonly Delete: KeyName;

  /**
   * The space bar.
   */
  public static readonly Space: KeyName;

  /**
   * The up arrow.
   */
  public static readonly Up: KeyName;

  /**
   * The down arrow.
   */
  public static readonly Down: KeyName;

  /**
   * The left arrow.
   */
  public static readonly Left: KeyName;

  /**
   * The right arrow.
   */
  public static readonly Right: KeyName;

  /**
   * The Home key.
   */
  public static readonly Home: KeyName;

  /**
   * The End key.
   */
  public static readonly End: KeyName;

  /**
   * The Page Up key.
   */
  public static readonly PageUp: KeyName;

  /**
   * The Page Down key.
   */
  public static readonly PageDown: KeyName;

  /**
   * The F1 key.
   */
  public static readonly F1: KeyName;

  /**
   * The F2 key.
   */
  public static readonly F2: KeyName;

  /**
   * The F3 key.
   */
  public static readonly F3: KeyName;

  /**
   * The F4 key.
   */
  public static readonly F4: KeyName;

  /**
   * The F5 key.
   */
  public static readonly F5: KeyName;

  /**
   * The F6 key.
   */
  public static readonly F6: KeyName;

  /**
   * The F7 key.
   */
  public static readonly F7: KeyName;

  /**
   * The F8 key.
   */
  public static readonly F8: KeyName;

  /**
   * The F9 key.
   */
  public static readonly F9: KeyName;

  /**
   * The F10 key.
   */
  public static readonly F10: KeyName;

  /**
   * The F11 key.
   */
  public static readonly F11: KeyName;

  /**
   * The F12 key.
   */
  public static readonly F12: KeyName;

  /**
   * The A key.
   */
  public static readonly A: KeyName;

  /**
   * The B key.
   */
  public static readonly B: KeyName;

  /**
   * The C key.
   */
  public static readonly C: KeyName;

  /**
   * The D key.
   */
  public static readonly D: KeyName;

  /**
   * The E key.
   */
  public static readonly E: KeyName;

  /**
   * The F key.
   */
  public static readonly F: KeyName;

  /**
   * The G key.
   */
  public static readonly G: KeyName;

  /**
   * The H key.
   */
  public static readonly H: KeyName;

  /**
   * The I key.
   */
  public static readonly I: KeyName;

  /**
   * The J key.
   */
  public static readonly J: KeyName;

  /**
   * The K key.
   */
  public static readonly K: KeyName;

  /**
   * The L key.
   */
  public static readonly L: KeyName;

  /**
   * The M key.
   */
  public static readonly M: KeyName;

  /**
   * The N key.
   */
  public static readonly N: KeyName;

  /**
   * The O key.
   */
  public static readonly O: KeyName;

  /**
   * The P key.
   */
  public static readonly P: KeyName;

  /**
   * The Q key.
   */
  public static readonly Q: KeyName;

  /**
   * The R key.
   */
  public static readonly R: KeyName;

  /**
   * The S key.
   */
  public static readonly S: KeyName;

  /**
   * The T key.
   */
  public static readonly T: KeyName;

  /**
   * The U key.
   */
  public static readonly U: KeyName;

  /**
   * The V key.
   */
  public static readonly V: KeyName;

  /**
   * The W key.
   */
  public static readonly W: KeyName;

  /**
   * The X key.
   */
  public static readonly X: KeyName;

  /**
   * The Y key.
   */
  public static readonly Y: KeyName;

  /**
   * The Z key.
   */
  public static readonly Z: KeyName;

  /**
   * The 0 key of the main keyboard.
   */
  public static readonly Digit0: KeyName;

  /**
   * The 1 key of the main keyboard.
   */
  public static readonly Digit1: KeyName;

  /**
   * The 2 key of the main keyboard.
   */
  public static readonly Digit2: KeyName;

  /**
   * The 3 key of the main keyboard.
   */
  public static readonly Digit3: KeyName;

  /**
   * The 4 key of the main keyboard.
   */
  public static readonly Digit4: KeyName;

  /**
   * The 5 key of the main keyboard.
   */
  public static readonly Digit5: KeyName;

  /**
   * The 6 key of the main keyboard.
   */
  public static readonly Digit6: KeyName;

  /**
   * The 7 key of the main keyboard.
   */
  public static readonly Digit7: KeyName;

  /**
   * The 8 key of the main keyboard.
   */
  public static readonly Digit8: KeyName;

  /**
   * The 9 key of the main keyboard.
   */
  public static readonly Digit9: KeyName;

  /**
   * Every key, in the order above.
   */
  public static readonly all: readonly KeyName[];

  /**
   * The key's value, the same as its member's name, such as `"PageDown"` or `"Digit7"`.
   */
  public readonly value: string;

  private constructor();

  /**
   * Finds the key with a value.
   *
   * @param value A key's {@link KeyName.value}, matched exactly.
   * @returns The key.
   * @throws {ArgumentOutOfRangeException} When no key has the value.
   *
   * @example
   * ```ts
   * import { KeyName } from "@noldova/computer-use.runtime";
   *
   * console.log(KeyName.parse("Digit7") === KeyName.Digit7);
   * ```
   */
  public static parse(value: string): KeyName;
}

/**
 * A key held during a pointer or key action.
 *
 * @example
 * ```ts
 * import { ModifierKey } from "@noldova/computer-use.runtime";
 *
 * console.log(ModifierKey.Control.value);
 * ```
 */
export declare class ModifierKey {
  /**
   * The Shift key.
   */
  public static readonly Shift: ModifierKey;

  /**
   * The Control key.
   */
  public static readonly Control: ModifierKey;

  /**
   * The Alt key, Option on macOS.
   */
  public static readonly Alt: ModifierKey;

  /**
   * The Windows key on Windows, Command on macOS.
   */
  public static readonly Meta: ModifierKey;

  /**
   * The key's value: `"Shift"`, `"Control"`, `"Alt"` or `"Meta"`.
   */
  public readonly value: string;

  private constructor();
}

/**
 * That the person used the real pointer or keyboard, when, and for a key, the process whose window was in front at the key event.
 * It carries no position, key or button.
 *
 * @example
 * ```ts
 * import { PhysicalInput, PhysicalInputKind } from "@noldova/computer-use.runtime";
 *
 * console.log(new PhysicalInput(PhysicalInputKind.Pointer, Date.now(), null).kind.value);
 * ```
 */
export declare class PhysicalInput {
  /**
   * When the person acted, in milliseconds since the Unix epoch, from the backend's clock.
   */
  public readonly at: number;

  /**
   * Whether it was the pointer or the keyboard.
   */
  public readonly kind: PhysicalInputKind;

  /**
   * For a key, the process whose window was in front at the key event; `null` for the pointer, or when no window was in front or the
   * keys reported together went to more than one process.
   */
  public readonly processId: number | null;

  /**
   * Creates the report.
   *
   * @param kind Whether it was the pointer or the keyboard.
   * @param at When, in milliseconds since the Unix epoch, finite and not negative.
   * @param processId The process the key went to, a safe integer above zero, or `null` when none is known.
   * @throws {ArgumentOutOfRangeException} When the time or the process ID is refused.
   */
  public constructor(kind: PhysicalInputKind, at: number, processId: number | null);
}

/**
 * Which real device the person used.
 *
 * @example
 * ```ts
 * import { PhysicalInputKind } from "@noldova/computer-use.runtime";
 *
 * console.log(PhysicalInputKind.Keyboard.value);
 * ```
 */
export declare class PhysicalInputKind {
  /**
   * The mouse, touchpad or another pointing device.
   */
  public static readonly Pointer: PhysicalInputKind;

  /**
   * The keyboard.
   */
  public static readonly Keyboard: PhysicalInputKind;

  /**
   * The kind's value: `"Pointer"` or `"Keyboard"`.
   */
  public readonly value: string;

  private constructor();
}

/**
 * A pointer button.
 *
 * @example
 * ```ts
 * import { PointerButton } from "@noldova/computer-use.runtime";
 *
 * console.log(PointerButton.Right.value);
 * ```
 */
export declare class PointerButton {
  /**
   * The left button.
   */
  public static readonly Left: PointerButton;

  /**
   * The right button.
   */
  public static readonly Right: PointerButton;

  /**
   * The middle button, or a pressed wheel.
   */
  public static readonly Middle: PointerButton;

  /**
   * The button's value: `"Left"`, `"Right"` or `"Middle"`.
   */
  public readonly value: string;

  private constructor();
}

/**
 * Why an operating-system backend refused a capture or an input. Each reason carries the text the model reads.
 *
 * @example
 * ```ts
 * import { RefusalReason } from "@noldova/computer-use.runtime";
 *
 * console.log(RefusalReason.parse("ElevatedTarget").description);
 * ```
 */
export declare class RefusalReason {
  /**
   * The target's window isn't in front, or another app's window is.
   */
  public static readonly NotForeground: RefusalReason;

  /**
   * A point lies over a window of another process, or over no window.
   */
  public static readonly OtherWindowAtPoint: RefusalReason;

  /**
   * On Windows, the target runs with higher rights than the module.
   */
  public static readonly ElevatedTarget: RefusalReason;

  /**
   * On Windows, the target's rights couldn't be read, so it may run with higher rights than the module.
   */
  public static readonly TargetRightsUnknown: RefusalReason;

  /**
   * After the input, another window is in front; the input was sent.
   */
  public static readonly ForegroundChanged: RefusalReason;

  /**
   * On macOS, an app has secure keyboard entry on, which drops synthetic keys.
   */
  public static readonly SecureInput: RefusalReason;

  /**
   * The focused field is a password field: on Windows a classic edit control with the `ES_PASSWORD` style or an element UI Automation
   * reports as `IsPassword`, and on macOS an element whose subrole is `AXSecureTextField`; on both, the text after a Tab or Enter,
   * which may move the focus to one.
   */
  public static readonly PasswordField: RefusalReason;

  /**
   * On macOS, the Accessibility grant that input needs is missing, so macOS would drop the input.
   */
  public static readonly MissingGrant: RefusalReason;

  /**
   * On macOS, the Screen Recording grant is missing, so the capture would show only the desktop picture and the module's own windows.
   */
  public static readonly DesktopOnlyCapture: RefusalReason;

  /**
   * No current display covers the point or has the display ID.
   */
  public static readonly OutsideDisplays: RefusalReason;

  /**
   * The person used the real pointer or keyboard during the input.
   */
  public static readonly PhysicalInput: RefusalReason;

  /**
   * Once the pointer reached a control the input names, the control was gone, changed, moved or covered, or wasn't found
   * again within a second.
   */
  public static readonly ControlChanged: RefusalReason;

  /**
   * The keyboard focus is in another process than the target's: on Windows outside the target's window; on macOS another app has it,
   * as a launcher's or a password manager's panel may while the target stays in front.
   */
  public static readonly FocusOutsideTarget: RefusalReason;

  /**
   * The focused field couldn't be identified, so it may be a password field: on Windows, UI Automation didn't say within the
   * backend's focus budget, half a second by default, which element has the keyboard focus, or its read failed; on macOS, the app
   * didn't name its focused element, or the element didn't say its subrole, within half a second, other than by answering that no
   * element has the focus, or the system-wide Accessibility element didn't answer which app has the keyboard focus.
   */
  public static readonly FocusUnknown: RefusalReason;

  /**
   * Every reason, in the order above.
   */
  public static readonly all: readonly RefusalReason[];

  /**
   * The text the model reads, in one sentence.
   */
  public readonly description: string;

  /**
   * The reason's value, the same as its member's name, such as `"NotForeground"`.
   */
  public readonly value: string;

  private constructor();

  /**
   * Finds the reason with a value, such as one a backend's addon reports.
   *
   * @param value A reason's {@link RefusalReason.value}, matched exactly.
   * @returns The reason.
   * @throws {RefusalReasonUnknownException} When no reason has the value.
   *
   * @example
   * ```ts
   * import { RefusalReason } from "@noldova/computer-use.runtime";
   *
   * console.log(RefusalReason.parse("PasswordField") === RefusalReason.PasswordField);
   * ```
   */
  public static parse(value: string): RefusalReason;
}

/**
 * How far one scroll turns the wheel, in notches, each way.
 *
 * @example
 * ```ts
 * import { ScrollAmount } from "@noldova/computer-use.runtime";
 *
 * console.log(new ScrollAmount(0, 3).y);
 * ```
 */
export declare class ScrollAmount {
  /**
   * The most notches one scroll turns each way: 50.
   */
  public static readonly maxNotches: number;

  /**
   * The notches to the right; negative scrolls left.
   */
  public readonly x: number;

  /**
   * The notches down; negative scrolls up.
   */
  public readonly y: number;

  /**
   * Creates the amount.
   *
   * @param x The notches to the right, a whole number from −{@link ScrollAmount.maxNotches} to {@link ScrollAmount.maxNotches}.
   * @param y The notches down, in the same range; at least one of the two isn't zero.
   * @throws {ArgumentOutOfRangeException} When a value is refused.
   * @throws {ArgumentException} When both are zero.
   */
  public constructor(x: number, y: number);
}

/**
 * A window's own pixels over its frame, as the window draws itself, whatever lies in front of it on the screen.
 *
 * @example
 * ```ts
 * import { WindowImage } from "@noldova/computer-use.runtime";
 *
 * const image = new WindowImage(800, 600, new Uint8Array(800 * 600 * 4));
 * console.log(image.bgra.byteLength);
 * ```
 */
export declare class WindowImage {
  /**
   * How many bytes each pixel takes in {@link WindowImage.bgra}: 4.
   */
  public static readonly bytesPerPixel: number;

  /**
   * The image's pixels, rows from the top, each pixel blue, green, red and an unused byte.
   */
  public readonly bgra: Uint8Array;

  /**
   * The image's height, in physical pixels.
   */
  public readonly height: number;

  /**
   * The image's width, in physical pixels.
   */
  public readonly width: number;

  /**
   * Creates the image.
   *
   * @param width The image's width, in whole pixels above zero.
   * @param height The image's height, in whole pixels above zero.
   * @param bgra The pixels, 4 bytes for each, blue, green, red and an unused byte. The image keeps this array, without copying it.
   * @throws {ArgumentOutOfRangeException} When the size is refused.
   * @throws {ArgumentException} When the pixels don't match it.
   */
  public constructor(width: number, height: number, bgra: Uint8Array);
}

/**
 * The window in front, as the operating system reports it, and the target an input on it names.
 *
 * @example
 * ```ts
 * import { AppIdentity, DesktopRect, WindowInfo } from "@noldova/computer-use.runtime";
 *
 * const window = new WindowInfo(new AppIdentity("com.example.notes"), "Notes", "4211", 812, new DesktopRect(0, 25, 800, 600), false);
 * console.log(window.target.windowId);
 * ```
 */
export declare class WindowInfo {
  /**
   * The app the window belongs to.
   */
  public readonly app: AppIdentity;

  /**
   * The app's name, for the person's eyes only, never for a decision.
   */
  public readonly appName: string;

  /**
   * The window's frame, in desktop coordinates.
   */
  public readonly frame: DesktopRect;

  /**
   * On Windows, whether the window's process runs with higher rights than the module, or its rights couldn't be read; on macOS, `false`.
   */
  public readonly isElevated: boolean;

  /**
   * The target an input on this window names.
   */
  public readonly target: InputTarget;

  /**
   * Creates the description.
   *
   * @param app The app the window belongs to.
   * @param appName The app's name, for the person's eyes only.
   * @param windowId The window's ID, as {@link InputTarget.windowId} takes it.
   * @param processId The ID of the window's process.
   * @param frame The window's frame, in desktop coordinates.
   * @param isElevated Whether the window's process runs with higher rights than the module.
   * @throws {ArgumentOutOfRangeException} When the app's name is blank, or the window or process ID is refused.
   */
  public constructor(app: AppIdentity, appName: string, windowId: string, processId: number, frame: DesktopRect, isElevated: boolean);
}

/**
 * A window that may show on the screen, as a {@link WindowStack} lists it.
 *
 * @example
 * ```ts
 * import { AppIdentity, DesktopRect, StackedWindow } from "@noldova/computer-use.runtime";
 *
 * const window = new StackedWindow(new AppIdentity("com.example.notes"), "4242", new DesktopRect(0, 25, 800, 600));
 * console.log(window.frame.width);
 * ```
 */
export declare class StackedWindow {
  /**
   * The app the window belongs to, or `null` when the operating system won't name its program.
   */
  public readonly app: AppIdentity | null;

  /**
   * The window's frame, in desktop coordinates.
   */
  public readonly frame: DesktopRect;

  /**
   * The window's ID, as a decimal number: the top-level window handle on Windows, the window number on macOS, which
   * {@link ICaptureBackend.captureWindowAsync} captures it by.
   */
  public readonly windowId: string;

  /**
   * Creates the window.
   *
   * @param app The app the window belongs to, or `null`.
   * @param windowId The window's ID, a decimal number above zero.
   * @param frame The window's frame, in desktop coordinates.
   * @throws {ArgumentOutOfRangeException} When the window ID isn't a decimal number above zero.
   */
  public constructor(app: AppIdentity | null, windowId: string, frame: DesktopRect);
}

/**
 * The windows that may show on the screen, from the front.
 *
 * @example
 * ```ts
 * import { WindowStack } from "@noldova/computer-use.runtime";
 *
 * console.log(new WindowStack(true, []).windows.length);
 * ```
 */
export declare class WindowStack {
  /**
   * Whether the stack holds every window that may show; when it doesn't, a screenshot covers everything.
   */
  public readonly isComplete: boolean;

  /**
   * The windows, from the front.
   */
  public readonly windows: readonly StackedWindow[];

  /**
   * Creates the stack.
   *
   * @param isComplete Whether it holds every window that may show.
   * @param windows The windows, from the front. The stack keeps this array, without copying it.
   */
  public constructor(isComplete: boolean, windows: readonly StackedWindow[]);
}

/**
 * A display of the machine the runtime runs on.
 *
 * @example
 * ```ts
 * import { Display } from "@noldova/computer-use.runtime";
 *
 * const display = new Display("display-1", 0, 0, 1920, 1080, 1, true);
 * console.log(display.toJson());
 * ```
 */
export declare class Display {
  /**
   * The height, in desktop units: physical pixels on Windows, points on macOS.
   */
  public readonly height: number;

  /**
   * The display's ID.
   */
  public readonly id: string;

  /**
   * Whether this is the primary display.
   */
  public readonly isPrimary: boolean;

  /**
   * The display's UI scale: physical pixels per logical unit of the operating system's own scaling. On Windows it is the DPI over 96,
   * and desktop coordinates are physical pixels; on macOS it is the backing scale factor, and desktop coordinates are points.
   */
  public readonly scaleFactor: number;

  /**
   * The width, in desktop units: physical pixels on Windows, points on macOS.
   */
  public readonly width: number;

  /**
   * The left edge on the virtual desktop, in desktop units: physical pixels on Windows, points on macOS.
   */
  public readonly x: number;

  /**
   * The top edge on the virtual desktop, in desktop units: physical pixels on Windows, points on macOS.
   */
  public readonly y: number;

  /**
   * Creates the display.
   *
   * @param id The display's ID, not empty.
   * @param x The left edge, a whole number of desktop units.
   * @param y The top edge, a whole number of desktop units.
   * @param width The width, a whole number of desktop units above zero.
   * @param height The height, a whole number of desktop units above zero.
   * @param scaleFactor The display's UI scale, as {@link Display.scaleFactor} describes it: a finite number above zero.
   * @param isPrimary Whether this is the primary display.
   * @throws {DisplayIdEmptyException} When the ID is empty.
   * @throws {DisplayOriginInvalidException} When the origin isn't a pair of integers.
   * @throws {DisplaySizeInvalidException} When the size isn't a pair of integers above zero.
   * @throws {DisplayScaleInvalidException} When the scale factor isn't a finite number above zero.
   */
  public constructor(id: string, x: number, y: number, width: number, height: number, scaleFactor: number, isPrimary: boolean);

  /**
   * Gives the display's wire form.
   *
   * @returns The wire form.
   */
  public toJson(): IDisplayJson;
}

/**
 * One fact a permission request shows the person: plain text the module writes or reads from the target, the call's arguments
 * as code, or the agent's own text, which the app shows as the agent's.
 *
 * @example
 * ```ts
 * import { PermissionDetail } from "@noldova/computer-use.runtime";
 * import { PermissionDetailKind } from "@noldova/desktop.runtime";
 *
 * const detail = new PermissionDetail("summary", "Open the settings", PermissionDetailKind.AgentText);
 * console.log(detail.kind);
 * ```
 */
export declare class PermissionDetail implements IPermissionDetail {
  /**
   * How the app shows the value.
   */
  public readonly kind: PermissionDetailKind;

  /**
   * What the fact is.
   */
  public readonly label: string;

  /**
   * The fact's value.
   */
  public readonly value: string;

  /**
   * Creates the detail.
   *
   * @param label What the fact is.
   * @param value The fact's value.
   * @param kind How the app shows the value, plain text by default.
   */
  public constructor(label: string, value: string, kind?: PermissionDetailKind);
}

/**
 * The module's runtime part, which registers the module's tools in the base's registry: computer_list_displays,
 * computer_list_apps, computer_request_apps, computer_screenshot, computer_zoom, computer_read_window, computer_click,
 * computer_scroll, computer_move, computer_drag, computer_type, computer_key and computer_batch, which runs a short list of the
 * input tools' actions in one call. The base activates it only while the module's preview setting, `computer-use.enabled`, its
 * switch setting, is on, and deactivates it when the person turns the setting off, building a new part when it's turned on again;
 * the part offers the tools for as long as it's active, and reaches the operating system only on a tool's call.
 *
 * Each call runs one at a time across conversations, inside the session grant: the first call of each session asks the person
 * to let its conversation see and control the screen, once or for the conversation, whose other sessions the base then answers
 * without asking,
 * and another conversation's call fails at once as Unavailable while one holds it. A session that ends releases the screen, its
 * app grants and its latest screenshot. A stop goes through the base's
 * `stopAll`, which ends every call in flight, and only the person resumes, through the base.
 *
 * @example
 * ```ts
 * import type { IRuntimePartContext } from "@noldova/desktop.runtime";
 * import { RuntimePart } from "@noldova/computer-use.runtime";
 *
 * declare const context: IRuntimePartContext;
 * const part = new RuntimePart();
 * await part.activateAsync(context);
 * await part.deactivateAsync();
 * ```
 */
export declare class RuntimePart implements IRuntimePart {
  /**
   * Creates the part; the base constructs it with no arguments. Both parameters are test seams: the tests run against
   * the installed package, so they reach the part's backend and accent file only through its declared constructor, and the real
   * backend drives the real screen.
   *
   * @param loadBackend Builds the platform's backend as the part activates, over the context as the starter of its programs; by
   *   default {@link RuntimePart.loadPlatformBackend} for the platform the runtime runs on. Tests pass doubles of the operating system.
   * @param kitAccentFile The file the build writes the kit's accent into, the border's colour until the app sends one; by default
   *   the runtime package's `generated/kit-accent.json`. A file that can't be read gives a fallback colour and a line in the log.
   *   Tests pass a file of their own, missing, unreadable or malformed.
   */
  public constructor(loadBackend?: (starter: IProgramStarter) => IOperatingSystemBackend, kitAccentFile?: string);

  /**
   * Builds the backend for a platform, which reaches the operating system only on its first call. The module declares Windows and
   * macOS as its platforms, so Noldova Desktop activates it on no other.
   *
   * @param starter Starts the macOS backend's programs.
   * @param platform The platform, as `process.platform` names it. The part passes `process.platform`; the parameter is a test seam,
   *   so a test on one platform checks the backend chosen for each.
   * @returns The Windows backend for `win32`, and the macOS backend otherwise.
   */
  public static loadPlatformBackend(starter: IProgramStarter, platform: string): IOperatingSystemBackend;

  /**
   * Registers the window's stop and status read, builds the backend, reads the kit's accent and registers the module's tools. A
   * backend that fails to load withdraws what the part registered and fails the activation, which the base shows as the module's
   * failure and writes to its log. computer_key refuses the app's shortcuts as `context.shortcuts` lists them at each call, and
   * the input tools leave the app's own windows, as `context.appWindows` lists them, alone.
   *
   * @param context What the base hands the part.
   */
  public activateAsync(context: IRuntimePartContext): Promise<void>;

  /**
   * Withdraws the tools the part registered, ending their running calls as switched off, stops the watch for the person, and hides
   * the border, trying a hide that fails up to three times, a second apart, so it may take up to two seconds: what a hide that
   * still fails leaves goes with the macOS backend's programs, which the base stops then, or with the runtime's process on Windows.
   */
  public deactivateAsync(): Promise<void>;
}
