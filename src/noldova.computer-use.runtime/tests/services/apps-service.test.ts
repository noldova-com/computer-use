/**
 * @license
 * Copyright (c) Noldova.
 *
 * This source code is licensed under the license found in the
 * LICENSE file in the root directory of this source tree.
 */

import assert from "node:assert/strict";
import { beforeEach, describe, it } from "node:test";

import { AppDescription, AppIdentity, AppsService } from "@noldova/computer-use.runtime";

import { AppBackendDouble } from "../doubles/app-backend-double.fixture.ts";
import { BackendFailureException } from "../doubles/backend-failure.fixture.ts";
import { HangGuard } from "./hang-guard.fixture.ts";

const NOTES = AppIdentity.ofMacBundleId("com.example.notes");
const DESCRIPTION = new AppDescription(NOTES, "Notes", "Example Corp", new Uint8Array([1, 2, 3]));
const TIME_LIMIT_MS = 5000;

function start(failure?: unknown): AppBackendDouble {
  const backend = new AppBackendDouble([], failure);
  backend.descriptions = new Map([[NOTES.id, DESCRIPTION]]);

  return backend;
}

describe("the apps service", () => {
  let written: string[] = [];

  beforeEach(() => {
    written = [];
  });

  it("describes the app with its icon at 64 pixels a side", async () => {
    const backend = start();

    const description = await new AppsService(() => backend, line => written.push(line)).describeAsync(NOTES.id, HangGuard.signal());

    assert.equal(description, DESCRIPTION);
    assert.deepEqual(backend.described, [{ identity: "com.example.notes", iconSize: 64 }]);
    assert.equal(AppsService.iconSize, 64);
    assert.deepEqual(written, []);
  });

  it("gives null for an app the backend doesn't know", async () => {
    const backend = start();
    const description = await new AppsService(() => backend, line => written.push(line)).describeAsync("com.example.maps", HangGuard.signal());

    assert.equal(description, null);
    assert.deepEqual(written, []);
  });

  it("gives null for a blank identity, which names no app, without asking the backend", async () => {
    const backend = start();

    assert.equal(await new AppsService(() => backend, line => written.push(line)).describeAsync(" ", HangGuard.signal()), null);
    assert.deepEqual(backend.described, []);
  });

  it("gives null while computer use is off, with no backend", async () => {
    assert.equal(await new AppsService(() => null, line => written.push(line)).describeAsync(NOTES.id, HangGuard.signal()), null);
  });

  it("gives null when the backend fails", async () => {
    const backend = start(new BackendFailureException("describeApp"));

    assert.equal(await new AppsService(() => backend, line => written.push(line)).describeAsync(NOTES.id, HangGuard.signal()), null);
    assert.deepEqual(written, ["Describing an app failed with BackendFailureException, so the apps service answered that it has no description."]);
  });

  it("rejects with a failure that isn't the backend's own", async () => {
    const defect = new TypeError("A defect in the module.");
    const backend = start(defect);

    await assert.rejects(new AppsService(() => backend, line => written.push(line)).describeAsync(NOTES.id, HangGuard.signal()), (error: unknown) => error === defect);
  });

  it("gives null at its time limit, not before, and ends the backend's read through its signal", async t => {
    t.mock.timers.enable({ apis: ["setTimeout"] });
    const backend = start();
    backend.describeWait = new Promise(() => undefined);
    const reached = backend.nextDescribedAsync();

    const describing = new AppsService(() => backend, line => written.push(line)).describeAsync(NOTES.id, HangGuard.signal());
    await reached;
    t.mock.timers.tick(TIME_LIMIT_MS - 1);
    const abortedBefore = backend.signals[0]?.aborted;
    t.mock.timers.tick(1);

    assert.equal(await describing, null);
    assert.deepEqual([abortedBefore, backend.signals[0]?.aborted], [false, true]);
    assert.deepEqual(written, ["Describing an app passed its time limit of 5 seconds, so the apps service answered that it has no description."]);
  });

  it("rejects with the caller's reason when the caller ends the call during the read", async () => {
    const backend = start();
    const controller = new AbortController();
    const { promise: wait, resolve: release } = Promise.withResolvers<void>();
    backend.describeWait = wait;
    const reason = new Error("the caller left");
    const reached = backend.nextDescribedAsync();

    const describing = new AppsService(() => backend, line => written.push(line)).describeAsync(NOTES.id, controller.signal);
    await reached;
    controller.abort(reason);

    await assert.rejects(describing, reason);
    assert.equal(backend.signals[0]?.aborted, true);
    release();
  });

  it("describes one app at a time, in the order asked, the next only once the read before it ends", async () => {
    const backend = start();
    const { promise: wait, resolve: release } = Promise.withResolvers<void>();
    backend.describeWait = wait;
    const service = new AppsService(() => backend, line => written.push(line));
    let isReleased = false;
    const firstReached = backend.nextDescribedAsync();

    const first = service.describeAsync(NOTES.id, HangGuard.signal());
    const second = service.describeAsync("com.example.maps", HangGuard.signal());
    await firstReached;
    const secondReached = backend.nextDescribedAsync().then(() => isReleased);
    isReleased = true;
    release();

    assert.deepEqual([await first, await second, await secondReached], [DESCRIPTION, null, true]);
    assert.deepEqual(backend.described.map(t => t.identity), ["com.example.notes", "com.example.maps"]);
  });

  it("rejects a waiting call its caller ends at once, and never asks the backend for it", async () => {
    const backend = start();
    const { promise: wait, resolve: release } = Promise.withResolvers<void>();
    backend.describeWait = wait;
    const service = new AppsService(() => backend, line => written.push(line));
    const controller = new AbortController();
    const reason = new Error("the caller left");

    const first = service.describeAsync(NOTES.id, HangGuard.signal());
    const waiting = service.describeAsync("com.example.maps", controller.signal);
    controller.abort(reason);

    await assert.rejects(waiting, reason);
    release();
    assert.equal(await first, DESCRIPTION);
    assert.equal(await service.describeAsync(NOTES.id, HangGuard.signal()), DESCRIPTION);
    assert.deepEqual(backend.described.map(t => t.identity), ["com.example.notes", "com.example.notes"]);
  });

  it("gives null for a waiting call when computer use is off by its turn", async () => {
    const backend = start();
    const { promise: wait, resolve: release } = Promise.withResolvers<void>();
    backend.describeWait = wait;
    let current: AppBackendDouble | null = backend;
    const service = new AppsService(() => current, line => written.push(line));
    const reached = backend.nextDescribedAsync();

    const first = service.describeAsync(NOTES.id, HangGuard.signal());
    const waiting = service.describeAsync(NOTES.id, HangGuard.signal());
    await reached;
    current = null;
    release();

    assert.deepEqual([await first, await waiting], [DESCRIPTION, null]);
    assert.equal(backend.described.length, 1);
  });

  it("holds the next call until the backend's read ends, even after the caller's answer came at the time limit", async t => {
    t.mock.timers.enable({ apis: ["setTimeout"] });
    const backend = start();
    const { promise: wait, resolve: release } = Promise.withResolvers<void>();
    backend.describeWait = wait;
    const service = new AppsService(() => backend, line => written.push(line));
    const firstReached = backend.nextDescribedAsync();

    const describing = service.describeAsync("com.example.maps", HangGuard.signal());
    await firstReached;
    t.mock.timers.tick(TIME_LIMIT_MS);
    const first = await describing;
    backend.describeWait = null;
    let isReleased = false;
    const secondReached = backend.nextDescribedAsync().then(() => isReleased);
    const second = service.describeAsync(NOTES.id, HangGuard.signal());
    isReleased = true;
    release();

    assert.deepEqual([first, await second, await secondReached], [null, DESCRIPTION, true]);
    assert.deepEqual(backend.described.map(t => t.identity), ["com.example.maps", "com.example.notes"]);
  });

  it("starts each call's time limit at its turn, not while it waits", async t => {
    t.mock.timers.enable({ apis: ["setTimeout"] });
    const backend = start();
    const { promise: wait, resolve: release } = Promise.withResolvers<void>();
    backend.describeWait = wait;
    const service = new AppsService(() => backend, line => written.push(line));
    const firstReached = backend.nextDescribedAsync();

    const first = service.describeAsync("com.example.maps", HangGuard.signal());
    await firstReached;
    backend.describeWait = null;
    const second = service.describeAsync(NOTES.id, HangGuard.signal());
    t.mock.timers.tick(TIME_LIMIT_MS);
    assert.equal(await first, null);
    t.mock.timers.tick(TIME_LIMIT_MS);
    release();

    assert.equal(await second, DESCRIPTION);
    assert.deepEqual(backend.signals.map(t => t.aborted), [true, false]);
  });

  it("asks nothing of the backend once the call has ended", async () => {
    const backend = start();

    await assert.rejects(new AppsService(() => backend, line => written.push(line)).describeAsync(NOTES.id, AbortSignal.abort()), { name: "AbortError" });
    assert.deepEqual(backend.described, []);
  });
});
