/**
 * @license
 * Copyright (c) Noldova.
 *
 * This source code is licensed under the license found in the
 * LICENSE file in the root directory of this source tree.
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { AppIdentity, ControlInfo, ControlRole, ControlState, DesktopRect } from "@noldova/computer-use.runtime";
import { ArgumentException, ArgumentOutOfRangeException } from "@noldova/context.exceptions";

describe("ControlInfo", () => {
  const app = AppIdentity.ofWindowsPath("C:/Windows/notepad.exe");
  const bounds = new DesktopRect(8, 64, 1180, 700);

  it("describes the control as the backend read it", () => {
    const states = [ControlState.Focused];
    const control = new ControlInfo("7", "3", app, ControlRole.Edit, "Text editor", "Dear team,", states, bounds);

    assert.equal(control.handle, "7");
    assert.equal(control.parentHandle, "3");
    assert.equal(control.app, app);
    assert.equal(control.role, ControlRole.Edit);
    assert.equal(control.name, "Text editor");
    assert.equal(control.value, "Dear team,");
    assert.equal(control.states, states);
    assert.equal(control.bounds, bounds);
    assert.equal(control.isSilentContainer, false);
  });

  it("is a silent container only as a group or a pane with no name and no value", () => {
    assert.equal(new ControlInfo("1", null, app, ControlRole.Group, "", null, [], null).isSilentContainer, true);
    assert.equal(new ControlInfo("1", null, app, ControlRole.Pane, "", null, [ControlState.Focused], bounds).isSilentContainer, true);
    assert.equal(new ControlInfo("1", null, app, ControlRole.Group, "Options", null, [], null).isSilentContainer, false);
    assert.equal(new ControlInfo("1", null, app, ControlRole.Pane, "", "", [], null).isSilentContainer, false);
    assert.equal(new ControlInfo("1", null, app, ControlRole.List, "", null, [], null).isSilentContainer, false);
  });

  it("refuses an empty handle or parent", () => {
    assert.throws(() => new ControlInfo("", null, app, ControlRole.Button, "Save", null, [], null), ArgumentOutOfRangeException);
    assert.throws(() => new ControlInfo("", null, app, ControlRole.Button, "Save", null, [], null), { name: "ArgumentOutOfRangeException", parameterName: "handle" });
    assert.throws(() => new ControlInfo("1", "", app, ControlRole.Button, "Save", null, [], null), ArgumentOutOfRangeException);
    assert.throws(() => new ControlInfo("1", "", app, ControlRole.Button, "Save", null, [], null), { name: "ArgumentOutOfRangeException", message: "A control's handle and its parent's must not be empty. (Parameter 'parentHandle')" });
  });

  it("refuses a password field's value", () => {
    assert.throws(() => new ControlInfo("1", null, app, ControlRole.Edit, "Password", "secret", [ControlState.Password], null), ArgumentException);
    assert.throws(() => new ControlInfo("1", null, app, ControlRole.Edit, "Password", "secret", [ControlState.Password], null), {
      name: "ArgumentException",
      message: "A password field's value is never read. (Parameter 'value')"
    });
    assert.equal(new ControlInfo("1", null, app, ControlRole.Edit, "Password", null, [ControlState.Password], null).value, null);
  });
});
