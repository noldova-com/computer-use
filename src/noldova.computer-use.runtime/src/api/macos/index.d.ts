/**
 * @license
 * Copyright (c) Noldova.
 *
 * This source code is licensed under the license found in the
 * LICENSE file in the root directory of this source tree.
 */

import type { ExceptionOptions } from "@noldova/context.exceptions";
import type { IModuleLog, ProcessExit } from "@noldova/desktop.runtime";

import type {
  BackendValueException,
  ComputerUseException,
  IAppBackend,
  IBorderBackend,
  ICaptureBackend,
  IControlBackend,
  IDisplayBackend,
  IInputBackend,
  IOperatingSystemBackend,
  IPhysicalInputMonitor,
  IProgramStarter,
  IWindowBackend
} from "../index.d.ts";

/**
 * Thrown when the macOS input process answers a method with a value that doesn't have the method's shape.
 *
 * @example
 * ```ts
 * import { MacAnswerUnreadableException } from "@noldova/computer-use.runtime/macos";
 *
 * const failure = new MacAnswerUnreadableException("readPointer");
 * console.log(failure.method);
 * ```
 */
export declare class MacAnswerUnreadableException extends BackendValueException {
  /**
   * The method the process answered.
   */
  public readonly method: string;

  /**
   * Creates the exception, with its message from the facts.
   *
   * @param method The method the process answered.
   */
  public constructor(method: string);
}

/**
 * Thrown when a capture isn't a PNG file.
 *
 * @example
 * ```ts
 * import { PngSignatureMissingException } from "@noldova/computer-use.runtime/macos";
 *
 * console.log(new PngSignatureMissingException().message);
 * ```
 */
export declare class PngSignatureMissingException extends BackendValueException {
  /**
   * Creates the exception, with its message from the facts.
   */
  public constructor();
}

/**
 * Thrown when a capture's PNG file ends before its chunks, its header or its rows do.
 *
 * @example
 * ```ts
 * import { PngTruncatedException } from "@noldova/computer-use.runtime/macos";
 *
 * console.log(new PngTruncatedException().message);
 * ```
 */
export declare class PngTruncatedException extends BackendValueException {
  /**
   * Creates the exception, with its message from the facts.
   */
  public constructor();
}

/**
 * Thrown when a chunk of a capture's PNG file fails its checksum.
 *
 * @example
 * ```ts
 * import { PngChecksumException } from "@noldova/computer-use.runtime/macos";
 *
 * console.log(new PngChecksumException("IDAT").chunkType);
 * ```
 */
export declare class PngChecksumException extends BackendValueException {
  /**
   * The chunk's type, such as `IDAT`.
   */
  public readonly chunkType: string;

  /**
   * Creates the exception, with its message from the facts.
   *
   * @param chunkType The chunk's type, such as `IDAT`.
   */
  public constructor(chunkType: string);
}

/**
 * Thrown when a capture's PNG file isn't 8-bit RGB or RGBA without interlacing, or holds no pixels.
 *
 * @example
 * ```ts
 * import { PngFormatUnsupportedException } from "@noldova/computer-use.runtime/macos";
 *
 * console.log(new PngFormatUnsupportedException().message);
 * ```
 */
export declare class PngFormatUnsupportedException extends BackendValueException {
  /**
   * Creates the exception, with its message from the facts.
   */
  public constructor();
}

/**
 * Thrown when a row of a capture's PNG file uses a filter PNG doesn't define.
 *
 * @example
 * ```ts
 * import { PngFilterUnknownException } from "@noldova/computer-use.runtime/macos";
 *
 * console.log(new PngFilterUnknownException(5).filter);
 * ```
 */
export declare class PngFilterUnknownException extends BackendValueException {
  /**
   * The row's filter.
   */
  public readonly filter: number;

  /**
   * Creates the exception, with its message from the facts.
   *
   * @param filter The row's filter.
   */
  public constructor(filter: number);
}

/**
 * Thrown when the header chunk (IHDR) of a capture's PNG file isn't the 13 bytes PNG defines.
 *
 * @example
 * ```ts
 * import { PngHeaderLengthException } from "@noldova/computer-use.runtime/macos";
 *
 * console.log(new PngHeaderLengthException(12).length);
 * ```
 */
export declare class PngHeaderLengthException extends BackendValueException {
  /**
   * The header chunk's length, in bytes.
   */
  public readonly length: number;

  /**
   * Creates the exception, with its message from the facts.
   *
   * @param length The header chunk's length, in bytes.
   */
  public constructor(length: number);
}

/**
 * Thrown when a capture's PNG file declares more pixels than a capture can have, 8192 by 8192, before any of its data is inflated.
 *
 * @example
 * ```ts
 * import { PngTooLargeException } from "@noldova/computer-use.runtime/macos";
 *
 * console.log(new PngTooLargeException(8193, 8192).width);
 * ```
 */
export declare class PngTooLargeException extends BackendValueException {
  /**
   * The height the file declares, in pixels.
   */
  public readonly height: number;

  /**
   * The width the file declares, in pixels.
   */
  public readonly width: number;

  /**
   * Creates the exception, with its message from the facts.
   *
   * @param width The width the file declares, in pixels.
   * @param height The height the file declares, in pixels.
   */
  public constructor(width: number, height: number);
}

/**
 * Thrown when screencapture's file is larger than any capture's PNG file can be, before the file is read.
 *
 * @example
 * ```ts
 * import { MacCaptureFileTooLargeException } from "@noldova/computer-use.runtime/macos";
 *
 * console.log(new MacCaptureFileTooLargeException(600_000_000).size);
 * ```
 */
export declare class MacCaptureFileTooLargeException extends BackendValueException {
  /**
   * The file's size, in bytes.
   */
  public readonly size: number;

  /**
   * Creates the exception, with its message from the facts.
   *
   * @param size The file's size, in bytes.
   */
  public constructor(size: number);
}

/**
 * Thrown when the pixel data of the capture's PNG file can't be inflated, with zlib's failure as its cause.
 *
 * @example
 * ```ts
 * import { PngDataCorruptException } from "@noldova/computer-use.runtime/macos";
 *
 * const failure = new PngDataCorruptException(new Error("incorrect header check"));
 * console.log(failure.cause);
 * ```
 */
export declare class PngDataCorruptException extends BackendValueException {
  /**
   * Creates the exception, with its message from the facts.
   *
   * @param cause Why the data couldn't be inflated.
   */
  public constructor(cause: unknown);
}

/**
 * Thrown when the macOS input process or screencapture fails; each way has its own subclass. A refusal, such as a missing grant or a
 * target that isn't in front, is not a failure: the backends report it as a {@link RefusalException}.
 *
 * @example
 * ```ts
 * import type { IRuntimePartContext } from "@noldova/desktop.runtime";
 * import { MacBackend, MacDesktopException } from "@noldova/computer-use.runtime/macos";
 *
 * export async function isMacFailureAsync(context: IRuntimePartContext): Promise<boolean> {
 *   try {
 *     await MacBackend.load(context).displays.listDisplaysAsync(AbortSignal.timeout(1000));
 *     return false;
 *   }
 *   catch (error) {
 *     return error instanceof MacDesktopException;
 *   }
 * }
 * ```
 */
export declare abstract class MacDesktopException extends ComputerUseException {
  /**
   * Creates the exception with its message, for a subclass.
   *
   * @param message What went wrong.
   * @param options The underlying error, if any.
   */
  protected constructor(message: string, options?: ExceptionOptions);
}

/**
 * Thrown when screencapture couldn't capture a window, with the failure as its cause.
 *
 * @example
 * ```ts
 * import { MacCaptureFailedException } from "@noldova/computer-use.runtime/macos";
 *
 * const failure = new MacCaptureFailedException(new Error("No file."));
 * console.log(failure.cause);
 * ```
 */
export declare class MacCaptureFailedException extends MacDesktopException {
  /**
   * Creates the exception, with its message from the facts.
   *
   * @param cause Why the capture failed.
   */
  public constructor(cause: unknown);
}

/**
 * Thrown when screencapture ends without capturing the window.
 *
 * @example
 * ```ts
 * import { ProcessExit } from "@noldova/desktop.runtime";
 * import { MacCaptureEndedException } from "@noldova/computer-use.runtime/macos";
 *
 * console.log(new MacCaptureEndedException(new ProcessExit(1, null)).exit.code);
 * ```
 */
export declare class MacCaptureEndedException extends MacDesktopException {
  /**
   * How screencapture exited: its exit code, or the signal that ended it.
   */
  public readonly exit: ProcessExit;

  /**
   * Creates the exception, with its message from the facts.
   *
   * @param exit How screencapture exited.
   */
  public constructor(exit: ProcessExit);
}

/**
 * Thrown when a capture's file couldn't be removed after the capture, with the system's failure as its cause.
 *
 * @example
 * ```ts
 * import { MacCaptureFileLeftException } from "@noldova/computer-use.runtime/macos";
 *
 * const failure = new MacCaptureFileLeftException("/tmp/captures/1234-capture.png", new Error("EBUSY"));
 * console.log(failure.file);
 * ```
 */
export declare class MacCaptureFileLeftException extends MacDesktopException {
  /**
   * The file left.
   */
  public readonly file: string;

  /**
   * Creates the exception, with its message from the facts.
   *
   * @param file The file left.
   * @param cause Why the file couldn't be removed.
   */
  public constructor(file: string, cause: unknown);
}

/**
 * Thrown when the folder for drags' stop files couldn't be made or narrowed to the person, with the system's failure as its cause.
 *
 * @example
 * ```ts
 * import { MacStopFolderFailedException } from "@noldova/computer-use.runtime/macos";
 *
 * const failure = new MacStopFolderFailedException("/tmp/stops", new Error("EACCES"));
 * console.log(failure.folder);
 * ```
 */
export declare class MacStopFolderFailedException extends MacDesktopException {
  /**
   * The folder.
   */
  public readonly folder: string;

  /**
   * Creates the exception, with its message from the facts.
   *
   * @param folder The folder.
   * @param cause Why the folder couldn't be prepared.
   */
  public constructor(folder: string, cause: unknown);
}

/**
 * Thrown when the macOS input process answers a call with a failure; the message names the method and quotes the process's text.
 *
 * @example
 * ```ts
 * import { MacScriptFailedException } from "@noldova/computer-use.runtime/macos";
 *
 * const failure = new MacScriptFailedException("readWindow", "The window has gone.");
 * console.log(failure.method, failure.message);
 * ```
 */
export declare class MacScriptFailedException extends MacDesktopException {
  /**
   * The method that failed.
   */
  public readonly method: string;

  /**
   * The process's text for the failure.
   */
  public readonly scriptMessage: string;

  /**
   * Creates the exception, with its message from the facts.
   *
   * @param method The method that failed.
   * @param scriptMessage The process's text for the failure.
   */
  public constructor(method: string, scriptMessage: string);
}

/**
 * Thrown for each call still waiting when the macOS input process ends, is closed, or answers what it can't; each way has its own
 * subclass.
 *
 * @example
 * ```ts
 * import { MacScriptEndedException, MacScriptProcess } from "@noldova/computer-use.runtime/macos";
 *
 * export async function hasEndedAsync(channel: MacScriptProcess): Promise<boolean> {
 *   try {
 *     await channel.callAsync("checkGrants", {});
 *     return false;
 *   }
 *   catch (error) {
 *     return error instanceof MacScriptEndedException;
 *   }
 * }
 * ```
 */
export declare abstract class MacScriptEndedException extends MacDesktopException {
  /**
   * Creates the exception with its message, for a subclass.
   *
   * @param message What went wrong.
   * @param options The underlying error, if any.
   */
  protected constructor(message: string, options?: ExceptionOptions);
}

/**
 * Thrown when the macOS input process didn't answer a call in time, so it was ended.
 *
 * @example
 * ```ts
 * import { MacScriptTimedOutException } from "@noldova/computer-use.runtime/macos";
 *
 * const failure = new MacScriptTimedOutException("listWindows", 10_000);
 * console.log(failure.method, failure.timeoutMs);
 * ```
 */
export declare class MacScriptTimedOutException extends MacScriptEndedException {
  /**
   * The method that wasn't answered.
   */
  public readonly method: string;

  /**
   * How long the call waited, in milliseconds.
   */
  public readonly timeoutMs: number;

  /**
   * Creates the exception, with its message from the facts.
   *
   * @param method The method that wasn't answered.
   * @param timeoutMs How long the call waited, in milliseconds.
   */
  public constructor(method: string, timeoutMs: number);
}

/**
 * Thrown when the macOS input process was closed while the call waited.
 *
 * @example
 * ```ts
 * import { MacScriptClosedException } from "@noldova/computer-use.runtime/macos";
 *
 * console.log(new MacScriptClosedException().message);
 * ```
 */
export declare class MacScriptClosedException extends MacScriptEndedException {
  /**
   * Creates the exception, with its message from the facts.
   */
  public constructor();
}

/**
 * Thrown when the macOS input process couldn't be started, with the failure as its cause.
 *
 * @example
 * ```ts
 * import { MacScriptStartFailedException } from "@noldova/computer-use.runtime/macos";
 *
 * const failure = new MacScriptStartFailedException(new Error("No such program."));
 * console.log(failure.cause);
 * ```
 */
export declare class MacScriptStartFailedException extends MacScriptEndedException {
  /**
   * Creates the exception, with its message from the facts.
   *
   * @param cause Why the process couldn't be started.
   */
  public constructor(cause: unknown);
}

/**
 * Thrown when a request couldn't be written to the macOS input process, with the failure as its cause.
 *
 * @example
 * ```ts
 * import { MacScriptInputFailedException } from "@noldova/computer-use.runtime/macos";
 *
 * const failure = new MacScriptInputFailedException(new Error("The pipe has closed."));
 * console.log(failure.cause);
 * ```
 */
export declare class MacScriptInputFailedException extends MacScriptEndedException {
  /**
   * Creates the exception, with its message from the facts.
   *
   * @param cause Why the request couldn't be written.
   */
  public constructor(cause: unknown);
}

/**
 * Thrown when the macOS input process's answers or errors can't be read, with the stream's failure as its cause, so it was ended.
 *
 * @example
 * ```ts
 * import { MacScriptOutputFailedException } from "@noldova/computer-use.runtime/macos";
 *
 * const failure = new MacScriptOutputFailedException(new Error("The pipe broke."));
 * console.log(failure.cause);
 * ```
 */
export declare class MacScriptOutputFailedException extends MacScriptEndedException {
  /**
   * Creates the exception, with its message from the facts.
   *
   * @param cause Why the answers or errors couldn't be read.
   */
  public constructor(cause: unknown);
}

/**
 * Thrown when the macOS input process exits, with the last line it wrote to its errors.
 *
 * @example
 * ```ts
 * import { ProcessExit } from "@noldova/desktop.runtime";
 * import { MacScriptExitedException } from "@noldova/computer-use.runtime/macos";
 *
 * const failure = new MacScriptExitedException(new ProcessExit(1, null), "execution error");
 * console.log(failure.exit.code, failure.lastError);
 * ```
 */
export declare class MacScriptExitedException extends MacScriptEndedException {
  /**
   * How the process exited: its exit code, or the signal that ended it.
   */
  public readonly exit: ProcessExit;

  /**
   * The last line the process wrote to its errors, at most its first 4,096 characters, or an empty string for none.
   */
  public readonly lastError: string;

  /**
   * Creates the exception, with its message from the facts.
   *
   * @param exit How the process exited.
   * @param lastError The last line the process wrote to its errors, at most its first 4,096 characters, or an empty string for none.
   */
  public constructor(exit: ProcessExit, lastError: string);
}

/**
 * Thrown when the macOS input process answers a line the module can't read, one longer than the module reads, or one that answers
 * no waiting call, so it was ended. It keeps only the line's length, since the line can hold the text of a window.
 *
 * @example
 * ```ts
 * import { MacScriptLineUnreadableException } from "@noldova/computer-use.runtime/macos";
 *
 * console.log(new MacScriptLineUnreadableException(8).length);
 * ```
 */
export declare class MacScriptLineUnreadableException extends MacScriptEndedException {
  /**
   * The length of the line the process answered, in UTF-16 code units.
   */
  public readonly length: number;

  /**
   * Creates the exception, with its message from the facts.
   *
   * @param length The length of the line the process answered, in UTF-16 code units.
   */
  public constructor(length: number);
}

/**
 * A channel to the macOS input process; a double of it drives the backends in tests.
 *
 * @remarks
 * Each call names one of the process's methods, in `src/jxa/mac-desktop.ts`, with its parameters, and waits for its one answer.
 * Positions and sizes are points from the top-left corner of the main display.
 * Each input method checks the Accessibility grant and its target in the same step, before it sends anything, and answers a refusal as
 * its outcome, `{ status: "refused", reason, inputSent }`, rather than failing.
 *
 * @example
 * ```ts
 * import type { IRuntimePartContext } from "@noldova/desktop.runtime";
 * import { type IMacScriptChannel, MacBackend, MacScriptProcess } from "@noldova/computer-use.runtime/macos";
 *
 * export async function checkGrantsAsync(context: IRuntimePartContext): Promise<unknown> {
 *   const channel: IMacScriptChannel = new MacScriptProcess(context, "/usr/bin/osascript", ["-l", "JavaScript", MacBackend.scriptFile], 10_000);
 *   try {
 *     return await channel.callAsync("checkGrants", {});
 *   }
 *   finally {
 *     await channel.closeAsync();
 *   }
 * }
 * ```
 */
export interface IMacScriptChannel {
  /**
   * Calls one method of the input process.
   *
   * @param method The method's name, such as `"listDisplays"` or `"click"`.
   * @param parameters The method's parameters, which go as JSON.
   * @returns The method's answer, parsed from JSON.
   * @throws {MacScriptFailedException} Rejects when the process reports an error for the call.
   * @throws {MacScriptEndedException} Rejects when the process fails before it answers.
   */
  callAsync(method: string, parameters: object): Promise<unknown>;

  /**
   * Ends the process, failing every call still waiting; the next call starts a new one.
   */
  closeAsync(): Promise<void>;
}

/**
 * Captures one window; a double of it drives the capture backend in tests.
 */
export interface IMacScreenCapturer {
  /**
   * Captures one window as the window server draws it alone, without its shadow, at its display's own pixels.
   *
   * @param windowId The window's number, from the window server's list.
   * @param signal Aborted when the call that asked is cancelled, which ends the capture and rejects with the abort's reason.
   * @returns The bytes of a PNG file: 8-bit RGB or RGBA, not interlaced.
   * @throws {MacCaptureFailedException} Rejects when the capture fails, as it does for a window that has closed.
   */
  captureWindowAsync(windowId: string, signal: AbortSignal): Promise<Uint8Array>;
}

/**
 * Reads who signed an app's bundle; a double of it drives the app backend's descriptions in tests.
 */
export interface IMacSignatureReader {
  /**
   * Reads the publisher the certificate that signed the bundle names.
   *
   * @param bundlePath The app bundle's path.
   * @param signal Aborted when the call that asked is cancelled, which ends the read and rejects with the abort's reason.
   * @returns The publisher's name, or `null` when the certificate names none or the bundle has none.
   */
  readSignerAsync(bundlePath: string, signal: AbortSignal): Promise<string | null>;
}

/**
 * One long-lived script process, started through the runtime part's context on the first call and again on the next call after
 * it ends.
 *
 * @remarks
 * It writes each call as one JSON line, every character outside printable ASCII escaped, and reads one JSON line for each answer:
 * `{ id, result }`, or `{ id, error }` for a call that failed. A call it doesn't answer in time ends the process.
 *
 * @example
 * ```ts
 * import type { IRuntimePartContext } from "@noldova/desktop.runtime";
 * import { MacBackend, MacScriptProcess } from "@noldova/computer-use.runtime/macos";
 *
 * export async function listDisplaysAsync(context: IRuntimePartContext): Promise<unknown> {
 *   const channel = new MacScriptProcess(context, "/usr/bin/osascript", ["-l", "JavaScript", MacBackend.scriptFile], 10_000);
 *   return await channel.callAsync("listDisplays", {});
 * }
 * ```
 */
export declare class MacScriptProcess implements IMacScriptChannel {
  /**
   * Builds the channel; the process starts on the first call.
   *
   * @param starter Starts the process, as the runtime part's context does.
   * @param program The program to start, such as `/usr/bin/osascript`.
   * @param parameters The program's parameters, the script's path among them.
   * @param timeoutMs How long a call may wait for its answer before the process is ended.
   */
  public constructor(starter: IProgramStarter, program: string, parameters: readonly string[], timeoutMs: number);

  /**
   * {@inheritDoc IMacScriptChannel.callAsync}
   */
  public callAsync(method: string, parameters: object): Promise<unknown>;

  /**
   * {@inheritDoc IMacScriptChannel.closeAsync}
   */
  public closeAsync(): Promise<void>;
}

/**
 * Captures a window through macOS's screencapture program, silently, into a file of its own that it reads and removes.
 * The program starts through the runtime part's context. The file goes in a folder that only the person can read, and each
 * capture first removes the files that processes no longer running left there, since a capture holds a granted window's pixels.
 *
 * @example
 * ```ts
 * import type { IRuntimePartContext } from "@noldova/desktop.runtime";
 * import { MacScreenCaptureProgram } from "@noldova/computer-use.runtime/macos";
 *
 * export async function captureAsync(context: IRuntimePartContext): Promise<number> {
 *   const capturer = new MacScreenCaptureProgram(context, "/usr/sbin/screencapture", [], 10_000, "/tmp/captures");
 *   return (await capturer.captureWindowAsync("1234", AbortSignal.timeout(10_000))).byteLength;
 * }
 * ```
 */
export declare class MacScreenCaptureProgram implements IMacScreenCapturer {
  /**
   * Builds the capturer.
   *
   * @param starter Starts the program, as the runtime part's context does.
   * @param program The program to run, such as `/usr/sbin/screencapture`.
   * @param parameters Parameters that go before the capture's own: `-l<windowId>`, `-o`, `-x`, `-t png` and the file.
   * @param timeoutMs How long a capture may take before it fails.
   * @param folder The module's own folder for the capture files, made with mode 700 when it is missing.
   */
  public constructor(starter: IProgramStarter, program: string, parameters: readonly string[], timeoutMs: number, folder: string);

  /**
   * {@inheritDoc IMacScreenCapturer.captureWindowAsync}
   */
  public captureWindowAsync(windowId: string, signal: AbortSignal): Promise<Uint8Array>;
}

/**
 * Reads an app's publisher through macOS's codesign program, started through the runtime part's context, from the first authority
 * of the bundle's signature, its signing certificate: a Developer ID certificate's publisher without its team's identifier, or
 * "Apple" for Apple's own apps, signed by "Software Signing". Any other certificate, such as the App Store's or TestFlight's, which
 * sign other publishers' apps, names none, nor does a bundle codesign finds unsigned, ad hoc signed, or can't read.
 *
 * @example
 * ```ts
 * import type { IRuntimePartContext } from "@noldova/desktop.runtime";
 * import { MacCodeSignProgram } from "@noldova/computer-use.runtime/macos";
 *
 * export async function readFinderSignerAsync(context: IRuntimePartContext): Promise<string | null> {
 *   const signatures = new MacCodeSignProgram(context, "/usr/bin/codesign", [], 10_000);
 *   return await signatures.readSignerAsync("/System/Library/CoreServices/Finder.app", AbortSignal.timeout(10_000));
 * }
 * ```
 */
export declare class MacCodeSignProgram implements IMacSignatureReader {
  /**
   * Builds the reader.
   *
   * @param starter Starts the program, as the runtime part's context does.
   * @param program The program to run, such as `/usr/bin/codesign`.
   * @param parameters Parameters that go before the read's own: `-d`, `--verbose=2` and the bundle's path.
   * @param timeoutMs How long a read may take before the bundle counts as having no signer.
   */
  public constructor(starter: IProgramStarter, program: string, parameters: readonly string[], timeoutMs: number);

  /**
   * {@inheritDoc IMacSignatureReader.readSignerAsync}
   */
  public readSignerAsync(bundlePath: string, signal: AbortSignal): Promise<string | null>;
}

/**
 * The macOS backend: every part over one input process, `osascript -l JavaScript` running the module's script, and screencapture.
 *
 * @remarks
 * Neither is native code, so the module needs no entitlement and no Info.plist key. Both start through the runtime part's context
 * as children of the runtime, so macOS checks Screen Recording and Accessibility for the runtime's responsible process, which
 * Noldova Desktop makes the runtime itself, the app, also when a terminal started the app.
 *
 * @example
 * ```ts
 * import type { IRuntimePartContext } from "@noldova/desktop.runtime";
 * import { MacBackend } from "@noldova/computer-use.runtime/macos";
 *
 * export async function countDisplaysAsync(context: IRuntimePartContext): Promise<number> {
 *   const backend = MacBackend.load(context);
 *   try {
 *     return (await backend.displays.listDisplaysAsync(AbortSignal.timeout(1000))).length;
 *   }
 *   finally {
 *     await backend.closeAsync();
 *   }
 * }
 * ```
 */
export declare class MacBackend implements IOperatingSystemBackend {
  /**
   * The input process's script, `jxa/mac-desktop.js` in the runtime package, which the build compiles from `src/jxa/mac-desktop.ts`.
   * In a packaged app it is the copy outside the app's archive, from {@link MacBackend.scriptFileOf}.
   */
  public static readonly scriptFile: string;

  /**
   * Lists the running apps that show in the Dock and the apps in the Applications folders, by bundle identifier, with no publisher,
   * and describes one with the publisher its signature's reader gives; a signature it can't read leaves the app without one.
   * Launch Services finds the app by its identity, or else the apps the list reads, matched without case.
   */
  public readonly apps: IAppBackend;

  /**
   * Draws the border in borderless windows of the input process, at the screen saver's level, which the window lists leave out by their numbers.
   */
  public readonly border: IBorderBackend;

  /**
   * Measures a display and captures a window by its number, each after checking the Screen Recording grant, refusing with
   * `DesktopOnlyCapture` when it is missing; a window that no longer shows where the list gave it has no image.
   */
  public readonly capture: ICaptureBackend;

  /**
   * Reads the window's controls through the input process's Accessibility API, in points, in slices of about a tenth of a second,
   * one call each, so the person's-input watch and the input calls run between them; it finds a control again by its handle at
   * the centre of its frame, and tells whether the element at a point is the control or lies in it.
   */
  public readonly controls: IControlBackend;

  /**
   * Lists the displays in points, with each one's backing scale.
   */
  public readonly displays: IDisplayBackend;

  /**
   * Sends input to a checked target, refusing it with the input process's reason, `MissingGrant` among them.
   */
  public readonly input: IInputBackend;

  /**
   * Reports the pointer leaving the position the input process last set, polled every 500 milliseconds; each poll that answers
   * is a heartbeat.
   */
  public readonly physicalInput: IPhysicalInputMonitor;

  /**
   * Reads the window in front and the windows that may show, from the window server's bounds.
   */
  public readonly windows: IWindowBackend;

  /**
   * Builds the backend over a channel and a capturer, or over doubles of them.
   *
   * @param channel The input process's channel, which every part but capture's pixels shares.
   * @param capturer The capturer of a window's pixels.
   * @param signatures The reader of an app's signer.
   * @param hostPath The app bundle the module runs in, from {@link MacBackend.hostPathOf}, or empty outside any bundle.
   * @param stopFolder The module's own folder, which only the person can read, for the files that stop a drag the input
   *   process runs; it is made when a drag starts.
   * @param log The module's log, where the input and the watch of the person's input write the failures they can't report to a call.
   */
  public constructor(channel: IMacScriptChannel, capturer: IMacScreenCapturer, signatures: IMacSignatureReader, hostPath: string, stopFolder: string, log: IModuleLog);

  /**
   * Builds the backend over `/usr/bin/osascript` running {@link MacBackend.scriptFile}, `/usr/sbin/screencapture` and
   * `/usr/bin/codesign`, each started through the starter.
   *
   * @param starter Starts the programs, as the runtime part's context does.
   * @returns A backend whose first call starts the input process.
   */
  public static load(starter: IProgramStarter): MacBackend;

  /**
   * Finds the app bundle that holds a program.
   *
   * @param executable The program's path, such as `process.execPath`.
   * @returns The outermost `.app` folder in the path, or an empty string when there is none.
   *
   * @example
   * ```ts
   * import { MacBackend } from "@noldova/computer-use.runtime/macos";
   *
   * console.log(MacBackend.hostPathOf("/Applications/Example.app/Contents/Frameworks/Example Helper.app/Contents/MacOS/Example Helper"));
   * ```
   */
  public static hostPathOf(executable: string): string;

  /**
   * Finds the input process's script for the backend's code at a location.
   *
   * The runtime package lists the script under `noldovaDesktop.unpacked`, so a packaged app keeps a copy of it outside its
   * `app.asar` archive, where `osascript` can read it.
   *
   * @param moduleUrl The `file:` URL of the backend's module, such as `import.meta.url`.
   * @returns The script's path, in `app.asar.unpacked` when the module is inside `app.asar`, or beside the module's package otherwise.
   *
   * @example
   * ```ts
   * import { MacBackend } from "@noldova/computer-use.runtime/macos";
   *
   * console.log(MacBackend.scriptFileOf("file:///Applications/Example.app/Contents/Resources/app.asar/node_modules/@noldova/computer-use.runtime/src/services/mac-backend.js"));
   * ```
   */
  public static scriptFileOf(moduleUrl: string): string;

  /**
   * Ends the input process, failing every call still waiting.
   */
  public closeAsync(): Promise<void>;
}
