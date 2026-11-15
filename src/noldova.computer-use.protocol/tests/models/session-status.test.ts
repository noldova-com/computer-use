/**
 * @license
 * Copyright (c) Noldova.
 *
 * This source code is licensed under the license found in the
 * LICENSE file in the root directory of this source tree.
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { ControlState, ControlStateUnknownException, SessionIdEmptyException, SessionIdMismatchException, SessionStatus } from "@noldova/computer-use.protocol";
import { JsonException } from "@noldova/context.json";

describe("SessionStatus", () => {
  it("holds a controlling session", () => {
    const status = new SessionStatus(ControlState.Controlling, "session-1");

    assert.equal(status.state, ControlState.Controlling);
    assert.equal(status.sessionId, "session-1");
  });

  it("holds no session while idle or stopped", () => {
    assert.equal(new SessionStatus(ControlState.Idle, null).sessionId, null);
    assert.equal(new SessionStatus(ControlState.Stopped, null).sessionId, null);
  });

  it("refuses a session ID that doesn't fit the state", () => {
    assert.throws(() => new SessionStatus(ControlState.Controlling, null), SessionIdMismatchException);
    assert.throws(() => new SessionStatus(ControlState.Idle, "session-1"), SessionIdMismatchException);
    assert.throws(() => new SessionStatus(ControlState.Controlling, ""), SessionIdEmptyException);
  });

  it("writes its wire form", () => {
    assert.deepEqual(new SessionStatus(ControlState.Controlling, "session-1").toJson(), { state: "Controlling", sessionId: "session-1" });
    assert.deepEqual(new SessionStatus(ControlState.Idle, null).toJson(), { state: "Idle", sessionId: null });
  });

  it("reads its wire form back to an equal status", () => {
    const status = SessionStatus.fromJson({ state: "Controlling", sessionId: "session-2" });

    assert.equal(status.state, ControlState.Controlling);
    assert.equal(status.sessionId, "session-2");
  });

  it("refuses a wire form whose fields break the status's rules", () => {
    assert.throws(() => SessionStatus.fromJson({ state: "Stopped", sessionId: "session-1" }), SessionIdMismatchException);
    assert.throws(() => SessionStatus.fromJson({ state: "Paused", sessionId: null }), ControlStateUnknownException);
  });

  it("refuses a missing field", () => {
    assert.throws(() => SessionStatus.fromJson({ sessionId: null }), JsonException);
  });

  it("refuses a string field of another type", () => {
    assert.throws(() => SessionStatus.fromJson({ state: null, sessionId: null }), JsonException);
    assert.throws(() => SessionStatus.fromJson({ state: "Idle", sessionId: 1 }), JsonException);
  });

  it("reads null where a string or null is allowed", () => {
    assert.equal(SessionStatus.fromJson({ state: "Idle", sessionId: null }).sessionId, null);
  });
});
