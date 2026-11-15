/**
 * @license
 * Copyright (c) Noldova.
 *
 * This source code is licensed under the license found in the
 * LICENSE file in the root directory of this source tree.
 */

import type { AppTier } from "../models/app-tier.ts";
import type { AppInfo } from "../models/backend/app-info.ts";
import type { AppClassifier } from "./app-classifier.ts";

export class TierPolicy {
  private readonly classifier: AppClassifier;

  public constructor(classifier: AppClassifier) {
    this.classifier = classifier;
  }

  public isBroadReach(app: AppInfo): boolean {
    return this.classifier.classify(app.identity).isBroadReach;
  }

  public tierOf(app: AppInfo): AppTier | null {
    if (app.isHost)
      return null;

    return this.classifier.classify(app.identity).tier;
  }
}
