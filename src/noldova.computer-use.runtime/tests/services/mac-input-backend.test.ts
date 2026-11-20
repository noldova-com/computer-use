/**
 * @license
 * Copyright (c) Noldova.
 *
 * This source code is licensed under the license found in the
 * LICENSE file in the root directory of this source tree.
 */

import assert from "node:assert/strict";
import fs from "node:fs";
import fsPromises from "node:fs/promises";
import path from "node:path";
import { after, describe, it } from "node:test";

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
import { MacStopFolderFailedException } from "@noldova/computer-use.runtime/macos";
import { ArgumentOutOfRangeException } from "@noldova/context.exceptions";

import { HangGuard } from "./hang-guard.fixture.ts";
import { MacBackendHarness } from "./mac-backend-harness.fixture.ts";

const TARGET = MacBackendHarness.target;
const TARGET_JSON = MacBackendHarness.targetJson;
const STOP_FOLDER = MacBackendHarness.stopFolder;

after(() => {
  MacBackendHarness.removeStops();
});

describe("the macOS backend's input", () => {
  it("reads where the pointer is, rounded to whole points", async () => {
    const { channel, backend } = MacBackendHarness.start();
    channel.answers.set("readPointer", { x: -1439.5, y: 40.4 });

    assert.deepEqual(await backend.input.readPointerAsync(HangGuard.signal()), new DesktopPoint(-1439, 40));
    assert.deepEqual(channel.calls, [{ method: "readPointer", parameters: {} }]);
  });

  it("glides to each pointer input's point from where the pointer is, then sends each kind of input to its target with its points, button, keys and modifiers", async () => {
    const { channel, backend } = MacBackendHarness.start();
    const signal = HangGuard.signal();
    const origin = new DesktopPoint(0, 0);
    const glide = (to: DesktopPoint, points: readonly DesktopPoint[]): readonly { readonly method: string; readonly parameters: object }[] => [
      { method: "readPointer", parameters: {} },
      { method: "glidePointer", parameters: { target: TARGET_JSON, steps: MacBackendHarness.stepsOf(origin, to), points: points.map(t => ({ x: t.x, y: t.y })), watched: false } }
    ];

    await backend.input.movePointerAsync(TARGET, new DesktopPoint(1, 2), signal);
    await backend.input.clickAsync(TARGET, new DesktopPoint(3, 4), PointerButton.Right, ClickCount.Double, [ModifierKey.Shift, ModifierKey.Meta], signal);
    await backend.input.dragAsync(TARGET, new DesktopPoint(5, 6), new DesktopPoint(7, 8), PointerButton.Left, [ModifierKey.Alt], signal);
    await backend.input.scrollAsync(TARGET, new DesktopPoint(9, 10), new ScrollAmount(-1, 3), [ModifierKey.Control], signal);
    await backend.input.typeTextAsync(TARGET, "héllo 😀", signal);
    await backend.input.pressKeyAsync(TARGET, KeyName.Tab, [ModifierKey.Shift], signal);

    const drag = channel.named("drag")[0];
    const stopPath = drag !== undefined && "stopPath" in drag && typeof drag.stopPath === "string" ? drag.stopPath : "";
    assert.equal(path.dirname(stopPath), STOP_FOLDER);
    assert.deepEqual(channel.calls, [
      ...glide(new DesktopPoint(1, 2), [new DesktopPoint(1, 2)]),
      { method: "movePointer", parameters: { target: TARGET_JSON, x: 1, y: 2, watched: false } },
      ...glide(new DesktopPoint(3, 4), [new DesktopPoint(3, 4)]),
      { method: "click", parameters: { target: TARGET_JSON, x: 3, y: 4, button: "Right", count: 2, modifiers: ["Shift", "Meta"], watched: false } },
      ...glide(new DesktopPoint(5, 6), [new DesktopPoint(5, 6), new DesktopPoint(7, 8)]),
      {
        method: "drag",
        parameters: {
          target: TARGET_JSON,
          fromX: 5,
          fromY: 6,
          toX: 7,
          toY: 8,
          steps: MacBackendHarness.stepsOf(new DesktopPoint(5, 6), new DesktopPoint(7, 8)),
          button: "Left",
          modifiers: ["Alt"],
          stopPath,
          watched: false
        }
      },
      ...glide(new DesktopPoint(9, 10), [new DesktopPoint(9, 10)]),
      { method: "scroll", parameters: { target: TARGET_JSON, x: 9, y: 10, deltaX: -1, deltaY: 3, modifiers: ["Control"], watched: false } },
      { method: "typeText", parameters: { target: TARGET_JSON, text: "héllo 😀", watched: false } },
      { method: "pressKey", parameters: { target: TARGET_JSON, key: "Tab", modifiers: ["Shift"], watched: false } }
    ]);
  });

  it("stops a pressed drag through its file when the call ends during it, letting the call fail by what was sent, and removes the file", t => {
    const writes: Promise<void>[] = [];
    const write = fsPromises.writeFile;

    return MacBackendHarness.withBuiltinAsync(t,
      () => t.mock.method(fsPromises, "writeFile", (file: string, data: string, options: Parameters<typeof fsPromises.writeFile>[2]): Promise<void> => {
        const writing = write(file, data, options);
        writes.push(writing);

        return writing;
      }),
      async () => {
        const { channel, backend } = MacBackendHarness.start();
        const controller = new AbortController();
        const seen: boolean[] = [];
        let stopPath = "";
        channel.answers.setBy("drag", async parameters => {
          stopPath = String(parameters.get("stopPath"));
          seen.push(fs.existsSync(stopPath));
          controller.abort();
          await Promise.all(writes);
          seen.push(fs.existsSync(stopPath));

          return { status: "stopped", inputSent: true };
        });

        await backend.input.dragAsync(TARGET, new DesktopPoint(1, 2), new DesktopPoint(3, 4), PointerButton.Left, [], controller.signal);

        assert.deepEqual([seen, writes.length], [[false, true], 1]);
        assert.equal(path.dirname(stopPath), STOP_FOLDER);
        assert.equal(fs.existsSync(stopPath), false);
      });
  });

  it("throws the call's end for a drag its file stopped before the press, with no input sent", async () => {
    const { channel, backend } = MacBackendHarness.start();
    const controller = new AbortController();
    channel.answers.setBy("drag", () => {
      controller.abort();

      return { status: "stopped", inputSent: false };
    });

    await assert.rejects(backend.input.dragAsync(TARGET, new DesktopPoint(1, 2), new DesktopPoint(3, 4), PointerButton.Left, [], controller.signal), { name: "AbortError" });
  });

  it("logs a stop file the system can't write, and leaves the drag to end at its end point", async () => {
    const { channel, backend, written } = MacBackendHarness.start();
    const controller = new AbortController();
    channel.answers.setBy("drag", () => {
      fs.rmSync(STOP_FOLDER, { recursive: true, force: true });
      controller.abort();

      return { status: "done" };
    });

    await backend.input.dragAsync(TARGET, new DesktopPoint(1, 2), new DesktopPoint(3, 4), PointerButton.Left, [], controller.signal);

    assert.equal(fs.existsSync(STOP_FOLDER), false);
    assert.equal(written.length, 1);
    assert.match(written[0] ?? "", /^A drag's stop file couldn't be written: Error: ENOENT/u);
  });

  it("fails a drag, starting none, when the stop files' folder can't be prepared, with the system's error as the cause", async () => {
    const { channel, backend } = MacBackendHarness.start();
    fs.rmSync(STOP_FOLDER, { recursive: true, force: true });
    fs.writeFileSync(STOP_FOLDER, "");
    try {
      const dragging = backend.input.dragAsync(TARGET, new DesktopPoint(1, 2), new DesktopPoint(3, 4), PointerButton.Left, [], HangGuard.signal());

      await assert.rejects(dragging, MacStopFolderFailedException);
      await assert.rejects(dragging, (error: unknown) => error instanceof MacStopFolderFailedException && error.folder === STOP_FOLDER && error.cause instanceof Error && "syscall" in error.cause);
      assert.deepEqual(channel.named("drag"), []);
    } finally {
      fs.rmSync(STOP_FOLDER, { force: true });
    }
  });

  it("passes on a failure preparing the stop files' folder that isn't the system's", t => MacBackendHarness.withBuiltinAsync(t,
    () => t.mock.method(fsPromises, "mkdir", () => Promise.reject(new TypeError("A defect in the module."))),
    async () => {
      const { channel, backend } = MacBackendHarness.start();

      await assert.rejects(backend.input.dragAsync(TARGET, new DesktopPoint(1, 2), new DesktopPoint(3, 4), PointerButton.Left, [], HangGuard.signal()), {
        name: "TypeError",
        message: "A defect in the module."
      });
      assert.deepEqual(channel.named("drag"), []);
    }));

  it("writes to the module's log a stop file the module fails to write, and leaves the drag to end at its end point", t => MacBackendHarness.withBuiltinAsync(t,
    () => t.mock.method(fsPromises, "writeFile", () => Promise.reject(new Error("The write broke."))),
    async () => {
      const { channel, backend, written } = MacBackendHarness.start();
      const controller = new AbortController();
      channel.answers.setBy("drag", () => {
        controller.abort();

        return { status: "done" };
      });

      await backend.input.dragAsync(TARGET, new DesktopPoint(1, 2), new DesktopPoint(3, 4), PointerButton.Left, [], controller.signal);

      assert.deepEqual(written, ["A drag's stop file couldn't be written: Error: The write broke."]);
    }));

  it("fails a drag whose stop file the module fails to remove", t => MacBackendHarness.withBuiltinAsync(t,
    () => t.mock.method(fsPromises, "rm", () => Promise.reject(new Error("The removal broke."))),
    async () => {
      const { backend } = MacBackendHarness.start();

      await assert.rejects(backend.input.dragAsync(TARGET, new DesktopPoint(1, 2), new DesktopPoint(3, 4), PointerButton.Left, [], HangGuard.signal()), {
        message: "The removal broke."
      });
    }));

  it("names a new stop file for each drag, of every backend, and writes none when the call ends after the drag", async () => {
    const first = MacBackendHarness.start();
    const second = MacBackendHarness.start();
    const controller = new AbortController();

    await first.backend.input.dragAsync(TARGET, new DesktopPoint(1, 2), new DesktopPoint(3, 4), PointerButton.Left, [], controller.signal);
    await first.backend.input.dragAsync(TARGET, new DesktopPoint(1, 2), new DesktopPoint(3, 4), PointerButton.Left, [], controller.signal);
    await second.backend.input.dragAsync(TARGET, new DesktopPoint(1, 2), new DesktopPoint(3, 4), PointerButton.Left, [], controller.signal);
    controller.abort();

    const paths = [...first.channel.named("drag"), ...second.channel.named("drag")].map(t => ("stopPath" in t && typeof t.stopPath === "string" ? t.stopPath : ""));
    assert.equal(new Set(paths).size, 3);
    assert.deepEqual(paths.map(t => path.dirname(t)), [STOP_FOLDER, STOP_FOLDER, STOP_FOLDER]);
    assert.deepEqual(paths.map(t => fs.existsSync(t)), [false, false, false]);
  });

  it("throws the call's end when it comes while the stop file's folder is prepared, starting no drag", t => {
    const controller = new AbortController();
    const prepare = fsPromises.mkdir;

    return MacBackendHarness.withBuiltinAsync(t,
      () => t.mock.method(fsPromises, "mkdir", async (folder: string, options: Parameters<typeof fsPromises.mkdir>[1]): Promise<string | undefined> => {
        controller.abort();

        return await prepare(folder, options);
      }),
      async () => {
        const { channel, backend } = MacBackendHarness.start();

        await assert.rejects(backend.input.dragAsync(TARGET, new DesktopPoint(1, 2), new DesktopPoint(3, 4), PointerButton.Left, [], controller.signal), { name: "AbortError" });
        assert.deepEqual(channel.named("drag"), []);
      });
  });

  it("answers a drag's outcome when its stop file can't be removed, and logs the file left", async () => {
    const { channel, backend, written } = MacBackendHarness.start();
    let stopPath = "";
    channel.answers.setBy("drag", parameters => {
      stopPath = String(parameters.get("stopPath"));
      fs.mkdirSync(stopPath);

      return { status: "done" };
    });

    await backend.input.dragAsync(TARGET, new DesktopPoint(1, 2), new DesktopPoint(3, 4), PointerButton.Left, [], new AbortController().signal);

    assert.equal(fs.statSync(stopPath).isDirectory(), true);
    assert.equal(written.length, 1);
    assert.match(written[0] ?? "", /^A drag's stop file couldn't be removed: /u);
    fs.rmdirSync(stopPath);
  });

  it("sends no glide when the pointer is already at the point, nor when the process can't read the pointer", async () => {
    const { channel, backend } = MacBackendHarness.start();
    const signal = HangGuard.signal();
    channel.answers.set("readPointer", { x: 3.2, y: 3.6 });

    await backend.input.clickAsync(TARGET, new DesktopPoint(3, 4), PointerButton.Left, ClickCount.Single, [], signal);
    channel.failures.add("readPointer");
    await backend.input.scrollAsync(TARGET, new DesktopPoint(9, 10), new ScrollAmount(0, 1), [], signal);

    assert.deepEqual(channel.calls.map(t => t.method), ["readPointer", "click", "readPointer", "scroll"]);
  });

  it("fails the pointer's read as the backend's own failure when the pointer the process reads isn't a point, and sends an input without a glide", async () => {
    const { channel, backend } = MacBackendHarness.start();
    channel.answers.set("readPointer", { x: Number.NaN, y: 3 });

    await assert.rejects(backend.input.readPointerAsync(HangGuard.signal()), BackendAnswerInvalidException);
    await assert.rejects(backend.input.readPointerAsync(HangGuard.signal()), (error: unknown) => error instanceof BackendAnswerInvalidException && error.answer === "readPointer"
      && error.cause instanceof ArgumentOutOfRangeException && error.cause.parameterName === "x");
    await backend.input.clickAsync(TARGET, new DesktopPoint(3, 4), PointerButton.Left, ClickCount.Single, [], HangGuard.signal());
    assert.deepEqual(channel.calls.map(t => t.method), ["readPointer", "readPointer", "readPointer", "click"]);
  });

  it("sends nothing after a glide a check stopped, refusing the input with no input sent", async () => {
    const { channel, backend } = MacBackendHarness.start();
    const signal = HangGuard.signal();
    const sends = [
      () => backend.input.movePointerAsync(TARGET, new DesktopPoint(1, 2), signal),
      () => backend.input.clickAsync(TARGET, new DesktopPoint(1, 2), PointerButton.Left, ClickCount.Single, [], signal),
      () => backend.input.dragAsync(TARGET, new DesktopPoint(1, 2), new DesktopPoint(3, 4), PointerButton.Left, [], signal),
      () => backend.input.scrollAsync(TARGET, new DesktopPoint(1, 2), new ScrollAmount(0, 1), [], signal)
    ];
    channel.answers.set("glidePointer", { status: "refused", reason: "PhysicalInput", inputSent: false });

    for (const sendAsync of sends)
      await assert.rejects(sendAsync(), (error: unknown) => {
        assert.ok(error instanceof RefusalException);
        assert.equal(error.reason, RefusalReason.PhysicalInput);
        assert.equal(error.isInputSent, false);

        return true;
      });
    assert.deepEqual([...new Set(channel.calls.map(t => t.method))], ["readPointer", "glidePointer"]);
  });

  it("sends nothing after a glide during which the call ended", async () => {
    const { channel, backend } = MacBackendHarness.start();
    const controller = new AbortController();
    channel.answers.setBy("glidePointer", () => {
      controller.abort();

      return { status: "done" };
    });

    await assert.rejects(backend.input.clickAsync(TARGET, new DesktopPoint(1, 2), PointerButton.Left, ClickCount.Single, [], controller.signal), { name: "AbortError" });
    assert.deepEqual(channel.named("click"), []);
  });

  for (const outcome of [
    { status: "refused", reason: "MissingGrant", inputSent: false },
    { status: "refused", reason: "SecureInput" },
    { status: "refused", reason: "PhysicalInput", inputSent: true }
  ])
    it(`refuses the input with the process's reason, ${JSON.stringify(outcome)}`, async () => {
      const { channel, backend } = MacBackendHarness.start();
      channel.outcome = outcome;

      await assert.rejects(backend.input.pressKeyAsync(TARGET, KeyName.A, [], HangGuard.signal()), (error: unknown) => {
        assert.ok(error instanceof RefusalException);
        assert.equal(error.reason.value, outcome.reason);
        assert.equal(error.isInputSent, outcome.inputSent === true);

        return true;
      });
    });

  it("fails on a refusal without a reason it knows", async () => {
    const { channel, backend } = MacBackendHarness.start();
    channel.outcome = { status: "refused" };

    await assert.rejects(backend.input.movePointerAsync(TARGET, new DesktopPoint(1, 2), HangGuard.signal()), RefusalReasonUnknownException);
  });

  it("takes text chunks of 1 to 40 characters, so one call of the input process posts four events at most", async () => {
    const { channel, backend } = MacBackendHarness.start();

    assert.equal(backend.input.maxTextChunkLength, 40);
    await assert.rejects(backend.input.typeTextAsync(TARGET, "", HangGuard.signal()), ArgumentOutOfRangeException);
    await assert.rejects(backend.input.typeTextAsync(TARGET, "a".repeat(41), HangGuard.signal()), ArgumentOutOfRangeException);
    await assert.rejects(backend.input.typeTextAsync(TARGET, "a".repeat(41), HangGuard.signal()), {
      message: "A text chunk holds from 1 to 40 UTF-16 code units, not 41. (Parameter 'chunk')",
      parameterName: "chunk",
      actualValue: 41
    });
    await backend.input.typeTextAsync(TARGET, "a".repeat(40), HangGuard.signal());
    assert.equal(channel.calls.length, 1);
  });

  it("sends nothing once the call has ended", async () => {
    const { channel, backend } = MacBackendHarness.start();
    const signal = AbortSignal.abort();

    await assert.rejects(backend.input.readPointerAsync(signal), { name: "AbortError" });
    await assert.rejects(backend.input.movePointerAsync(TARGET, new DesktopPoint(1, 2), signal), { name: "AbortError" });
    await assert.rejects(backend.input.clickAsync(TARGET, new DesktopPoint(1, 2), PointerButton.Left, ClickCount.Single, [], signal), { name: "AbortError" });
    await assert.rejects(backend.input.dragAsync(TARGET, new DesktopPoint(1, 2), new DesktopPoint(3, 4), PointerButton.Left, [], signal), { name: "AbortError" });
    await assert.rejects(backend.input.scrollAsync(TARGET, new DesktopPoint(1, 2), new ScrollAmount(0, 1), [], signal), { name: "AbortError" });
    await assert.rejects(backend.input.typeTextAsync(TARGET, "a", signal), { name: "AbortError" });
    await assert.rejects(backend.input.pressKeyAsync(TARGET, KeyName.Tab, [], signal), { name: "AbortError" });
    assert.deepEqual(channel.calls, []);
  });

  it("names the combinations macOS handles: switching, Spotlight, quitting, hiding, locking, logging out, screenshots and the Spaces, never every one with Command", () => {
    const { backend } = MacBackendHarness.start();
    const { Alt, Control, Meta, Shift } = ModifierKey;
    const system = [
      [KeyName.Tab, [Meta]],
      [KeyName.Tab, [Shift, Meta]],
      [KeyName.Space, [Meta]],
      [KeyName.Q, [Meta]],
      [KeyName.H, [Meta]],
      [KeyName.Escape, [Alt, Meta]],
      [KeyName.Q, [Meta, Control]],
      [KeyName.Q, [Shift, Meta]],
      [KeyName.Q, [Alt, Shift, Meta]],
      [KeyName.Digit3, [Shift, Meta]],
      [KeyName.Digit4, [Shift, Meta]],
      [KeyName.Digit5, [Shift, Meta]],
      [KeyName.Digit3, [Shift, Control, Meta]],
      [KeyName.Digit4, [Control, Shift, Meta]],
      [KeyName.Space, [Control]],
      [KeyName.D, [Alt, Meta]],
      [KeyName.F11, []],
      [KeyName.Up, [Control]],
      [KeyName.Down, [Control]],
      [KeyName.Left, [Control]],
      [KeyName.Right, [Control]]
    ] as const;
    const app = [
      [KeyName.S, [Meta]],
      [KeyName.S, [Shift, Meta]],
      [KeyName.Q, [Alt, Meta]],
      [KeyName.Space, [Control, Shift]],
      [KeyName.Tab, [Control]],
      [KeyName.Digit3, [Meta]],
      [KeyName.Digit3, [Control, Meta]],
      [KeyName.Digit5, [Control, Shift, Meta]],
      [KeyName.D, [Meta]],
      [KeyName.F11, [Shift]],
      [KeyName.F10, []],
      [KeyName.Up, [Meta]],
      [KeyName.Left, [Control, Shift]],
      [KeyName.Escape, []]
    ] as const;

    assert.deepEqual(system.filter(([key, modifiers]) => !backend.input.isSystemCombination(key, modifiers)), []);
    assert.deepEqual(app.filter(([key, modifiers]) => backend.input.isSystemCombination(key, modifiers)), []);
  });
});
