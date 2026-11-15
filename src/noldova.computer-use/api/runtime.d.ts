/**
 * @license
 * Copyright (c) Noldova.
 *
 * This source code is licensed under the license found in the
 * LICENSE file in the root directory of this source tree.
 */

/**
 * The module's runtime part, which Noldova Desktop constructs with no arguments for an app that lists the module. It hosts the agent tools,
 * which teammates get only while the `computer-use.enabled` setting is on, and loads the operating system's backend on the first tool call.
 *
 * @example
 * ```ts
 * import { RuntimePart } from "@noldova/computer-use/runtime";
 *
 * const part = new RuntimePart();
 * ```
 */
export { RuntimePart } from "@noldova/computer-use.runtime";
