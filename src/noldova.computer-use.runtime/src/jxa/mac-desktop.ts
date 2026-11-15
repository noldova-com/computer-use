/**
 * @license
 * Copyright (c) Noldova.
 *
 * This source code is licensed under the license found in the
 * LICENSE file in the root directory of this source tree.
 */

type IMacAppDescriptionJson = import("../interfaces/i-mac-app-description-json.ts").IMacAppDescriptionJson;
type IMacAppJson = import("../interfaces/i-mac-app-json.ts").IMacAppJson;
type IMacAppListJson = import("../interfaces/i-mac-app-list-json.ts").IMacAppListJson;
type IMacControlJson = import("../interfaces/i-mac-control-json.ts").IMacControlJson;
type IMacControlSliceJson = import("../interfaces/i-mac-control-slice-json.ts").IMacControlSliceJson;
type IMacControlSpotJson = import("../interfaces/i-mac-control-spot-json.ts").IMacControlSpotJson;
type IMacDisplayJson = import("../interfaces/i-mac-display-json.ts").IMacDisplayJson;
type IMacGlideStepJson = import("../interfaces/i-mac-glide-step-json.ts").IMacGlideStepJson;
type IMacGrantsJson = import("../interfaces/i-mac-grants-json.ts").IMacGrantsJson;
type IMacOutcomeJson = import("../interfaces/i-mac-outcome-json.ts").IMacOutcomeJson;
type IMacPointJson = import("../interfaces/i-mac-point-json.ts").IMacPointJson;
type IMacStackedWindowJson = import("../interfaces/i-mac-stacked-window-json.ts").IMacStackedWindowJson;
type IMacTargetJson = import("../interfaces/i-mac-target-json.ts").IMacTargetJson;
type IMacWatchPollJson = import("../interfaces/i-mac-watch-poll-json.ts").IMacWatchPollJson;
type IMacWindowJson = import("../interfaces/i-mac-window-json.ts").IMacWindowJson;
type IMacWindowListJson = import("../interfaces/i-mac-window-list-json.ts").IMacWindowListJson;

class Resources {
  public static readonly listOnScreen: number = 1;
  public static readonly listExcludeDesktop: number = 16;
  public static readonly listIncludingWindow: number = 8;
  public static readonly noWindow: number = 0;
  public static readonly hidTap: number = 0;
  public static readonly hidState: number = 1;
  public static readonly pointerTypes: readonly number[] = [1, 2, 3, 4, 5, 6, 7, 22, 25, 26, 27];
  public static readonly nullEvent: number = 0;
  public static readonly movedEvent: number = 5;
  public static readonly counterRange: number = 2 ** 32;
  public static readonly countStepMs: number = 0.2;
  public static readonly lineUnits: number = 1;
  public static readonly wheelCount: number = 2;
  public static readonly clickStateField: number = 1;
  public static readonly normalLayer: number = 0;
  public static readonly pointerTolerance: number = 1;
  public static readonly msPerSecond: number = 1000;
  public static readonly settleMs: number = 100;
  public static readonly stepMs: number = 5;
  public static readonly postGapMs: number = 30;
  public static readonly maxGlideSteps: number = 64;
  public static readonly maxGlideMs: number = 1000;
  public static readonly unicodeChunkLength: number = 20;
  public static readonly highSurrogateFirst: number = 0xd800;
  public static readonly highSurrogateLast: number = 0xdbff;
  public static readonly hexRadix: number = 16;
  public static readonly axTimeoutSeconds: number = 0.5;
  public static readonly axSuccess: number = 0;
  public static readonly axNoValue: number = -25212;
  public static readonly axAttributeUnsupported: number = -25205;
  public static readonly roleAttribute: string = "AXRole";
  public static readonly subroleAttribute: string = "AXSubrole";
  public static readonly titleAttribute: string = "AXTitle";
  public static readonly descriptionAttribute: string = "AXDescription";
  public static readonly enabledAttribute: string = "AXEnabled";
  public static readonly focusedAttribute: string = "AXFocused";
  public static readonly selectedAttribute: string = "AXSelected";
  public static readonly expandedAttribute: string = "AXExpanded";
  public static readonly disclosingAttribute: string = "AXDisclosing";
  public static readonly positionAttribute: string = "AXPosition";
  public static readonly sizeAttribute: string = "AXSize";
  public static readonly numberOfCharactersAttribute: string = "AXNumberOfCharacters";
  public static readonly valueAttribute: string = "AXValue";
  public static readonly stringForRangeAttribute: string = "AXStringForRange";
  public static readonly childrenAttribute: string = "AXChildren";
  public static readonly parentAttribute: string = "AXParent";
  public static readonly windowsAttribute: string = "AXWindows";
  public static readonly focusedWindowAttribute: string = "AXFocusedWindow";
  public static readonly focusedApplicationAttribute: string = "AXFocusedApplication";
  public static readonly focusedElementAttribute: string = "AXFocusedUIElement";
  public static readonly secureSubrole: string = "AXSecureTextField";
  public static readonly missingGrantReason: string = "MissingGrant";
  public static readonly physicalInputReason: string = "PhysicalInput";
  public static readonly notForegroundReason: string = "NotForeground";
  public static readonly otherWindowAtPointReason: string = "OtherWindowAtPoint";
  public static readonly secureInputReason: string = "SecureInput";
  public static readonly focusUnknownReason: string = "FocusUnknown";
  public static readonly focusOutsideTargetReason: string = "FocusOutsideTarget";
  public static readonly passwordFieldReason: string = "PasswordField";
  public static readonly foregroundChangedReason: string = "ForegroundChanged";
  public static readonly prohibitedPolicy: number = 2;
  public static readonly regularPolicy: number = 0;
  public static readonly runLoopMode: string = "kCFRunLoopDefaultMode";
  public static readonly screenNumberKey: string = "NSScreenNumber";
  public static readonly maxBorderFrames: number = 16;
  public static readonly borderlessStyle: number = 0;
  public static readonly bufferedBacking: number = 2;
  public static readonly screenSaverLevel: number = 1000;
  public static readonly allSpaces: number = 1;
  public static readonly stationary: number = 16;
  public static readonly ignoresCycle: number = 64;
  public static readonly fullScreenAuxiliary: number = 256;
  public static readonly borderColorPattern: RegExp = /^#([0-9A-Fa-f]{2})([0-9A-Fa-f]{2})([0-9A-Fa-f]{2})$/;
  public static readonly colorChannelMax: number = 255;
  public static readonly maxIconSize: number = 1024;
  public static readonly iconBitsPerSample: number = 8;
  public static readonly iconSamplesPerPixel: number = 4;
  public static readonly deviceRgbColorSpace: string = "NSDeviceRGBColorSpace";
  public static readonly compositeCopy: number = 1;
  public static readonly pngFileType: number = 4;
  public static readonly bundleNameKeys: readonly string[] = ["CFBundleDisplayName", "CFBundleName"];
  public static readonly applicationFolders: readonly string[] = ["/Applications", "/System/Applications", "/Applications/Utilities", "/System/Applications/Utilities"];
  public static readonly appExtension: string = "app";
  public static readonly focusMoverPattern: RegExp = /\r\n|[\t\n\r]/;
  public static readonly tabCharacter: string = "\t";
  public static readonly lineBreak: string = "\n";
  public static readonly nonAsciiPattern: RegExp = /[^\x20-\x7e]/g;
  public static readonly axReadTimeoutSeconds: number = 0.25;
  public static readonly readSliceMs: number = 100;
  public static readonly maxControlText: number = 402;
  public static readonly maxControlChildren: number = 200;
  public static readonly maxControlDepth: number = 50;
  public static readonly maxReadControls: number = 2000;
  public static readonly maxHitLevels: number = 64;
  public static readonly maxControlTimeoutMs: number = 60000;
  public static readonly numberLocale: string = "en-US";
  public static readonly cfRangeType: number = 4;
  public static readonly textRangeBytes: string = "AAAAAAAAAACSAQAAAAAAAA==";
  public static readonly pointValuePattern: RegExp = /x:(-?[\d.]+) y:(-?[\d.]+) type = kAXValueCGPointType/;
  public static readonly sizeValuePattern: RegExp = /w:(-?[\d.]+) h:(-?[\d.]+) type = kAXValueCGSizeType/;
  public static readonly handlePattern: RegExp = /^(\d+)\.(\d+)$/;
  public static readonly controlAttributes: readonly string[] = [Resources.roleAttribute, Resources.subroleAttribute, Resources.titleAttribute,
    Resources.descriptionAttribute, Resources.enabledAttribute, Resources.focusedAttribute, Resources.selectedAttribute, Resources.expandedAttribute,
    Resources.disclosingAttribute, Resources.positionAttribute, Resources.sizeAttribute, Resources.numberOfCharactersAttribute];
  public static readonly spotAttributes: readonly string[] = [Resources.roleAttribute, Resources.subroleAttribute, Resources.titleAttribute,
    Resources.descriptionAttribute, Resources.enabledAttribute, Resources.positionAttribute, Resources.sizeAttribute];
  public static readonly frameAttributes: readonly string[] = [Resources.positionAttribute, Resources.sizeAttribute];
  public static readonly frameKeys: readonly (keyof IFrame)[] = ["x", "y", "width", "height"];
  public static readonly windowPhase: string = "window";
  public static readonly menuPhase: string = "menus";
  public static readonly controlPhase: string = "controls";
  public static readonly checkedRoles: readonly string[] = ["AXCheckBox", "AXRadioButton"];
  public static readonly popupRole: string = "AXMenu";
  public static readonly dockBundleId: string = "com.apple.dock";
  public static readonly dockAutohideKey: string = "autohide";
  public static readonly dockMagnificationKey: string = "magnification";
  public static readonly dockOrientationKey: string = "orientation";
  public static readonly dockLeftEdge: string = "left";
  public static readonly dockRightEdge: string = "right";
  public static readonly dockWindowName: string = "Dock";
  public static readonly dockLayer: number = 20;
  public static readonly dockBand: number = 152;
  public static readonly refusedStatus: IMacOutcomeJson["status"] = "refused";
  public static readonly doneStatus: IMacOutcomeJson["status"] = "done";
  public static readonly stoppedStatus: IMacOutcomeJson["status"] = "stopped";
  public static readonly leftButton: IButton = { down: 1, up: 2, dragged: 6, number: 0 };
  public static readonly buttons: { readonly [name: string]: IButton } = {
    Left: Resources.leftButton,
    Right: { down: 3, up: 4, dragged: 7, number: 1 },
    Middle: { down: 25, up: 26, dragged: 27, number: 2 }
  };
  public static readonly modifiers: { readonly [name: string]: IModifier } = {
    Shift: { key: 56, flag: 0x20000 },
    Control: { key: 59, flag: 0x40000 },
    Alt: { key: 58, flag: 0x80000 },
    Meta: { key: 55, flag: 0x100000 }
  };
  public static readonly enterKey: number = 36;
  public static readonly tabKey: number = 48;
  public static readonly keys: { readonly [name: string]: number } = {
    Enter: Resources.enterKey, Tab: Resources.tabKey, Escape: 53, Backspace: 51, Delete: 117, Space: 49,
    Up: 126, Down: 125, Left: 123, Right: 124, Home: 115, End: 119, PageUp: 116, PageDown: 121,
    F1: 122, F2: 120, F3: 99, F4: 118, F5: 96, F6: 97, F7: 98, F8: 100, F9: 101, F10: 109, F11: 103, F12: 111,
    A: 0, B: 11, C: 8, D: 2, E: 14, F: 3, G: 5, H: 4, I: 34, J: 38, K: 40, L: 37, M: 46,
    N: 45, O: 31, P: 35, Q: 12, R: 15, S: 1, T: 17, U: 32, V: 9, W: 13, X: 7, Y: 16, Z: 6,
    Digit0: 29, Digit1: 18, Digit2: 19, Digit3: 20, Digit4: 21, Digit5: 23, Digit6: 22, Digit7: 26, Digit8: 28, Digit9: 25
  };
  public static readonly glideStepsOutOfOrder: string = "The glide's steps aren't in time order within its longest time.";
  public static readonly invalidStopPath: string = "The drag's stop file isn't a path.";
  public static readonly invalidBorderFrame: string = "A border's frame isn't whole points whose thickness fits twice into it.";
  public static readonly borderColorNotText: string = "The border's colour isn't text.";
  public static readonly invalidBundleRequest: string = "The bundle identifier or the icon's size isn't one the process takes.";
  public static readonly windowNotFound: string = "The Accessibility API didn't find the window.";
  public static readonly invalidHandle: string = "The control's handle isn't one a read gave.";
  public static readonly accessibilityMissing: string = "The Accessibility grant is missing.";
  public static readonly notTargetWindow: string = "The window isn't the target's.";
  public static readonly controlGone: string = "The control is gone, or isn't one of the latest read's.";
  public static readonly readEnded: string = "A later read ended the read.";
  public static readonly requestNotObject: string = "The request isn't an object.";
  public static readonly requestUnnamed: string = "The request names no number id or no method.";
  public static readonly personInputBeforeSendArgument: string = "--person-input-before-send";
  public static readonly parametersField: string = "parameters";
  public static readonly targetField: string = "target";
  public static readonly windowIdField: string = "windowId";
  public static readonly processIdField: string = "processId";
  public static readonly bundleIdField: string = "bundleId";
  public static readonly xField: string = "x";
  public static readonly yField: string = "y";
  public static readonly fromXField: string = "fromX";
  public static readonly fromYField: string = "fromY";
  public static readonly toXField: string = "toX";
  public static readonly toYField: string = "toY";
  public static readonly deltaXField: string = "deltaX";
  public static readonly deltaYField: string = "deltaY";
  public static readonly framesField: string = "frames";
  public static readonly colorField: string = "color";
  public static readonly hostPathField: string = "hostPath";
  public static readonly iconSizeField: string = "iconSize";
  public static readonly pointsField: string = "points";
  public static readonly stepsField: string = "steps";
  public static readonly buttonField: string = "button";
  public static readonly countField: string = "count";
  public static readonly modifiersField: string = "modifiers";
  public static readonly stopPathField: string = "stopPath";
  public static readonly textField: string = "text";
  public static readonly keyField: string = "key";
  public static readonly underHandleField: string = "underHandle";
  public static readonly timeoutMsField: string = "timeoutMs";
  public static readonly readField: string = "read";
  public static readonly handleField: string = "handle";
  public static readonly minClickCount: number = 1;
  public static readonly maxClickCount: number = 3;
  public static readonly maxScrollNotches: number = 50;
  public static readonly maxProcessId: number = 2147483647;
  public static readonly maxReadNumber: number = Number.MAX_SAFE_INTEGER;

  public static formatUnknownModifier(name: string): string {
    return `The modifier ${name} isn't one the process knows.`;
  }

  public static formatUnknownButton(name: string): string {
    return `The button ${name} isn't one the process knows.`;
  }

  public static formatUnknownKey(name: string): string {
    return `The key ${name} isn't one the process knows.`;
  }

  public static formatFieldNotObject(name: string): string {
    return `The request's ${name} isn't an object.`;
  }

  public static formatFieldNotNumber(name: string): string {
    return `The request's ${name} isn't a finite number.`;
  }

  public static formatFieldOutOfRange(name: string, min: number, max: number): string {
    return `The request's ${name} isn't a whole number from ${min} to ${max}.`;
  }

  public static formatFieldNotText(name: string): string {
    return `The request's ${name} isn't text.`;
  }

  public static formatFieldNotTextList(name: string): string {
    return `The request's ${name} isn't a list of text.`;
  }

  public static formatFieldNotPointList(name: string): string {
    return `The request's ${name} isn't a list of points.`;
  }

  public static formatUnknownMethod(name: string): string {
    return `The method ${name} isn't one the process knows.`;
  }

  public static formatInvalidGlideSteps(maxSteps: number): string {
    return `The glide's steps aren't a list of at most ${maxSteps}.`;
  }

  public static formatInvalidBorderFrames(maxFrames: number): string {
    return `The border's frames aren't a list of at most ${maxFrames}.`;
  }

  public static formatInvalidBorderColor(color: string): string {
    return `The border's colour ${color} isn't of the form #RRGGBB.`;
  }

  public static formatHomeApplications(home: string | undefined): string {
    return `${home}/Applications`;
  }

  public static formatInvalidTimeout(maxMs: number): string {
    return `The time limit must be from 1 to ${maxMs.toLocaleString(Resources.numberLocale)} milliseconds.`;
  }

  public static formatHandle(read: number, index: number): string {
    return `${read}.${index}`;
  }

  public static formatUnicodeEscape(unit: number): string {
    return `\\u${unit.toString(Resources.hexRadix).padStart(4, "0")}`;
  }
}

interface IPoint {
  readonly x: number;
  readonly y: number;
}

interface ISize {
  readonly width: number;
  readonly height: number;
}

interface IFrame {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
}

interface IBorderFrame extends IFrame {
  readonly thickness: number;
}

interface IShownWindow extends IFrame {
  readonly windowId: string;
  readonly processId: number;
  readonly bundleId: string;
}

interface IDockArea {
  readonly display: IFrame;
  readonly parts: readonly IFrame[];
}

interface IButton {
  readonly down: number;
  readonly up: number;
  readonly dragged: number;
  readonly number: number;
}

interface IModifier {
  readonly key: number;
  readonly flag: number;
}

interface IWatch {
  expected: readonly IPoint[];
  readonly countedAtStart: readonly ICounter[];
  ownCount: number;
  fencedCount: number;
}

interface ICounter {
  readonly type: number;
  readonly count: number;
}

interface IGlide {
  readonly reason: string | null;
  readonly at: IPoint | null;
  readonly isStopped: boolean;
}

interface IAttributeAnswer {
  readonly isAnswered: boolean;
  readonly value: IJxaAXObject | null;
}

interface IAttributes {
  readonly [name: string]: string | number | boolean | IPoint | ISize;
}

interface IReferences {
  readonly read: number;
  readonly elements: IJxaAXObject[];
}

interface IVisit {
  readonly element: IJxaAXObject;
  readonly handle: string | null;
  readonly depth: number;
  readonly area: IFrame;
}

interface IChildren {
  readonly visit: IVisit;
  readonly elements: readonly IJxaAXObject[];
  index: number;
}

interface IReadState {
  readonly references: IReferences;
  readonly deadline: number;
  readonly processId: number;
  readonly bundleId: string;
  readonly app: IJxaAXObject | null;
  readonly area: IFrame;
  phase: string;
  candidates: (IJxaAXObject | null)[] | null;
  candidateIndex: number;
  menus: readonly IJxaAXObject[] | null;
  menuIndex: number;
  readonly visits: IVisit[];
  visitIndex: number;
  children: IChildren | null;
  readonly bundles: Map<number, string>;
  rows: IMacControlJson[];
  leftOut: number;
  timedOut: boolean;
  isDone: boolean;
}

interface ITextRange {
  readonly bytes: IJxaData;
  readonly range: IJxaAXObject;
}

type Fields = ReadonlyMap<string, unknown>;

type Method = (fields: Fields) => unknown;

interface IAnswer {
  readonly id: number | null;
  readonly result?: unknown;
  readonly error?: string;
}

ObjC.import("Foundation");
ObjC.import("AppKit");
ObjC.import("CoreGraphics");
ObjC.import("ApplicationServices");
ObjC.import("QuartzCore");
ObjC.bindFunction("CGPreflightScreenCaptureAccess", ["bool", []]);
ObjC.bindFunction("IsSecureEventInputEnabled", ["bool", []]);
ObjC.bindFunction("CGEventKeyboardSetUnicodeString", ["void", ["void *", "unsigned long", "void *"]]);
ObjC.bindFunction("AXValueCreate", ["id", ["int", "void *"]]);

let borderWindows: readonly IJxaWindow[] = [];
let borderNumbers: ReadonlySet<number> = new Set();
let shownBorder = "";

let watch: IWatch | null = null;

let isPersonInputBeforeSend = false;

function sleep(ms: number): void {
  $.NSThread.sleepForTimeInterval(ms / Resources.msPerSecond);
}

function readPointer(): IPoint {
  const point = $.CGEventGetLocation($.CGEventCreate(null));
  return { x: point.x, y: point.y };
}

function isAway(point: IPoint, from: IPoint): boolean {
  return Math.abs(point.x - from.x) > Resources.pointerTolerance || Math.abs(point.y - from.y) > Resources.pointerTolerance;
}

function uptimeMs(): number {
  return Number($.NSProcessInfo.processInfo.systemUptime) * Resources.msPerSecond;
}

function since(count: number, start: number): number {
  return (count - start + Resources.counterRange) % Resources.counterRange;
}

function readCounter(type: number): number {
  return Number($.CGEventSourceCounterForEventType(Resources.hidState, type));
}

function readCounters(): readonly ICounter[] {
  return Resources.pointerTypes.map(t => ({ type: t, count: readCounter(t) }));
}

function countPointerEvents(start: readonly ICounter[]): number {
  return start.reduce((sum, t) => sum + since(readCounter(t.type), t.count), 0);
}

function readNulls(): number {
  return readCounter(Resources.nullEvent);
}

function isCountOwn(running: IWatch): boolean {
  if (running.fencedCount !== running.ownCount) {
    const nulls = readNulls();
    $.CGEventPost(Resources.hidTap, $.CGEventCreate(null));
    const end = uptimeMs() + Resources.settleMs;
    while (since(readNulls(), nulls) === 0) {
      if (uptimeMs() >= end)
        return false;
      sleep(Resources.countStepMs);
    }
    running.fencedCount = running.ownCount;
  }
  return countPointerEvents(running.countedAtStart) === running.ownCount;
}

function hasPersonMoved(): boolean {
  if (watch === null)
    return false;
  if (!isCountOwn(watch))
    return true;
  const pointer = readPointer();
  const reached = watch.expected.findIndex(t => !isAway(pointer, t));
  if (reached < 0)
    return true;
  watch.expected = watch.expected.slice(0, reached + 1);
  return false;
}

function expect(point: IPoint): void {
  if (watch !== null)
    watch.expected = [point, ...watch.expected];
}

function readWindows(): readonly IJxaWindowInfo[] | null {
  const list = ObjC.deepUnwrap(ObjC.castRefToObject($.CGWindowListCopyWindowInfo(Resources.listOnScreen | Resources.listExcludeDesktop, Resources.noWindow)));
  return list?.filter(t => !isBorderWindow(t)) ?? null;
}

function isBorderWindow(window: IJxaWindowInfo): boolean {
  return window.kCGWindowNumber !== undefined && borderNumbers.has(window.kCGWindowNumber);
}

function deliverNotifications(): void {
  $.CFRunLoopRunInMode($(Resources.runLoopMode), 0, false);
}

function readBundle(processId: number): string {
  const app = $.NSRunningApplication.runningApplicationWithProcessIdentifier(processId);
  if (app.isNil())
    return "";
  const bundle = ObjC.unwrap(app.bundleIdentifier);
  return typeof bundle === "string" ? bundle.toLowerCase() : "";
}

function readFrame(window: IJxaWindowInfo): IFrame | null {
  const bounds = window.kCGWindowBounds;
  if (bounds === undefined || ![bounds.X, bounds.Y, bounds.Width, bounds.Height].every(Number.isFinite))
    return null;
  const x = Math.floor(bounds.X);
  const y = Math.floor(bounds.Y);
  return { x, y, width: Math.ceil(bounds.X + bounds.Width) - x, height: Math.ceil(bounds.Y + bounds.Height) - y };
}

function isDrawn(window: IJxaWindowInfo): boolean {
  return window.kCGWindowAlpha !== 0;
}

function contains(frame: IFrame, point: IPoint): boolean {
  return point.x >= frame.x && point.x < frame.x + frame.width && point.y >= frame.y && point.y < frame.y + frame.height;
}

function readFrontWindow(): IMacWindowJson | null {
  deliverNotifications();
  const app = $.NSWorkspace.sharedWorkspace.frontmostApplication;
  if (app.isNil())
    return null;
  const processId = app.processIdentifier;
  const bundleId = readBundle(processId);
  const windows = readWindows();
  if (bundleId === "" || windows === null)
    return null;
  const window = windows.find(t => t.kCGWindowOwnerPID === processId && t.kCGWindowLayer === Resources.normalLayer && isDrawn(t));
  if (window === undefined)
    return null;
  const frame = readFrame(window);
  if (frame === null || frame.width <= 0 || frame.height <= 0)
    return null;
  const name = ObjC.unwrap(app.localizedName);
  return { windowId: String(window.kCGWindowNumber), processId, bundleId, appName: typeof name === "string" && name.trim() !== "" ? name : bundleId, ...frame };
}

function copyAttribute(element: IJxaAXObject, attribute: string): IJxaAXObject | null {
  const value = Ref<IJxaPointer<IJxaAXObject>>();
  return $.AXUIElementCopyAttributeValue(element, $(attribute), value) === Resources.axSuccess ? ObjC.castRefToObject(value[0]) : null;
}

function askAttribute(element: IJxaAXObject, attribute: string): IAttributeAnswer {
  const value = Ref<IJxaPointer<IJxaAXObject>>();
  const error = $.AXUIElementCopyAttributeValue(element, $(attribute), value);
  if (error === Resources.axSuccess)
    return { isAnswered: true, value: ObjC.castRefToObject(value[0]) };
  return { isAnswered: error === Resources.axNoValue || error === Resources.axAttributeUnsupported, value: null };
}

function readFocusedProcess(): number | null {
  const system = $.AXUIElementCreateSystemWide();
  $.AXUIElementSetMessagingTimeout(system, Resources.axTimeoutSeconds);
  const app = askAttribute(system, Resources.focusedApplicationAttribute);
  if (!app.isAnswered)
    return -1;
  return app.value === null ? null : processOf(app.value);
}

function readFocusRefusal(processId: number): string | null {
  const focusedProcess = readFocusedProcess();
  if (focusedProcess === -1)
    return Resources.focusUnknownReason;
  if (focusedProcess !== null && focusedProcess !== processId)
    return Resources.focusOutsideTargetReason;
  const app = $.AXUIElementCreateApplication(processId);
  $.AXUIElementSetMessagingTimeout(app, Resources.axTimeoutSeconds);
  const focused = Ref<IJxaPointer<IJxaAXObject>>();
  const error = $.AXUIElementCopyAttributeValue(app, $(Resources.focusedElementAttribute), focused);
  if (error === Resources.axNoValue)
    return null;
  if (error !== Resources.axSuccess)
    return Resources.focusUnknownReason;
  const element = ObjC.castRefToObject(focused[0]);
  $.AXUIElementSetMessagingTimeout(element, Resources.axTimeoutSeconds);
  const subrole = askAttribute(element, Resources.subroleAttribute);
  if (!subrole.isAnswered)
    return Resources.focusUnknownReason;
  return subrole.value !== null && subrole.value.js === Resources.secureSubrole ? Resources.passwordFieldReason : null;
}

function checkTarget(target: IMacTargetJson, points: readonly IPoint[], isKeyboard: boolean): string | null {
  if ($.AXIsProcessTrusted() !== true)
    return Resources.missingGrantReason;
  if (hasPersonMoved())
    return Resources.physicalInputReason;
  const front = readFrontWindow();
  if (front === null || front.windowId !== target.windowId || front.processId !== target.processId || front.bundleId !== target.bundleId)
    return Resources.notForegroundReason;
  const shown = readShownWindows();
  for (const point of points) {
    const at = shown.isComplete ? shown.windows.find(t => contains(t, point)) : undefined;
    if (at === undefined || at.processId !== target.processId)
      return Resources.otherWindowAtPointReason;
  }
  if (isKeyboard && $.IsSecureEventInputEnabled() === true)
    return Resources.secureInputReason;
  const focusRefusal = isKeyboard ? readFocusRefusal(target.processId) : null;
  if (focusRefusal !== null)
    return focusRefusal;
  return isPersonInputBeforeSend || hasPersonMoved() ? Resources.physicalInputReason : null;
}

function postEvent(event: IJxaEvent): void {
  if (watch !== null && Resources.pointerTypes.includes(Number($.CGEventGetType(event))))
    watch.ownCount += 1;
  $.CGEventPost(Resources.hidTap, event);
}

function post(event: IJxaEvent): void {
  postEvent(event);
  sleep(Resources.postGapMs);
}

function readModifiers(names: readonly string[]): readonly IModifier[] {
  return names.map(t => {
    const modifier = Object.hasOwn(Resources.modifiers, t) ? Resources.modifiers[t] : undefined;
    if (modifier === undefined)
      throw new Error(Resources.formatUnknownModifier(t));
    return modifier;
  });
}

function flagsOf(modifiers: readonly IModifier[]): number {
  return modifiers.reduce((flags, t) => flags | t.flag, 0);
}

function pressModifiers(modifiers: readonly IModifier[], isDown: boolean): void {
  let flags = isDown ? 0 : flagsOf(modifiers);
  for (const modifier of isDown ? modifiers : [...modifiers].reverse()) {
    flags = isDown ? flags | modifier.flag : flags & ~modifier.flag;
    const event = $.CGEventCreateKeyboardEvent(null, modifier.key, isDown);
    $.CGEventSetFlags(event, flags);
    post(event);
  }
}

function postMouse(type: number, point: IPoint, button: IButton, flags: number, clickState: number): void {
  const event = $.CGEventCreateMouseEvent(null, type, point, button.number);
  $.CGEventSetFlags(event, flags);
  if (clickState > 0)
    $.CGEventSetIntegerValueField(event, Resources.clickStateField, clickState);
  post(event);
}

function postMove(point: IPoint, button: IButton | null, flags: number): void {
  const event = $.CGEventCreateMouseEvent(null, button === null ? Resources.movedEvent : button.dragged, point, (button ?? Resources.leftButton).number);
  $.CGEventSetFlags(event, flags);
  postEvent(event);
  expect(point);
}

function moveTo(point: IPoint, button: IButton | null, flags: number): void {
  postMove(point, button, flags);
  sleep(Resources.postGapMs);
  for (let waited = 0; waited < Resources.settleMs && isAway(readPointer(), point); waited += Resources.stepMs)
    sleep(Resources.stepMs);
}

function readSteps(steps: unknown): readonly IMacGlideStepJson[] {
  if (!Array.isArray(steps) || steps.length > Resources.maxGlideSteps)
    throw new Error(Resources.formatInvalidGlideSteps(Resources.maxGlideSteps));
  const read: IMacGlideStepJson[] = [];
  const list: readonly unknown[] = steps;
  for (const step of list) {
    if (typeof step !== "object" || step === null || !("x" in step) || !("y" in step) || !("atMs" in step) || !isWhole(step.x) || !isWhole(step.y)
      || !isWhole(step.atMs) || step.atMs < (read[read.length - 1]?.atMs ?? 0) || step.atMs > Resources.maxGlideMs)
      throw new Error(Resources.glideStepsOutOfOrder);
    read.push({ x: step.x, y: step.y, atMs: step.atMs });
  }
  return read;
}

function isWhole(value: unknown): value is number {
  return Number.isSafeInteger(value);
}

function isStopSet(stopPath: string | null): boolean {
  return stopPath !== null && $.NSFileManager.defaultManager.fileExistsAtPath($(stopPath));
}

function readStopPath(stopPath: unknown): string {
  if (typeof stopPath !== "string" || stopPath === "")
    throw new Error(Resources.invalidStopPath);
  return stopPath;
}

function glide(target: IMacTargetJson, points: readonly IPoint[], steps: readonly IMacGlideStepJson[], button: IButton | null, flags: number,
  stopPath: string | null = null): IGlide {
  const start = uptimeMs();
  let at: IPoint | null = null;
  for (const [index, step] of steps.entries()) {
    const now = uptimeMs() - start;
    const next = steps[index + 1];
    if (next !== undefined && next.atMs <= now)
      continue;
    if (step.atMs > now)
      sleep(step.atMs - now);
    if (isStopSet(stopPath))
      return { reason: null, at, isStopped: true };
    const reason = checkTarget(target, points, false);
    if (reason !== null)
      return { reason, at, isStopped: false };
    at = { x: step.x, y: step.y };
    postMove(at, button, flags);
  }
  return { reason: null, at, isStopped: false };
}

function postKey(keyCode: number, flags: number, isDown: boolean): void {
  const event = $.CGEventCreateKeyboardEvent(null, keyCode, isDown);
  $.CGEventSetFlags(event, flags);
  post(event);
}

function postText(text: string): void {
  let chunk = "";
  const flush = (): void => {
    const units = $(chunk).dataUsingEncoding($.NSUTF16LittleEndianStringEncoding);
    for (const isDown of [true, false]) {
      const event = $.CGEventCreateKeyboardEvent(null, 0, isDown);
      $.CGEventKeyboardSetUnicodeString(event, chunk.length, units.bytes);
      post(event);
    }
    chunk = "";
  };
  for (const character of text) {
    if (chunk.length + character.length > Resources.unicodeChunkLength)
      flush();
    chunk += character;
  }
  if (chunk.length > 0)
    flush();
}

function finish(target: IMacTargetJson): IMacOutcomeJson {
  const front = readFrontWindow();
  if (front === null || front.windowId !== target.windowId || front.processId !== target.processId)
    return { status: Resources.refusedStatus, reason: Resources.foregroundChangedReason, inputSent: true };
  if (hasPersonMoved())
    return { status: Resources.refusedStatus, reason: Resources.physicalInputReason, inputSent: true };
  return { status: Resources.doneStatus };
}

function send(target: IMacTargetJson, points: readonly IPoint[], isKeyboard: boolean, sendInput: () => string | null): IMacOutcomeJson {
  const reason = checkTarget(target, points, isKeyboard);
  if (reason !== null)
    return { status: Resources.refusedStatus, reason, inputSent: false };
  const stopped = sendInput();
  return stopped !== null ? { status: Resources.refusedStatus, reason: stopped, inputSent: true } : finish(target);
}

function readButton(name: string): IButton {
  const button = Object.hasOwn(Resources.buttons, name) ? Resources.buttons[name] : undefined;
  if (button === undefined)
    throw new Error(Resources.formatUnknownButton(name));
  return button;
}

function readKey(name: string): number {
  const key = Object.hasOwn(Resources.keys, name) ? Resources.keys[name] : undefined;
  if (key === undefined)
    throw new Error(Resources.formatUnknownKey(name));
  return key;
}

function readScreenNumber(screen: IJxaScreen): number {
  return Number(ObjC.unwrap(screen.deviceDescription.objectForKey($(Resources.screenNumberKey))));
}

function readDisplays(): readonly IMacDisplayJson[] {
  const screens = $.NSScreen.screens;
  const main = $.CGMainDisplayID();
  const displays: IMacDisplayJson[] = [];
  for (let index = 0; index < Number(screens.count); index++) {
    const screen = screens.objectAtIndex(index);
    const id = readScreenNumber(screen);
    const bounds = $.CGDisplayBounds(id);
    displays.push({
      id: String(id), x: bounds.origin.x, y: bounds.origin.y, width: bounds.size.width, height: bounds.size.height,
      scaleFactor: screen.backingScaleFactor, isPrimary: id === main
    });
  }
  return displays;
}

function readBorderFrames(frames: unknown): readonly IBorderFrame[] {
  if (!Array.isArray(frames) || frames.length > Resources.maxBorderFrames)
    throw new Error(Resources.formatInvalidBorderFrames(Resources.maxBorderFrames));
  const read: IBorderFrame[] = [];
  const list: readonly unknown[] = frames;
  for (const frame of list) {
    if (typeof frame !== "object" || frame === null || !("x" in frame) || !("y" in frame) || !("width" in frame) || !("height" in frame)
      || !("thickness" in frame) || !isWhole(frame.x) || !isWhole(frame.y) || !isWhole(frame.width) || !isWhole(frame.height)
      || !isWhole(frame.thickness) || frame.thickness <= 0 || 2 * frame.thickness > Math.min(frame.width, frame.height))
      throw new Error(Resources.invalidBorderFrame);
    read.push({ x: frame.x, y: frame.y, width: frame.width, height: frame.height, thickness: frame.thickness });
  }
  return read;
}

function addBorderSide(x: number, y: number, width: number, height: number, mainHeight: number, color: IJxaColor): IJxaWindow {
  const window = $.NSWindow.alloc.initWithContentRectStyleMaskBackingDefer($.NSMakeRect(x, mainHeight - y - height, width, height), Resources.borderlessStyle,
    Resources.bufferedBacking, false);
  window.releasedWhenClosed = false;
  window.ignoresMouseEvents = true;
  window.opaque = true;
  window.hasShadow = false;
  window.backgroundColor = color;
  window.level = Resources.screenSaverLevel;
  window.collectionBehavior = Resources.allSpaces | Resources.stationary | Resources.ignoresCycle | Resources.fullScreenAuxiliary;
  window.orderFrontRegardless;
  window.display;
  return window;
}

function showBorder(frames: readonly IBorderFrame[], color: string): void {
  const channels = Resources.borderColorPattern.exec(color);
  if (channels === null)
    throw new Error(Resources.formatInvalidBorderColor(color));
  const shown = JSON.stringify([frames, color.toUpperCase()]);
  if (shown === shownBorder && borderWindows.length > 0) {
    for (const window of borderWindows)
      window.orderFrontRegardless;
    $.CATransaction.flush;
    return;
  }
  hideBorder();
  const [red, green, blue] = channels.slice(1).map(t => Number.parseInt(t, Resources.hexRadix) / Resources.colorChannelMax);
  const fill = $.NSColor.colorWithSRGBRedGreenBlueAlpha(red ?? 0, green ?? 0, blue ?? 0, 1);
  const mainHeight = $.CGDisplayBounds($.CGMainDisplayID()).size.height;
  const windows: IJxaWindow[] = [];
  borderWindows = windows;
  for (const frame of frames) {
    const inner = frame.height - 2 * frame.thickness;
    windows.push(addBorderSide(frame.x, frame.y, frame.width, frame.thickness, mainHeight, fill),
      addBorderSide(frame.x, frame.y + frame.height - frame.thickness, frame.width, frame.thickness, mainHeight, fill));
    if (inner > 0)
      windows.push(addBorderSide(frame.x, frame.y + frame.thickness, frame.thickness, inner, mainHeight, fill),
        addBorderSide(frame.x + frame.width - frame.thickness, frame.y + frame.thickness, frame.thickness, inner, mainHeight, fill));
  }
  $.CATransaction.flush;
  borderNumbers = new Set(windows.map(t => Number(t.windowNumber)));
  shownBorder = shown;
}

function hideBorder(): void {
  for (const window of borderWindows) {
    window.orderOut(null);
    window.close;
  }
  $.CATransaction.flush;
  borderWindows = [];
  borderNumbers = new Set();
  shownBorder = "";
}

function readDockBand(display: IFrame): IFrame | null {
  const settings = $.NSUserDefaults.alloc.initWithSuiteName($(Resources.dockBundleId));
  const isSet = (key: string): boolean => ObjC.deepUnwrap(settings.objectForKey($(key))) === true;
  if (!isSet(Resources.dockAutohideKey) && !isSet(Resources.dockMagnificationKey))
    return null;
  const edge = ObjC.deepUnwrap(settings.objectForKey($(Resources.dockOrientationKey)));
  if (edge === Resources.dockLeftEdge)
    return { x: display.x, y: display.y, width: Resources.dockBand, height: display.height };
  if (edge === Resources.dockRightEdge)
    return { x: display.x + display.width - Resources.dockBand, y: display.y, width: Resources.dockBand, height: display.height };
  return { x: display.x, y: display.y + display.height - Resources.dockBand, width: display.width, height: Resources.dockBand };
}

function readDockAreas(): readonly IDockArea[] {
  const screens = $.NSScreen.screens;
  const mainHeight = screens.objectAtIndex(0).frame.size.height;
  const areas: IDockArea[] = [];
  for (let index = 0; index < Number(screens.count); index++) {
    const screen = screens.objectAtIndex(index);
    const bounds = $.CGDisplayBounds(readScreenNumber(screen));
    const display = { x: bounds.origin.x, y: bounds.origin.y, width: bounds.size.width, height: bounds.size.height };
    const visible = screen.visibleFrame;
    const left = Math.floor(visible.origin.x);
    const top = Math.floor(mainHeight - visible.origin.y - visible.size.height);
    const right = Math.ceil(visible.origin.x + visible.size.width);
    const bottom = Math.ceil(mainHeight - visible.origin.y);
    const parts = [
      { x: display.x, y: display.y, width: display.width, height: top - display.y },
      { x: display.x, y: bottom, width: display.width, height: display.y + display.height - bottom },
      { x: display.x, y: top, width: left - display.x, height: bottom - top },
      { x: right, y: top, width: display.x + display.width - right, height: bottom - top },
      readDockBand(display)
    ];
    areas.push({ display, parts: parts.filter((t): t is IFrame => t !== null && t.width > 0 && t.height > 0) });
  }
  return areas;
}

function readShownWindows(): { readonly isComplete: boolean; readonly windows: readonly IShownWindow[] } {
  const windows = readWindows();
  if (windows === null)
    return { isComplete: false, windows: [] };
  const dockAreas = readDockAreas();
  let isComplete = true;
  const shown: IShownWindow[] = [];
  for (const window of windows.filter(isDrawn)) {
    const frame = readFrame(window);
    const processId = window.kCGWindowOwnerPID;
    const windowId = window.kCGWindowNumber;
    if (frame === null || processId === undefined || !Number.isInteger(processId) || windowId === undefined || !(Number.isInteger(windowId) && windowId > 0)) {
      isComplete = false;
      continue;
    }
    const bundleId = readBundle(processId);
    const isResting = bundleId === Resources.dockBundleId && window.kCGWindowLayer === Resources.dockLayer && window.kCGWindowName === Resources.dockWindowName;
    const dockArea = isResting ? dockAreas.find(t => t.display.x === frame.x && t.display.y === frame.y && t.display.width === frame.width && t.display.height === frame.height) : undefined;
    const parts = dockArea === undefined ? [frame] : dockArea.parts;
    for (const part of parts.filter(t => t.width > 0 && t.height > 0))
      shown.push({ windowId: String(windowId), processId, bundleId, ...part });
  }
  return { isComplete, windows: shown };
}

function listWindows(): IMacWindowListJson {
  const shown = readShownWindows();
  return { isComplete: shown.isComplete, windows: shown.windows.map(t => ({ windowId: t.windowId, bundleId: t.bundleId, x: t.x, y: t.y, width: t.width, height: t.height })) };
}

function readWindow(windowId: string): IMacStackedWindowJson | null {
  const number = Number(windowId);
  const list: readonly IJxaWindowInfo[] = ObjC.deepUnwrap(ObjC.castRefToObject($.CGWindowListCopyWindowInfo(Resources.listIncludingWindow, number))) ?? [];
  const window = list.find(t => t.kCGWindowNumber === number && !isBorderWindow(t));
  const processId = window?.kCGWindowOwnerPID;
  if (window === undefined || window.kCGWindowIsOnscreen !== true || !isDrawn(window) || processId === undefined || !Number.isInteger(processId))
    return null;
  const frame = readFrame(window);
  return frame === null ? null : { windowId, bundleId: readBundle(processId), ...frame };
}

function describeApp(url: IJxaURL): IMacAppJson | null {
  const bundle = $.NSBundle.bundleWithURL(url);
  if (bundle.isNil())
    return null;
  const id = ObjC.unwrap(bundle.bundleIdentifier);
  if (typeof id !== "string" || id === "")
    return null;
  const names = Resources.bundleNameKeys.map(t => ObjC.unwrap(bundle.objectForInfoDictionaryKey($(t))));
  const name = names.find((t): t is string => typeof t === "string" && t.trim() !== "");
  return { bundleId: id.toLowerCase(), name: name ?? ObjC.unwrap(url.lastPathComponent.stringByDeletingPathExtension) ?? "" };
}

function runningAppURLs(): IJxaURL[] {
  const urls: IJxaURL[] = [];
  const apps = $.NSWorkspace.sharedWorkspace.runningApplications;
  for (let index = 0; index < Number(apps.count); index++) {
    const app = apps.objectAtIndex(index);
    if (Number(app.activationPolicy) === Resources.regularPolicy && !app.bundleURL.isNil())
      urls.push(app.bundleURL);
  }
  return urls;
}

function installedAppURLs(): IJxaURL[] {
  const found: IJxaURL[] = [];
  const manager = $.NSFileManager.defaultManager;
  for (const folder of [...Resources.applicationFolders, Resources.formatHomeApplications(ObjC.unwrap($.NSHomeDirectory()))]) {
    const urls = manager.contentsOfDirectoryAtURLIncludingPropertiesForKeysOptionsError($.NSURL.fileURLWithPath(folder), $(), 0, null);
    for (let index = 0; !urls.isNil() && index < Number(urls.count); index++) {
      const url = urls.objectAtIndex(index);
      if (ObjC.unwrap(url.pathExtension) === Resources.appExtension)
        found.push(url);
    }
  }
  return found;
}

function listApps(hostPath: string): IMacAppListJson {
  deliverNotifications();
  const running = runningAppURLs().map(describeApp).filter((t): t is IMacAppJson => t !== null);
  const installed = installedAppURLs().map(describeApp).filter((t): t is IMacAppJson => t !== null);
  const host = hostPath === "" ? null : describeApp($.NSURL.fileURLWithPath(hostPath));
  return { host: host === null ? "" : host.bundleId, running, installed };
}

function describeBundle(bundleId: unknown, iconSize: unknown): IMacAppDescriptionJson | null {
  if (typeof bundleId !== "string" || bundleId === "" || !isWhole(iconSize) || iconSize < 1 || iconSize > Resources.maxIconSize)
    throw new Error(Resources.invalidBundleRequest);
  const url = findBundle(bundleId);
  const app = url === null ? null : describeApp(url);
  return url === null || app === null ? null : { name: app.name, path: ObjC.unwrap(url.path) ?? "", icon: readIcon(url, iconSize) };
}

function findBundle(bundleId: string): IJxaURL | null {
  const url = $.NSWorkspace.sharedWorkspace.URLForApplicationWithBundleIdentifier(bundleId);
  if (!url.isNil())
    return url;
  const wanted = bundleId.toLowerCase();
  return [...runningAppURLs(), ...installedAppURLs()].find(t => describeApp(t)?.bundleId === wanted) ?? null;
}

function readIcon(url: IJxaURL, size: number): string | null {
  const image = $.NSWorkspace.sharedWorkspace.iconForFile(url.path);
  const bitmap = $.NSBitmapImageRep.alloc.initWithBitmapDataPlanesPixelsWidePixelsHighBitsPerSampleSamplesPerPixelHasAlphaIsPlanarColorSpaceNameBytesPerRowBitsPerPixel(
    null, size, size, Resources.iconBitsPerSample, Resources.iconSamplesPerPixel, true, false, $(Resources.deviceRgbColorSpace), 0, 0);
  const context = image.isNil() || bitmap.isNil() ? null : $.NSGraphicsContext.graphicsContextWithBitmapImageRep(bitmap);
  if (context === null || context.isNil())
    return null;
  $.NSGraphicsContext.setCurrentContext(context);
  try {
    image.drawInRectFromRectOperationFraction({ origin: { x: 0, y: 0 }, size: { width: size, height: size } }, { origin: { x: 0, y: 0 }, size: { width: 0, height: 0 } },
      Resources.compositeCopy, 1);
  } finally {
    $.NSGraphicsContext.setCurrentContext($());
  }
  const png = bitmap.representationUsingTypeProperties(Resources.pngFileType, $());
  return png.isNil() ? null : ObjC.unwrap(png.base64EncodedStringWithOptions(0)) ?? null;
}

let controlReads = 0;
let wholeControls: IReferences | null = null;
let underControls: IReferences | null = null;
const appControls = new WeakSet<IJxaAXObject>();
let reading: IReadState | null = null;
let textRange: ITextRange | null = null;

function pointOf(value: string | number | boolean | IPoint | ISize | undefined): IPoint | null {
  return typeof value === "object" && "x" in value ? value : null;
}

function sizeOf(value: string | number | boolean | IPoint | ISize | undefined): ISize | null {
  return typeof value === "object" && "width" in value ? value : null;
}

function readItem(item: IJxaAXObject): string | number | boolean | IPoint | ISize | undefined {
  if (item.isKindOfClass($.NSString) || item.isKindOfClass($.NSNumber)) {
    const value = ObjC.unwrap(item);
    return typeof value === "string" || typeof value === "number" || typeof value === "boolean" ? value : undefined;
  }
  const text = ObjC.unwrap(item.description) ?? "";
  const point = Resources.pointValuePattern.exec(text);
  if (point !== null)
    return { x: Number(point[1]), y: Number(point[2]) };
  const size = Resources.sizeValuePattern.exec(text);
  return size === null ? undefined : { width: Number(size[1]), height: Number(size[2]) };
}

function copyAttributes(element: IJxaAXObject, names: readonly string[]): IAttributes | null {
  const values = Ref<IJxaPointer<IJxaArray<IJxaAXObject>>>();
  $.AXUIElementSetMessagingTimeout(element, Resources.axReadTimeoutSeconds);
  if ($.AXUIElementCopyMultipleAttributeValues(element, $(names), 0, values) !== Resources.axSuccess)
    return null;
  const list = ObjC.castRefToObject(values[0]);
  const count = Number(list.count);
  const attributes: { [name: string]: string | number | boolean | IPoint | ISize } = {};
  for (const [index, name] of names.entries()) {
    const value = index < count ? readItem(list.objectAtIndex(index)) : undefined;
    if (value !== undefined)
      attributes[name] = value;
  }
  return attributes;
}

function controlFrameOf(attributes: IAttributes): IFrame | null {
  const position = pointOf(attributes[Resources.positionAttribute]);
  const size = sizeOf(attributes[Resources.sizeAttribute]);
  if (position === null || size === null)
    return null;
  const x = Math.floor(position.x);
  const y = Math.floor(position.y);
  return { x, y, width: Math.ceil(position.x + size.width) - x, height: Math.ceil(position.y + size.height) - y };
}

function overlaps(frame: IFrame, area: IFrame): boolean {
  return frame.x < area.x + area.width && area.x < frame.x + frame.width && frame.y < area.y + area.height && area.y < frame.y + frame.height;
}

function textOf(value: unknown): string {
  return typeof value === "string" ? value : "";
}

function cutText(text: string): string {
  if (text.length <= Resources.maxControlText)
    return text;
  const last = text.charCodeAt(Resources.maxControlText - 1);
  return text.slice(0, last >= Resources.highSurrogateFirst && last <= Resources.highSurrogateLast ? Resources.maxControlText - 1 : Resources.maxControlText);
}

function nameOf(attributes: IAttributes): string {
  const title = textOf(attributes[Resources.titleAttribute]);
  return cutText(title !== "" ? title : textOf(attributes[Resources.descriptionAttribute]));
}

function readTextRange(): IJxaAXObject {
  if (textRange === null) {
    const bytes = $.NSData.alloc.initWithBase64EncodedStringOptions($(Resources.textRangeBytes), 0);
    textRange = { bytes, range: $.AXValueCreate(Resources.cfRangeType, bytes.bytes) };
  }
  return textRange.range;
}

function readValue(element: IJxaAXObject, characters: unknown): unknown {
  const value = Ref<IJxaPointer<IJxaAXObject>>();
  if (typeof characters === "number" && characters > Resources.maxControlText)
    return $.AXUIElementCopyParameterizedAttributeValue(element, $(Resources.stringForRangeAttribute), readTextRange(), value) === Resources.axSuccess
      ? ObjC.unwrap(ObjC.castRefToObject(value[0])) : null;
  return $.AXUIElementCopyAttributeValue(element, $(Resources.valueAttribute), value) === Resources.axSuccess ? ObjC.unwrap(ObjC.castRefToObject(value[0])) : null;
}

function copyChildren(element: IJxaAXObject): { readonly elements: readonly IJxaAXObject[]; readonly total: number } {
  const children = Ref<IJxaPointer<IJxaArray<IJxaAXObject>>>();
  $.AXUIElementSetMessagingTimeout(element, Resources.axReadTimeoutSeconds);
  if ($.AXUIElementCopyAttributeValues(element, $(Resources.childrenAttribute), 0, Resources.maxControlChildren, children) !== Resources.axSuccess)
    return { elements: [], total: 0 };
  const list = ObjC.castRefToObject(children[0]);
  const elements: IJxaAXObject[] = [];
  for (let index = 0; index < Number(list.count); index++)
    elements.push(list.objectAtIndex(index));
  const count = Ref<number>();
  const total = elements.length === Resources.maxControlChildren
    && $.AXUIElementGetAttributeValueCount(element, $(Resources.childrenAttribute), count) === Resources.axSuccess ? Number(count[0]) : elements.length;
  return { elements, total: Math.max(total, elements.length) };
}

function processOf(element: IJxaAXObject): number {
  const processId = Ref<number>();
  return $.AXUIElementGetPid(element, processId) === Resources.axSuccess ? Number(processId[0]) : -1;
}

function bundleOf(state: IReadState, processId: number): string {
  const known = state.bundles.get(processId);
  if (known !== undefined)
    return known;
  const bundleId = readBundle(processId);
  state.bundles.set(processId, bundleId);
  return bundleId;
}

function addControl(state: IReadState, element: IJxaAXObject, attributes: IAttributes, frame: IFrame, bundleId: string, parentHandle: string | null, depth: number,
  area: IFrame): void {
  const role = textOf(attributes[Resources.roleAttribute]);
  const subrole = textOf(attributes[Resources.subroleAttribute]);
  const value = subrole === Resources.secureSubrole ? null : readValue(element, attributes[Resources.numberOfCharactersAttribute]);
  const handle = Resources.formatHandle(state.references.read, state.references.elements.length);
  const isExpanded = attributes[Resources.expandedAttribute];
  const expanded = typeof isExpanded === "boolean" ? isExpanded : attributes[Resources.disclosingAttribute];
  state.references.elements.push(element);
  state.rows.push({
    handle, parentHandle, bundleId, role, subrole, name: nameOf(attributes), value: typeof value === "string" ? cutText(value) : null,
    isEnabled: attributes[Resources.enabledAttribute] !== false, isFocused: attributes[Resources.focusedAttribute] === true,
    isSelected: attributes[Resources.selectedAttribute] === true,
    checkState: Resources.checkedRoles.includes(role) && typeof value === "number" ? value : -1, isExpanded: typeof expanded === "boolean" ? expanded : null,
    ...frame
  });
  if (depth + 1 < Resources.maxControlDepth)
    state.visits.push({ element, handle, depth: depth + 1, area });
}

function addAppControl(state: IReadState, element: IJxaAXObject, frame: IFrame, bundleId: string, parentHandle: string | null): void {
  const handle = Resources.formatHandle(state.references.read, state.references.elements.length);
  state.references.elements.push(element);
  appControls.add(element);
  state.rows.push({
    handle, parentHandle, bundleId, role: "", subrole: "", name: "", value: null, isEnabled: true, isFocused: false, isSelected: false, checkState: -1,
    isExpanded: null, ...frame
  });
}

function readChild(state: IReadState, visit: IVisit, element: IJxaAXObject): void {
  const processId = processOf(element);
  const isOwn = processId === state.processId;
  const attributes = copyAttributes(element, isOwn ? Resources.controlAttributes : Resources.frameAttributes);
  const frame = attributes === null ? null : controlFrameOf(attributes);
  const bundleId = frame === null || processId < 0 ? "" : bundleOf(state, processId);
  if (attributes === null || frame === null || frame.width <= 0 || frame.height <= 0 || !overlaps(frame, visit.area) || bundleId === ""
    || state.references.elements.length === Resources.maxReadControls) {
    state.leftOut++;
    return;
  }
  if (isOwn)
    addControl(state, element, attributes, frame, bundleId, visit.handle, visit.depth, visit.area);
  else
    addAppControl(state, element, frame, bundleId, visit.handle);
}

function findWindowStep(state: IReadState, app: IJxaAXObject): void {
  if (state.candidates === null) {
    const windows = Ref<IJxaPointer<IJxaArray<IJxaAXObject>>>();
    state.candidates = [copyAttribute(app, Resources.focusedWindowAttribute)];
    if ($.AXUIElementCopyAttributeValues(app, $(Resources.windowsAttribute), 0, Resources.maxControlChildren, windows) === Resources.axSuccess) {
      const list = ObjC.castRefToObject(windows[0]);
      for (let index = 0; index < Number(list.count); index++)
        state.candidates.push(list.objectAtIndex(index));
    }
    return;
  }
  const candidate = state.candidates[state.candidateIndex++];
  if (candidate === undefined)
    throw new Error(Resources.windowNotFound);
  const attributes = candidate === null ? null : copyAttributes(candidate, Resources.frameAttributes);
  const frame = attributes === null ? null : controlFrameOf(attributes);
  if (candidate !== null && frame !== null && Resources.frameKeys.every(t => Math.abs(frame[t] - state.area[t]) <= Resources.pointerTolerance)) {
    wholeControls = state.references;
    underControls = null;
    state.visits.push({ element: candidate, handle: null, depth: 0, area: state.area });
    state.candidates = null;
    state.phase = Resources.menuPhase;
  }
}

function readMenuStep(state: IReadState, app: IJxaAXObject): void {
  if (state.menus === null) {
    state.menus = copyChildren(app).elements;
    return;
  }
  const element = state.menus[state.menuIndex++];
  if (element === undefined) {
    state.menus = null;
    state.phase = Resources.controlPhase;
    return;
  }
  const attributes = copyAttributes(element, Resources.controlAttributes);
  const frame = attributes === null ? null : controlFrameOf(attributes);
  if (attributes !== null && frame !== null && frame.width > 0 && frame.height > 0 && textOf(attributes[Resources.roleAttribute]) === Resources.popupRole)
    addControl(state, element, attributes, frame, state.bundleId, null, 0, frame);
}

function readStep(state: IReadState): void {
  if (state.app !== null && state.phase === Resources.windowPhase)
    findWindowStep(state, state.app);
  else if (state.app !== null && state.phase === Resources.menuPhase)
    readMenuStep(state, state.app);
  else if (state.children === null) {
    const visit = state.visits[state.visitIndex];
    if (visit === undefined) {
      state.isDone = true;
      return;
    }
    const { elements, total } = copyChildren(visit.element);
    state.leftOut += total - elements.length;
    state.children = { visit, elements, index: 0 };
  } else {
    const element = state.children.elements[state.children.index++];
    if (element === undefined) {
      state.visitIndex++;
      state.children = null;
    } else
      readChild(state, state.children.visit, element);
  }
}

function readSlice(state: IReadState): IMacControlSliceJson {
  const end = uptimeMs() + Resources.readSliceMs;
  while (!state.isDone && uptimeMs() < end) {
    if (uptimeMs() >= state.deadline) {
      state.leftOut += state.children === null ? 0 : state.children.elements.length - state.children.index;
      state.timedOut = true;
      state.isDone = true;
    } else {
      try {
        readStep(state);
      } catch (error) {
        reading = null;
        throw error;
      }
    }
  }
  const controls = state.rows;
  state.rows = [];
  if (state.isDone)
    reading = null;
  return { read: state.references.read, controls, leftOut: state.leftOut, timedOut: state.timedOut, isDone: state.isDone };
}

function readTimeout(timeoutMs: unknown): number {
  if (!isWhole(timeoutMs) || timeoutMs < 1 || timeoutMs > Resources.maxControlTimeoutMs)
    throw new Error(Resources.formatInvalidTimeout(Resources.maxControlTimeoutMs));
  return timeoutMs;
}

function findReference(handle: unknown): IJxaAXObject | null {
  const match = Resources.handlePattern.exec(typeof handle === "string" ? handle : "");
  if (match === null)
    throw new Error(Resources.invalidHandle);
  const references = [wholeControls, underControls].find((t): t is IReferences => t !== null && t.read === Number(match[1]));
  return references === undefined ? null : references.elements[Number(match[2])] ?? null;
}

function newReadState(references: IReferences, deadline: number, front: IMacWindowJson, processId: number, app: IJxaAXObject | null,
  visits: IVisit[]): IReadState {
  return {
    references, deadline, processId, bundleId: front.bundleId, app, area: front, phase: app === null ? Resources.controlPhase : Resources.windowPhase, candidates: null,
    candidateIndex: 0, menus: null, menuIndex: 0, visits, visitIndex: 0, children: null, bundles: new Map(), rows: [], leftOut: 0, timedOut: false,
    isDone: false
  };
}

function startRead(target: IMacTargetJson, underHandle: unknown, timeoutMs: unknown): IMacControlSliceJson {
  const deadline = uptimeMs() + readTimeout(timeoutMs);
  if ($.AXIsProcessTrusted() !== true)
    throw new Error(Resources.accessibilityMissing);
  const front = readFrontWindow();
  if (front === null || front.windowId !== target.windowId || front.processId !== target.processId || front.bundleId !== target.bundleId)
    throw new Error(Resources.notTargetWindow);
  let state: IReadState;
  if (underHandle !== null) {
    const element = findReference(underHandle);
    const attributes = element === null ? null : copyAttributes(element, Resources.frameAttributes);
    const frame = attributes === null ? null : controlFrameOf(attributes);
    if (element === null || frame === null)
      throw new Error(Resources.controlGone);
    underControls = { read: ++controlReads, elements: [] };
    state = newReadState(underControls, deadline, front, processOf(element), null, [{ element, handle: null, depth: 0, area: frame }]);
  } else {
    const app = $.AXUIElementCreateApplication(front.processId);
    $.AXUIElementSetMessagingTimeout(app, Resources.axReadTimeoutSeconds);
    state = newReadState({ read: ++controlReads, elements: [] }, deadline, front, front.processId, app, []);
  }
  reading = state;
  return readSlice(state);
}

function hitsControl(handle: unknown, point: IPoint, timeoutMs: unknown): boolean {
  const element = findReference(handle);
  const deadline = uptimeMs() + readTimeout(timeoutMs);
  const system = $.AXUIElementCreateSystemWide();
  const at = Ref<IJxaPointer<IJxaAXObject>>();
  $.AXUIElementSetMessagingTimeout(system, Resources.axReadTimeoutSeconds);
  if (element === null || $.AXUIElementCopyElementAtPosition(system, point.x, point.y, at) !== Resources.axSuccess)
    return false;
  let current: IJxaAXObject | null = ObjC.castRefToObject(at[0]);
  for (let level = 0; current !== null && level < Resources.maxHitLevels && uptimeMs() < deadline; level++) {
    if ($.CFEqual(current, element) === true)
      return true;
    $.AXUIElementSetMessagingTimeout(current, Resources.axReadTimeoutSeconds);
    current = copyAttribute(current, Resources.parentAttribute);
  }
  return false;
}

function findControl(handle: unknown): IMacControlSpotJson | null {
  const element = findReference(handle);
  const attributes = element === null || appControls.has(element) ? null : copyAttributes(element, Resources.spotAttributes);
  const frame = attributes === null ? null : controlFrameOf(attributes);
  return attributes === null || frame === null ? null
    : {
      role: textOf(attributes[Resources.roleAttribute]), subrole: textOf(attributes[Resources.subroleAttribute]), name: nameOf(attributes),
      isEnabled: attributes[Resources.enabledAttribute] !== false, ...frame
    };
}

function readFields(value: unknown, name: string): Fields {
  if (typeof value !== "object" || value === null || Array.isArray(value))
    throw new Error(Resources.formatFieldNotObject(name));
  return new Map<string, unknown>(Object.entries(value));
}

function readNumberField(fields: Fields, name: string): number {
  const value = fields.get(name);
  if (typeof value !== "number" || !Number.isFinite(value))
    throw new Error(Resources.formatFieldNotNumber(name));
  return value;
}

function readWholeField(fields: Fields, name: string, min: number, max: number): number {
  const value = fields.get(name);
  if (!isWhole(value) || value < min || value > max)
    throw new Error(Resources.formatFieldOutOfRange(name, min, max));
  return value;
}

function readTextField(fields: Fields, name: string): string {
  const value = fields.get(name);
  if (typeof value !== "string")
    throw new Error(Resources.formatFieldNotText(name));
  return value;
}

function readTextListField(fields: Fields, name: string): readonly string[] {
  const value = fields.get(name);
  if (!Array.isArray(value))
    throw new Error(Resources.formatFieldNotTextList(name));
  const list: readonly unknown[] = value;
  const texts = list.filter((t): t is string => typeof t === "string");
  if (texts.length !== list.length)
    throw new Error(Resources.formatFieldNotTextList(name));
  return texts;
}

function readPointField(fields: Fields, xName: string, yName: string): IPoint {
  return { x: readNumberField(fields, xName), y: readNumberField(fields, yName) };
}

function readPointListField(fields: Fields, name: string): readonly IPoint[] {
  const value = fields.get(name);
  if (!Array.isArray(value))
    throw new Error(Resources.formatFieldNotPointList(name));
  const list: readonly unknown[] = value;
  return list.map(t => readPointField(readFields(t, name), Resources.xField, Resources.yField));
}

function readTargetField(fields: Fields): IMacTargetJson {
  const target = readFields(fields.get(Resources.targetField), Resources.targetField);
  return {
    windowId: readTextField(target, Resources.windowIdField),
    processId: readWholeField(target, Resources.processIdField, 1, Resources.maxProcessId),
    bundleId: readTextField(target, Resources.bundleIdField)
  };
}

function readScrollNotches(fields: Fields, name: string): number {
  return readWholeField(fields, name, -Resources.maxScrollNotches, Resources.maxScrollNotches);
}

const METHODS: { readonly [name: string]: Method } = {
  checkGrants: (): IMacGrantsJson => ({ screenRecording: $.CGPreflightScreenCaptureAccess() === true, accessibility: $.AXIsProcessTrusted() === true }),
  listDisplays: () => readDisplays(),
  showBorder: fields => {
    const color = fields.get(Resources.colorField);
    if (typeof color !== "string")
      throw new Error(Resources.borderColorNotText);
    showBorder(readBorderFrames(fields.get(Resources.framesField)), color);
    return null;
  },
  hideBorder: () => {
    hideBorder();
    return null;
  },
  getForegroundWindow: () => readFrontWindow(),
  listWindows: () => listWindows(),
  readWindow: fields => readWindow(readTextField(fields, Resources.windowIdField)),
  listApps: fields => listApps(readTextField(fields, Resources.hostPathField)),
  describeBundle: fields => describeBundle(fields.get(Resources.bundleIdField), fields.get(Resources.iconSizeField)),
  readPointer: (): IMacPointJson => readPointer(),
  startWatch: () => {
    watch = { expected: [readPointer()], countedAtStart: readCounters(), ownCount: 0, fencedCount: 0 };
    return null;
  },
  pollWatch: (): IMacWatchPollJson => ({ hasMoved: hasPersonMoved() }),
  stopWatch: () => {
    watch = null;
    return null;
  },
  glidePointer: (fields): IMacOutcomeJson => {
    const target = readTargetField(fields);
    const points = readPointListField(fields, Resources.pointsField);
    const { reason } = glide(target, points, readSteps(fields.get(Resources.stepsField)), null, 0);
    return reason === null ? { status: Resources.doneStatus } : { status: Resources.refusedStatus, reason, inputSent: false };
  },
  movePointer: fields => {
    const target = readTargetField(fields);
    const point = readPointField(fields, Resources.xField, Resources.yField);
    return send(target, [point], false, () => {
      moveTo(point, null, 0);
      return null;
    });
  },
  click: fields => {
    const target = readTargetField(fields);
    const point = readPointField(fields, Resources.xField, Resources.yField);
    const button = readButton(readTextField(fields, Resources.buttonField));
    const clicks = readWholeField(fields, Resources.countField, Resources.minClickCount, Resources.maxClickCount);
    const modifiers = readModifiers(readTextListField(fields, Resources.modifiersField));
    return send(target, [point], false, () => {
      const flags = flagsOf(modifiers);
      moveTo(point, null, flags);
      pressModifiers(modifiers, true);
      for (let count = 1; count <= clicks; count++) {
        postMouse(button.down, point, button, flags, count);
        postMouse(button.up, point, button, flags, count);
      }
      pressModifiers(modifiers, false);
      return null;
    });
  },
  drag: (fields): IMacOutcomeJson => {
    const target = readTargetField(fields);
    const button = readButton(readTextField(fields, Resources.buttonField));
    const modifiers = readModifiers(readTextListField(fields, Resources.modifiersField));
    const from = readPointField(fields, Resources.fromXField, Resources.fromYField);
    const to = readPointField(fields, Resources.toXField, Resources.toYField);
    const steps = readSteps(fields.get(Resources.stepsField));
    const stopPath = readStopPath(fields.get(Resources.stopPathField));
    if (isStopSet(stopPath))
      return { status: Resources.stoppedStatus, inputSent: false };
    let stopped: IMacOutcomeJson | null = null;
    const outcome = send(target, [from, to], false, () => {
      if (isStopSet(stopPath)) {
        stopped = { status: Resources.stoppedStatus, inputSent: false };
        return null;
      }
      const flags = flagsOf(modifiers);
      moveTo(from, null, flags);
      pressModifiers(modifiers, true);
      if (isStopSet(stopPath)) {
        pressModifiers(modifiers, false);
        stopped = { status: Resources.stoppedStatus, inputSent: true };
        return null;
      }
      postMouse(button.down, from, button, flags, 1);
      const glided = glide(target, [to], steps, button, flags, stopPath);
      if (glided.isStopped)
        stopped = { status: Resources.stoppedStatus, inputSent: true };
      const isEnded = glided.reason === null && !glided.isStopped;
      if (isEnded)
        moveTo(to, button, flags);
      else
        sleep(Resources.postGapMs);
      postMouse(button.up, isEnded ? to : glided.at ?? from, button, flags, 1);
      pressModifiers(modifiers, false);
      return glided.reason;
    });
    return stopped ?? outcome;
  },
  scroll: fields => {
    const target = readTargetField(fields);
    const point = readPointField(fields, Resources.xField, Resources.yField);
    const deltaX = readScrollNotches(fields, Resources.deltaXField);
    const deltaY = readScrollNotches(fields, Resources.deltaYField);
    const modifiers = readModifiers(readTextListField(fields, Resources.modifiersField));
    return send(target, [point], false, () => {
      const flags = flagsOf(modifiers);
      moveTo(point, null, flags);
      pressModifiers(modifiers, true);
      const event = $.CGEventCreateScrollWheelEvent2(null, Resources.lineUnits, Resources.wheelCount, -deltaY, -deltaX, 0);
      $.CGEventSetFlags(event, flags);
      post(event);
      pressModifiers(modifiers, false);
      return null;
    });
  },
  typeText: (fields): IMacOutcomeJson => {
    const target = readTargetField(fields);
    const text = readTextField(fields, Resources.textField);
    const mover = Resources.focusMoverPattern.exec(text);
    const start = mover === null ? text.length : mover.index;
    const end = mover === null ? text.length : start + mover[0].length;
    const outcome = send(target, [], true, () => {
      if (start > 0)
        postText(text.slice(0, start));
      if (mover !== null) {
        const key = mover[0] === Resources.tabCharacter ? Resources.tabKey : Resources.enterKey;
        postKey(key, 0, true);
        postKey(key, 0, false);
      }
      return null;
    });
    return outcome.status === Resources.doneStatus && end < text.length
      ? { status: Resources.refusedStatus, reason: Resources.passwordFieldReason, inputSent: true } : outcome;
  },
  pressKey: fields => {
    const target = readTargetField(fields);
    const key = readKey(readTextField(fields, Resources.keyField));
    const modifiers = readModifiers(readTextListField(fields, Resources.modifiersField));
    return send(target, [], true, () => {
      const flags = flagsOf(modifiers);
      pressModifiers(modifiers, true);
      postKey(key, flags, true);
      postKey(key, flags, false);
      pressModifiers(modifiers, false);
      return null;
    });
  },
  readControls: fields => startRead(readTargetField(fields), fields.get(Resources.underHandleField), fields.get(Resources.timeoutMsField)),
  continueControls: fields => {
    const read = readWholeField(fields, Resources.readField, 1, Resources.maxReadNumber);
    if (reading === null || reading.references.read !== read)
      throw new Error(Resources.readEnded);
    return readSlice(reading);
  },
  findControl: fields => findControl(fields.get(Resources.handleField)),
  hitsControl: fields => hitsControl(fields.get(Resources.handleField), readPointField(fields, Resources.xField, Resources.yField), fields.get(Resources.timeoutMsField))
};

function readMethod(name: string): Method {
  const method = Object.hasOwn(METHODS, name) ? METHODS[name] : undefined;
  if (method === undefined)
    throw new Error(Resources.formatUnknownMethod(name));
  return method;
}

function answer(line: string): IAnswer {
  let id: number | null = null;
  try {
    const request: unknown = JSON.parse(line);
    if (typeof request !== "object" || request === null)
      throw new Error(Resources.requestNotObject);
    id = "id" in request && typeof request.id === "number" ? request.id : null;
    if (id === null || !("method" in request) || typeof request.method !== "string")
      throw new Error(Resources.requestUnnamed);
    const method = readMethod(request.method);
    const fields = readFields("parameters" in request ? request.parameters : undefined, Resources.parametersField);
    return { id, result: method(fields) };
  } catch (error) {
    return { id, error: String(error) };
  }
}

function write(output: IJxaFileHandle, value: IAnswer): void {
  const line = JSON.stringify(value).replace(Resources.nonAsciiPattern, t => Resources.formatUnicodeEscape(t.charCodeAt(0)));
  output.writeData($(`${line}${Resources.lineBreak}`).dataUsingEncoding($.NSUTF8StringEncoding));
}

function run(argv: readonly string[]): string {
  isPersonInputBeforeSend = argv.includes(Resources.personInputBeforeSendArgument);
  $.NSApplication.sharedApplication.setActivationPolicy(Resources.prohibitedPolicy);
  const input = $.NSFileHandle.fileHandleWithStandardInput;
  const output = $.NSFileHandle.fileHandleWithStandardOutput;
  let pending = "";
  for (;;) {
    const end = pending.indexOf(Resources.lineBreak);
    if (end >= 0) {
      write(output, answer(pending.slice(0, end)));
      pending = pending.slice(end + 1);
      continue;
    }
    const data = input.availableData;
    if (Number(data.length) === 0)
      return "";
    pending += ObjC.unwrap($.NSString.alloc.initWithDataEncoding(data, $.NSASCIIStringEncoding)) ?? "";
  }
}
