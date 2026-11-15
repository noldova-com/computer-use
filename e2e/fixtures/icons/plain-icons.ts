/**
 * @license
 * Copyright (c) Noldova.
 *
 * This source code is licensed under the license found in the
 * LICENSE file in the root directory of this source tree.
 */

import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

import { IcoFile } from "./ico-file.ts";
import { IconColor } from "./icon-color.ts";
import { IconShape } from "./icon-shape.ts";

export class PlainIcons {
  private static readonly APP_ICO_SIZES: readonly number[] = [16, 24, 32, 48, 64, 128, 256];
  private static readonly APP_PNG_SIZE: number = 512;
  private static readonly TRAY_ICO_SIZES: readonly number[] = [16, 20, 24, 32, 40, 48];
  private static readonly TRAY_PNG_SIZE: number = 32;
  private static readonly TRAY_TEMPLATE_SIZE: number = 16;
  private static readonly TRAY_STATES: ReadonlyMap<string, IconShape> = new Map([
    ["idle", IconShape.IDLE],
    ["running", IconShape.RUNNING],
    ["unread", IconShape.UNREAD],
    ["both", IconShape.BOTH]
  ]);

  public static async writeAsync(folder: string): Promise<void> {
    const tray = path.join(folder, "tray");
    await mkdir(tray, { recursive: true });
    await writeFile(path.join(folder, "icon-dark.ico"), IcoFile.encode(PlainIcons.APP_ICO_SIZES.map(t => IconShape.APP.draw(t, IconColor.LIGHT))));
    await writeFile(path.join(folder, "icon-dark-512.png"), IconShape.APP.draw(PlainIcons.APP_PNG_SIZE, IconColor.LIGHT).encode());
    await writeFile(path.join(folder, "icon-dock-512.png"), IconShape.APP.draw(PlainIcons.APP_PNG_SIZE, IconColor.ACCENT).encode());
    for (const [state, shape] of PlainIcons.TRAY_STATES) {
      const name = path.join(tray, `tray-${state}`);
      await writeFile(`${name}.ico`, IcoFile.encode(PlainIcons.TRAY_ICO_SIZES.map(t => shape.draw(t, IconColor.LIGHT))));
      await writeFile(`${name}.png`, shape.draw(PlainIcons.TRAY_PNG_SIZE, IconColor.LIGHT).encode());
      await writeFile(`${name}@2x.png`, shape.draw(PlainIcons.TRAY_PNG_SIZE * 2, IconColor.LIGHT).encode());
      await writeFile(`${name}Template.png`, shape.draw(PlainIcons.TRAY_TEMPLATE_SIZE, IconColor.TEMPLATE).encode());
      await writeFile(`${name}Template@2x.png`, shape.draw(PlainIcons.TRAY_TEMPLATE_SIZE * 2, IconColor.TEMPLATE).encode());
    }
  }
}
