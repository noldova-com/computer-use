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
import { RefusalReason } from "@noldova/computer-use.runtime";
import { MacScriptFailedException } from "@noldova/computer-use.runtime/macos";
import { AppShortcut, KeyChord } from "@noldova/desktop.protocol";
import { type IPermissionRequest, PermissionOption, ToolFailureCode, ToolFailureException, ToolRisk } from "@noldova/desktop.runtime";

import { BackendFailureException } from "../doubles/backend-failure.fixture.ts";
import { KeyCalls } from "./key-calls.fixture.ts";
import { RuntimeHarness } from "./runtime-harness.fixture.ts";

const summary = KeyCalls.summary;

describe("computer_key", () => {
  it("presses the keys in the granted app in front, raising a request the remembered grant answers without asking", async () => {
    const harness = await KeyCalls.grantedAsync();
    const asked = harness.answerer.delivered().length;

    const result = await harness.callAsync("computer_key", KeyCalls.pressing("Control+Shift+S"));

    assert.deepEqual(result.structured, { pressed: 1 });
    assert.deepEqual(harness.input.sent.map(t => [t.action, t.target]), [["press", RuntimeHarness.windowOf(RuntimeHarness.notes).target]]);
    assert.deepEqual(KeyCalls.pressed(harness), ["Control+Shift+S"]);
    assert.equal(harness.answerer.delivered().length, asked);
    const record = harness.center.records().at(-1);
    assert.equal(record?.action, "computer-use.controlApp");
    assert.equal(record?.subject, RuntimeHarness.notes.identity.id);
    assert.deepEqual(record?.details, [
      { name: "input", value: "key" },
      { name: "keys", value: "Control+Shift+S" },
      { name: "repeat", value: "1" },
      { name: "app", value: "Notes" },
      { name: "identity", value: RuntimeHarness.notes.identity.id },
      { name: "summary", value: summary }
    ]);
  });

  it("asks at the medium risk level, answered only from what is remembered", async () => {
    const requests: IPermissionRequest[] = [];
    const harness = await KeyCalls.grantedAsync(t => {
      requests.push(t);

      return null;
    });

    await harness.callAsync("computer_key", KeyCalls.pressing("Enter"));

    assert.equal(requests[0]?.risk, ToolRisk.Medium);
    assert.deepEqual(requests[0]?.options, [PermissionOption.AllowOnce, PermissionOption.Deny]);
  });

  it("presses the keys as many times as repeat says", async () => {
    const harness = await KeyCalls.grantedAsync();

    const result = await harness.callAsync("computer_key", KeyCalls.pressing("Down", 3));

    assert.deepEqual(result.structured, { pressed: 3 });
    assert.deepEqual(KeyCalls.pressed(harness), ["Down", "Down", "Down"]);
    assert.deepEqual(harness.center.records().at(-1)?.details[2], { name: "repeat", value: "3" });
  });

  it("asks the person at the high risk level for a combination the operating system handles, after the app's request, remembering nothing", async () => {
    const harness = await KeyCalls.grantedAsync();

    const call = harness.callAsync("computer_key", KeyCalls.pressing("Meta+R", 2));
    const pending = await harness.answerer.nextAsync();
    assert.equal(harness.monitor.isRunning, false);
    harness.answerer.answer(pending.id, PermissionOption.AllowOnce);

    assert.deepEqual((await call).structured, { pressed: 2 });
    assert.deepEqual(KeyCalls.pressed(harness), ["Meta+R", "Meta+R"]);
    assert.equal(harness.center.records().at(-2)?.action, "computer-use.controlApp");
    assert.equal(pending.request.action, "computer-use.systemKeys");
    assert.equal(pending.request.subject, RuntimeHarness.notes.identity.id);
    assert.equal(pending.request.risk, ToolRisk.High);
    assert.equal(pending.request.isRememberedOnly === true, false);
    assert.deepEqual(pending.request.options, [PermissionOption.AllowOnce, PermissionOption.Deny]);
    assert.deepEqual(pending.request.details.map(t => [t.label, t.value]), [
      ["keys", "Meta+R"],
      ["repeat", "2"],
      ["app", "Notes"],
      ["identity", RuntimeHarness.notes.identity.id],
      ["summary", summary]
    ]);

    const denied = harness.callAsync("computer_key", KeyCalls.pressing("Meta+R"));
    await harness.answerAsync("computer-use.systemKeys", PermissionOption.Deny);

    await RuntimeHarness.assertFailsAsync(denied, ToolFailureCode.Denied, /didn't allow this input/);
    assert.equal(harness.input.sent.length, 2);
  });

  it("refuses without raising a request when no window is in front, the window is elevated, or its app isn't granted at a tier that presses keys", async () => {
    const harness = await KeyCalls.grantedAsync();
    await harness.grantAppAsync(RuntimeHarness.terminal);
    const asked = harness.center.records().length;
    const cases = [
      [null, /No app's window is in front/],
      [RuntimeHarness.windowOf(RuntimeHarness.notes, true), /higher rights/],
      [RuntimeHarness.windowOf(RuntimeHarness.files), /File Explorer isn't granted to this session/],
      [RuntimeHarness.windowOf(RuntimeHarness.terminal), /Command Prompt is granted at the ClickOnly tier, which doesn't allow key/]
    ] as const;

    for (const [window, message] of cases) {
      harness.windows.foreground = window;

      await RuntimeHarness.assertFailsAsync(harness.callAsync("computer_key", KeyCalls.pressing("Enter")), ToolFailureCode.Refused, message);
    }
    assert.equal(harness.center.records().length, asked);
    assert.deepEqual(harness.input.sent, []);
  });

  it("refuses a global shortcut the app lists, as it lists its stop key, before raising anything", async () => {
    const harness = await KeyCalls.grantedAsync();
    harness.context.listedShortcuts = [new AppShortcut(KeyChord.parse("Mod+Shift+S"), "desktop.stopAgentControl", true)];
    const asked = harness.center.records().length;

    await RuntimeHarness.assertFailsAsync(harness.callAsync("computer_key", KeyCalls.pressing("Control+Shift+S")), ToolFailureCode.Refused, /^Control\+Shift\+S is one of the app's own shortcuts/);

    assert.equal(harness.center.records().length, asked);
    assert.deepEqual(harness.input.sent, []);
  });

  it("follows the app's shortcuts as they change, refusing a chord the app adds and sending one it removes", async () => {
    const harness = await KeyCalls.grantedAsync();
    const listed: AppShortcut[] = [];
    harness.context.shortcuts.answer("list", () => listed);

    await harness.callAsync("computer_key", KeyCalls.pressing("Control+K"));
    listed.push(new AppShortcut(KeyChord.parse("Mod+K"), "notes.open", false));
    harness.context.shortcuts.raiseChanged();
    await RuntimeHarness.assertFailsAsync(harness.callAsync("computer_key", KeyCalls.pressing("Control+K")), ToolFailureCode.Refused, /one of the app's own shortcuts/);
    listed.length = 0;
    harness.context.shortcuts.raiseChanged();
    await harness.callAsync("computer_key", KeyCalls.pressing("Control+K"));

    assert.deepEqual(KeyCalls.pressed(harness), ["Control+K", "Control+K"]);
  });

  it("fails by the backend's refusal before sending, and as uncertain when a later press is refused after an earlier one was sent", async () => {
    const harness = await KeyCalls.grantedAsync();
    harness.input.refusalBeforeSending = RefusalReason.PasswordField;

    await RuntimeHarness.assertFailsAsync(harness.callDirectlyAsync("computer_key", KeyCalls.pressing("Enter", 2)), ToolFailureCode.Refused, /password field/);
    harness.input.refusalBeforeSending = null;
    KeyCalls.afterEachPress(harness, () => {
      harness.windows.foreground = RuntimeHarness.windowOf(RuntimeHarness.files);
    });
    await RuntimeHarness.assertFailsAsync(harness.callAsync("computer_key", KeyCalls.pressing("Enter", 2)), ToolFailureCode.OutcomeUncertain, /may already have been sent/);
    assert.deepEqual(KeyCalls.pressed(harness), ["Enter"]);
  });

  it("fails as uncertain when the backend fails during the input", async () => {
    const harness = await KeyCalls.grantedAsync();
    harness.input.pressKeyAsync = async () => {
      throw new BackendFailureException("pressKey");
    };

    await RuntimeHarness.assertFailsAsync(harness.callAsync("computer_key", KeyCalls.pressing("Enter")), ToolFailureCode.OutcomeUncertain, /backend failed during the input/);
    assert.deepEqual(harness.tools.messages.map(t => t.split("\n")[0]), [
      `The tool computer_key failed with "The backend failed during the input, so some of it may have been sent and the outcome is uncertain. Call computer_screenshot before acting again.", caused by: BackendFailureException: The backend failed pressKey.`
    ]);
  });

  it("keeps the macOS input process's failure as the cause of the uncertain failure", async () => {
    const harness = await KeyCalls.grantedAsync();
    const failure = new MacScriptFailedException("pressKey", "The key could not be pressed.");
    harness.input.pressKeyAsync = async () => {
      throw failure;
    };

    await assert.rejects(harness.callDirectlyAsync("computer_key", KeyCalls.pressing("Enter")), (error: unknown) =>
      error instanceof ToolFailureException && error.failure.code === ToolFailureCode.OutcomeUncertain && error.cause === failure);
  });

  it("passes on a failure during the input that isn't the backend's own as it is", async () => {
    const harness = await KeyCalls.grantedAsync();
    const defect = new TypeError("A defect in the module.");
    harness.input.pressKeyAsync = async () => {
      throw defect;
    };

    await assert.rejects(harness.callDirectlyAsync("computer_key", KeyCalls.pressing("Enter")), (error: unknown) => error === defect);
  });

  it("refuses keys it can't name, a repeat out of range, or no summary, before raising anything", async () => {
    const harness = await KeyCalls.grantedAsync();
    const asked = harness.center.records().length;
    const inputs: readonly JsonObject[] = [
      { keys: "Enter" },
      { keys: "", summary },
      { keys: 1, summary },
      { keys: "Enter", summary: "" },
      KeyCalls.pressing("Hyper+S"),
      KeyCalls.pressing("Control+Control+S"),
      KeyCalls.pressing("Control+Ctrl+S"),
      KeyCalls.pressing("S+Control"),
      KeyCalls.pressing("Control+"),
      KeyCalls.pressing("A+B"),
      KeyCalls.pressing("Comma"),
      KeyCalls.pressing("Enter", 0),
      KeyCalls.pressing("Enter", 101),
      KeyCalls.pressing("Enter", 1.5),
      { keys: "Enter", repeat: "2", summary }
    ];

    for (const input of inputs)
      await RuntimeHarness.assertFailsAsync(harness.callDirectlyAsync("computer_key", input), ToolFailureCode.Refused, /computer_key takes keys/);
    assert.equal(harness.center.records().length, asked);
    assert.deepEqual(harness.input.sent, []);
  });
});
