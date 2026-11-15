/**
 * @license
 * Copyright (c) Noldova.
 *
 * This source code is licensed under the license found in the
 * LICENSE file in the root directory of this source tree.
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { StopRequest } from "@noldova/computer-use.protocol";
import { JsonException } from "@noldova/context.json";

describe("StopRequest", () => {
  it("writes an empty object", () => {
    assert.deepEqual(new StopRequest().toJson(), {});
  });

  it("reads an empty object", () => {
    assert.equal(StopRequest.fromJson({}).constructor, StopRequest);
  });

  it("refuses a field and a value that isn't an object", () => {
    assert.throws(() => StopRequest.fromJson({ force: true }), JsonException);
    assert.throws(() => StopRequest.fromJson([]), JsonException);
  });
});
