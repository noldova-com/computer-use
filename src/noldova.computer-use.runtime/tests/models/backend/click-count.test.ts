/**
 * @license
 * Copyright (c) Noldova.
 *
 * This source code is licensed under the license found in the
 * LICENSE file in the root directory of this source tree.
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { ClickCount } from "@noldova/computer-use.runtime";

describe("ClickCount", () => {
  it("has single, double and triple clicks with their counts", () => {
    assert.deepEqual([ClickCount.Single, ClickCount.Double, ClickCount.Triple].map(t => [t.value, t.count]), [["Single", 1], ["Double", 2], ["Triple", 3]]);
  });
});
