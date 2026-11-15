/**
 * @license
 * Copyright (c) Noldova.
 *
 * This source code is licensed under the license found in the
 * LICENSE file in the root directory of this source tree.
 */

import { Resources } from "../resources.ts";
import { ReleaseException } from "./release.exception.ts";

export class CheckoutMismatchException extends ReleaseException {
  public readonly head: string;
  public readonly commit: string;

  public constructor(head: string, commit: string) {
    super(Resources.formatCheckoutMismatch(head, commit));

    this.head = head;
    this.commit = commit;
  }
}
