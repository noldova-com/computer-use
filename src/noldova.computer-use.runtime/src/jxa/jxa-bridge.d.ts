/**
 * @license
 * Copyright (c) Noldova.
 *
 * This source code is licensed under the license found in the
 * LICENSE file in the root directory of this source tree.
 */

interface IJxaObject<T> {
  readonly js: T | undefined;
  isNil(): boolean;
}

interface IJxaPointer<T> {
  readonly pointee?: T;
}

interface IJxaRef<T> {
  readonly 0: T;
}

interface IJxaPoint {
  readonly x: number;
  readonly y: number;
}

interface IJxaSize {
  readonly width: number;
  readonly height: number;
}

interface IJxaRect {
  readonly origin: IJxaPoint;
  readonly size: IJxaSize;
}

interface IJxaEvent {
  readonly event?: never;
}

interface IJxaClass {
  readonly objectiveClass?: never;
}

interface IJxaString extends IJxaObject<string> {
  readonly stringByDeletingPathExtension: IJxaString;
  dataUsingEncoding(encoding: number): IJxaData;
}

interface IJxaData extends IJxaObject<unknown> {
  readonly bytes: IJxaPointer<number>;
  readonly length: number | string;
  base64EncodedStringWithOptions(options: number): IJxaString;
}

interface IJxaArray<T> extends IJxaObject<unknown> {
  readonly count: number;
  objectAtIndex(index: number): T;
}

interface IJxaDictionary extends IJxaObject<unknown> {
  objectForKey(key: IJxaString): IJxaObject<unknown>;
}

interface IJxaAXObject extends IJxaObject<unknown> {
  readonly description: IJxaString;
  isKindOfClass(objectiveClass: IJxaClass): boolean;
}

interface IJxaURL extends IJxaObject<unknown> {
  readonly lastPathComponent: IJxaString;
  readonly path: IJxaString;
  readonly pathExtension: IJxaString;
}

interface IJxaImage extends IJxaObject<unknown> {
  drawInRectFromRectOperationFraction(rect: IJxaRect, fromRect: IJxaRect, operation: number, fraction: number): void;
}

interface IJxaBitmapImageRep extends IJxaObject<unknown> {
  representationUsingTypeProperties(fileType: number, properties: IJxaObject<unknown>): IJxaData;
}

interface IJxaGraphicsContext extends IJxaObject<unknown> {
  readonly graphicsContext?: never;
}

interface IJxaRunningApplication extends IJxaObject<unknown> {
  readonly activationPolicy: number;
  readonly bundleIdentifier: IJxaString;
  readonly bundleURL: IJxaURL;
  readonly localizedName: IJxaString;
  readonly processIdentifier: number;
}

interface IJxaBundle extends IJxaObject<unknown> {
  readonly bundleIdentifier: IJxaString;
  objectForInfoDictionaryKey(key: IJxaString): IJxaObject<unknown>;
}

interface IJxaScreen extends IJxaObject<unknown> {
  readonly backingScaleFactor: number;
  readonly deviceDescription: IJxaDictionary;
  readonly frame: IJxaRect;
  readonly visibleFrame: IJxaRect;
}

interface IJxaFileHandle extends IJxaObject<unknown> {
  readonly availableData: IJxaData;
  writeData(data: IJxaData): void;
}

interface IJxaFileManager extends IJxaObject<unknown> {
  contentsOfDirectoryAtURLIncludingPropertiesForKeysOptionsError(url: IJxaURL, keys: IJxaObject<unknown>, options: number, error: null): IJxaArray<IJxaURL>;
  fileExistsAtPath(path: IJxaString): boolean;
}

interface IJxaColor extends IJxaObject<unknown> {
  readonly color?: never;
}

interface IJxaWindow extends IJxaObject<unknown> {
  backgroundColor: IJxaColor;
  readonly close: void;
  collectionBehavior: number;
  readonly display: void;
  hasShadow: boolean;
  ignoresMouseEvents: boolean;
  level: number;
  opaque: boolean;
  readonly orderFrontRegardless: void;
  releasedWhenClosed: boolean;
  readonly windowNumber: number;
  orderOut(sender: null): void;
}

interface IJxaWindowInfo {
  readonly kCGWindowAlpha?: number;
  readonly kCGWindowBounds?: { readonly X: number; readonly Y: number; readonly Width: number; readonly Height: number };
  readonly kCGWindowIsOnscreen?: boolean;
  readonly kCGWindowLayer?: number;
  readonly kCGWindowName?: string;
  readonly kCGWindowNumber?: number;
  readonly kCGWindowOwnerPID?: number;
}

interface IJxaBridge {
  (text: string): IJxaString;
  (list: readonly string[]): IJxaObject<readonly string[]>;
  (): IJxaObject<unknown>;
  readonly NSASCIIStringEncoding: number;
  readonly NSUTF16LittleEndianStringEncoding: number;
  readonly NSUTF8StringEncoding: number;
  readonly NSApplication: { readonly sharedApplication: { setActivationPolicy(policy: number): boolean } };
  readonly NSBitmapImageRep: {
    readonly alloc: {
      initWithBitmapDataPlanesPixelsWidePixelsHighBitsPerSampleSamplesPerPixelHasAlphaIsPlanarColorSpaceNameBytesPerRowBitsPerPixel(planes: null,
        pixelsWide: number, pixelsHigh: number, bitsPerSample: number, samplesPerPixel: number, hasAlpha: boolean, isPlanar: boolean,
        colorSpaceName: IJxaString, bytesPerRow: number, bitsPerPixel: number): IJxaBitmapImageRep;
    };
  };
  readonly NSBundle: { bundleWithURL(url: IJxaURL): IJxaBundle };
  readonly NSColor: { colorWithSRGBRedGreenBlueAlpha(red: number, green: number, blue: number, alpha: number): IJxaColor };
  readonly NSData: { readonly alloc: { initWithBase64EncodedStringOptions(text: IJxaString, options: number): IJxaData } };
  readonly NSFileHandle: { readonly fileHandleWithStandardInput: IJxaFileHandle; readonly fileHandleWithStandardOutput: IJxaFileHandle };
  readonly NSFileManager: { readonly defaultManager: IJxaFileManager };
  readonly NSGraphicsContext: {
    graphicsContextWithBitmapImageRep(bitmap: IJxaBitmapImageRep): IJxaGraphicsContext;
    setCurrentContext(context: IJxaObject<unknown>): void;
  };
  readonly NSNumber: IJxaClass;
  readonly NSProcessInfo: { readonly processInfo: { readonly systemUptime: number } };
  readonly NSRunningApplication: { runningApplicationWithProcessIdentifier(processId: number): IJxaRunningApplication };
  readonly NSScreen: { readonly screens: IJxaArray<IJxaScreen> };
  readonly NSString: IJxaClass & { readonly alloc: { initWithDataEncoding(data: IJxaData, encoding: number): IJxaString } };
  readonly NSThread: { sleepForTimeInterval(seconds: number): void };
  readonly NSURL: { fileURLWithPath(path: string): IJxaURL };
  readonly NSWindow: {
    readonly alloc: { initWithContentRectStyleMaskBackingDefer(rect: IJxaRect, style: number, backing: number, isDeferred: boolean): IJxaWindow };
  };
  readonly CATransaction: { readonly flush: void };
  readonly NSUserDefaults: { readonly alloc: { initWithSuiteName(name: IJxaString): IJxaDictionary } };
  readonly NSWorkspace: {
    readonly sharedWorkspace: {
      readonly frontmostApplication: IJxaRunningApplication;
      readonly runningApplications: IJxaArray<IJxaRunningApplication>;
      URLForApplicationWithBundleIdentifier(bundleId: string): IJxaURL;
      iconForFile(path: IJxaString): IJxaImage;
    };
  };
  AXIsProcessTrusted(): boolean;
  AXUIElementCopyAttributeValue(element: IJxaAXObject, attribute: IJxaString, value: IJxaRef<IJxaPointer<IJxaAXObject>>): number;
  AXUIElementCopyAttributeValues(element: IJxaAXObject, attribute: IJxaString, index: number, maxValues: number,
    values: IJxaRef<IJxaPointer<IJxaArray<IJxaAXObject>>>): number;
  AXUIElementCopyElementAtPosition(element: IJxaAXObject, x: number, y: number, found: IJxaRef<IJxaPointer<IJxaAXObject>>): number;
  AXUIElementCopyMultipleAttributeValues(element: IJxaAXObject, attributes: IJxaObject<readonly string[]>, options: number,
    values: IJxaRef<IJxaPointer<IJxaArray<IJxaAXObject>>>): number;
  AXUIElementCopyParameterizedAttributeValue(element: IJxaAXObject, attribute: IJxaString, parameter: IJxaAXObject, value: IJxaRef<IJxaPointer<IJxaAXObject>>): number;
  AXUIElementCreateApplication(processId: number): IJxaAXObject;
  AXUIElementCreateSystemWide(): IJxaAXObject;
  AXUIElementGetAttributeValueCount(element: IJxaAXObject, attribute: IJxaString, count: IJxaRef<number>): number;
  AXUIElementGetPid(element: IJxaAXObject, processId: IJxaRef<number>): number;
  AXUIElementSetMessagingTimeout(element: IJxaAXObject, seconds: number): number;
  AXValueCreate(type: number, bytes: IJxaPointer<number>): IJxaAXObject;
  CFEqual(first: IJxaAXObject, second: IJxaAXObject): boolean;
  CFRunLoopRunInMode(mode: IJxaString, seconds: number, returnAfterSourceHandled: boolean): number;
  CGDisplayBounds(display: number): IJxaRect;
  CGEventCreate(source: null): IJxaEvent;
  CGEventCreateKeyboardEvent(source: null, keyCode: number, isDown: boolean): IJxaEvent;
  CGEventCreateMouseEvent(source: null, type: number, point: IJxaPoint, button: number): IJxaEvent;
  CGEventCreateScrollWheelEvent2(source: null, units: number, wheelCount: number, wheel1: number, wheel2: number, wheel3: number): IJxaEvent;
  CGEventGetLocation(event: IJxaEvent): IJxaPoint;
  CGEventGetType(event: IJxaEvent): number;
  CGEventKeyboardSetUnicodeString(event: IJxaEvent, length: number, units: IJxaPointer<number>): void;
  CGEventPost(tap: number, event: IJxaEvent): void;
  CGEventSetFlags(event: IJxaEvent, flags: number): void;
  CGEventSetIntegerValueField(event: IJxaEvent, field: number, value: number): void;
  CGEventSourceCounterForEventType(state: number, type: number): number;
  CGMainDisplayID(): number;
  CGPreflightScreenCaptureAccess(): boolean;
  CGWindowListCopyWindowInfo(option: number, relativeToWindow: number): IJxaPointer<IJxaObject<readonly IJxaWindowInfo[]>>;
  IsSecureEventInputEnabled(): boolean;
  NSHomeDirectory(): IJxaString;
  NSMakeRect(x: number, y: number, width: number, height: number): IJxaRect;
}

interface IJxaObjC {
  bindFunction(name: string, signature: readonly [string, readonly string[]]): void;
  castRefToObject<T>(reference: IJxaPointer<T>): T;
  deepUnwrap<T>(value: IJxaObject<T>): T | undefined;
  import(framework: string): void;
  unwrap<T>(value: IJxaObject<T>): T | undefined;
}

declare const $: IJxaBridge;
declare const ObjC: IJxaObjC;
declare function Ref<T>(): IJxaRef<T>;
