/**
 * @license
 * Copyright (c) Noldova.
 *
 * This source code is licensed under the license found in the
 * LICENSE file in the root directory of this source tree.
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { DesktopPoint, GlidePath } from "@noldova/computer-use.runtime";

describe("GlidePath", () => {
  it("has no steps when the pointer is already at the point", () => {
    const path = GlidePath.between(new DesktopPoint(40, -30), new DesktopPoint(40, -30));

    assert.equal(path.steps.length, 0);
    assert.equal(path.durationMs, 0);
  });

  it("glides 20 units in steps a frame apart, eased out, leaving out a step at the point it already reached", () => {
    const path = GlidePath.between(new DesktopPoint(0, 0), new DesktopPoint(20, 0));

    assert.deepEqual(path.steps.map(t => [t.point.x, t.point.y, t.atMs]), [[16, 0, 16], [20, 0, 32]]);
    assert.equal(path.durationMs, 32);
  });

  for (const [x, y] of [[300, 0], [-290, 410], [0, -1200], [3, 2]] as const)
    it(`glides from (10, 10) by (${x}, ${y}) along a straight line to the point, slowing into it`, () => {
      const path = GlidePath.between(new DesktopPoint(10, 10), new DesktopPoint(10 + x, 10 + y));
      const length = Math.hypot(x, y);
      const points = [new DesktopPoint(10, 10), ...path.steps.map(t => t.point)];
      const advances = points.slice(1).map((t, index) => Math.hypot(t.x - (points[index]?.x ?? 0), t.y - (points[index]?.y ?? 0)));

      assert.deepEqual(path.steps.at(-1)?.point, new DesktopPoint(10 + x, 10 + y));
      for (const step of path.steps)
        assert.ok(Math.abs((step.point.x - 10) * y - (step.point.y - 10) * x) / length <= 1, `(${step.point.x}, ${step.point.y}) is off the line`);
      for (const [index, advance] of advances.slice(1).entries())
        assert.ok(advance <= (advances[index] ?? 0) + 1, `step ${index + 1} moves further than the one before it`);
    });

  it("takes longer for a longer distance, and never longer than the most", () => {
    const durations = [1, 20, 100, 300, 600, 2000, 8000].map(t => GlidePath.between(new DesktopPoint(0, 0), new DesktopPoint(t, 0)).durationMs);

    for (const [index, duration] of durations.slice(1).entries())
      assert.ok(duration >= (durations[index] ?? 0), `${duration} ms is shorter than ${durations[index]} ms`);
    assert.ok((durations[0] ?? 0) > 0);
    assert.ok((durations.at(-1) ?? Infinity) <= GlidePath.maxDurationMs);
    assert.ok(GlidePath.maxDurationMs < 250);
  });

  it("puts each step a frame after the one before, the last one at most a frame after", () => {
    const path = GlidePath.between(new DesktopPoint(0, 0), new DesktopPoint(4000, 0));

    for (const [index, step] of path.steps.entries())
      assert.ok(step.atMs > (path.steps[index - 1]?.atMs ?? 0) && step.atMs <= (index + 1) * GlidePath.stepMs);
    assert.ok(path.durationMs <= GlidePath.maxDurationMs);
  });
});
