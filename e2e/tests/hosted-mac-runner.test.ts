/**
 * @license
 * Copyright (c) Noldova.
 *
 * This source code is licensed under the license found in the
 * LICENSE file in the root directory of this source tree.
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { HostedMacRunner } from "../fixtures/hosted-mac-runner.ts";

const HOSTED: Readonly<Record<string, string | undefined>> = { GITHUB_ACTIONS: "true", RUNNER_ENVIRONMENT: "github-hosted" };

describe("HostedMacRunner.isHosted", () => {
  it("passes for macOS with GITHUB_ACTIONS true and RUNNER_ENVIRONMENT github-hosted, as on a GitHub-hosted runner", () => {
    assert.equal(HostedMacRunner.isHosted("darwin", HOSTED), true);
  });

  it("refuses a platform other than macOS", () => {
    assert.deepEqual(["win32", "linux"].map(t => HostedMacRunner.isHosted(t, HOSTED)), [false, false]);
  });

  it("refuses when GITHUB_ACTIONS is unset", () => {
    assert.equal(HostedMacRunner.isHosted("darwin", { RUNNER_ENVIRONMENT: "github-hosted" }), false);
  });

  it("refuses a self-hosted runner", () => {
    assert.equal(HostedMacRunner.isHosted("darwin", { ...HOSTED, RUNNER_ENVIRONMENT: "self-hosted" }), false);
  });
});
