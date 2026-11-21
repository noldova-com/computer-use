/**
 * @license
 * Copyright (c) Noldova.
 *
 * This source code is licensed under the license found in the
 * LICENSE file in the root directory of this source tree.
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";

import type { JsonObject } from "@noldova/computer-use.protocol";
import { type IPermissionRequest, PermissionDecision, PermissionOption, ToolAbortReason, ToolFailureCode, ToolRisk } from "@noldova/desktop.runtime";

import { BackendFailureException } from "../doubles/backend-failure.fixture.ts";
import { RuntimeHarness } from "./runtime-harness.fixture.ts";
import { TypeCalls } from "./type-calls.fixture.ts";

const summary = TypeCalls.summary;

describe("computer_type", () => {
  it("types into the granted app in front, raising a request the remembered grant answers without asking", async () => {
    const harness = await TypeCalls.grantedAsync();
    const asked = harness.answerer.delivered().length;

    const result = await harness.callAsync("computer_type", TypeCalls.typing("Shopping list"));

    assert.deepEqual(result.structured, { typed: 13 });
    assert.deepEqual(harness.input.sent.map(t => [t.action, t.text, t.target]), [["type", "Shopping list", RuntimeHarness.windowOf(RuntimeHarness.notes).target]]);
    assert.equal(harness.answerer.delivered().length, asked);
    const record = harness.center.records().at(-1);
    assert.equal(record?.action, "computer-use.controlApp");
    assert.equal(record?.subject, RuntimeHarness.notes.identity.id);
    assert.equal(record?.isRemembered, true);
    assert.deepEqual(record?.details, [
      { name: "input", value: "type" },
      { name: "text", value: "Shopping list" },
      { name: "app", value: "Notes" },
      { name: "identity", value: RuntimeHarness.notes.identity.id },
      { name: "summary", value: summary }
    ]);
  });

  it("asks at the medium risk level, answered only from what is remembered", async () => {
    const requests: IPermissionRequest[] = [];
    const harness = await TypeCalls.grantedAsync(undefined, t => {
      requests.push(t);

      return null;
    });

    await harness.callAsync("computer_type", TypeCalls.typing("a"));

    assert.equal(requests[0]?.risk, ToolRisk.Medium);
    assert.deepEqual(requests[0]?.options, [PermissionOption.AllowOnce, PermissionOption.Deny]);
  });

  it("sends the text in chunks the backend takes, never splitting a surrogate pair", async () => {
    const harness = await TypeCalls.grantedAsync(3);

    await harness.callAsync("computer_type", TypeCalls.typing("ab\u{1F600}cdefg"));

    assert.deepEqual(harness.input.sent.map(t => t.text), ["ab", "\u{1F600}c", "def", "g"]);
  });

  it("sends a \"\\r\\n\" within one chunk, never splitting it, so a text that ends with one is sent whole", async () => {
    const harness = await TypeCalls.grantedAsync(3);

    await harness.callAsync("computer_type", TypeCalls.typing("ab\r\ncd"));

    assert.deepEqual(harness.input.sent.map(t => t.text), ["ab", "\r\nc", "d"]);
    const ending = await TypeCalls.grantedAsync(3);

    await ending.callAsync("computer_type", TypeCalls.typing("ab\r\n"));

    assert.deepEqual(ending.input.sent.map(t => t.text), ["ab", "\r\n"]);
  });

  it("refuses without raising a request when no window is in front, the window is elevated, or its app isn't granted at a tier that types", async () => {
    const harness = await TypeCalls.grantedAsync();
    await harness.grantAppAsync(RuntimeHarness.terminal);
    const asked = harness.center.records().length;
    const cases = [
      [null, /No app's window is in front/],
      [RuntimeHarness.windowOf(RuntimeHarness.notes, true), /higher rights/],
      [RuntimeHarness.windowOf(RuntimeHarness.files), /File Explorer isn't granted to this session\. Call computer_request_apps/],
      [RuntimeHarness.windowOf(RuntimeHarness.terminal), /Command Prompt is granted at the ClickOnly tier, which doesn't allow type/]
    ] as const;

    for (const [window, message] of cases) {
      harness.windows.foreground = window;

      await RuntimeHarness.assertFailsAsync(harness.callAsync("computer_type", TypeCalls.typing("a")), ToolFailureCode.Refused, message);
    }
    assert.equal(harness.center.records().length, asked);
    assert.deepEqual(harness.input.sent, []);
  });

  it("is denied without asking once the app's grant is revoked in the app's settings", async () => {
    const harness = await TypeCalls.grantedAsync();
    const asked = harness.answerer.delivered().length;

    for (const answer of harness.center.remembered())
      harness.center.forget(answer);

    await RuntimeHarness.assertFailsAsync(harness.callAsync("computer_type", TypeCalls.typing("a")), ToolFailureCode.Denied, /didn't allow this input/);
    assert.equal(harness.answerer.delivered().length, asked);
    assert.deepEqual(harness.input.sent, []);
  });

  it("fails by how its request ended when the request doesn't grant it", async () => {
    const cases = [
      [PermissionDecision.Expired, ToolFailureCode.Expired, /expired without an answer/],
      [PermissionDecision.Withdrawn, ToolFailureCode.Withdrawn, /while its request was waiting/]
    ] as const;

    for (const [decision, code, message] of cases) {
      const harness = await TypeCalls.grantedAsync(undefined, async () => decision);

      await RuntimeHarness.assertFailsAsync(harness.callAsync("computer_type", TypeCalls.typing("a")), code, message);
      assert.deepEqual(harness.input.sent, []);
    }
  });

  it("fails as withdrawn when the caller cancels while its request waits", async () => {
    const waiting = Promise.withResolvers<void>();
    const harness = await TypeCalls.grantedAsync(undefined, async (_, signal) => {
      waiting.resolve();
      await new Promise(t => signal?.addEventListener("abort", t, { once: true }));

      return PermissionDecision.Withdrawn;
    });
    const controller = new AbortController();

    const call = harness.callDirectlyAsync("computer_type", TypeCalls.typing("a"), controller.signal);
    await waiting.promise;
    controller.abort();

    await RuntimeHarness.assertFailsAsync(call, ToolFailureCode.Withdrawn, /while its permission request was waiting/);
  });

  it("ends the call after a chunk that ends in a Tab or a line break when text follows, refusing the rest as a possible password field", async () => {
    for (const mover of ["\t", "\n", "\r"]) {
      const harness = await TypeCalls.grantedAsync(3);

      await RuntimeHarness.assertFailsAsync(harness.callAsync("computer_type", TypeCalls.typing(`ab${mover}S3cret`)), ToolFailureCode.OutcomeUncertain, /password field/);
      assert.deepEqual(harness.input.sent.map(t => t.text), [`ab${mover}`]);
    }
    const harness = await TypeCalls.grantedAsync(3);

    await harness.callAsync("computer_type", TypeCalls.typing("abc\t"));

    assert.deepEqual(harness.input.sent.map(t => t.text), ["abc", "\t"]);
  });

  it("fails as uncertain when a later chunk is refused after an earlier one was sent", async () => {
    const harness = await TypeCalls.grantedAsync(2);
    TypeCalls.afterEachChunk(harness, () => {
      harness.windows.foreground = RuntimeHarness.windowOf(RuntimeHarness.files);
    });

    await RuntimeHarness.assertFailsAsync(harness.callAsync("computer_type", TypeCalls.typing("abcd")), ToolFailureCode.OutcomeUncertain, /may already have been sent/);
    assert.deepEqual(harness.input.sent.map(t => t.text), ["ab"]);
  });

  it("fails as uncertain when the backend fails during the input", async () => {
    const harness = await TypeCalls.grantedAsync();
    harness.input.typeTextAsync = async () => {
      throw new BackendFailureException("typeText");
    };

    await RuntimeHarness.assertFailsAsync(harness.callAsync("computer_type", TypeCalls.typing("a")), ToolFailureCode.OutcomeUncertain, /backend failed during the input/);
    assert.deepEqual(harness.tools.messages.map(t => t.split("\n")[0]), [
      `The tool computer_type failed with "The backend failed during the input, so some of it may have been sent and the outcome is uncertain. Call computer_screenshot before acting again.", caused by: BackendFailureException: The backend failed typeText.`
    ]);
  });

  it("passes on a failure during the input, or of reading the window in front, that isn't the backend's own as it is", async () => {
    const defect = new TypeError("A defect in the module.");
    const fail = async (): Promise<never> => {
      throw defect;
    };
    const sending = await TypeCalls.grantedAsync();
    sending.input.typeTextAsync = fail;
    const reading = await TypeCalls.grantedAsync();
    reading.windows.getForegroundWindowAsync = fail;

    for (const harness of [sending, reading])
      await assert.rejects(harness.callDirectlyAsync("computer_type", TypeCalls.typing("a")), (error: unknown) => error === defect);
    assert.deepEqual(reading.input.sent, []);
  });

  it("fails as uncertain, naming the kind, when the call ends between chunks or after the last", async () => {
    for (const text of ["abcd", "ab"]) {
      const harness = await TypeCalls.grantedAsync(2);
      const controller = new AbortController();
      TypeCalls.afterEachChunk(harness, () => controller.abort(ToolAbortReason.Stopped));

      await RuntimeHarness.assertFailsAsync(harness.callDirectlyAsync("computer_type", TypeCalls.typing(text), controller.signal), ToolFailureCode.OutcomeUncertain, /The call ended \(Stopped\)/);
      assert.deepEqual(harness.input.sent.map(t => t.text), ["ab"]);
    }
  });

  it("fails by the call's end, or as unavailable, when the window in front can't be read", async () => {
    const harness = await TypeCalls.grantedAsync();
    const controller = new AbortController();
    harness.windows.getForegroundWindowAsync = async () => {
      throw new BackendFailureException("getForegroundWindow");
    };

    await RuntimeHarness.assertFailsAsync(harness.callAsync("computer_type", TypeCalls.typing("a")), ToolFailureCode.Unavailable, /could not be read/);
    harness.windows.getForegroundWindowAsync = async () => {
      controller.abort(ToolAbortReason.DeadlineReached);
      throw new Error("The window list stopped.");
    };
    await RuntimeHarness.assertFailsAsync(harness.callDirectlyAsync("computer_type", TypeCalls.typing("a"), controller.signal), ToolFailureCode.TimedOut);
  });

  it("refuses input without text and a summary, or with too long a text", async () => {
    const harness = await TypeCalls.grantedAsync();

    const refused: readonly JsonObject[] = [{ text: "a" }, { text: "", summary }, { text: 1, summary }, { text: "a", summary: "" }, TypeCalls.typing("a".repeat(4001))];

    for (const input of refused)
      await RuntimeHarness.assertFailsAsync(harness.callDirectlyAsync("computer_type", input), ToolFailureCode.Refused, /computer_type takes text/);
  });
});
