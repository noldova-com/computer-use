/**
 * @license
 * Copyright (c) Noldova.
 *
 * This source code is licensed under the license found in the
 * LICENSE file in the root directory of this source tree.
 */

import path from "node:path";

import { defineConfig } from "@playwright/test";

import { HangLimits } from "./fixtures/hang-limits.ts";
import { TestAppLayout } from "./fixtures/test-app-layout.ts";

export default defineConfig({
  testDir: path.join(import.meta.dirname, "specs"),
  testMatch: "*.spec.ts",
  timeout: HangLimits.CI_TEST_COVERS_A_COLD_APP_START_AND_QUIT_MS,
  expect: { timeout: HangLimits.CI_TEST_COVERS_A_COLD_APP_START_AND_QUIT_MS },
  workers: 1,
  retries: 0,
  fullyParallel: false,
  forbidOnly: true,
  outputDir: path.join(TestAppLayout.REPORT_FOLDER, "results"),
  reporter: [["list", { printFailuresInline: true }], ["json", { outputFile: path.join(TestAppLayout.REPORT_FOLDER, "report.json") }]]
});
