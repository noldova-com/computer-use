/**
 * @license
 * Copyright (c) Noldova.
 *
 * This source code is licensed under the license found in the
 * LICENSE file in the root directory of this source tree.
 */

import type { ControlInfo } from "../models/backend/control-info.ts";
import type { ControlTree } from "../models/backend/control-tree.ts";
import { ListedControls } from "../models/listed-controls.ts";
import { ReadControl } from "../models/read-control.ts";
import type { ScreenFrame } from "../models/screen-frame.ts";
import { Resources } from "../resources.ts";

export class ControlListing {
  public static write(tree: ControlTree, frame: ScreenFrame, firstNumber: number, hiddenApps: ReadonlySet<string>): ListedControls {
    const childDepths = new Map<string, number>();
    const chosen = new Map<string | null, ControlInfo[]>();
    const widestId = `${Resources.controlIdPrefix}${firstNumber + Resources.maxListedControls}`;
    let budget = Resources.maxListingCharacters;
    let listed = 0;
    let leftOut = tree.leftOut;
    for (const control of tree.controls) {
      const parent = control.parentHandle;
      const depth = parent === null ? 0 : childDepths.get(parent);
      if (depth === undefined || hiddenApps.has(control.app.id)) {
        leftOut += control.isSilentContainer ? 0 : 1;
        continue;
      }
      if (control.isSilentContainer)
        childDepths.set(control.handle, depth);
      else {
        const length = ControlListing.lineOf(control, depth, frame, widestId).length + 1;
        if (listed === Resources.maxListedControls || length > budget) {
          leftOut += 1;
          continue;
        }
        budget -= length;
        listed += 1;
        childDepths.set(control.handle, depth + 1);
      }
      const siblings = chosen.get(parent);
      if (siblings === undefined)
        chosen.set(parent, [control]);
      else
        siblings.push(control);
    }

    const lines: string[] = [];
    const controls: ReadControl[] = [];
    const visit = (parent: string | null, depth: number): void => {
      for (const control of chosen.get(parent) ?? []) {
        if (control.isSilentContainer) {
          visit(control.handle, depth);
          continue;
        }
        const id = `${Resources.controlIdPrefix}${firstNumber + controls.length}`;
        if (control.bounds !== null && frame.toImageRect(control.bounds) !== null)
          controls.push(new ReadControl(id, control.handle, control.role, control.name, control.bounds));
        lines.push(ControlListing.lineOf(control, depth, frame, id));
        visit(control.handle, depth + 1);
      }
    };
    visit(null, 0);

    return new ListedControls(lines.join(Resources.lineBreak), controls, listed, leftOut, firstNumber + controls.length);
  }

  private static lineOf(control: ControlInfo, depth: number, frame: ScreenFrame, id: string): string {
    const parts = [`${Resources.controlIndent.repeat(depth)}${Resources.controlBullet}${control.role.value.toLowerCase()}`];
    if (control.name !== "")
      parts.push(JSON.stringify(ControlListing.cut(control.name)));
    if (control.value !== null)
      parts.push(`${Resources.controlValueMark}${JSON.stringify(ControlListing.cut(control.value))}`);
    parts.push(...control.states.map(t => t.value.toLowerCase()));
    const rect = control.bounds === null ? null : frame.toImageRect(control.bounds);
    if (rect !== null)
      parts.push(Resources.formatControlBounds(rect.x, rect.y, rect.width, rect.height, id));

    return parts.join(Resources.controlPartSeparator);
  }

  private static cut(text: string): string {
    const characters = Array.from(text);

    return characters.length > Resources.maxControlTextLength ? `${characters.slice(0, Resources.maxControlTextLength).join("")}${Resources.cutMark}` : text;
  }
}
