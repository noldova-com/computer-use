/**
 * @license
 * Copyright (c) Noldova.
 *
 * This source code is licensed under the license found in the
 * LICENSE file in the root directory of this source tree.
 */

ObjC.import("Cocoa");
ObjC.import("CoreGraphics");

const ON_SCREEN_ONLY = 1;
const LOOK_S = 0.01;

function run(argv) {
  const files = $.NSFileManager.defaultManager;
  let found = 0;
  let listed = 0;
  while (!files.fileExistsAtPath(argv[1])) {
    const list = ObjC.deepUnwrap(ObjC.castRefToObject($.CGWindowListCopyWindowInfo(ON_SCREEN_ONLY, 0)));
    if (Array.isArray(list)) {
      if (listed++ === 0)
        files.createFileAtPathContentsAttributes(argv[2], $(), $());
      if (list.some(t => t.kCGWindowOwnerName === argv[0]))
        found++;
    }
    delay(LOOK_S);
  }

  return `${found} ${listed}`;
}
