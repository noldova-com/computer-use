/**
 * @license
 * Copyright (c) Noldova.
 *
 * This source code is licensed under the license found in the
 * LICENSE file in the root directory of this source tree.
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { StatusReadRequest } from "@noldova/computer-use.protocol";
import { JsonException } from "@noldova/context.json";

describe("StatusReadRequest", () => {
  it("writes an empty object", () => {
    assert.deepEqual(new StatusReadRequest().toJson(), {});
  });

  it("reads an empty object", () => {
    assert.equal(StatusReadRequest.fromJson({}).constructor, StatusReadRequest);
  });

  it("refuses a field and a value that isn't an object", () => {
    assert.throws(() => StatusReadRequest.fromJson({ sessionId: "session-1" }), JsonException);
    assert.throws(() => StatusReadRequest.fromJson([]), JsonException);
  });
});
