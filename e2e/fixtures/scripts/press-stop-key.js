/**
 * @license
 * Copyright (c) Noldova.
 *
 * This source code is licensed under the license found in the
 * LICENSE file in the root directory of this source tree.
 */

ObjC.import("CoreGraphics");

const HID_TAP = 0;
const COMMAND_KEY = 55;
const SHIFT_KEY = 56;
const PERIOD_KEY = 47;
const COMMAND_FLAG = 0x100000;
const SHIFT_FLAG = 0x20000;

function post(key, isDown, flags) {
  const event = $.CGEventCreateKeyboardEvent(null, key, isDown);
  $.CGEventSetFlags(event, flags);
  $.CGEventPost(HID_TAP, event);
}

function run() {
  post(COMMAND_KEY, true, COMMAND_FLAG);
  post(SHIFT_KEY, true, COMMAND_FLAG | SHIFT_FLAG);
  post(PERIOD_KEY, true, COMMAND_FLAG | SHIFT_FLAG);
  post(PERIOD_KEY, false, COMMAND_FLAG | SHIFT_FLAG);
  post(SHIFT_KEY, false, COMMAND_FLAG);
  post(COMMAND_KEY, false, 0);
  return "pressed";
}
