/**
 * @license
 * Copyright (c) Noldova.
 *
 * This source code is licensed under the license found in the
 * LICENSE file in the root directory of this source tree.
 */

ObjC.import("Cocoa");

const ACCESSORY = 1;
const TITLED = 1;
const NONACTIVATING = 128;
const KEY_DOWN = 10;
const ANY_EVENT = 4294967295;
const WAIT_S = 0.05;

function run(argv) {
  const [logFile, closeFile, mode] = argv;
  const lines = [];
  const log = line => {
    lines.push(line);
    $(`${lines.join("\n")}\n`).writeToFileAtomicallyEncodingError(logFile, true, $.NSUTF8StringEncoding, null);
  };
  const app = $.NSApplication.sharedApplication;
  app.setActivationPolicy(ACCESSORY);
  if (mode !== "silent")
    app.finishLaunching;
  const panel = $.NSPanel.alloc.initWithContentRectStyleMaskBackingDefer($.NSMakeRect(700, 300, 300, 120), TITLED | NONACTIVATING, $.NSBackingStoreBuffered, false);
  panel.releasedWhenClosed = false;
  panel.restorable = false;
  panel.floatingPanel = true;
  panel.becomesKeyOnlyIfNeeded = false;
  const field = $.NSTextField.alloc.initWithFrame($.NSMakeRect(20, 40, 260, 24));
  panel.contentView.addSubview(field);
  panel.makeKeyAndOrderFront($());
  panel.makeFirstResponder(field);
  let isReady = false;
  let text = "";
  while (!$.NSFileManager.defaultManager.fileExistsAtPath(closeFile)) {
    const event = app.nextEventMatchingMaskUntilDateInModeDequeue(ANY_EVENT, $.NSDate.dateWithTimeIntervalSinceNow(WAIT_S), $.NSDefaultRunLoopMode, true);
    if (!event.isNil()) {
      if (Number(event.type) === KEY_DOWN)
        log(`key ${ObjC.unwrap(event.characters)}`);
      app.sendEvent(event);
    }
    const now = ObjC.unwrap(field.stringValue);
    if (now !== text) {
      text = now;
      log(`text ${text}`);
    }
    if (!isReady && panel.isKeyWindow) {
      isReady = true;
      log(`ready ${panel.windowNumber}`);
    }
  }
  panel.orderOut($());
}
