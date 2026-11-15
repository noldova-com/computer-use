/**
 * @license
 * Copyright (c) Noldova.
 *
 * This source code is licensed under the license found in the
 * LICENSE file in the root directory of this source tree.
 */

import type { DesktopPoint } from "@noldova/computer-use.runtime";

export interface IPointerSample {
  readonly atMs: number;
  readonly x: number;
  readonly y: number;
}

export class GlideRecording {
  public readonly durationMs: number;
  public readonly halfwayShare: number;
  public readonly isArrived: boolean;
  public readonly maxOffPath: number;
  public readonly passed: readonly IPointerSample[];
  public readonly samples: number;

  private constructor(samples: readonly IPointerSample[], from: DesktopPoint, to: DesktopPoint) {
    const length = Math.hypot(to.x - from.x, to.y - from.y);
    const isAt = (sample: IPointerSample, point: DesktopPoint): boolean => sample.x === point.x && sample.y === point.y;
    const away = samples.findIndex(t => !isAt(t, from));
    const arrived = samples.findIndex(t => isAt(t, to));
    const startMs = samples[Math.max(0, away - 1)]?.atMs ?? 0;
    const endMs = samples[arrived]?.atMs ?? samples.at(-1)?.atMs ?? 0;
    const halfway = samples.findLast(t => t.atMs <= startMs + (endMs - startMs) / 2) ?? { atMs: 0, x: from.x, y: from.y };
    this.durationMs = endMs - startMs;
    this.halfwayShare = ((halfway.x - from.x) * (to.x - from.x) + (halfway.y - from.y) * (to.y - from.y)) / (length * length);
    this.isArrived = arrived >= 0;
    this.maxOffPath = Math.max(0, ...samples.map(t => Math.abs((t.x - from.x) * (to.y - from.y) - (t.y - from.y) * (to.x - from.x)) / length));
    this.passed = samples.filter((t, index) => !isAt(t, from) && !isAt(t, to) && (index === 0 || t.x !== samples[index - 1]?.x || t.y !== samples[index - 1]?.y));
    this.samples = samples.length;
  }

  public static of(samples: readonly IPointerSample[], from: DesktopPoint, to: DesktopPoint): GlideRecording {
    return new GlideRecording(samples, from, to);
  }

  public static slowSteps(from: DesktopPoint, to: DesktopPoint): readonly IPointerSample[] {
    return Array.from({ length: 50 }, (_, index) => {
      const share = (index + 1) / 50;

      return { atMs: (index + 1) * 20, x: Math.round(from.x + (to.x - from.x) * share), y: Math.round(from.y + (to.y - from.y) * share) };
    });
  }

  public static heldSteps(from: DesktopPoint, to: DesktopPoint): readonly IPointerSample[] {
    return Array.from({ length: 50 }, (_, index) => index < 49 ? { atMs: (index + 1) * 20, x: from.x, y: from.y } : { atMs: 1000, x: to.x, y: to.y });
  }

  public describe(): string {
    return `${this.passed.length} positions between start and end in ${this.durationMs.toFixed(1)} ms, ${(this.halfwayShare * 100).toFixed(0)}% of the way at half the time, `
      + `at most ${this.maxOffPath.toFixed(2)} units off the straight path, from ${this.samples} readings: ${this.passed.map(t => `${t.atMs.toFixed(1)} ms (${t.x}, ${t.y})`).join(", ")}`;
  }
}
