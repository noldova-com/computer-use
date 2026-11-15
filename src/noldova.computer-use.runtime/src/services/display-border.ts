/**
 * @license
 * Copyright (c) Noldova.
 *
 * This source code is licensed under the license found in the
 * LICENSE file in the root directory of this source tree.
 */

import type { ControlState } from "@noldova/computer-use.protocol";

import type { IBorderBackend } from "../interfaces/backend/i-border-backend.ts";
import type { IDisplayBackend } from "../interfaces/i-display-backend.ts";
import { BorderFrame } from "../models/backend/border-frame.ts";
import { Resources } from "../resources.ts";

export class DisplayBorder {
  private readonly backend: IBorderBackend;
  private readonly displays: IDisplayBackend;
  private readonly ended: PromiseWithResolvers<void> = Promise.withResolvers<void>();
  private readonly isAllowed: () => boolean;
  private readonly lifetime: AbortController = new AbortController();
  private readonly log: (line: string) => void;
  private check: NodeJS.Timeout | null = null;
  private color: string;
  private hidesLeft: number = 0;
  private isControlling: boolean = false;
  private isEnding: boolean = false;
  private isShown: boolean = false;
  private running: Promise<void> = Promise.resolve();

  public constructor(backend: IBorderBackend, displays: IDisplayBackend, isAllowed: () => boolean, color: string, log: (line: string) => void) {
    this.backend = backend;
    this.displays = displays;
    this.isAllowed = isAllowed;
    this.color = color;
    this.log = log;
  }

  public follow(state: ControlState): void {
    this.isControlling = state.isControlling;
    this.update();
  }

  public setColor(color: string): void {
    this.color = color;
    this.update();
  }

  public update(): void {
    void this.runAsync(async () => await this.applyAsync());
  }

  public async disposeAsync(): Promise<void> {
    this.isControlling = false;
    void this.runAsync(async () => {
      this.isEnding = true;
      this.hidesLeft = Resources.borderHideTries;
      await this.applyAsync();
    });
    await this.ended.promise;
    await this.running;
  }

  public cancel(): void {
    this.end();
  }

  private async runAsync(action: () => Promise<void>): Promise<void> {
    const ran = this.running.then(action).catch((error: unknown) => this.log(Resources.formatBorderFailed(String(error))));
    this.running = ran;
    await ran;
  }

  private async applyAsync(): Promise<void> {
    if (this.lifetime.signal.aborted)
      return;
    this.endCheck();
    if (!this.isControlling || !this.isAllowed()) {
      try {
        if (this.isShown)
          await this.hideAsync();
      } finally {
        if (this.isEnding && (!this.isShown || this.hidesLeft === 0))
          this.end();
      }
      return;
    }

    this.startCheck();
    const frames = (await this.displays.listDisplaysAsync(this.lifetime.signal)).map(t => BorderFrame.of(t, this.backend.unitsPerPixel(t)));
    this.isShown = true;
    await this.backend.showAsync(frames, this.color, this.lifetime.signal);
  }

  private async hideAsync(): Promise<void> {
    if (this.isEnding)
      this.hidesLeft -= 1;
    if (!this.isEnding || this.hidesLeft > 0)
      this.startCheck();
    await this.backend.hideAsync(this.lifetime.signal);
    this.isShown = false;
    this.endCheck();
  }

  private startCheck(): void {
    this.check = setTimeout(() => this.update(), Resources.borderCheckMs).unref();
  }

  private endCheck(): void {
    if (this.check !== null)
      clearTimeout(this.check);
    this.check = null;
  }

  private end(): void {
    this.endCheck();
    this.lifetime.abort();
    this.ended.resolve();
  }
}
