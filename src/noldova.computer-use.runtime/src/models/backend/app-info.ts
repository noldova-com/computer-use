/**
 * @license
 * Copyright (c) Noldova.
 *
 * This source code is licensed under the license found in the
 * LICENSE file in the root directory of this source tree.
 */

import { ArgumentOutOfRangeException } from "@noldova/context.exceptions";

import { Resources } from "../../resources.ts";
import type { AppIdentity } from "./app-identity.ts";

export class AppInfo {
  public readonly identity: AppIdentity;
  public readonly isHost: boolean;
  public readonly isRunning: boolean;
  public readonly name: string;
  public readonly publisher: string | null;

  public constructor(identity: AppIdentity, name: string, publisher: string | null, isRunning: boolean, isHost: boolean) {
    if (name.trim() === "")
      throw new ArgumentOutOfRangeException(Resources.nameParameterName, name, Resources.formatEmptyAppName(identity.id));
    if (publisher !== null && publisher.trim() === "")
      throw new ArgumentOutOfRangeException(Resources.publisherParameterName, publisher, Resources.formatEmptyAppPublisher(identity.id));

    this.identity = identity;
    this.isHost = isHost;
    this.isRunning = isRunning;
    this.name = name;
    this.publisher = publisher;
  }
}
