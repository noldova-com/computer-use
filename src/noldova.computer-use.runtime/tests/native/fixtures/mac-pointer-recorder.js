/**
 * @license
 * Copyright (c) Noldova.
 *
 * This source code is licensed under the license found in the
 * LICENSE file in the root directory of this source tree.
 */

ObjC.import("CoreGraphics");
ObjC.import("Foundation");

const INTERVAL_S = 0.002;

function nowMs() {
  return Number($.NSProcessInfo.processInfo.systemUptime) * 1000;
}

function write(text) {
  $.NSFileHandle.fileHandleWithStandardOutput.writeData($(text).dataUsingEncoding($.NSUTF8StringEncoding));
}

function run(argv) {
  const from = { x: Number(argv[0]), y: Number(argv[1]) };
  const spanMs = Number(argv[2]);
  const stopPath = argv[4] ?? null;
  const lines = [];
  let end = nowMs() + Number(argv[3]);
  let hasLeft = false;
  write("ready\n");
  for (; nowMs() < end; $.NSThread.sleepForTimeInterval(INTERVAL_S)) {
    const point = $.CGEventGetLocation($.CGEventCreate(null));
    lines.push(`${nowMs().toFixed(2)} ${point.x} ${point.y}`);
    if (!hasLeft && (Math.round(point.x) !== from.x || Math.round(point.y) !== from.y)) {
      hasLeft = true;
      end = nowMs() + spanMs;
      if (stopPath !== null && !$("").writeToFileAtomicallyEncodingError(stopPath, false, $.NSUTF8StringEncoding, null))
        throw new Error("The recorder couldn't write the stop file.");
      write("left\n");
    }
  }
  write(`${lines.join("\n")}\n`);
  return "";
}
