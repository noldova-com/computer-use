/**
 * @license
 * Copyright (c) Noldova.
 *
 * This source code is licensed under the license found in the
 * LICENSE file in the root directory of this source tree.
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { AppDescription, AppIdentity } from "@noldova/computer-use.runtime";
import { ArgumentOutOfRangeException } from "@noldova/context.exceptions";

describe("AppDescription", () => {
  const identity = new AppIdentity("C:\\Program Files\\Sample\\sample.exe");

  it("holds the name, publisher and icon the backend reads", () => {
    const icon = new Uint8Array([137, 80, 78, 71]);
    const app = new AppDescription(identity, "Sample", "Sample Publisher", icon);

    assert.equal(app.identity, identity);
    assert.equal(app.name, "Sample");
    assert.equal(app.publisher, "Sample Publisher");
    assert.equal(app.icon, icon);
  });

  it("holds an app without a publisher or an icon", () => {
    const app = new AppDescription(identity, "Sample", null, null);

    assert.deepEqual([app.publisher, app.icon], [null, null]);
  });

  it("refuses a blank name", () => {
    assert.throws(() => new AppDescription(identity, " ", null, null), ArgumentOutOfRangeException);
    assert.throws(() => new AppDescription(identity, " ", null, null), {
      name: "ArgumentOutOfRangeException",
      message: "The app C:\\Program Files\\Sample\\sample.exe needs a name. (Parameter 'name')"
    });
  });

  it("refuses a blank publisher rather than an absent one", () => {
    assert.throws(() => new AppDescription(identity, "Sample", " ", null), ArgumentOutOfRangeException);
    assert.throws(() => new AppDescription(identity, "Sample", " ", null), { name: "ArgumentOutOfRangeException", parameterName: "publisher", actualValue: " " });
  });
});
