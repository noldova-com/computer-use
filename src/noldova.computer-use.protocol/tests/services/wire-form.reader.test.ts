/**
 * @license
 * Copyright (c) Noldova.
 *
 * This source code is licensed under the license found in the
 * LICENSE file in the root directory of this source tree.
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { SessionStatus, StopRequest } from "@noldova/computer-use.protocol";
import { JsonException } from "@noldova/context.json";

describe("WireFormReader", () => {
  it("refuses a value that isn't an object", () => {
    for (const value of [null, "Idle", 3, true, [], undefined])
      assert.throws(() => SessionStatus.fromJson(value), JsonException);
  });

  it("refuses an unknown field and reads an object with only known ones", () => {
    assert.throws(() => SessionStatus.fromJson({ state: "Idle", sessionId: null, extra: 1 }), JsonException);
    assert.equal(StopRequest.fromJson({}).constructor, StopRequest);
  });
});
