/**
 * @license
 * Copyright (c) Noldova.
 *
 * This source code is licensed under the license found in the
 * LICENSE file in the root directory of this source tree.
 */

ObjC.import("CoreGraphics");
ObjC.import("Foundation");

const MOUSE_MOVED = 5;
const HID_TAP = 0;
const HID_STATE = 1;
const LEFT = 0;
const POINTER_TYPES = [1, 2, 3, 4, 5, 6, 7, 22, 25, 26, 27];
const INTERVAL_S = 0.001;

function nowMs() {
  return Number($.NSProcessInfo.processInfo.systemUptime) * 1000;
}

function write(text) {
  $.NSFileHandle.fileHandleWithStandardOutput.writeData($(text).dataUsingEncoding($.NSUTF8StringEncoding));
}

function countPointerEvents() {
  return POINTER_TYPES.reduce((sum, t) => sum + Number($.CGEventSourceCounterForEventType(HID_STATE, t)), 0);
}

function readPointer() {
  return $.CGEventGetLocation($.CGEventCreate(null));
}

function readLine() {
  const line = $.NSFileHandle.fileHandleWithStandardInput.availableData;
  return Number(line.length) === 0 ? null : ObjC.unwrap($.NSString.alloc.initWithDataEncoding(line, $.NSUTF8StringEncoding));
}

function waitCounted(before, events, start, rises, end) {
  for (; nowMs() < end; $.NSThread.sleepForTimeInterval(INTERVAL_S)) {
    const count = countPointerEvents() - before;
    if (count !== (rises.length === 0 ? 0 : rises[rises.length - 1].count))
      rises.push({ count, at: nowMs() - start });
    if (count >= events)
      return true;
  }
  return false;
}

function move(to) {
  $.CGEventPost(HID_TAP, $.CGEventCreateMouseEvent(null, MOUSE_MOVED, to, LEFT));
}

function run(argv) {
  const to = { x: Number(argv[0]), y: Number(argv[1]) };
  const end = nowMs() + Number(argv[2]);
  $.CGEventPost(HID_TAP, $.CGEventCreate(null));
  write("ready\n");
  const line = readLine();
  if (line === null)
    return "";
  const [events, afterMs, holdMs = 0] = line.trim().split(" ").map(Number);
  const before = countPointerEvents();
  const armedAt = nowMs();
  const rises = [];
  let posted = "none";
  write("armed\n");
  if (waitCounted(before, events, armedAt, rises, end)) {
    $.NSThread.sleepForTimeInterval(afterMs / 1000);
    move(to);
    posted = (nowMs() - armedAt).toFixed(2);
    waitCounted(before, events + 1, armedAt, rises, end);
  }
  const held = armedAt + holdMs - nowMs();
  if (held > 0)
    $.NSThread.sleepForTimeInterval(held / 1000);
  write(`times posted ${posted}, counted ${rises.map(t => `${t.count} at ${t.at.toFixed(2)}`).join(", ")}\n`);
  const point = readPointer();
  write(`counted ${countPointerEvents() - before} ${point.x} ${point.y}\n`);
  return "";
}
