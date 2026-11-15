/**
 * @license
 * Copyright (c) Noldova.
 *
 * This source code is licensed under the license found in the
 * LICENSE file in the root directory of this source tree.
 */

import type { AppIdentity } from "../models/backend/app-identity.ts";
import { AppCategory } from "../models/app-category.ts";
import { Resources } from "../resources.ts";

export class AppClassifier {
  private static readonly categories: ReadonlyMap<string, AppCategory> = new Map<string, AppCategory>([
    ...Resources.browserAppIds.map(t => [t, AppCategory.Browser] as const),
    ...Resources.tradingAppIds.map(t => [t, AppCategory.Trading] as const),
    ...Resources.terminalAppIds.map(t => [t, AppCategory.Terminal] as const),
    ...Resources.codeEditorAppIds.map(t => [t, AppCategory.CodeEditor] as const),
    ...Resources.fileManagerAppIds.map(t => [t, AppCategory.FileManager] as const),
    ...Resources.systemPromptAppIds.map(t => [t, AppCategory.SystemPrompt] as const),
    ...Resources.systemSettingsAppIds.map(t => [t, AppCategory.SystemSettings] as const),
    ...Resources.credentialStoreAppIds.map(t => [t, AppCategory.CredentialStore] as const)
  ]);

  public classify(identity: AppIdentity): AppCategory {
    const name = identity.id.slice(Math.max(identity.id.lastIndexOf(Resources.windowsPathSeparator), identity.id.lastIndexOf(Resources.posixPathSeparator)) + 1);

    return AppClassifier.categories.get(name.toLowerCase()) ?? AppCategory.Other;
  }
}
