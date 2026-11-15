/**
 * @license
 * Copyright (c) Noldova.
 *
 * This source code is licensed under the license found in the
 * LICENSE file in the root directory of this source tree.
 */

ObjC.import("CoreGraphics");

function run(argv) {
  const pointer = $.CGEventGetLocation($.CGEventCreate(null));
  $.CGWarpMouseCursorPosition({ x: Number(argv[0]), y: Number(argv[1]) });

  return `${pointer.x} ${pointer.y}`;
}
