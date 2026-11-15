/**
 * @license
 * Copyright (c) Noldova.
 *
 * This source code is licensed under the license found in the
 * LICENSE file in the root directory of this source tree.
 */

import { Resources } from "../resources.ts";
import { KeyName } from "./backend/key-name.ts";
import { ModifierKey } from "./backend/modifier-key.ts";

export class KeyChord {
  private static readonly MODIFIERS: readonly ModifierKey[] = [ModifierKey.Control, ModifierKey.Alt, ModifierKey.Shift, ModifierKey.Meta];
  private static readonly MODIFIER_NAMES: ReadonlyMap<string, ModifierKey> = new Map<string, ModifierKey>([
    ...Resources.controlModifierAliases.map(t => [t, ModifierKey.Control] as const),
    ...Resources.altModifierAliases.map(t => [t, ModifierKey.Alt] as const),
    ...Resources.shiftModifierAliases.map(t => [t, ModifierKey.Shift] as const),
    ...Resources.metaModifierAliases.map(t => [t, ModifierKey.Meta] as const)
  ]);
  private static readonly KEY_NAMES: ReadonlyMap<string, KeyName> = new Map<string, KeyName>([
    ...KeyName.all.map(t => [t.value.toLowerCase(), t] as const),
    ...KeyName.all.filter(t => t.value.startsWith(Resources.digitKeyPrefix)).map(t => [t.value.slice(-1), t] as const),
    [Resources.escapeKeyAlias, KeyName.Escape],
    [Resources.enterKeyAlias, KeyName.Enter],
    [Resources.upKeyAlias, KeyName.Up],
    [Resources.downKeyAlias, KeyName.Down],
    [Resources.leftKeyAlias, KeyName.Left],
    [Resources.rightKeyAlias, KeyName.Right]
  ]);

  public readonly key: KeyName;
  public readonly modifiers: readonly ModifierKey[];

  private constructor(key: KeyName, modifiers: readonly ModifierKey[]) {
    this.key = key;
    this.modifiers = KeyChord.MODIFIERS.filter(t => modifiers.includes(t));
  }

  public get text(): string {
    return [...this.modifiers.map(t => t.value), this.key.value].join(Resources.keyChordSeparator);
  }

  public static parse(keys: string): KeyChord | null {
    const names = keys.split(Resources.keyChordSeparator).map(t => t.trim().toLowerCase());
    const key = names.map(t => KeyChord.KEY_NAMES.get(t)).at(-1);
    const modifiers = names.slice(0, -1).map(t => KeyChord.MODIFIER_NAMES.get(t));
    if (key === undefined || modifiers.some(t => t === undefined) || new Set(modifiers).size !== modifiers.length)
      return null;

    return new KeyChord(key, modifiers.filter(t => t !== undefined));
  }

  public static parseModifiers(text: string): readonly ModifierKey[] | null {
    const modifiers = text.split(Resources.keyChordSeparator).map(t => KeyChord.MODIFIER_NAMES.get(t.trim().toLowerCase()));
    if (modifiers.some(t => t === undefined) || new Set(modifiers).size !== modifiers.length)
      return null;

    return KeyChord.MODIFIERS.filter(t => modifiers.includes(t));
  }

  public static readShortcut(shortcut: string): readonly KeyChord[] {
    const names = shortcut.split(Resources.keyChordSeparator);
    const readings = names.some(t => t.trim().toLowerCase() === Resources.baseModifierName) ? [ModifierKey.Control, ModifierKey.Meta] : [ModifierKey.Control];

    return readings
      .map(t => KeyChord.parse(names.map(u => (u.trim().toLowerCase() === Resources.baseModifierName ? t.value : u)).join(Resources.keyChordSeparator)))
      .filter(t => t !== null);
  }

  public isSameAs(other: KeyChord): boolean {
    return this.text === other.text;
  }
}
