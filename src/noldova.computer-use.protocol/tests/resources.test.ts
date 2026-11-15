/**
 * @license
 * Copyright (c) Noldova.
 *
 * This source code is licensed under the license found in the
 * LICENSE file in the root directory of this source tree.
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  BorderColorInvalidException,
  BorderColorSetRequest,
  ControlState,
  ControlStateUnknownException,
  SessionIdEmptyException,
  SessionIdMismatchException,
  SessionStatus,
  StatusReadRequest,
  StopRequest
} from "@noldova/computer-use.protocol";
import { JsonException } from "@noldova/context.json";

describe("Resources", () => {
  it("names the model when the value is not an object", () => {
    assert.throws(() => SessionStatus.fromJson(7), { constructor: JsonException, message: "SessionStatus: Expected a JSON object." });
  });

  it("names the model and the field when a field is missing", () => {
    assert.throws(() => SessionStatus.fromJson({ state: "Idle" }), { constructor: JsonException, message: "SessionStatus.sessionId: The field is required." });
  });

  it("names the field that must be a string", () => {
    assert.throws(() => SessionStatus.fromJson({ state: 1, sessionId: null }), { constructor: JsonException, message: "SessionStatus.state: Expected a string." });
    assert.throws(() => SessionStatus.fromJson({ state: "Idle", sessionId: 1 }), { constructor: JsonException, message: "SessionStatus.sessionId: Expected a string." });
  });

  it("names the unknown field", () => {
    assert.throws(() => StopRequest.fromJson({ force: true }), { constructor: JsonException, message: "StopRequest.force: The field is not known." });
    assert.throws(() => StatusReadRequest.fromJson({ sessionId: "session-1" }), {
      constructor: JsonException,
      message: "StatusReadRequest.sessionId: The field is not known."
    });
    assert.throws(() => BorderColorSetRequest.fromJson({ color: "#005FB8", alpha: 1 }), {
      constructor: JsonException,
      message: "BorderColorSetRequest.alpha: The field is not known."
    });
  });

  it("quotes the unknown control state", () => {
    assert.throws(() => ControlState.fromJson("Paused"), { constructor: ControlStateUnknownException, message: "\"Paused\" is not a known control state." });
  });

  it("names the state a session ID doesn't fit", () => {
    assert.throws(() => new SessionStatus(ControlState.Stopped, "session-1"), {
      constructor: SessionIdMismatchException,
      message: "A session ID is given exactly when the state is Controlling; the state is Stopped."
    });
  });

  it("says a session ID must not be empty", () => {
    assert.throws(() => new SessionStatus(ControlState.Controlling, ""), { constructor: SessionIdEmptyException, message: "A session ID must not be empty." });
  });

  it("names the event and the method by the module's ID", () => {
    assert.equal(SessionStatus.changedEvent, "computer-use.statusChanged");
    assert.equal(StopRequest.method, "computer-use.stop");
    assert.equal(StatusReadRequest.method, "computer-use.statusRead");
    assert.equal(BorderColorSetRequest.method, "computer-use.borderColorSet");
  });

  it("quotes the colour that isn't of the form #RRGGBB", () => {
    assert.throws(() => new BorderColorSetRequest("#4AF"), { constructor: BorderColorInvalidException, message: "\"#4AF\" is not a colour of the form #RRGGBB." });
  });
});
