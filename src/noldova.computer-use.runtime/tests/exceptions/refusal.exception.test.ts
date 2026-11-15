/**
 * @license
 * Copyright (c) Noldova.
 *
 * This source code is licensed under the license found in the
 * LICENSE file in the root directory of this source tree.
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { ComputerUseException, RefusalException, RefusalReason } from "@noldova/computer-use.runtime";
import { Exception } from "@noldova/context.exceptions";

describe("RefusalException", () => {
  it("carries a refusal before any input, with the reason's text", () => {
    const refusal = new RefusalException(RefusalReason.NotForeground, false);

    assert.equal(refusal.reason, RefusalReason.NotForeground);
    assert.equal(refusal.isInputSent, false);
    assert.equal(refusal.message, "The input was refused: the target window isn't in front.");
    assert.equal(refusal.name, "RefusalException");
    assert.ok(refusal instanceof ComputerUseException);
    assert.ok(refusal instanceof Exception);
  });

  it("says when the input was already sent", () => {
    const refusal = new RefusalException(RefusalReason.ForegroundChanged, true);

    assert.equal(refusal.isInputSent, true);
    assert.equal(refusal.message,
      "Another window came to the front during the input. Some input may already have been sent, so the outcome is uncertain. Call computer_screenshot before acting again.");
  });
});
