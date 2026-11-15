/**
 * @license
 * Copyright (c) Noldova.
 *
 * This source code is licensed under the license found in the
 * LICENSE file in the root directory of this source tree.
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { BorderColorInvalidException, ProtocolException } from "@noldova/computer-use.protocol";

describe("BorderColorInvalidException", () => {
  it("keeps the colour and quotes it in its message", () => {
    const error = new BorderColorInvalidException("#4AF");

    assert.ok(error instanceof ProtocolException);
    assert.equal(error.name, "BorderColorInvalidException");
    assert.equal(error.color, "#4AF");
    assert.equal(error.message, "\"#4AF\" is not a colour of the form #RRGGBB.");
  });
});
