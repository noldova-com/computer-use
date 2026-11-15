/**
 * @license
 * Copyright (c) Noldova.
 *
 * This source code is licensed under the license found in the
 * LICENSE file in the root directory of this source tree.
 */

import { type ControlSpot, ControlTree, type DesktopPoint, type IControlBackend, type InputTarget } from "@noldova/computer-use.runtime";

export class ControlBackendDouble implements IControlBackend {
  private readonly spots: Map<string, ControlSpot> = new Map();
  private readonly trees: Map<string | null, ControlTree> = new Map();

  public readonly covered: Set<string> = new Set();
  public failure: unknown;
  public readonly hits: { readonly handle: string; readonly at: DesktopPoint }[] = [];
  public searchFailure: unknown;
  public readonly searches: string[] = [];
  public readonly reads: (string | null)[] = [];
  public readonly targets: InputTarget[] = [];

  public set(underHandle: string | null, tree: ControlTree): void {
    this.trees.set(underHandle, tree);
  }

  public setSpot(handle: string, spot: ControlSpot): void {
    this.spots.set(handle, spot);
  }

  public async readControlsAsync(target: InputTarget, underHandle: string | null, signal: AbortSignal): Promise<ControlTree> {
    signal.throwIfAborted();
    this.targets.push(target);
    this.reads.push(underHandle);
    if (this.failure !== undefined)
      throw this.failure;

    return this.trees.get(underHandle) ?? new ControlTree([], 0, false);
  }

  public removeSpot(handle: string): void {
    this.spots.delete(handle);
  }

  public async findControlAsync(target: InputTarget, handle: string, signal: AbortSignal): Promise<ControlSpot | null> {
    signal.throwIfAborted();
    this.targets.push(target);
    this.searches.push(handle);
    if (this.searchFailure !== undefined)
      throw this.searchFailure;

    return this.spots.get(handle) ?? null;
  }

  public async isControlAtAsync(target: InputTarget, handle: string, at: DesktopPoint, signal: AbortSignal): Promise<boolean> {
    signal.throwIfAborted();
    this.targets.push(target);
    this.hits.push({ handle, at });

    return this.spots.has(handle) && !this.covered.has(handle);
  }
}
