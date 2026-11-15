/**
 * @license
 * Copyright (c) Noldova.
 *
 * This source code is licensed under the license found in the
 * LICENSE file in the root directory of this source tree.
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { AppIdentity, ControlInfo, ControlRole, ControlTree } from "@noldova/computer-use.runtime";
import { ArgumentException, ArgumentOutOfRangeException } from "@noldova/context.exceptions";

describe("ControlTree", () => {
  const app = AppIdentity.ofWindowsPath("C:/Windows/notepad.exe");
  const top = new ControlInfo("1", null, app, ControlRole.MenuBar, "Application", null, [], null);
  const item = new ControlInfo("2", "1", app, ControlRole.MenuItem, "File", null, [], null);

  it("holds the controls, each after the one it lies in, with what the read left out and whether it ran out of time", () => {
    const controls = [top, item];
    const tree = new ControlTree(controls, 3, true);

    assert.equal(tree.controls, controls);
    assert.equal(tree.leftOut, 3);
    assert.equal(tree.isTimedOut, true);
    assert.equal(new ControlTree([], 0, false).isTimedOut, false);
  });

  for (const leftOut of [-1, 0.5, Number.NaN])
    it(`refuses ${leftOut} controls left out`, () => {
      assert.throws(() => new ControlTree([], leftOut, false), ArgumentOutOfRangeException);
      assert.throws(() => new ControlTree([], leftOut, false), { message: `The controls a read left out must be a whole number from zero, not ${leftOut}. (Parameter 'leftOut')` });
    });

  it("refuses a handle given twice", () => {
    assert.throws(() => new ControlTree([top, item, top], 0, false), ArgumentException);
    assert.throws(() => new ControlTree([top, item, top], 0, false), { name: "ArgumentException", message: "The control 1 is listed twice in one read. (Parameter 'controls')" });
  });

  it("refuses a control before the one it lies in, or under one the read doesn't hold", () => {
    const message = "The control 2 comes before its parent; a read lists each control after the one it lies in. (Parameter 'controls')";

    assert.throws(() => new ControlTree([item, top], 0, false), ArgumentException);
    assert.throws(() => new ControlTree([item, top], 0, false), { name: "ArgumentException", message });
    assert.throws(() => new ControlTree([item], 0, false), ArgumentException);
    assert.throws(() => new ControlTree([item], 0, false), { name: "ArgumentException", message });
  });
});
