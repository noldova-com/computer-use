/**
 * @license
 * Copyright (c) Noldova.
 *
 * This source code is licensed under the license found in the
 * LICENSE file in the root directory of this source tree.
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { PermissionDetail } from "@noldova/computer-use.runtime";
import { PermissionDetailKind } from "@noldova/desktop.runtime";

describe("PermissionDetail", () => {
  it("keeps its label, value and kind", () => {
    const detail = new PermissionDetail("reason", "To write the note.", PermissionDetailKind.AgentText);

    assert.deepEqual([detail.label, detail.value, detail.kind], ["reason", "To write the note.", PermissionDetailKind.AgentText]);
  });

  it("is plain text the module writes unless it says otherwise", () => {
    assert.equal(new PermissionDetail("app", "Notes").kind, PermissionDetailKind.Text);
  });
});
