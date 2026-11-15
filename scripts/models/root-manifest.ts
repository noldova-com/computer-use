/**
 * @license
 * Copyright (c) Noldova.
 *
 * This source code is licensed under the license found in the
 * LICENSE file in the root directory of this source tree.
 */

import { RootVersionInvalidException } from "../exceptions/root-version-invalid.exception.ts";
import { Resources } from "../resources.ts";

export class RootManifest {
  public readonly pins: ReadonlyMap<string, string>;
  public readonly productVersion: string;

  public constructor(productVersion: string, pins: ReadonlyMap<string, string>) {
    if (!Resources.rootVersionPattern.test(productVersion))
      throw new RootVersionInvalidException();

    this.pins = pins;
    this.productVersion = productVersion;
  }

  public static parse(text: string): RootManifest {
    let manifest: unknown;
    try {
      manifest = JSON.parse(text);
    }
    catch (error) {
      if (!(error instanceof SyntaxError))
        throw error;
      throw new RootVersionInvalidException(error);
    }
    if (typeof manifest !== "object" || manifest === null)
      throw new RootVersionInvalidException();
    const fields = new Map<string, unknown>(Object.entries(manifest));
    const version = fields.get(Resources.versionField);
    if (typeof version !== "string")
      throw new RootVersionInvalidException();
    const pins = new Map<string, string>();
    for (const field of Resources.rootPinFields) {
      const dependencies = fields.get(field);
      if (typeof dependencies === "object" && dependencies !== null && !Array.isArray(dependencies))
        for (const [name, pin] of Object.entries(dependencies))
          if (typeof pin === "string")
            pins.set(name, pin);
    }
    return new RootManifest(version, pins);
  }
}
