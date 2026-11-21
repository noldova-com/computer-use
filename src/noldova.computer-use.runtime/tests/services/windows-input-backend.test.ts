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
  BackendAnswerInvalidException,
  ClickCount,
  DesktopPoint,
  KeyName,
  ModifierKey,
  PointerButton,
  RefusalException,
  RefusalReason,
  RefusalReasonUnknownException,
  ScrollAmount
} from "@noldova/computer-use.runtime";
import { ArgumentOutOfRangeException } from "@noldova/context.exceptions";

import { HangGuard } from "./hang-guard.fixture.ts";
import { WindowsBackendHarness } from "./windows-backend-harness.fixture.ts";

const TARGET = WindowsBackendHarness.target;
const TARGET_JSON = WindowsBackendHarness.targetJson;

describe("the Windows backend's input", () => {
  it("reads where the pointer is from the addon, in its physical pixels", async () => {
    const { api, backend } = WindowsBackendHarness.start();
    api.pointer = { x: -1920, y: 40 };

    assert.deepEqual(await backend.input.readPointerAsync(HangGuard.signal()), new DesktopPoint(-1920, 40));
    assert.deepEqual(api.calls, [{ name: "readPointer", arguments: [] }]);
  });

  it("reads nothing once the call has ended", async () => {
    const { api, backend } = WindowsBackendHarness.start();

    await assert.rejects(backend.input.readPointerAsync(AbortSignal.abort()), { name: "AbortError" });
    assert.deepEqual(api.calls, []);
  });

  it("glides to each pointer input's point from where the pointer is, then sends each input to the addon with its target, points, names and the person's input count read as the action began", async () => {
    const { api, backend } = WindowsBackendHarness.start();
    const signal = HangGuard.signal();
    const origin = new DesktopPoint(0, 0);
    api.physicalCount = 7;
    const glide = (to: DesktopPoint, points: readonly DesktopPoint[]): readonly { readonly name: string; readonly arguments: readonly unknown[] }[] => [
      { name: "readPhysicalCount", arguments: [] },
      { name: "readPointer", arguments: [] },
      { name: "glidePointer", arguments: [TARGET_JSON, WindowsBackendHarness.stepsOf(origin, to), points.map(t => ({ x: t.x, y: t.y })), 7] }
    ];

    await backend.input.movePointerAsync(TARGET, new DesktopPoint(1, 2), signal);
    await backend.input.clickAsync(TARGET, new DesktopPoint(3, 4), PointerButton.Right, ClickCount.Double, [ModifierKey.Control, ModifierKey.Shift], signal);
    await backend.input.dragAsync(TARGET, new DesktopPoint(5, 6), new DesktopPoint(7, 8), PointerButton.Left, [ModifierKey.Shift], signal);
    await backend.input.scrollAsync(TARGET, new DesktopPoint(9, 10), new ScrollAmount(-1, 3), [ModifierKey.Alt], signal);
    await backend.input.typeTextAsync(TARGET, "Hello", signal);
    await backend.input.pressKeyAsync(TARGET, KeyName.Enter, [ModifierKey.Meta], signal);

    assert.deepEqual(api.calls, [
      ...glide(new DesktopPoint(1, 2), [new DesktopPoint(1, 2)]),
      { name: "movePointer", arguments: [TARGET_JSON, 1, 2, 7] },
      ...glide(new DesktopPoint(3, 4), [new DesktopPoint(3, 4)]),
      { name: "click", arguments: [TARGET_JSON, 3, 4, "Right", 2, ["Control", "Shift"], 7] },
      ...glide(new DesktopPoint(5, 6), [new DesktopPoint(5, 6), new DesktopPoint(7, 8)]),
      { name: "drag", arguments: [TARGET_JSON, 5, 6, 7, 8, WindowsBackendHarness.stepsOf(new DesktopPoint(5, 6), new DesktopPoint(7, 8)), "Left", ["Shift"], new Int32Array(new SharedArrayBuffer(4)), 7] },
      ...glide(new DesktopPoint(9, 10), [new DesktopPoint(9, 10)]),
      { name: "scroll", arguments: [TARGET_JSON, 9, 10, -1, 3, ["Alt"], 7] },
      { name: "typeText", arguments: [TARGET_JSON, "Hello", 500] },
      { name: "pressKey", arguments: [TARGET_JSON, "Enter", ["Meta"], 500] }
    ]);
  });

  it("sends no glide when the pointer is already at the point, nor when Windows can't read the pointer", async () => {
    const { api, backend } = WindowsBackendHarness.start();
    const signal = HangGuard.signal();
    api.pointer = { x: 3, y: 4 };

    await backend.input.clickAsync(TARGET, new DesktopPoint(3, 4), PointerButton.Left, ClickCount.Single, [], signal);
    api.readPointer = () => {
      throw WindowsBackendHarness.addonFailure("Windows couldn't read where the pointer is.");
    };
    await backend.input.scrollAsync(TARGET, new DesktopPoint(9, 10), new ScrollAmount(0, 1), [], signal);

    assert.deepEqual(api.calls.map(t => t.name), ["readPhysicalCount", "readPointer", "click", "readPhysicalCount", "scroll"]);
  });

  it("fails the pointer's read as the backend's own failure when the pointer Windows reads isn't a point, and sends an input without a glide", async () => {
    const { api, backend } = WindowsBackendHarness.start();
    const pointer = { x: 0.5, y: 4 };
    api.pointer = pointer;

    await assert.rejects(backend.input.readPointerAsync(HangGuard.signal()), BackendAnswerInvalidException);
    await assert.rejects(backend.input.readPointerAsync(HangGuard.signal()), (error: unknown) => error instanceof BackendAnswerInvalidException && error.answer === "readPointer"
      && error.value === pointer && error.cause instanceof ArgumentOutOfRangeException && error.cause.parameterName === "x");
    await backend.input.clickAsync(TARGET, new DesktopPoint(3, 4), PointerButton.Left, ClickCount.Single, [], HangGuard.signal());
    assert.deepEqual(api.calls.map(t => t.name), ["readPointer", "readPointer", "readPhysicalCount", "readPointer", "click"]);
  });

  for (const reason of [RefusalReason.OtherWindowAtPoint, RefusalReason.PhysicalInput])
    it(`sends nothing after a glide stopped by ${reason.value}, throwing its refusal with no input sent`, async () => {
      const { api, backend } = WindowsBackendHarness.start();
      const signal = HangGuard.signal();
      const sends = [
        () => backend.input.movePointerAsync(TARGET, new DesktopPoint(1, 2), signal),
        () => backend.input.clickAsync(TARGET, new DesktopPoint(1, 2), PointerButton.Left, ClickCount.Single, [], signal),
        () => backend.input.dragAsync(TARGET, new DesktopPoint(1, 2), new DesktopPoint(3, 4), PointerButton.Left, [], signal),
        () => backend.input.scrollAsync(TARGET, new DesktopPoint(1, 2), new ScrollAmount(0, 1), [], signal)
      ];
      api.glideOutcome = { status: "refused", reason: reason.value, inputSent: false };

      for (const sendAsync of sends)
        await assert.rejects(sendAsync(), (error: unknown) => {
          assert.ok(error instanceof RefusalException);
          assert.equal(error.reason, reason);
          assert.equal(error.isInputSent, false);

          return true;
        });
      assert.deepEqual([...new Set(api.calls.map(t => t.name))], ["readPhysicalCount", "readPointer", "glidePointer"]);
    });

  it("glides on its own with the person's input count read as the glide began", async () => {
    const { api, backend } = WindowsBackendHarness.start();
    const to = new DesktopPoint(3, 4);
    api.physicalCount = 5;

    await backend.input.glidePointerAsync(TARGET, to, [to], HangGuard.signal());

    assert.deepEqual(api.calls, [
      { name: "readPhysicalCount", arguments: [] },
      { name: "readPointer", arguments: [] },
      { name: "glidePointer", arguments: [TARGET_JSON, WindowsBackendHarness.stepsOf(new DesktopPoint(0, 0), to), [{ x: 3, y: 4 }], 5] }
    ]);
  });

  it("passes the count read as a pointer action began to its input, not one read after the glide, so the person's input during the action refuses the input", async () => {
    const { api, backend } = WindowsBackendHarness.start();
    const signal = HangGuard.signal();
    const sends = [
      () => backend.input.movePointerAsync(TARGET, new DesktopPoint(1, 2), signal),
      () => backend.input.clickAsync(TARGET, new DesktopPoint(1, 2), PointerButton.Left, ClickCount.Single, [], signal),
      () => backend.input.dragAsync(TARGET, new DesktopPoint(1, 2), new DesktopPoint(3, 4), PointerButton.Left, [], signal),
      () => backend.input.scrollAsync(TARGET, new DesktopPoint(1, 2), new ScrollAmount(0, 1), [], signal)
    ];
    const glideAsync = api.glidePointer.bind(api);
    api.glidePointer = async (...values) => {
      api.physicalCount += 1;

      return await glideAsync(...values);
    };

    for (const sendAsync of sends)
      await sendAsync();

    assert.deepEqual(api.calls.filter(t => t.name !== "readPointer" && t.name !== "readPhysicalCount").map(t => [t.name, t.arguments.at(-1)]), [
      ["glidePointer", 0], ["movePointer", 0], ["glidePointer", 1], ["click", 1], ["glidePointer", 2], ["drag", 2], ["glidePointer", 3], ["scroll", 3]
    ]);
  });

  it("sends nothing after a glide during which the call ended", async () => {
    const { api, backend } = WindowsBackendHarness.start();
    const controller = new AbortController();
    api.glidePointer = async () => {
      controller.abort();

      return { status: "done" };
    };

    await assert.rejects(backend.input.clickAsync(TARGET, new DesktopPoint(1, 2), PointerButton.Left, ClickCount.Single, [], controller.signal), { name: "AbortError" });
    assert.deepEqual(api.named("click"), []);
  });

  it("stops a pressed drag through its flag when the call ends during it, letting the call fail by what was sent", async () => {
    const { api, backend } = WindowsBackendHarness.start();
    const controller = new AbortController();
    let flags: number[] = [];
    api.drag = async (...values) => {
      const stop = values[8];
      flags = [Atomics.load(stop, 0)];
      controller.abort();
      flags.push(Atomics.load(stop, 0));

      return { status: "stopped", inputSent: true };
    };

    await backend.input.dragAsync(TARGET, new DesktopPoint(1, 2), new DesktopPoint(3, 4), PointerButton.Left, [], controller.signal);

    assert.deepEqual(flags, [0, 1]);
    assert.equal(controller.signal.aborted, true);
  });

  it("throws the call's end for a drag its flag stopped before the press, with no input sent", async () => {
    const { api, backend } = WindowsBackendHarness.start();
    const controller = new AbortController();
    api.drag = async () => {
      controller.abort();

      return { status: "stopped", inputSent: false };
    };

    await assert.rejects(backend.input.dragAsync(TARGET, new DesktopPoint(1, 2), new DesktopPoint(3, 4), PointerButton.Left, [], controller.signal), { name: "AbortError" });
  });

  it("leaves a finished drag's flag alone when the call ends after it", async () => {
    const { api, backend } = WindowsBackendHarness.start();
    const controller = new AbortController();
    const stops: Int32Array[] = [];
    api.drag = async (...values) => {
      stops.push(values[8]);

      return { status: "done" };
    };

    await backend.input.dragAsync(TARGET, new DesktopPoint(1, 2), new DesktopPoint(3, 4), PointerButton.Left, [], controller.signal);
    controller.abort();

    const [stop] = stops;
    assert.ok(stop !== undefined && stop.buffer instanceof SharedArrayBuffer);
    assert.equal(Atomics.load(stop, 0), 0);
  });

  it("throws the addon's refusal with its reason and whether input was already sent", async () => {
    const { api, backend } = WindowsBackendHarness.start();
    const signal = HangGuard.signal();
    const sends = [
      () => backend.input.movePointerAsync(TARGET, new DesktopPoint(1, 2), signal),
      () => backend.input.clickAsync(TARGET, new DesktopPoint(1, 2), PointerButton.Left, ClickCount.Single, [], signal),
      () => backend.input.dragAsync(TARGET, new DesktopPoint(1, 2), new DesktopPoint(3, 4), PointerButton.Left, [], signal),
      () => backend.input.scrollAsync(TARGET, new DesktopPoint(1, 2), new ScrollAmount(0, 1), [], signal),
      () => backend.input.typeTextAsync(TARGET, "a", signal),
      () => backend.input.pressKeyAsync(TARGET, KeyName.Tab, [], signal)
    ];

    for (const [index, sendAsync] of sends.entries()) {
      const isInputSent = index % 2 === 0;
      api.outcome = isInputSent ? { status: "refused", reason: "ForegroundChanged", inputSent: true } : { status: "refused", reason: "NotForeground" };
      await assert.rejects(sendAsync(), (error: unknown) => {
        assert.ok(error instanceof RefusalException);
        assert.equal(error.reason, isInputSent ? RefusalReason.ForegroundChanged : RefusalReason.NotForeground);
        assert.equal(error.isInputSent, isInputSent);

        return true;
      });
    }
  });

  it("fails on a refusal without a reason it knows", async () => {
    const { api, backend } = WindowsBackendHarness.start();
    api.outcome = { status: "refused" };

    await assert.rejects(backend.input.movePointerAsync(TARGET, new DesktopPoint(1, 2), HangGuard.signal()), RefusalReasonUnknownException);
    await assert.rejects(backend.input.movePointerAsync(TARGET, new DesktopPoint(1, 2), HangGuard.signal()), { message: "\"\" is not a refusal reason.", value: "" });
  });

  it("types a chunk of 1 to its longest length, and refuses others before sending", async () => {
    const { api, backend } = WindowsBackendHarness.start();
    const longest = "a".repeat(backend.input.maxTextChunkLength);

    await backend.input.typeTextAsync(TARGET, longest, HangGuard.signal());
    await assert.rejects(backend.input.typeTextAsync(TARGET, "", HangGuard.signal()), ArgumentOutOfRangeException);
    await assert.rejects(backend.input.typeTextAsync(TARGET, "", HangGuard.signal()), {
      message: "A text chunk holds from 1 to 256 UTF-16 code units, not 0. (Parameter 'chunk')",
      parameterName: "chunk",
      actualValue: 0
    });
    await assert.rejects(backend.input.typeTextAsync(TARGET, `${longest}a`, HangGuard.signal()), ArgumentOutOfRangeException);
    await assert.rejects(backend.input.typeTextAsync(TARGET, `${longest}a`, HangGuard.signal()), {
      message: "A text chunk holds from 1 to 256 UTF-16 code units, not 257. (Parameter 'chunk')",
      parameterName: "chunk",
      actualValue: 257
    });
    assert.deepEqual(api.named("typeText"), [[TARGET_JSON, longest, 500]]);
  });

  it("names the combinations Windows handles: any with the Windows key, and switching, closing and its system menus", () => {
    const { backend } = WindowsBackendHarness.start();
    const { Alt, Control, Meta, Shift } = ModifierKey;
    const system = [
      [KeyName.D, [Meta]],
      [KeyName.L, [Shift, Meta]],
      [KeyName.Tab, [Alt]],
      [KeyName.Tab, [Shift, Alt]],
      [KeyName.Tab, [Control, Alt]],
      [KeyName.Tab, [Control, Alt, Shift]],
      [KeyName.Escape, [Alt]],
      [KeyName.Escape, [Alt, Shift]],
      [KeyName.F4, [Alt]],
      [KeyName.Space, [Alt]],
      [KeyName.Escape, [Control]],
      [KeyName.Escape, [Shift, Control]],
      [KeyName.Delete, [Alt, Control]]
    ] as const;
    const app = [
      [KeyName.Tab, []],
      [KeyName.Tab, [Control]],
      [KeyName.Tab, [Control, Shift]],
      [KeyName.F4, [Control]],
      [KeyName.Escape, []],
      [KeyName.Delete, [Control]],
      [KeyName.S, [Control, Shift]]
    ] as const;

    assert.deepEqual(system.filter(([key, modifiers]) => !backend.input.isSystemCombination(key, modifiers)), []);
    assert.deepEqual(app.filter(([key, modifiers]) => backend.input.isSystemCombination(key, modifiers)), []);
  });
});
