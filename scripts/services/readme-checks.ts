/**
 * @license
 * Copyright (c) Noldova.
 *
 * This source code is licensed under the license found in the
 * LICENSE file in the root directory of this source tree.
 */

import { ChecksRowInvalidException } from "../exceptions/checks-row-invalid.exception.ts";
import { ChecksRow } from "../models/checks-row.ts";
import { Resources } from "../resources.ts";

export class ReadmeChecks {
  private readonly lines: readonly string[];

  public constructor(text: string) {
    this.lines = text.split(Resources.lineBreak).map(t => t.trim());
  }

  public readRows(header: string, table: string): readonly ChecksRow[] {
    const start = this.lines.indexOf(Resources.checksHeading);
    if (start === -1)
      return [];
    const end = this.lines.findIndex((t, index) => index > start && t.startsWith(Resources.headingPrefix));
    const checksEnd = end === -1 ? this.lines.length : end;
    const headerIndex = this.lines.findIndex((t, index) => index > start && index < checksEnd && t === header);
    if (headerIndex === -1)
      return [];
    const rows: ChecksRow[] = [];
    for (let index = headerIndex +Resources.tableHeaderRows; index < checksEnd && this.lines[index]?.startsWith(Resources.tableCellMark) === true; index++) {
      const row = this.lines[index] ?? "";
      const [, file, reason] = Resources.checksRowPattern.exec(row) ?? [];
      if (file === undefined || reason === undefined || reason === "")
        throw new ChecksRowInvalidException(table, row);
      rows.push(new ChecksRow(file, reason, index + 1));
    }

    return rows;
  }
}
