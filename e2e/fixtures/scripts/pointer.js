/**
 * @license
 * Copyright (c) Noldova.
 *
 * This source code is licensed under the license found in the
 * LICENSE file in the root directory of this source tree.
 */

ObjC.import("CoreGraphics");

function read() {
  const point = $.CGEventGetLocation($.CGEventCreate(null));
  return `${Math.round(point.x)},${Math.round(point.y)}`;
}

function run(argv) {
  if (argv.length === 2) {
    const failure = $.CGWarpMouseCursorPosition($.CGPointMake(Number(argv[0]), Number(argv[1])));
    if (failure !== 0)
      throw new Error(`CGWarpMouseCursorPosition failed with ${failure}.`);
    $.CGAssociateMouseAndMouseCursorPosition(true);
  }
  return read();
}
