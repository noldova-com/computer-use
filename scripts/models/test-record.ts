/**
 * @license
 * Copyright (c) Noldova.
 *
 * This source code is licensed under the license found in the
 * LICENSE file in the root directory of this source tree.
 */

import type { EventData } from "node:test";

import { TestRecordUnreadableException } from "../exceptions/test-record-unreadable.exception.ts";
import { Resources } from "../resources.ts";
import { TimingMeasurement } from "./timing-measurement.ts";

export class TestRecord {
  public readonly file: string;
  public readonly name: string;
  public readonly line: number;
  public readonly column: number;
  public readonly nesting: number;
  public readonly isSuite: boolean;
  public readonly isPassed: boolean;
  public readonly isSkipped: boolean;
  public readonly isSkippedWithoutReason: boolean;
  public readonly isTodo: boolean;
  public readonly isTimedOut: boolean;
  public readonly duration: number;
  public readonly measurement: TimingMeasurement | null;

  public constructor(file: string, name: string, line: number, column: number, nesting: number, isSuite: boolean, isPassed: boolean, isSkipped: boolean,
    isSkippedWithoutReason: boolean, isTodo: boolean, isTimedOut: boolean, duration: number, measurement: TimingMeasurement | null) {
    this.file = file;
    this.name = name;
    this.line = line;
    this.column = column;
    this.nesting = nesting;
    this.isSuite = isSuite;
    this.isPassed = isPassed;
    this.isSkipped = isSkipped;
    this.isSkippedWithoutReason = isSkippedWithoutReason;
    this.isTodo = isTodo;
    this.isTimedOut = isTimedOut;
    this.duration = duration;
    this.measurement = measurement;
  }

  public get isTopLevel(): boolean {
    return this.nesting === 0;
  }

  public get isCountedPass(): boolean {
    return this.isPassed && !this.isSuite && !this.isSkipped && !this.isTodo && this.nesting > 0;
  }

  public get isTimingCheck(): boolean {
    return this.isPassed && !this.isSuite && !this.isSkipped && !this.isTodo;
  }

  public static fromEvent(data: EventData.TestPass | EventData.TestFail, file: string, isPassed: boolean, isTimedOut: boolean): TestRecord {
    const isSkipped = data.skip !== undefined && data.skip !== false;

    return new TestRecord(file, data.name, data.line ?? 0, data.column ?? 0, data.nesting, data.details.type === Resources.suiteType, isPassed, isSkipped,
      data.skip === true, data.todo !== undefined && data.todo !== false, isTimedOut, data.details.duration_ms, null);
  }

  public static isTimeoutFailure(error: Error): boolean {
    return Resources.failureTypeField in error && error[Resources.failureTypeField] === Resources.timeoutFailureType;
  }

  public static locationOf(file: string, line: number | undefined, column: number | undefined, nesting: number): string {
    return Resources.formatTestLocation(file, line ?? 0, column ?? 0, nesting);
  }

  public static parse(line: string, recordsFile: string): TestRecord {
    let value: unknown;
    try {
      value = JSON.parse(line);
    }
    catch (error) {
      if (!(error instanceof SyntaxError))
        throw error;
      throw new TestRecordUnreadableException(recordsFile, line, error);
    }
    const fields = typeof value === "object" && value !== null && !Array.isArray(value) ? new Map<string, unknown>(Object.entries(value)) : new Map<string, unknown>();
    const file = fields.get(Resources.recordFileField);
    const name = fields.get(Resources.recordNameField);
    const testLine = fields.get(Resources.recordLineField);
    const column = fields.get(Resources.recordColumnField);
    const nesting = fields.get(Resources.recordNestingField);
    const isSuite = fields.get(Resources.recordSuiteField);
    const isPassed = fields.get(Resources.recordPassedField);
    const isSkipped = fields.get(Resources.recordSkippedField);
    const isSkippedWithoutReason = fields.get(Resources.recordSkippedWithoutReasonField);
    const isTodo = fields.get(Resources.recordTodoField);
    const isTimedOut = fields.get(Resources.recordTimedOutField);
    const duration = fields.get(Resources.recordDurationField);
    const measuredMs = fields.get(Resources.recordMeasuredField);
    const limitMs = fields.get(Resources.recordLimitField);
    if (typeof file !== "string" || typeof name !== "string" || typeof testLine !== "number" || typeof column !== "number" || typeof nesting !== "number"
      || typeof isSuite !== "boolean" || typeof isPassed !== "boolean" || typeof isSkipped !== "boolean" || typeof isSkippedWithoutReason !== "boolean"
      || typeof isTodo !== "boolean" || typeof isTimedOut !== "boolean" || typeof duration !== "number")
      throw new TestRecordUnreadableException(recordsFile, line);
    if (typeof measuredMs === "number" && typeof limitMs === "number")
      return new TestRecord(file, name, testLine, column, nesting, isSuite, isPassed, isSkipped, isSkippedWithoutReason, isTodo, isTimedOut, duration,
        new TimingMeasurement(measuredMs, limitMs));
    if (measuredMs !== null || limitMs !== null)
      throw new TestRecordUnreadableException(recordsFile, line);

    return new TestRecord(file, name, testLine, column, nesting, isSuite, isPassed, isSkipped, isSkippedWithoutReason, isTodo, isTimedOut, duration, null);
  }

  public withMeasurement(measurement: TimingMeasurement): TestRecord {
    return new TestRecord(this.file, this.name, this.line, this.column, this.nesting, this.isSuite, this.isPassed, this.isSkipped, this.isSkippedWithoutReason,
      this.isTodo, this.isTimedOut, this.duration, measurement);
  }

  public toLine(): string {
    return Resources.formatRecordLine(JSON.stringify({
      [Resources.recordFileField]: this.file,
      [Resources.recordNameField]: this.name,
      [Resources.recordLineField]: this.line,
      [Resources.recordColumnField]: this.column,
      [Resources.recordNestingField]: this.nesting,
      [Resources.recordSuiteField]: this.isSuite,
      [Resources.recordPassedField]: this.isPassed,
      [Resources.recordSkippedField]: this.isSkipped,
      [Resources.recordSkippedWithoutReasonField]: this.isSkippedWithoutReason,
      [Resources.recordTodoField]: this.isTodo,
      [Resources.recordTimedOutField]: this.isTimedOut,
      [Resources.recordDurationField]: this.duration,
      [Resources.recordMeasuredField]: this.measurement?.measuredMs ?? null,
      [Resources.recordLimitField]: this.measurement?.limitMs ?? null
    }));
  }
}
