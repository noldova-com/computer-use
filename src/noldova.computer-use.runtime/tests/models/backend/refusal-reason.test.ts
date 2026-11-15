/**
 * @license
 * Copyright (c) Noldova.
 *
 * This source code is licensed under the license found in the
 * LICENSE file in the root directory of this source tree.
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { RefusalReason, RefusalReasonUnknownException } from "@noldova/computer-use.runtime";

describe("RefusalReason", () => {
  const expected = [
    "NotForeground",
    "OtherWindowAtPoint",
    "ElevatedTarget",
    "TargetRightsUnknown",
    "ForegroundChanged",
    "SecureInput",
    "PasswordField",
    "MissingGrant",
    "DesktopOnlyCapture",
    "OutsideDisplays",
    "PhysicalInput",
    "ControlChanged",
    "FocusOutsideTarget",
    "FocusUnknown"
  ];

  it("lists every reason once, each with its own text", () => {
    assert.deepEqual(RefusalReason.all.map(t => t.value), expected);
    assert.equal(new Set(RefusalReason.all.map(t => t.description)).size, expected.length);
    assert.equal(RefusalReason.PasswordField.description, "The input was refused: the focused field is a password field, or may be one, as after a Tab or Enter.");
    assert.equal(RefusalReason.TargetRightsUnknown.description,
      "The input was refused: the target window's rights couldn't be read, so it may run with higher rights than the module.");
    assert.equal(RefusalReason.FocusUnknown.description, "The input was refused: the focused field couldn't be identified, and it may be a password field. Click the field and try again, or ask the person.");
  });

  for (const value of expected)
    it(`parses ${value}`, () => {
      assert.equal(RefusalReason.parse(value).value, value);
    });

  for (const value of ["", "notForeground", "not-foreground"])
    it(`refuses to parse "${value}"`, () => {
      assert.throws(() => RefusalReason.parse(value), RefusalReasonUnknownException);
      assert.throws(() => RefusalReason.parse(value), { message: `"${value}" is not a refusal reason.`, value });
    });
});
