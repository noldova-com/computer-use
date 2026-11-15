/**
 * @license
 * Copyright (c) Noldova.
 *
 * This source code is licensed under the license found in the
 * LICENSE file in the root directory of this source tree.
 */

ObjC.import("Cocoa");
ObjC.import("CoreGraphics");

const TITLE = "__TITLE__";
const LOG = "__LOG__";
const CLOSE = "__CLOSE__";
const COMMAND = "__COMMAND__";
const RELEASE = "__RELEASE__";
const RESUME = "__RESUME__";
const WIDTH = 640;
const HEIGHT = 400;
const MARKER = { x: 100, y: 100, size: 48 };
const POINTER_START = { x: 40, y: 360 };
const SAVE = { x: 300, y: 160, width: 96, height: 32 };
const WEB = { x: 420, y: 240, width: 200, height: 120 };
const WEB_PAGE = "<button>Web content's button</button><p>Web content's text</p>";
const MODIFIERS = [["Shift", 1 << 17], ["Control", 1 << 18], ["Alt", 1 << 19], ["Meta", 1 << 20]];
const ANY_EVENT = 4294967295;
const ESCAPE = 53;
const WAIT_S = 0.05;
const STALL_S = 1;
const NIL = $();
const LIST_ON_SCREEN_ONLY = 1;
const LIST_INCLUDING_WINDOW = 8;
const NORMAL_LAYER = 0;
const BORDERLESS = 0;
const MOVE_LISTED_S = 0.5;
const MOVE_LOOK_S = 0.005;
const HOLD_LOOK_S = 0.05;
const ARM64 = 0x0100000c;
const BOOL = Number($.NSRunningApplication.currentApplication.executableArchitecture) === ARM64 ? "bool" : "char";

const lines = [];
let web = null;
let keyView = null;
let downAt = null;
let moveOnPress = null;
let moveOnFocusRead = null;
let isClosing = false;
let isAwaitingFront = false;
let cover = null;

ObjC.registerSubclass({
  name: "NoldovaContentView",
  superclass: "NSView",
  methods: {
    "acceptsFirstMouse:": { types: [BOOL, ["id"]], implementation: function () { return 1; } },
    "mouseDown:": {
      types: ["void", ["id"]],
      implementation: function (event) {
        downAt = pointOf(event);
        if (moveOnPress !== null) {
          moveBy(this.window, moveOnPress.dx, moveOnPress.dy);
          moveOnPress = null;
        }
      },
    },
    "mouseUp:": {
      types: ["void", ["id"]],
      implementation: function (event) {
        const upAt = pointOf(event);
        const from = downAt ?? upAt;
        downAt = null;
        this.window.makeFirstResponder(this.window.initialFirstResponder);
        if (Math.abs(upAt.x - from.x) < 2 && Math.abs(upAt.y - from.y) < 2)
          log(`click ${from.x - MARKER.x} ${from.y - MARKER.y} ${Number(event.clickCount)} ${modifiersOf(event).join(" ")}`.trimEnd());
        else
          log(`drag ${upAt.x - from.x} ${upAt.y - from.y} ${modifiersOf(event).join(" ")}`.trimEnd());
      },
    },
    "scrollWheel:": {
      types: ["void", ["id"]],
      implementation: function (event) {
        log(`scroll ${Math.sign(Number(event.scrollingDeltaX))} ${Math.sign(Number(event.scrollingDeltaY))}`);
      },
    },
    "performKeyEquivalent:": {
      types: [BOOL, ["id"]],
      implementation: function (event) {
        if (Number(event.keyCode) !== ESCAPE)
          return 0;
        log("escape");
        isClosing = true;
        return 1;
      },
    },
  },
});

ObjC.registerSubclass({
  name: "NoldovaSaveTarget",
  superclass: "NSObject",
  methods: {
    "pressSave:": { types: ["void", ["id"]], implementation: function () { log("pressed save"); } },
  },
});
const saveTarget = $.NoldovaSaveTarget.alloc.init;
let webDelegate = null;

ObjC.registerSubclass({
  name: "NoldovaKeyView",
  superclass: "NSView",
  methods: {
    acceptsFirstResponder: { types: [BOOL, []], implementation: function () { return 1; } },
    "keyDown:": { types: ["void", ["id"]], implementation: function (event) { log(`key ${ObjC.unwrap(event.characters)}`); } },
    accessibilityFocusedUIElement: {
      types: ["id", []],
      implementation: function () {
        if (moveOnFocusRead !== null) {
          $.CGWarpMouseCursorPosition(moveOnFocusRead);
          moveOnFocusRead = null;
          log("moved on focus read");
        }
        return NIL;
      },
    },
    isAccessibilityElement: { types: [BOOL, []], implementation: function () { return 0; } },
  },
});

function uptime() {
  return Number($.NSProcessInfo.processInfo.systemUptime);
}

function wallClockMs() {
  return Number($.NSDate.date.timeIntervalSince1970) * 1000;
}

function log(line) {
  lines.push(line);
  $(`${lines.join("\n")}\n`).writeToFileAtomicallyEncodingError(LOG, true, $.NSUTF8StringEncoding, null);
}

function frameOf(x, y, width, height) {
  return $.NSMakeRect(x, HEIGHT - y - height, width, height);
}

function pointOf(event) {
  const point = event.locationInWindow;

  return { x: Math.round(point.x), y: Math.round(HEIGHT - point.y) };
}

function modifiersOf(event) {
  const flags = Number(event.modifierFlags);

  return MODIFIERS.filter(t => (flags & t[1]) !== 0).map(t => t[0]);
}

function centreOf(window, field) {
  const frame = window.convertRectToScreen(field.convertRectToView(field.bounds, NIL));
  const height = $.NSScreen.screens.objectAtIndex(0).frame.size.height;

  return `${Math.round(frame.origin.x + frame.size.width / 2)} ${Math.round(height - frame.origin.y - frame.size.height / 2)}`;
}

function readListedOrigin(window) {
  const list = ObjC.deepUnwrap(ObjC.castRefToObject($.CGWindowListCopyWindowInfo(LIST_INCLUDING_WINDOW, Number(window.windowNumber))));
  const bounds = Array.isArray(list) ? list[0]?.kCGWindowBounds : undefined;
  return bounds === undefined ? null : { x: bounds.X, y: bounds.Y };
}

function moveBy(window, dx, dy) {
  const origin = window.frame.origin;
  const before = readListedOrigin(window);
  window.setFrameOrigin({ x: origin.x + dx, y: origin.y - dy });
  const isListed = () => {
    const after = readListedOrigin(window);
    return before !== null && after !== null && Math.abs(after.x - before.x - dx) < 0.5 && Math.abs(after.y - before.y - dy) < 0.5;
  };
  const isMoved = waitListed(isListed);
  log(`listed at ${wallClockMs().toFixed(1)}`);
  log(isMoved ? `moved ${dx} ${dy}` : `moved ${dx} ${dy} unlisted`);
}

function readFrontNumber() {
  const list = ObjC.deepUnwrap(ObjC.castRefToObject($.CGWindowListCopyWindowInfo(LIST_ON_SCREEN_ONLY, 0)));
  const processId = $.NSProcessInfo.processInfo.processIdentifier;
  const front = Array.isArray(list) ? list.find(t => t.kCGWindowOwnerPID === processId && t.kCGWindowLayer === NORMAL_LAYER) : undefined;
  return front === undefined ? null : front.kCGWindowNumber;
}

function coverBy(window) {
  if (cover === null) {
    cover = $.NSWindow.alloc.initWithContentRectStyleMaskBackingDefer(window.frame, BORDERLESS, $.NSBackingStoreBuffered, false);
    cover.releasedWhenClosed = false;
    cover.restorable = false;
    cover.backgroundColor = $.NSColor.whiteColor;
  }
  cover.setFrameDisplay(window.frame, true);
  cover.orderFrontRegardless;
  const isCovered = waitListed(() => readFrontNumber() === Number(cover.windowNumber));
  log(`listed at ${wallClockMs().toFixed(1)}`);
  log(isCovered ? "covered" : "covered unlisted");
}

function uncover(window) {
  if (cover !== null)
    cover.orderOut(NIL);
  window.makeKeyAndOrderFront(NIL);
  const isUncovered = waitListed(() => readFrontNumber() === Number(window.windowNumber));
  log(isUncovered ? "uncovered" : "uncovered unlisted");
}

function waitListed(isListed) {
  for (const until = uptime() + MOVE_LISTED_S; !isListed() && uptime() < until;)
    $.NSRunLoop.currentRunLoop.runModeBeforeDate($.NSDefaultRunLoopMode, $.NSDate.dateWithTimeIntervalSinceNow(MOVE_LOOK_S));
  return isListed();
}

function block() {
  const pipe = $.NSFileHandle.fileHandleForReadingAtPath(RELEASE);
  pipe.readDataOfLength(1);
  pipe.closeFile;
}

function hold() {
  while (!$.NSFileManager.defaultManager.fileExistsAtPath(RESUME))
    $.NSRunLoop.currentRunLoop.runUntilDate($.NSDate.dateWithTimeIntervalSinceNow(HOLD_LOOK_S));
  $.NSFileManager.defaultManager.removeItemAtPathError(RESUME, null);
}

function readWebDelegate() {
  if (webDelegate !== null)
    return webDelegate;
  ObjC.registerSubclass({
    name: "NoldovaWebDelegate",
    superclass: "NSObject",
    protocols: ["WKNavigationDelegate"],
    methods: {
      "webView:didFinishNavigation:": { types: ["void", ["id", "id"]], implementation: function () { log("web ready"); } },
      "webView:didFailNavigation:withError:": { types: ["void", ["id", "id", "id"]], implementation: function (view, navigation, error) { log(`failed web: ${ObjC.unwrap(error.localizedDescription)}`); } },
      "webView:didFailProvisionalNavigation:withError:": { types: ["void", ["id", "id", "id"]], implementation: function (view, navigation, error) { log(`failed web: ${ObjC.unwrap(error.localizedDescription)}`); } },
    },
  });
  webDelegate = $.NoldovaWebDelegate.alloc.init;
  return webDelegate;
}

function unfocus(window) {
  if (keyView === null) {
    keyView = $.NoldovaKeyView.alloc.initWithFrame(frameOf(0, 0, 1, 1));
    window.contentView.addSubview(keyView);
  }
  if (!window.makeFirstResponder(keyView))
    throw new Error("The key view didn't take the keyboard focus.");
  log("unfocused");
}

function runCommand(window) {
  const manager = $.NSFileManager.defaultManager;
  if (!manager.fileExistsAtPath(COMMAND))
    return;
  const line = ObjC.unwrap($.NSString.stringWithContentsOfFileEncodingError(COMMAND, $.NSUTF8StringEncoding, null)) ?? "";
  manager.removeItemAtPathError(COMMAND, null);
  const [name, first, second] = line.trim().split(" ");
  const [x, y] = [Number(first), Number(second)];
  if (name === "throw")
    throw new Error(line.trim().slice(name.length + 1));
  try {
    if (name === "move")
      moveBy(window, x, y);
    else if (name === "cover")
      coverBy(window);
    else if (name === "uncover")
      uncover(window);
    else if (name === "move-on-press") {
      moveOnPress = { dx: x, dy: y };
      log("armed");
    } else if (name === "web" && web === null) {
      ObjC.import("WebKit");
      web = $.WKWebView.alloc.initWithFrameConfiguration(frameOf(WEB.x, WEB.y, WEB.width, WEB.height), $.WKWebViewConfiguration.alloc.init);
      web.navigationDelegate = readWebDelegate();
      window.contentView.addSubview(web);
      web.loadHTMLStringBaseURL($(WEB_PAGE), NIL);
    } else if (name === "unweb" && web !== null) {
      web.removeFromSuperview;
      web = null;
      log("web closed");
    } else if (name === "hold") {
      log("holding");
      hold();
      log("held");
    } else if (name === "block") {
      log("blocking");
      block();
      log("unblocked");
    } else if (name === "unfocus") {
      unfocus(window);
    } else if (name === "move-on-focus-read") {
      unfocus(window);
      moveOnFocusRead = { x, y };
      log("armed");
    } else if (name === "front") {
      isAwaitingFront = true;
    }
  } catch (error) {
    log(`failed ${line.trim()}: ${error}`);
  }
}

function desktopPointOf(window, point) {
  const origin = window.convertRectToScreen($.NSMakeRect(point.x, HEIGHT - point.y, 0, 0)).origin;
  const height = $.NSScreen.screens.objectAtIndex(0).frame.size.height;

  return { x: origin.x, y: height - origin.y };
}

function makeField(view, isSecure, y) {
  const field = (isSecure ? $.NSSecureTextField : $.NSTextField).alloc.initWithFrame(frameOf(300, y, 280, 24));
  view.addSubview(field);

  return field;
}

function openWindow() {
  const window = $.NSWindow.alloc.initWithContentRectStyleMaskBackingDefer($.NSMakeRect(80, 200, WIDTH, HEIGHT), 1 | 2, $.NSBackingStoreBuffered, false);
  window.title = TITLE;
  window.releasedWhenClosed = false;
  window.restorable = false;
  window.backgroundColor = $.NSColor.whiteColor;
  const view = $.NoldovaContentView.alloc.initWithFrame($.NSMakeRect(0, 0, WIDTH, HEIGHT));
  const textField = makeField(view, false, 40);
  const secureField = makeField(view, true, 100);
  const marker = $.NSBox.alloc.initWithFrame(frameOf(MARKER.x, MARKER.y, MARKER.size, MARKER.size));
  marker.boxType = 4;
  marker.borderWidth = 0;
  marker.titlePosition = 0;
  marker.fillColor = $.NSColor.colorWithSRGBRedGreenBlueAlpha(1, 0, 1, 1);
  marker.contentView = $.NoldovaContentView.alloc.initWithFrame($.NSMakeRect(0, 0, MARKER.size, MARKER.size));
  view.addSubview(marker);
  const save = $.NSButton.alloc.initWithFrame(frameOf(SAVE.x, SAVE.y, SAVE.width, SAVE.height));
  save.title = "Save";
  save.bezelStyle = 1;
  save.target = saveTarget;
  save.action = "pressSave:";
  view.addSubview(save);
  window.contentView = view;
  window.initialFirstResponder = textField;
  textField.nextKeyView = secureField;
  secureField.nextKeyView = textField;

  return { window, textField, secureField };
}

function textsOf(view, depth) {
  const texts = view.isKindOfClass($.NSTextField) ? [ObjC.unwrap(view.stringValue)] : [];
  const views = view.subviews;
  for (let index = 0; depth < 6 && index < Number(views.count); index++)
    texts.push(...textsOf(views.objectAtIndex(index), depth + 1));
  return texts.filter(t => typeof t === "string" && t !== "");
}

function watchStalls(window, lastTurn) {
  let isStalled = false;
  const timer = $.NSTimer.timerWithTimeIntervalRepeatsBlock(STALL_S / 2, true, () => {
    const isTurning = uptime() - lastTurn.at < STALL_S;
    if (isStalled && isTurning) {
      isStalled = false;
      log("resumed");
    }
    if (isStalled || isTurning)
      return;
    isStalled = true;
    const origin = window.frame.origin;
    const modal = $.NSApplication.sharedApplication.modalWindow;
    const texts = modal.isNil() ? [] : textsOf(modal.contentView, 0);
    log(`stalled ${ObjC.unwrap($.NSRunLoop.currentRunLoop.currentMode)} ${Number($.NSEvent.pressedMouseButtons)} ${Math.round(origin.x)} ${Math.round(origin.y)} ${JSON.stringify(texts)}`);
  });
  $.NSRunLoop.currentRunLoop.addTimerForMode(timer, $.NSRunLoopCommonModes);
}

function run() {
  const app = $.NSApplication.sharedApplication;
  const folder = $(CLOSE).stringByDeletingLastPathComponent;
  if (!$.NSFileManager.defaultManager.fileExistsAtPath(folder))
    return;
  const { window, textField, secureField } = openWindow();
  app.activateIgnoringOtherApps(true);
  window.makeKeyAndOrderFront(NIL);
  window.makeFirstResponder(textField);
  let isReady = false;
  const texts = new Map([["text", ""], ["secret", ""]]);
  let focused = "";
  const lastTurn = { at: uptime() };
  watchStalls(window, lastTurn);
  while (!isClosing) {
    lastTurn.at = uptime();
    const event = app.nextEventMatchingMaskUntilDateInModeDequeue(ANY_EVENT, $.NSDate.dateWithTimeIntervalSinceNow(WAIT_S), $.NSDefaultRunLoopMode, true);
    if (!event.isNil())
      app.sendEvent(event);
    for (const [name, field] of [["text", textField], ["secret", secureField]]) {
      const text = ObjC.unwrap(field.stringValue);
      if (text !== texts.get(name)) {
        texts.set(name, text);
        log(`${name} ${text}`);
      }
      if (!field.currentEditor.isNil() && focused !== name) {
        focused = name;
        log(`focus ${name}`);
      } else if (field.currentEditor.isNil() && focused === name) {
        focused = "";
      }
    }
    runCommand(window);
    if ($.NSFileManager.defaultManager.fileExistsAtPath(CLOSE) || !$.NSFileManager.defaultManager.fileExistsAtPath(folder))
      isClosing = true;
    else if (isAwaitingFront && app.isActive && window.isKeyWindow) {
      isAwaitingFront = false;
      log("front");
    }
    if (!isClosing && !isReady && app.isActive && window.isKeyWindow) {
      isReady = true;
      const start = desktopPointOf(window, POINTER_START);
      log(`ready ${$.NSProcessInfo.processInfo.processIdentifier} ${window.windowNumber} ${centreOf(window, textField)} ${centreOf(window, secureField)} ${Math.round(start.x)} ${Math.round(start.y)}`);
    }
  }
  log("closed");
}
