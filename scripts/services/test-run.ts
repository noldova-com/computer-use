/**
 * @license
 * Copyright (c) Noldova.
 *
 * This source code is licensed under the license found in the
 * LICENSE file in the root directory of this source tree.
 */

import { existsSync } from "node:fs";
import { access, glob, mkdir, readFile, rm } from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";

import { TestRecordsMissingException } from "../exceptions/test-records-missing.exception.ts";
import { TestRunException } from "../exceptions/test-run.exception.ts";
import { TestRecord } from "../models/test-record.ts";
import { TestSuite } from "../models/test-suite.ts";
import { Resources } from "../resources.ts";
import type { ProcessRunner } from "./process-runner.ts";
import { ReadmeChecks } from "./readme-checks.ts";
import { TestWaitCheck } from "./test-wait-check.ts";

export class TestRun {
  private readonly root: string;
  private readonly runner: ProcessRunner;
  private readonly report: (line: string) => void;
  private readonly recordsFile: string;

  public constructor(root: string, runner: ProcessRunner, report: (line: string) => void) {
    this.root = root;
    this.runner = runner;
    this.report = report;
    this.recordsFile = path.join(root, Resources.testRecordsFile);
  }

  public async runAsync(values: readonly string[]): Promise<number> {
    try {
      const filters = values.filter(t => !Resources.workflowTestOptions.includes(t));
      if (filters.includes(Resources.nativeOption))
        return await this.runNativeAsync(filters);
      if (filters.length > 0)
        return await this.runFilteredAsync(filters);

      return await this.runSuiteAsync();
    }
    catch (error) {
      if (!(error instanceof TestRunException))
        throw error;
      this.report(error.message);
      return Resources.failureExitCode;
    }
  }

  public async timeAsync(values: readonly string[]): Promise<number> {
    try {
      const isNative = values.includes(Resources.nativeOption);
      if (values.some(t => t !== Resources.nativeOption)) {
        this.report(Resources.formatTimingOptions(Resources.nativeOption));
        return Resources.failureExitCode;
      }

      return await this.runTimingAsync(isNative);
    }
    catch (error) {
      if (!(error instanceof TestRunException))
        throw error;
      this.report(error.message);
      return Resources.failureExitCode;
    }
  }

  private static unitSuite(): TestSuite {
    return new TestSuite(Resources.unitSuiteName, Resources.unitHangLimitMs, Resources.unitHangReason);
  }

  private static nativeSuite(): TestSuite {
    return new TestSuite(Resources.nativeSuiteName, Resources.nativeHangLimitMs, Resources.nativeHangReason);
  }

  private static timingSuite(isNative: boolean): TestSuite {
    return isNative
      ? new TestSuite(Resources.nativeTimingSuiteName, Resources.nativeTimingHangLimitMs, Resources.nativeTimingHangReason)
      : new TestSuite(Resources.timingSuiteName, Resources.timingHangLimitMs, Resources.timingHangReason);
  }

  private static medianOf(values: readonly number[]): number {
    const sorted = [...values].sort((first, second) => first - second);

    return sorted[Math.floor(sorted.length / 2)] ?? 0;
  }

  private async runSuiteAsync(): Promise<number> {
    const checks = new ReadmeChecks(await readFile(path.join(this.root, Resources.readmeFile), Resources.textEncoding));
    const exclusions = checks.readRows(Resources.exclusionsHeader, Resources.exclusionsTable);
    let isMissing = false;
    for (const exclusion of exclusions) {
      this.report(Resources.formatCoverageExcludes(exclusion.file, exclusion.reason));
      if (!await this.existsAsync(exclusion.file)) {
        this.report(Resources.formatExclusionFileMissing(exclusion.file));
        isMissing = true;
      }
    }
    if (isMissing)
      return Resources.failureExitCode;
    const pauses = await new TestWaitCheck(this.root, checks.readRows(Resources.pausesHeader, Resources.pausesTable), this.report).runAsync();
    for (const finding of pauses)
      this.report(finding);
    if (pauses.length > 0)
      return Resources.failureExitCode;

    const exitCode = await this.runTestsAsync(TestRun.unitSuite(), [
      ...Resources.testOptions,
      ...exclusions.map(t => Resources.formatCoverageExcludeOption(t.file))
    ], Resources.testFiles, []);
    const records = await this.readRecordsAsync(exitCode);
    this.reportSlowFiles(records);
    const unexplained = records.filter(t => t.isSkippedWithoutReason);
    for (const record of unexplained)
      this.report(Resources.formatSkipWithoutReason(this.relativeOf(record.file), record.name));

    return exitCode !== Resources.successExitCode ? exitCode : unexplained.length > 0 ? Resources.failureExitCode : Resources.successExitCode;
  }

  private async runFilteredAsync(filters: readonly string[]): Promise<number> {
    const files = filters.filter(t => t.endsWith(Resources.testFileEnding));
    this.report(Resources.filteredNote);
    const exitCode = await this.runTestsAsync(TestRun.unitSuite(), [
      ...Resources.filteredTestOptions,
      ...filters.filter(t => !t.endsWith(Resources.testFileEnding)).map(t => Resources.formatTestNamePattern(t))
    ], files.length > 0 ? files : Resources.testFiles, []);
    const records = await this.readRecordsAsync(exitCode);
    this.reportSlowFiles(records);
    if (exitCode !== Resources.successExitCode)
      return exitCode;
    if (records.some(t => t.isCountedPass))
      return Resources.successExitCode;

    this.report(Resources.noTestNote);
    return Resources.failureExitCode;
  }

  private async runNativeAsync(filters: readonly string[]): Promise<number> {
    if (filters.length !== 1) {
      this.report(Resources.formatNativeAlone(Resources.nativeOption));
      return Resources.failureExitCode;
    }
    const files = (await this.listAsync(Resources.nativeTestFiles)).filter(t => !t.endsWith(Resources.nativeTimingFileEnding));
    if (files.length === 0) {
      this.report(Resources.nativeNone);
      return Resources.failureExitCode;
    }
    const exitCode = await this.runTestsAsync(TestRun.nativeSuite(), Resources.nativeTestOptions, files, Resources.formatTapReporterOptions(Resources.nativeReport));
    await this.readRecordsAsync(exitCode);

    return exitCode;
  }

  private async runTimingAsync(isNative: boolean): Promise<number> {
    const files = await this.listAsync(isNative ? Resources.nativeTimingFiles : Resources.timingFiles);
    if (files.length === 0) {
      this.report(Resources.timingNone);
      return Resources.successExitCode;
    }
    const suite = TestRun.timingSuite(isNative);
    const measured = new Map<string, number[]>();
    const limits = new Map<string, number>();
    const unmeasured = new Set<string>();
    for (let run = 1; run <= Resources.timingRuns; run++) {
      const exitCode = await this.runTestsAsync(suite, Resources.timingTestOptions, files, []);
      const records = await this.readRecordsAsync(exitCode);
      if (exitCode !== Resources.successExitCode)
        return exitCode;
      for (const record of records.filter(t => t.isTimingCheck)) {
        const check = Resources.formatTimingCheckName(this.relativeOf(record.file), record.line, record.name);
        if (record.measurement === null)
          unmeasured.add(check);
        else {
          measured.set(check, [...measured.get(check) ?? [], record.measurement.measuredMs]);
          limits.set(check, record.measurement.limitMs);
        }
      }
    }
    const findings = [...unmeasured].sort().map(t => Resources.formatTimingUnmeasured(t));
    for (const [check, times] of [...measured].sort(([first], [second]) => first.localeCompare(second))) {
      const median = TestRun.medianOf(times);
      const limit = limits.get(check) ?? 0;
      this.report(Resources.formatTimingResult(check, median, times.length, limit));
      if (median > limit * (1 + Resources.timingMargin))
        findings.push(Resources.formatTimingOver(check, median, limit));
    }
    for (const finding of findings)
      this.report(finding);

    return findings.length > 0 ? Resources.failureExitCode : Resources.successExitCode;
  }

  private async runTestsAsync(suite: TestSuite, options: readonly string[], files: readonly string[], reporters: readonly string[]): Promise<number> {
    await mkdir(path.dirname(this.recordsFile), { recursive: true });
    await rm(this.recordsFile, { force: true });
    this.report(Resources.formatHangLimit(suite.name, suite.hangLimitMs, suite.hangReason));
    const reporter = pathToFileURL(path.join(this.root, ...Resources.testRecordReporter)).href;

    return await this.runner.runAsync(process.execPath, [
      ...options,
      Resources.formatTestTimeoutOption(suite.hangLimitMs),
      ...Resources.screenReporterOptions,
      ...reporters,
      ...Resources.formatRecordReporterOptions(reporter, this.recordsFile),
      ...files
    ], this.root);
  }

  private async readRecordsAsync(exitCode: number): Promise<readonly TestRecord[]> {
    if (!existsSync(this.recordsFile) && exitCode !== Resources.successExitCode)
      return [];
    if (!existsSync(this.recordsFile))
      throw new TestRecordsMissingException(this.recordsFile);
    const records = (await readFile(this.recordsFile, Resources.textEncoding)).split(Resources.lineBreak).filter(t => t !== "")
      .map(t => TestRecord.parse(t, this.recordsFile));
    for (const record of records.filter(t => t.isTimedOut))
      this.report(Resources.formatTestHung(this.relativeOf(record.file), record.name));

    return records;
  }

  private reportSlowFiles(records: readonly TestRecord[]): void {
    const durations = new Map<string, number>();
    for (const record of records.filter(t => t.isTopLevel))
      durations.set(this.relativeOf(record.file), (durations.get(this.relativeOf(record.file)) ?? 0) + record.duration);
    for (const [file, duration] of [...durations].sort(([first], [second]) => first.localeCompare(second)))
      if (duration > Resources.testFileBudgetMs)
        this.report(Resources.formatTestFileSlow(file, Math.round(duration)));
  }

  private async listAsync(pattern: string): Promise<readonly string[]> {
    const files: string[] = [];
    for await (const file of glob(pattern, { cwd: this.root }))
      files.push(file.replaceAll(path.sep, Resources.pathSeparator));

    return files.sort();
  }

  private relativeOf(file: string): string {
    return path.relative(this.root, file).replaceAll(path.sep, Resources.pathSeparator);
  }

  private async existsAsync(file: string): Promise<boolean> {
    try {
      await access(path.join(this.root, file));
      return true;
    }
    catch (error) {
      if (error instanceof Error && Resources.errorCodeField in error && Resources.missingFileCodes.includes(String(error[Resources.errorCodeField])))
        return false;
      throw error;
    }
  }
}
