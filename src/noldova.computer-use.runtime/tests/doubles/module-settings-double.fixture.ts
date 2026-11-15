/**
 * @license
 * Copyright (c) Noldova.
 *
 * This source code is licensed under the license found in the
 * LICENSE file in the root directory of this source tree.
 */

import fs from "node:fs";

import type { JsonValue } from "@noldova/context.json";
import { QualifiedName, SettingChange, SettingKey } from "@noldova/desktop.protocol";
import { FakeModuleSettings } from "@noldova/desktop.runtime/testing";

export class ModuleSettingsDouble extends FakeModuleSettings {
  private static readonly SETTINGS_FILE: URL = new URL("../../../noldova.computer-use/settings.json", import.meta.url);
  private readonly defaults: ReadonlyMap<string, JsonValue>;
  private isActive: boolean = true;
  private readonly values: Map<string, JsonValue>;

  public constructor(values: Map<string, JsonValue> = new Map(), defaults: ReadonlyMap<string, JsonValue> = ModuleSettingsDouble.readDefaults()) {
    super();
    this.defaults = defaults;
    this.values = values;
    this.answer("read", name => this.values.get(name) ?? this.defaultOf(name));
    this.answer("write", (name, value) => {
      this.defaultOf(name);
      this.values.set(name, value);
      this.notify(name, value, true);
    });
    this.answer("reset", name => {
      const fallback = this.defaultOf(name);
      this.values.delete(name);
      this.notify(name, fallback, false);
    });
  }

  public get sharedValues(): Map<string, JsonValue> {
    return this.values;
  }

  public deactivate(): void {
    this.isActive = false;
  }

  private defaultOf(name: string): JsonValue {
    const value = this.defaults.get(name);
    if (value === undefined)
      throw new RangeError(`The module declares no setting ${name}.`);

    return value;
  }

  private notify(name: string, value: JsonValue, isSet: boolean): void {
    if (this.isActive)
      this.raiseChanged(name, new SettingChange(new SettingKey(QualifiedName.parse(name)), value, isSet));
  }

  private static readDefaults(): ReadonlyMap<string, JsonValue> {
    const defaults = new Map<string, JsonValue>();
    const declaration: unknown = JSON.parse(fs.readFileSync(ModuleSettingsDouble.SETTINGS_FILE, "utf8"));
    const settings = typeof declaration === "object" && declaration !== null && "settings" in declaration ? declaration.settings : null;
    if (!Array.isArray(settings))
      throw new RangeError(`${ModuleSettingsDouble.SETTINGS_FILE.pathname} lists no settings.`);
    for (const setting of settings)
      if (typeof setting === "object" && setting !== null && "name" in setting && typeof setting.name === "string" && "default" in setting)
        defaults.set(setting.name, ModuleSettingsDouble.jsonOf(setting.default));

    return defaults;
  }

  private static jsonOf(value: unknown): JsonValue {
    if (value === null || typeof value === "boolean" || typeof value === "number" || typeof value === "string")
      return value;

    throw new RangeError(`The default ${String(value)} isn't a plain value.`);
  }
}
