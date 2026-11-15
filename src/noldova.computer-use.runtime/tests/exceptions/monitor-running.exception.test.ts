/**
 * @license
 * Copyright (c) Noldova.
 *
 * This source code is licensed under the license found in the
 * LICENSE file in the root directory of this source tree.
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { ComputerUseException, MonitorRunningException } from "@noldova/computer-use.runtime";
import { Exception } from "@noldova/context.exceptions";

describe("MonitorRunningException", () => {
  it("carries its message, its facts and its name", () => {
    const exception = new MonitorRunningException();

    assert.equal(exception.message, "The physical input monitor is already running.");
    assert.equal(exception.name, "MonitorRunningException");
  });

  it("is a computer use exception and a context exception", () => {
    const exception = new MonitorRunningException();

    assert.ok(exception instanceof ComputerUseException);
    assert.ok(exception instanceof Exception);
  });
});
