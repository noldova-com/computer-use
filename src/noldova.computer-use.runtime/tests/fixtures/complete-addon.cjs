/**
 * @license
 * Copyright (c) Noldova.
 *
 * This source code is licensed under the license found in the
 * LICENSE file in the root directory of this source tree.
 */

const display = { id: "\\\\.\\DISPLAY1", x: 0, y: 0, width: 1, height: 1, dpi: 96, isPrimary: true };
const window = { windowId: "100", processId: 42, imagePath: "C:\\Apps\\Notes.exe", className: "Notes", x: 0, y: 0, width: 800, height: 600, isElevated: false };
const done = { status: "done" };

module.exports = {
  listDisplays: () => [display],
  captureWindow: async (windowId, x, y, width, height) => ({ width, height, bgra: new ArrayBuffer(width * height * 4) }),
  getForegroundWindow: () => window,
  listWindows: () => ({ isComplete: true, windows: [window] }),
  readPointer: () => ({ x: 1, y: 2 }),
  glidePointer: async () => done,
  movePointer: () => done,
  click: () => done,
  drag: async () => done,
  scroll: () => done,
  typeText: () => done,
  pressKey: () => done,
  startMonitor: () => undefined,
  stopMonitor: () => undefined,
  showBorder: () => undefined,
  hideBorder: () => undefined,
  listAppPaths: () => ({ host: "C:\\Apps\\Host.exe", running: [window.imagePath], installed: [] }),
  describeProgram: () => ({ description: "Notes", signer: "Example" }),
  readProgramIcon: () => null,
  readControls: async () => ({ controls: [], leftOut: 0, timedOut: false }),
  findControl: async () => null,
  hitsControl: async () => false
};
