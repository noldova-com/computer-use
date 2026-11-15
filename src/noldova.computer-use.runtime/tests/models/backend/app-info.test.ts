/**
 * @license
 * Copyright (c) Noldova.
 *
 * This source code is licensed under the license found in the
 * LICENSE file in the root directory of this source tree.
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { AppIdentity, AppInfo } from "@noldova/computer-use.runtime";
import { ArgumentOutOfRangeException } from "@noldova/context.exceptions";

describe("AppInfo", () => {
  const identity = new AppIdentity("C:\\Program Files\\Sample\\sample.exe");

  it("holds the facts the backend reports", () => {
    const app = new AppInfo(identity, "Sample", "Sample Publisher", true, false);

    assert.equal(app.identity, identity);
    assert.equal(app.name, "Sample");
    assert.equal(app.publisher, "Sample Publisher");
    assert.equal(app.isRunning, true);
    assert.equal(app.isHost, false);
  });

  it("holds an app without a publisher", () => {
    assert.equal(new AppInfo(identity, "Sample", null, false, true).publisher, null);
  });

  it("refuses a blank name", () => {
    assert.throws(() => new AppInfo(identity, " ", null, true, false), ArgumentOutOfRangeException);
    assert.throws(() => new AppInfo(identity, "", null, true, false), { message: "The app C:\\Program Files\\Sample\\sample.exe needs a name. (Parameter 'name')" });
  });

  it("refuses a blank publisher rather than an absent one", () => {
    assert.throws(() => new AppInfo(identity, "Sample", " ", true, false), ArgumentOutOfRangeException);
    assert.throws(() => new AppInfo(identity, "Sample", " ", true, false), {
      name: "ArgumentOutOfRangeException",
      message: "The app C:\\Program Files\\Sample\\sample.exe's publisher must not be blank; an app without one has none. (Parameter 'publisher')"
    });
  });
});
