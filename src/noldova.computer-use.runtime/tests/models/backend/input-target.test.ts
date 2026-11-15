/**
 * @license
 * Copyright (c) Noldova.
 *
 * This source code is licensed under the license found in the
 * LICENSE file in the root directory of this source tree.
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { AppIdentity, InputTarget } from "@noldova/computer-use.runtime";
import { ArgumentOutOfRangeException } from "@noldova/context.exceptions";

describe("InputTarget", () => {
  const app = new AppIdentity("com.example.sample");

  it("holds the app, the window and the process an input may touch", () => {
    const target = new InputTarget(app, "264190", 4120);

    assert.equal(target.app, app);
    assert.equal(target.windowId, "264190");
    assert.equal(target.processId, 4120);
  });

  for (const windowId of ["", "0", "0x1F", "12a", "-4"])
    it(`refuses the window ID "${windowId}"`, () => {
      assert.throws(() => new InputTarget(app, windowId, 1), ArgumentOutOfRangeException);
      assert.throws(() => new InputTarget(app, windowId, 1), { name: "ArgumentOutOfRangeException", message: `The window ID "${windowId}" must be a decimal number above zero. (Parameter 'windowId')` });
    });

  for (const processId of [0, -1, 1.5, Number.NaN])
    it(`refuses the process ID ${processId}`, () => {
      assert.throws(() => new InputTarget(app, "1", processId), ArgumentOutOfRangeException);
      assert.throws(() => new InputTarget(app, "1", processId), { message: `A process ID must be a whole number above zero, not ${processId}. (Parameter 'processId')` });
    });
});
