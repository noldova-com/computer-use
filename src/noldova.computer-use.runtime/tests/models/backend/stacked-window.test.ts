/**
 * @license
 * Copyright (c) Noldova.
 *
 * This source code is licensed under the license found in the
 * LICENSE file in the root directory of this source tree.
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { AppIdentity, DesktopRect, StackedWindow } from "@noldova/computer-use.runtime";
import { ArgumentOutOfRangeException } from "@noldova/context.exceptions";

describe("StackedWindow", () => {
  const frame = new DesktopRect(-10, 20, 800, 600);

  it("holds the window's app, or none, its ID and its frame", () => {
    const app = AppIdentity.ofMacBundleId("com.example.notes");
    const window = new StackedWindow(app, "100", frame);
    const ownerless = new StackedWindow(null, "7", frame);

    assert.deepEqual([window.app, window.windowId, window.frame], [app, "100", frame]);
    assert.equal(ownerless.app, null);
  });

  for (const windowId of ["0", "0x64", "-1", "", "12a", "1.5"])
    it(`refuses the window ID "${windowId}", which isn't a decimal number above zero`, () => {
      assert.throws(() => new StackedWindow(null, windowId, frame), ArgumentOutOfRangeException);
      assert.throws(() => new StackedWindow(null, windowId, frame), {
        message: `The window ID "${windowId}" must be a decimal number above zero. (Parameter 'windowId')`,
        parameterName: "windowId"
      });
    });
});
