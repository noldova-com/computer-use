/**
 * @license
 * Copyright (c) Noldova.
 *
 * This source code is licensed under the license found in the
 * LICENSE file in the root directory of this source tree.
 */

import type { TestEvent } from "node:test/reporters";

import { TestRecord } from "../models/test-record.ts";
import { TimingMeasurement } from "../models/timing-measurement.ts";

export default async function* reportTestRecords(source: AsyncIterable<TestEvent>): AsyncGenerator<string> {
  const records: TestRecord[] = [];
  const latest = new Map<string, number>();
  for await (const event of source)
    if ((event.type === "test:pass" || event.type === "test:fail") && event.data.file !== undefined) {
      const isTimedOut = event.type === "test:fail" && TestRecord.isTimeoutFailure(event.data.details.error);
      latest.set(TestRecord.locationOf(event.data.file, event.data.line, event.data.column, event.data.nesting), records.length);
      records.push(TestRecord.fromEvent(event.data, event.data.file, event.type === "test:pass", isTimedOut));
    }
    else if (event.type === "test:diagnostic" && event.data.file !== undefined) {
      const measurement = TimingMeasurement.parseOrNull(event.data.message);
      const index = latest.get(TestRecord.locationOf(event.data.file, event.data.line, event.data.column, event.data.nesting));
      const record = index === undefined ? undefined : records[index];
      if (measurement !== null && index !== undefined && record !== undefined)
        records[index] = record.withMeasurement(measurement);
    }
  for (const record of records)
    yield record.toLine();
}
