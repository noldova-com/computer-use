/**
 * @license
 * Copyright (c) Noldova.
 *
 * This source code is licensed under the license found in the
 * LICENSE file in the root directory of this source tree.
 */

import type { IMacAppDescriptionJson } from "../interfaces/i-mac-app-description-json.ts";
import type { IMacAppJson } from "../interfaces/i-mac-app-json.ts";
import type { IMacAppListJson } from "../interfaces/i-mac-app-list-json.ts";
import type { IMacControlJson } from "../interfaces/i-mac-control-json.ts";
import type { IMacControlSliceJson } from "../interfaces/i-mac-control-slice-json.ts";
import type { IMacControlSpotJson } from "../interfaces/i-mac-control-spot-json.ts";
import type { IMacDisplayJson } from "../interfaces/i-mac-display-json.ts";
import type { IMacGrantsJson } from "../interfaces/i-mac-grants-json.ts";
import type { IMacOutcomeJson } from "../interfaces/i-mac-outcome-json.ts";
import type { IMacPointJson } from "../interfaces/i-mac-point-json.ts";
import type { IMacStackedWindowJson } from "../interfaces/i-mac-stacked-window-json.ts";
import type { IMacWatchPollJson } from "../interfaces/i-mac-watch-poll-json.ts";
import type { IMacWindowJson } from "../interfaces/i-mac-window-json.ts";
import type { IMacWindowListJson } from "../interfaces/i-mac-window-list-json.ts";
import { Resources } from "../resources.ts";

export class MacAnswers {
  private static readonly OUTCOME_STATUSES: readonly string[] = [Resources.doneStatus, Resources.refusedStatus, Resources.stoppedStatus];
  private static readonly FRAME_FIELDS: readonly string[] = [Resources.macXField, Resources.macYField, Resources.macWidthField, Resources.macHeightField];

  public static isGrants(value: unknown): value is IMacGrantsJson {
    return MacAnswers.hasAll(value, "boolean", [Resources.macScreenRecordingField, Resources.macAccessibilityField]);
  }

  public static isDisplays(value: unknown): value is readonly IMacDisplayJson[] {
    return MacAnswers.isListOf(value, t => MacAnswers.isDisplay(t));
  }

  public static isWindowOrNull(value: unknown): value is IMacWindowJson | null {
    return value === null || (MacAnswers.hasAll(value, "string", [Resources.macWindowIdField, Resources.macBundleIdField, Resources.macAppNameField])
      && MacAnswers.hasAll(value, "number", [Resources.macProcessIdField]) && MacAnswers.hasAll(value, "number", MacAnswers.FRAME_FIELDS));
  }

  public static isWindowList(value: unknown): value is IMacWindowListJson {
    return MacAnswers.isFields(value) && typeof value[Resources.macIsCompleteField] === "boolean"
      && MacAnswers.isListOf(value[Resources.macWindowsField], t => MacAnswers.isStackedWindow(t));
  }

  public static isStackedWindowOrNull(value: unknown): value is IMacStackedWindowJson | null {
    return value === null || MacAnswers.isStackedWindow(value);
  }

  public static isAppList(value: unknown): value is IMacAppListJson {
    return MacAnswers.isFields(value) && typeof value[Resources.macHostField] === "string"
      && MacAnswers.isListOf(value[Resources.macRunningField], t => MacAnswers.isApp(t))
      && MacAnswers.isListOf(value[Resources.macInstalledField], t => MacAnswers.isApp(t));
  }

  public static isAppDescriptionOrNull(value: unknown): value is IMacAppDescriptionJson | null {
    return value === null || (MacAnswers.hasAll(value, "string", [Resources.macNameField, Resources.macPathField])
      && MacAnswers.isStringOrNull(value[Resources.macIconField]));
  }

  public static isWatchPoll(value: unknown): value is IMacWatchPollJson {
    return MacAnswers.hasAll(value, "boolean", [Resources.macHasMovedField]);
  }

  public static isPoint(value: unknown): value is IMacPointJson {
    return MacAnswers.hasAll(value, "number", [Resources.macXField, Resources.macYField]);
  }

  public static isOutcome(value: unknown): value is IMacOutcomeJson {
    return MacAnswers.isFields(value) && MacAnswers.OUTCOME_STATUSES.some(t => t === value[Resources.macStatusField])
      && (value[Resources.macReasonField] === undefined || typeof value[Resources.macReasonField] === "string")
      && (value[Resources.macInputSentField] === undefined || typeof value[Resources.macInputSentField] === "boolean");
  }

  public static isControlSlice(value: unknown): value is IMacControlSliceJson {
    return MacAnswers.hasAll(value, "number", [Resources.macReadField, Resources.macLeftOutField])
      && MacAnswers.hasAll(value, "boolean", [Resources.macTimedOutField, Resources.macIsDoneField])
      && MacAnswers.isListOf(value[Resources.macControlsField], t => MacAnswers.isControl(t));
  }

  public static isControlSpotOrNull(value: unknown): value is IMacControlSpotJson | null {
    return value === null || (MacAnswers.hasAll(value, "string", [Resources.macRoleField, Resources.macSubroleField, Resources.macNameField])
      && typeof value[Resources.macIsEnabledField] === "boolean" && MacAnswers.hasAll(value, "number", MacAnswers.FRAME_FIELDS));
  }

  public static isBoolean(value: unknown): value is boolean {
    return typeof value === "boolean";
  }

  private static isDisplay(value: unknown): value is IMacDisplayJson {
    return MacAnswers.hasAll(value, "string", [Resources.macIdField]) && MacAnswers.hasAll(value, "number", MacAnswers.FRAME_FIELDS)
      && MacAnswers.hasAll(value, "number", [Resources.macScaleFactorField]) && typeof value[Resources.macIsPrimaryField] === "boolean";
  }

  private static isStackedWindow(value: unknown): value is IMacStackedWindowJson {
    return MacAnswers.hasAll(value, "string", [Resources.macWindowIdField, Resources.macBundleIdField])
      && MacAnswers.hasAll(value, "number", MacAnswers.FRAME_FIELDS);
  }

  private static isApp(value: unknown): value is IMacAppJson {
    return MacAnswers.hasAll(value, "string", [Resources.macBundleIdField, Resources.macNameField]);
  }

  private static isControl(value: unknown): value is IMacControlJson {
    return MacAnswers.hasAll(value, "string", [Resources.macHandleField, Resources.macBundleIdField, Resources.macRoleField])
      && MacAnswers.hasAll(value, "string", [Resources.macSubroleField, Resources.macNameField])
      && MacAnswers.isStringOrNull(value[Resources.macParentHandleField]) && MacAnswers.isStringOrNull(value[Resources.macValueField])
      && MacAnswers.hasAll(value, "boolean", [Resources.macIsEnabledField, Resources.macIsFocusedField, Resources.macIsSelectedField])
      && (value[Resources.macIsExpandedField] === null || typeof value[Resources.macIsExpandedField] === "boolean")
      && MacAnswers.hasAll(value, "number", [Resources.macCheckStateField]) && MacAnswers.hasAll(value, "number", MacAnswers.FRAME_FIELDS);
  }

  private static isStringOrNull(value: unknown): boolean {
    return value === null || typeof value === "string";
  }

  private static isListOf(value: unknown, isItem: (item: unknown) => boolean): boolean {
    return MacAnswers.isList(value) && value.every(isItem);
  }

  private static hasAll(value: unknown, kind: string, names: readonly string[]): value is { readonly [name: string]: unknown } {
    return MacAnswers.isFields(value) && names.every(t => typeof value[t] === kind);
  }

  private static isList(value: unknown): value is readonly unknown[] {
    return Array.isArray(value);
  }

  private static isFields(value: unknown): value is { readonly [name: string]: unknown } {
    return typeof value === "object" && value !== null && !Array.isArray(value);
  }
}
