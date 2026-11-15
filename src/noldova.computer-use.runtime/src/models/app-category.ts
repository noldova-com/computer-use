/**
 * @license
 * Copyright (c) Noldova.
 *
 * This source code is licensed under the license found in the
 * LICENSE file in the root directory of this source tree.
 */

import { AppTier } from "./app-tier.ts";

export class AppCategory {
  public static readonly Browser: AppCategory = new AppCategory("Browser", AppTier.ViewOnly, false);
  public static readonly Trading: AppCategory = new AppCategory("Trading", AppTier.ViewOnly, false);
  public static readonly Terminal: AppCategory = new AppCategory("Terminal", AppTier.ClickOnly, true);
  public static readonly CodeEditor: AppCategory = new AppCategory("CodeEditor", AppTier.ClickOnly, false);
  public static readonly FileManager: AppCategory = new AppCategory("FileManager", AppTier.Full, true);
  public static readonly SystemPrompt: AppCategory = new AppCategory("SystemPrompt", null, false);
  public static readonly SystemSettings: AppCategory = new AppCategory("SystemSettings", null, false);
  public static readonly CredentialStore: AppCategory = new AppCategory("CredentialStore", null, false);
  public static readonly Other: AppCategory = new AppCategory("Other", AppTier.Full, false);
  public readonly isBroadReach: boolean;
  public readonly tier: AppTier | null;
  public readonly value: string;

  private constructor(value: string, tier: AppTier | null, isBroadReach: boolean) {
    this.isBroadReach = isBroadReach;
    this.tier = tier;
    this.value = value;
  }
}
