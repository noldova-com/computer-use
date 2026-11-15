/**
 * @license
 * Copyright (c) Noldova.
 *
 * This source code is licensed under the license found in the
 * LICENSE file in the root directory of this source tree.
 */

ObjC.import("CoreGraphics");
ObjC.import("Foundation");

const HID_TAP = 0;
const MOUSE_MOVED = 5;
const LEFT_DOWN = 1;
const LEFT_UP = 2;
const LEFT = 0;
const ON_SCREEN_ONLY = 1;
const INCLUDING_WINDOW = 8;
const SENTINEL_KEY = 6;
const DOCK_OWNER = "Dock";
const DOCK_LAYER = 20;

function ownerAt(point) {
  const list = ObjC.deepUnwrap(ObjC.castRefToObject($.CGWindowListCopyWindowInfo(ON_SCREEN_ONLY, 0)));
  const windows = Array.isArray(list) ? list : [];
  const hit = windows.find(t => t.kCGWindowBounds !== undefined && t.kCGWindowAlpha !== 0 && !isRestingDock(t) && point.x >= t.kCGWindowBounds.X && point.x < t.kCGWindowBounds.X + t.kCGWindowBounds.Width
    && point.y >= t.kCGWindowBounds.Y && point.y < t.kCGWindowBounds.Y + t.kCGWindowBounds.Height);
  return hit === undefined ? { processId: -1, name: "none" } : { processId: hit.kCGWindowOwnerPID, name: hit.kCGWindowOwnerName };
}

function isRestingDock(window) {
  return window.kCGWindowOwnerName === DOCK_OWNER && window.kCGWindowLayer === DOCK_LAYER && window.kCGWindowName === DOCK_OWNER;
}

function boundsOf(windowNumber) {
  const list = ObjC.deepUnwrap(ObjC.castRefToObject($.CGWindowListCopyWindowInfo(INCLUDING_WINDOW, windowNumber)));
  const bounds = Array.isArray(list) ? list[0]?.kCGWindowBounds : undefined;
  if (bounds === undefined)
    throw new Error(`The window ${windowNumber} isn't listed.`);
  return bounds;
}

function click(windowNumber, processId, contentHeight, spots) {
  const bounds = boundsOf(windowNumber);
  const contentTop = bounds.Y + bounds.Height - contentHeight;
  const owners = [];
  for (const spot of spots) {
    const point = { x: bounds.X + spot.x, y: contentTop + spot.y };
    const owner = ownerAt(point);
    if (owner.processId === processId) {
      for (const type of [MOUSE_MOVED, LEFT_DOWN, LEFT_UP])
        $.CGEventPost(HID_TAP, $.CGEventCreateMouseEvent(null, type, point, LEFT));
      return `posted ${spot.x} ${spot.y}`;
    }
    owners.push(`${point.x}, ${point.y} on process ${owner.processId}, ${owner.name}`);
  }
  throw new Error(`No sentinel spot of window ${windowNumber} lies on process ${processId}'s window: ${owners.join("; ")}.`);
}

function readSpots(text) {
  return text.split(";").map(t => {
    const [x, y] = t.split(",").map(Number);
    if (!Number.isFinite(x) || !Number.isFinite(y))
      throw new Error(`The sentinel spot "${t}" isn't two numbers.`);
    return { x, y };
  });
}

function key() {
  for (const isDown of [true, false])
    $.CGEventPost(HID_TAP, $.CGEventCreateKeyboardEvent(null, SENTINEL_KEY, isDown));
}

function run(argv) {
  if (argv[0] === "click")
    return click(Number(argv[1]), Number(argv[2]), Number(argv[3]), readSpots(argv[4] ?? ""));
  if (argv[0] === "key") {
    key();
    return "posted";
  }
  throw new Error(`The sentinel has no kind "${argv[0]}".`);
}
