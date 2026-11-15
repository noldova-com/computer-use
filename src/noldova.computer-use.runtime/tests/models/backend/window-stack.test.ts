/**
 * @license
 * Copyright (c) Noldova.
 *
 * This source code is licensed under the license found in the
 * LICENSE file in the root directory of this source tree.
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { AppIdentity, DesktopRect, StackedWindow, WindowStack } from "@noldova/computer-use.runtime";

describe("WindowStack", () => {
  it("holds its windows from the front, each with its app or none and its ID, and whether it is complete", () => {
    const front = new StackedWindow(new AppIdentity("com.example.notes"), "4242", new DesktopRect(0, 25, 800, 600));
    const back = new StackedWindow(null, "7", new DesktopRect(-1920, 0, 1920, 1080));
    const windows = [front, back];

    const stack = new WindowStack(false, windows);

    assert.equal(stack.isComplete, false);
    assert.equal(stack.windows, windows);
    assert.equal(front.app?.id, "com.example.notes");
    assert.equal(front.windowId, "4242");
    assert.deepEqual(front.frame, new DesktopRect(0, 25, 800, 600));
    assert.equal(back.app, null);
  });
});
