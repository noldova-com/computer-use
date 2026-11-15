/**
 * @license
 * Copyright (c) Noldova.
 *
 * This source code is licensed under the license found in the
 * LICENSE file in the root directory of this source tree.
 */

import type { JsonObject } from "@noldova/computer-use.protocol";
import { ToolFailureCode, type ToolFailureException } from "@noldova/desktop.runtime";

import type { IPointerAim } from "../interfaces/i-pointer-aim.ts";
import { ClickCount } from "../models/backend/click-count.ts";
import type { ModifierKey } from "../models/backend/modifier-key.ts";
import { PointerButton } from "../models/backend/pointer-button.ts";
import { KeyChord } from "../models/key-chord.ts";
import { Resources } from "../resources.ts";
import { CallFailures } from "./call-failures.ts";
import { ControlAim } from "./control-aim.ts";
import { PixelAim } from "./pixel-aim.ts";
import { PointerAim } from "./pointer-aim.ts";

export class PointerFields {
  private static readonly BUTTONS: ReadonlyMap<string, PointerButton> = new Map<string, PointerButton>([
    [Resources.leftButtonName, PointerButton.Left],
    [Resources.rightButtonName, PointerButton.Right],
    [Resources.middleButtonName, PointerButton.Middle]
  ]);
  private static readonly COUNTS: readonly ClickCount[] = [ClickCount.Single, ClickCount.Double, ClickCount.Triple];
  private readonly fields: ReadonlyMap<string, unknown>;
  private readonly message: string;

  private constructor(fields: ReadonlyMap<string, unknown>, message: string) {
    this.fields = fields;
    this.message = message;
  }

  public static of(input: JsonObject, names: readonly string[], message: string): PointerFields {
    if (Object.keys(input).some(t => !names.includes(t)))
      throw CallFailures.of(ToolFailureCode.Refused, message);

    return new PointerFields(new Map<string, unknown>(Object.entries(input)), message);
  }

  public aim(): IPointerAim {
    const control = this.fields.get(Resources.controlField);
    if (control === undefined)
      return new PixelAim(this.point(Resources.xField, Resources.yField));
    if (typeof control !== "string" || control === "" || this.fields.has(Resources.xField) || this.fields.has(Resources.yField))
      throw this.refusal();

    return new ControlAim(control);
  }

  public end(name: string): IPointerAim {
    const value = this.fields.get(name);
    if (typeof value === "string" && value !== "")
      return new ControlAim(value);
    const [x, y]: readonly unknown[] = Array.isArray(value) && value.length === Resources.pointLength ? value : [];
    if (typeof x !== "number" || typeof y !== "number" || !Number.isSafeInteger(x) || !Number.isSafeInteger(y))
      throw this.refusal();

    return new PixelAim([x, y]);
  }

  public optionalEnd(name: string): IPointerAim {
    return this.fields.get(name) === undefined ? new PointerAim() : this.end(name);
  }

  public button(): PointerButton {
    const value = this.fields.get(Resources.buttonField);
    if (value === undefined)
      return PointerButton.Left;

    return (typeof value === "string" ? PointerFields.BUTTONS.get(value) : undefined) ?? this.throwRefusal();
  }

  public count(): ClickCount {
    const value = this.fields.get(Resources.countField);
    if (value === undefined)
      return ClickCount.Single;

    return PointerFields.COUNTS.find(t => t.count === value) ?? this.throwRefusal();
  }

  public modifiers(): readonly ModifierKey[] {
    const value = this.fields.get(Resources.modifiersField);
    if (value === undefined)
      return [];

    return (typeof value === "string" ? KeyChord.parseModifiers(value) : null) ?? this.throwRefusal();
  }

  public integer(name: string, least: number, most: number): number {
    const value = this.fields.get(name);
    if (typeof value !== "number" || !Number.isSafeInteger(value) || value < least || value > most)
      throw this.refusal();

    return value;
  }

  public choice<T>(name: string, choices: ReadonlyMap<string, T>): T {
    const value = this.fields.get(name);

    return (typeof value === "string" ? choices.get(value) : undefined) ?? this.throwRefusal();
  }

  public text(name: string): string {
    const value = this.fields.get(name);
    if (typeof value !== "string" || value === "")
      throw this.refusal();

    return value;
  }

  private point(xName: string, yName: string): readonly [number, number] {
    const x = this.fields.get(xName);
    const y = this.fields.get(yName);
    if (typeof x !== "number" || typeof y !== "number" || !Number.isSafeInteger(x) || !Number.isSafeInteger(y))
      throw this.refusal();

    return [x, y];
  }

  private refusal(): ToolFailureException {
    return CallFailures.of(ToolFailureCode.Refused, this.message);
  }

  private throwRefusal(): never {
    throw this.refusal();
  }
}
