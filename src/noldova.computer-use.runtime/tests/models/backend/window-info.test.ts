/**
 * @license
 * Copyright (c) Noldova.
 *
 * This source code is licensed under the license found in the
 * LICENSE file in the root directory of this source tree.
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { AppIdentity, DesktopRect, WindowInfo } from "@noldova/computer-use.runtime";
import { ArgumentOutOfRangeException } from "@noldova/context.exceptions";

describe("WindowInfo", () => {
  const app = new AppIdentity("C:\\Program Files\\Sample\\sample.exe");
  const frame = new DesktopRect(100, 50, 800, 600);

  it("describes the window and gives the target an input on it names", () => {
    const window = new WindowInfo(app, "sample", "264190", 4120, frame, true);

    assert.equal(window.app, app);
    assert.equal(window.appName, "sample");
    assert.equal(window.frame, frame);
    assert.equal(window.isElevated, true);
    assert.equal(window.target.app, app);
    assert.equal(window.target.windowId, "264190");
    assert.equal(window.target.processId, 4120);
  });

  for (const appName of ["", "  "])
    it(`refuses the blank app name "${appName}"`, () => {
      assert.throws(() => new WindowInfo(app, appName, "264190", 4120, frame, false), ArgumentOutOfRangeException);
      assert.throws(() => new WindowInfo(app, appName, "264190", 4120, frame, false), { message: `The app ${app.id} needs a name. (Parameter 'appName')` });
    });

  it("refuses a window that no target could name", () => {
    assert.throws(() => new WindowInfo(app, "sample", "0", 4120, frame, false), ArgumentOutOfRangeException);
    assert.throws(() => new WindowInfo(app, "sample", "0", 4120, frame, false), { name: "ArgumentOutOfRangeException", parameterName: "windowId" });
    assert.throws(() => new WindowInfo(app, "sample", "264190", 0, frame, false), ArgumentOutOfRangeException);
    assert.throws(() => new WindowInfo(app, "sample", "264190", 0, frame, false), { name: "ArgumentOutOfRangeException", parameterName: "processId" });
  });
});
