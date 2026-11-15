/**
 * @license
 * Copyright (c) Noldova.
 *
 * This source code is licensed under the license found in the
 * LICENSE file in the root directory of this source tree.
 */

ObjC.import("Cocoa");

const ACCESSORY = 1;
const BORDERLESS = 0;
const FLOATING_LEVEL = 3;
const ANY_EVENT = 4294967295;
const WAIT_S = 0.05;

function run(argv) {
  const [x, y, width, height] = argv.slice(0, 4).map(Number);
  const [logFile, closeFile] = argv.slice(4);
  const app = $.NSApplication.sharedApplication;
  app.setActivationPolicy(ACCESSORY);
  const mainHeight = $.NSScreen.screens.objectAtIndex(0).frame.size.height;
  const window = $.NSWindow.alloc.initWithContentRectStyleMaskBackingDefer($.NSMakeRect(x, mainHeight - y - height, width, height), BORDERLESS, $.NSBackingStoreBuffered, false);
  window.releasedWhenClosed = false;
  window.restorable = false;
  window.level = FLOATING_LEVEL;
  window.backgroundColor = $.NSColor.colorWithSRGBRedGreenBlueAlpha(0, 1, 0, 1);
  window.orderFrontRegardless;
  let isReady = false;
  while (!$.NSFileManager.defaultManager.fileExistsAtPath(closeFile)) {
    const event = app.nextEventMatchingMaskUntilDateInModeDequeue(ANY_EVENT, $.NSDate.dateWithTimeIntervalSinceNow(WAIT_S), $.NSDefaultRunLoopMode, true);
    if (!event.isNil())
      app.sendEvent(event);
    if (!isReady && window.isVisible) {
      isReady = true;
      $(`ready ${window.windowNumber}\n`).writeToFileAtomicallyEncodingError(logFile, true, $.NSUTF8StringEncoding, null);
    }
  }
  window.orderOut($());
}
