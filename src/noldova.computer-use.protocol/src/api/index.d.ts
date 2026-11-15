/**
 * @license
 * Copyright (c) Noldova.
 *
 * This source code is licensed under the license found in the
 * LICENSE file in the root directory of this source tree.
 */

import { Exception, type ExceptionOptions } from "@noldova/context.exceptions";
import type { JsonObject } from "@noldova/context.json";

export type { JsonObject, JsonValue } from "@noldova/context.json";

/**
 * The base of the exceptions a model of the module's protocol throws when it is built from values it refuses.
 * A value that isn't a model's wire form fails with `JsonException` from `@noldova/context.json` instead, whose path names the model
 * and the field.
 *
 * @example
 * ```ts
 * import { ControlState, ProtocolException } from "@noldova/computer-use.protocol";
 *
 * try {
 *   ControlState.fromJson("Paused");
 * }
 * catch (error) {
 *   console.log(error instanceof ProtocolException);
 * }
 * ```
 */
export declare abstract class ProtocolException extends Exception {
  /**
   * The class's name, which logs show; each subclass gives its own.
   */
  public override readonly name: string;

  /**
   * Initializes the exception.
   *
   * @param message What went wrong, as a sentence.
   * @param options Optional options carrying the cause.
   *
   * @example
   * ```ts
   * import { ProtocolException } from "@noldova/computer-use.protocol";
   *
   * class RefusedException extends ProtocolException {
   *   public constructor() {
   *     super("Refused.");
   *   }
   * }
   *
   * console.log(new RefusedException().message);
   * ```
   */
  protected constructor(message: string, options?: ExceptionOptions);
}

/**
 * Thrown when a {@link BorderColorSetRequest}'s colour isn't of the form `#RRGGBB`.
 *
 * @example
 * ```ts
 * import { BorderColorInvalidException } from "@noldova/computer-use.protocol";
 *
 * const error = new BorderColorInvalidException("#4AF");
 * console.log(error.color, error.message);
 * ```
 */
export declare class BorderColorInvalidException extends ProtocolException {
  /**
   * The class's name, `"BorderColorInvalidException"`, which logs show.
   */
  public override readonly name: string;

  /**
   * The colour as given.
   */
  public readonly color: string;

  /**
   * Initializes the exception, whose message quotes the colour.
   *
   * @param color The colour as given.
   *
   * @example
   * ```ts
   * import { BorderColorInvalidException } from "@noldova/computer-use.protocol";
   *
   * console.log(new BorderColorInvalidException("blue").message);
   * ```
   */
  public constructor(color: string);
}

/**
 * Thrown when a value names no known {@link ControlState}.
 *
 * @example
 * ```ts
 * import { ControlStateUnknownException } from "@noldova/computer-use.protocol";
 *
 * const error = new ControlStateUnknownException("Paused");
 * console.log(error.value, error.message);
 * ```
 */
export declare class ControlStateUnknownException extends ProtocolException {
  /**
   * The class's name, `"ControlStateUnknownException"`, which logs show.
   */
  public override readonly name: string;

  /**
   * The value as given, of any type.
   */
  public readonly value: unknown;

  /**
   * Initializes the exception, whose message quotes the value as text.
   *
   * @param value The value as given.
   *
   * @example
   * ```ts
   * import { ControlStateUnknownException } from "@noldova/computer-use.protocol";
   *
   * console.log(new ControlStateUnknownException(0).message);
   * ```
   */
  public constructor(value: unknown);
}

/**
 * Thrown when a {@link SessionStatus}'s session ID doesn't fit its state: one is given with a state that has none, or none is given
 * for {@link ControlState.Controlling}.
 *
 * @example
 * ```ts
 * import { ControlState, SessionIdMismatchException } from "@noldova/computer-use.protocol";
 *
 * const error = new SessionIdMismatchException(ControlState.Idle, "session-1");
 * console.log(error.state === ControlState.Idle, error.sessionId, error.message);
 * ```
 */
export declare class SessionIdMismatchException extends ProtocolException {
  /**
   * The class's name, `"SessionIdMismatchException"`, which logs show.
   */
  public override readonly name: string;

  /**
   * The session ID as given, or `null` when none was.
   */
  public readonly sessionId: string | null;

  /**
   * The state as given.
   */
  public readonly state: ControlState;

  /**
   * Initializes the exception, whose message names the state.
   *
   * @param state The state as given.
   * @param sessionId The session ID as given, or `null` when none was.
   *
   * @example
   * ```ts
   * import { ControlState, SessionIdMismatchException } from "@noldova/computer-use.protocol";
   *
   * console.log(new SessionIdMismatchException(ControlState.Controlling, null).message);
   * ```
   */
  public constructor(state: ControlState, sessionId: string | null);
}

/**
 * Thrown when a {@link SessionStatus}'s session ID is empty.
 *
 * @example
 * ```ts
 * import { SessionIdEmptyException } from "@noldova/computer-use.protocol";
 *
 * console.log(new SessionIdEmptyException().message);
 * ```
 */
export declare class SessionIdEmptyException extends ProtocolException {
  /**
   * The class's name, `"SessionIdEmptyException"`, which logs show.
   */
  public override readonly name: string;

  /**
   * Initializes the exception.
   *
   * @example
   * ```ts
   * import { SessionIdEmptyException } from "@noldova/computer-use.protocol";
   *
   * console.log(new SessionIdEmptyException().name);
   * ```
   */
  public constructor();
}

/**
 * The wire form of a {@link SessionStatus}.
 */
export interface ISessionStatusJson {
  readonly [key: string]: string | null;

  /**
   * The {@link ControlState}'s value.
   */
  readonly state: string;

  /**
   * The session that controls the screen, or `null` when none does.
   */
  readonly sessionId: string | null;
}

/**
 * The app's request that sets the colour of the border that shows around every display while a session controls the screen.
 * The app sends its theme's accent colour when computer use starts and again when its theme changes; the runtime keeps the last
 * colour sent, and before any is sent uses the kit's accent colour.
 *
 * @example
 * ```ts
 * import { BorderColorSetRequest } from "@noldova/computer-use.protocol";
 *
 * console.log(BorderColorSetRequest.method, new BorderColorSetRequest("#005fb8").toJson());
 * ```
 */
export declare class BorderColorSetRequest {
  /**
   * The name of the runtime method that receives the request, which answers an empty object.
   */
  public static readonly method: string;

  /**
   * The colour, as `#RRGGBB` in upper case.
   */
  public readonly color: string;

  /**
   * Creates a request.
   *
   * @param color The colour, as `#RRGGBB` in either case.
   * @throws {@link BorderColorInvalidException} Synchronously, when the colour isn't of the form `#RRGGBB`.
   *
   * @example
   * ```ts
   * import { BorderColorSetRequest } from "@noldova/computer-use.protocol";
   *
   * console.log(new BorderColorSetRequest("#4daafc").color);
   * // Throws a BorderColorInvalidException: the colour has three digits.
   * new BorderColorSetRequest("#4AF");
   * ```
   */
  public constructor(color: string);

  /**
   * Reads a request from its wire form.
   *
   * @param value The wire form, untrusted: an object with the one string field `color`.
   * @returns The request.
   * @throws {JsonException} Synchronously, when the value isn't such an object; the message names the field.
   * @throws {@link BorderColorInvalidException} Synchronously, when its colour isn't of the form `#RRGGBB`.
   *
   * @example
   * ```ts
   * import { BorderColorSetRequest } from "@noldova/computer-use.protocol";
   *
   * const request = BorderColorSetRequest.fromJson({ color: "#005FB8" });
   * // Throws a BorderColorInvalidException: the colour is a name.
   * BorderColorSetRequest.fromJson({ color: "blue" });
   * ```
   */
  public static fromJson(value: unknown): BorderColorSetRequest;

  /**
   * Gives the request's wire form.
   *
   * @returns A new object with the colour.
   *
   * @example
   * ```ts
   * import { BorderColorSetRequest } from "@noldova/computer-use.protocol";
   *
   * console.log(new BorderColorSetRequest("#005FB8").toJson());
   * ```
   */
  public toJson(): JsonObject;
}

/**
 * Whether an agent session controls the screen's pointer and keyboard.
 *
 * @example
 * ```ts
 * import { ControlState } from "@noldova/computer-use.protocol";
 *
 * console.log(ControlState.fromJson("Controlling") === ControlState.Controlling);
 * ```
 */
export declare class ControlState {
  /**
   * No session controls the screen.
   */
  public static readonly Idle: ControlState;

  /**
   * A session controls the screen.
   */
  public static readonly Controlling: ControlState;

  /**
   * The person stopped control; no session controls the screen until the person resumes it.
   */
  public static readonly Stopped: ControlState;

  /**
   * Whether a session controls the screen in this state.
   */
  public readonly isControlling: boolean;

  /**
   * The state's wire value: `"Idle"`, `"Controlling"` or `"Stopped"`.
   */
  public readonly value: string;

  private constructor();

  /**
   * Reads a state from its wire value.
   *
   * @param value The wire value, untrusted.
   * @returns The one instance of the state with that value.
   * @throws {@link ControlStateUnknownException} Synchronously, when the value names no known state.
   *
   * @example
   * ```ts
   * import { ControlState } from "@noldova/computer-use.protocol";
   *
   * const state = ControlState.fromJson("Idle");
   * console.log(state.isControlling);
   * ```
   */
  public static fromJson(value: unknown): ControlState;

  /**
   * Gives the state's wire value.
   *
   * @returns The same text as {@link ControlState.value}.
   *
   * @example
   * ```ts
   * import { ControlState } from "@noldova/computer-use.protocol";
   *
   * console.log(ControlState.Stopped.toJson());
   * ```
   */
  public toJson(): string;
}

/**
 * The status the runtime part publishes to the window part: the control state and the session that controls the screen.
 *
 * @example
 * ```ts
 * import { ControlState, SessionStatus } from "@noldova/computer-use.protocol";
 *
 * const status = new SessionStatus(ControlState.Controlling, "session-1");
 * console.log(status.toJson());
 * ```
 */
export declare class SessionStatus {
  /**
   * The name of the event that carries a new status to the window part.
   */
  public static readonly changedEvent: string;

  /**
   * The session that controls the screen, or `null` when none does.
   */
  public readonly sessionId: string | null;

  /**
   * Whether a session controls the screen.
   */
  public readonly state: ControlState;

  /**
   * Creates a status.
   *
   * @param state The control state.
   * @param sessionId The session that controls the screen: a non-empty ID exactly when the state is {@link ControlState.Controlling}, and `null` otherwise.
   * @throws {@link SessionIdMismatchException} Synchronously, when a session ID is given with a state that has none, or is missing for {@link ControlState.Controlling}.
   * @throws {@link SessionIdEmptyException} Synchronously, when the session ID is empty.
   *
   * @example
   * ```ts
   * import { ControlState, SessionStatus } from "@noldova/computer-use.protocol";
   *
   * const idle = new SessionStatus(ControlState.Idle, null);
   * // Throws a SessionIdMismatchException: an idle status has no session.
   * new SessionStatus(ControlState.Idle, "session-1");
   * ```
   */
  public constructor(state: ControlState, sessionId: string | null);

  /**
   * Reads a status from its wire form.
   *
   * @param value The wire form, untrusted: an object with exactly the fields `state` and `sessionId`.
   * @returns The status.
   * @throws {JsonException} Synchronously, when the value isn't an object, or a field is missing, has the wrong type or isn't known; the message names the field.
   * @throws {@link ControlStateUnknownException} Synchronously, when the state names no known state.
   * @throws {@link SessionIdMismatchException} Synchronously, when the session ID doesn't fit the state.
   * @throws {@link SessionIdEmptyException} Synchronously, when the session ID is empty.
   *
   * @example
   * ```ts
   * import { SessionStatus } from "@noldova/computer-use.protocol";
   *
   * const status = SessionStatus.fromJson({ state: "Controlling", sessionId: "session-1" });
   * console.log(status.state.isControlling);
   * ```
   */
  public static fromJson(value: unknown): SessionStatus;

  /**
   * Gives the status's wire form.
   *
   * @returns A new plain object that {@link SessionStatus.fromJson} reads back to an equal status.
   *
   * @example
   * ```ts
   * import { ControlState, SessionStatus } from "@noldova/computer-use.protocol";
   *
   * console.log(new SessionStatus(ControlState.Stopped, null).toJson());
   * ```
   */
  public toJson(): ISessionStatusJson;
}

/**
 * The window part's request for the session's status as it is now, which a window that opens while a session controls the
 * screen reads before the next {@link SessionStatus.changedEvent}.
 *
 * @example
 * ```ts
 * import { StatusReadRequest } from "@noldova/computer-use.protocol";
 *
 * console.log(StatusReadRequest.method, new StatusReadRequest().toJson());
 * ```
 */
export declare class StatusReadRequest {
  /**
   * The name of the runtime method that receives the request, which answers a {@link SessionStatus}'s wire form.
   */
  public static readonly method: string;

  /**
   * Reads a request from its wire form.
   *
   * @param value The wire form, untrusted: an object with no fields.
   * @returns The request.
   * @throws {JsonException} Synchronously, when the value isn't an object or has a field; the message names the field.
   *
   * @example
   * ```ts
   * import { StatusReadRequest } from "@noldova/computer-use.protocol";
   *
   * const request = StatusReadRequest.fromJson({});
   * // Throws a JsonException: a status read request has no fields.
   * StatusReadRequest.fromJson({ sessionId: "session-1" });
   * ```
   */
  public static fromJson(value: unknown): StatusReadRequest;

  /**
   * Gives the request's wire form.
   *
   * @returns A new empty object.
   *
   * @example
   * ```ts
   * import { StatusReadRequest } from "@noldova/computer-use.protocol";
   *
   * console.log(new StatusReadRequest().toJson());
   * ```
   */
  public toJson(): JsonObject;
}

/**
 * The window part's request that the runtime part stop control at once.
 *
 * @example
 * ```ts
 * import { StopRequest } from "@noldova/computer-use.protocol";
 *
 * console.log(StopRequest.method, new StopRequest().toJson());
 * ```
 */
export declare class StopRequest {
  /**
   * The name of the runtime method that receives the request.
   */
  public static readonly method: string;

  /**
   * Reads a request from its wire form.
   *
   * @param value The wire form, untrusted: an object with no fields.
   * @returns The request.
   * @throws {JsonException} Synchronously, when the value isn't an object or has a field; the message names the field.
   *
   * @example
   * ```ts
   * import { StopRequest } from "@noldova/computer-use.protocol";
   *
   * const request = StopRequest.fromJson({});
   * // Throws a JsonException: a stop request has no fields.
   * StopRequest.fromJson({ force: true });
   * ```
   */
  public static fromJson(value: unknown): StopRequest;

  /**
   * Gives the request's wire form.
   *
   * @returns A new empty object.
   *
   * @example
   * ```ts
   * import { StopRequest } from "@noldova/computer-use.protocol";
   *
   * console.log(new StopRequest().toJson());
   * ```
   */
  public toJson(): JsonObject;
}
