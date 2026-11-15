/**
 * @license
 * Copyright (c) Noldova.
 *
 * This source code is licensed under the license found in the
 * LICENSE file in the root directory of this source tree.
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { BorderColorInvalidException, BorderColorSetRequest } from "@noldova/computer-use.protocol";
import { JsonException } from "@noldova/context.json";

describe("BorderColorSetRequest", () => {
  it("holds its colour in upper case", () => {
    assert.equal(new BorderColorSetRequest("#4daafc").color, "#4DAAFC");
    assert.equal(new BorderColorSetRequest("#005FB8").color, "#005FB8");
  });

  it("refuses a colour that isn't of the form #RRGGBB", () => {
    for (const color of ["", "005FB8", "#4AF", "#005FB80", "#005FBG", " #005FB8", "blue"])
      assert.throws(() => new BorderColorSetRequest(color), BorderColorInvalidException, color);
  });

  it("writes its wire form", () => {
    assert.deepEqual(new BorderColorSetRequest("#4daafc").toJson(), { color: "#4DAAFC" });
  });

  it("reads its wire form back to an equal request", () => {
    assert.equal(BorderColorSetRequest.fromJson({ color: "#005fb8" }).color, "#005FB8");
  });

  it("refuses a wire form that isn't one", () => {
    assert.throws(() => BorderColorSetRequest.fromJson({}), JsonException);
    assert.throws(() => BorderColorSetRequest.fromJson({ color: 0x005FB8 }), JsonException);
    assert.throws(() => BorderColorSetRequest.fromJson({ color: "#005FB8", alpha: 1 }), JsonException);
    assert.throws(() => BorderColorSetRequest.fromJson({ color: "blue" }), BorderColorInvalidException);
    assert.throws(() => BorderColorSetRequest.fromJson("#005FB8"), JsonException);
  });
});
