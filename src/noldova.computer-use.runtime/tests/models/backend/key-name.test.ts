/**
 * @license
 * Copyright (c) Noldova.
 *
 * This source code is licensed under the license found in the
 * LICENSE file in the root directory of this source tree.
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { KeyName } from "@noldova/computer-use.runtime";
import { ArgumentOutOfRangeException } from "@noldova/context.exceptions";

describe("KeyName", () => {
  const letters = [..."ABCDEFGHIJKLMNOPQRSTUVWXYZ"];
  const digits = [..."0123456789"].map(t => `Digit${t}`);
  const functionKeys = Array.from({ length: 12 }, (_, index) => `F${index + 1}`);
  const expected = [
    "Enter", "Tab", "Escape", "Backspace", "Delete", "Space", "Up", "Down", "Left", "Right", "Home", "End", "PageUp", "PageDown",
    ...functionKeys,
    ...letters,
    ...digits
  ];

  it("lists the editing, navigation, function, letter and digit keys once each", () => {
    assert.deepEqual(KeyName.all.map(t => t.value), expected);
    assert.equal(KeyName.PageDown.value, "PageDown");
    assert.equal(KeyName.Digit7.value, "Digit7");
  });

  it("parses every key's value to that key", () => {
    for (const key of KeyName.all)
      assert.equal(KeyName.parse(key.value), key);
  });

  for (const value of ["", "enter", "Ctrl", "F13", "7"])
    it(`refuses to parse "${value}"`, () => {
      assert.throws(() => KeyName.parse(value), ArgumentOutOfRangeException);
      assert.throws(() => KeyName.parse(value), { message: `"${value}" is not a key name. (Parameter 'value')` });
    });
});
