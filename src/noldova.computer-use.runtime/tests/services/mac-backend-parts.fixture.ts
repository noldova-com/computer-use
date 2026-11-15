/**
 * @license
 * Copyright (c) Noldova.
 *
 * This source code is licensed under the license found in the
 * LICENSE file in the root directory of this source tree.
 */

import { MacBackend } from "@noldova/computer-use.runtime/macos";

import { MacScreenCapturerDouble } from "../doubles/mac-screen-capturer-double.fixture.ts";
import { MacScriptChannelDouble } from "../doubles/mac-script-channel-double.fixture.ts";
import { MacSignatureReaderDouble } from "../doubles/mac-signature-reader-double.fixture.ts";
import { RecordingModuleLog } from "../doubles/recording-module-log.fixture.ts";

export class MacBackendParts {
  private readonly log: RecordingModuleLog = new RecordingModuleLog();
  public readonly backend: MacBackend;
  public readonly capturer: MacScreenCapturerDouble = new MacScreenCapturerDouble();
  public readonly channel: MacScriptChannelDouble = new MacScriptChannelDouble();
  public readonly signatures: MacSignatureReaderDouble = new MacSignatureReaderDouble();

  public constructor(hostPath: string, stopFolder: string) {
    this.backend = new MacBackend(this.channel, this.capturer, this.signatures, hostPath, stopFolder, this.log);
  }

  public get written(): readonly string[] {
    return this.log.messages;
  }
}
