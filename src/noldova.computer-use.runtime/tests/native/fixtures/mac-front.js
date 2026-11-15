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
const EXCLUDE_DESKTOP = 16;
const NORMAL_LAYER = 0;
const WINDOWS = 8;

function run() {
  const app = $.NSWorkspace.sharedWorkspace.frontmostApplication;
  const bundle = app.isNil() ? null : ObjC.unwrap(app.bundleIdentifier);
  const front = app.isNil() ? null : { name: ObjC.unwrap(app.localizedName) ?? "", bundle: typeof bundle === "string" ? bundle : "", pid: app.processIdentifier };
  const list = ObjC.deepUnwrap(ObjC.castRefToObject($.CGWindowListCopyWindowInfo(ON_SCREEN_ONLY | EXCLUDE_DESKTOP, 0)));
  const windows = (Array.isArray(list) ? list : []).filter(t => t.kCGWindowLayer === NORMAL_LAYER).slice(0, WINDOWS)
    .map(t => ({ owner: t.kCGWindowOwnerName ?? "", pid: t.kCGWindowOwnerPID, bounds: t.kCGWindowBounds }));

  return JSON.stringify({ front, windows });
}
