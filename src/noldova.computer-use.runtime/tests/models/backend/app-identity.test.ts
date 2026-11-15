/**
 * @license
 * Copyright (c) Noldova.
 *
 * This source code is licensed under the license found in the
 * LICENSE file in the root directory of this source tree.
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { AppIdentity, BundleIdInvalidException, ProgramPathInvalidException } from "@noldova/computer-use.runtime";
import { ArgumentOutOfRangeException } from "@noldova/context.exceptions";

describe("AppIdentity", () => {
  it("holds the operating system's identity of the app", () => {
    assert.equal(new AppIdentity("C:\\Program Files\\Sample\\sample.exe").id, "C:\\Program Files\\Sample\\sample.exe");
    assert.equal(new AppIdentity("com.example.sample").id, "com.example.sample");
  });

  for (const id of ["", "  "])
    it(`refuses the blank identity "${id}"`, () => {
      assert.throws(() => new AppIdentity(id), ArgumentOutOfRangeException);
      assert.throws(() => new AppIdentity(id), { message: "An app's identity must not be empty. (Parameter 'id')", parameterName: "id", actualValue: id });
    });

  it("gives every spelling of one Windows program the same identity", () => {
    for (const spelling of ["C:\\Program Files\\Sample\\Sample.exe", "c:/program files/sample/sample.EXE", "C:\\Program Files\\\\Tools\\..\\Sample\\.\\sample.exe"])
      assert.equal(AppIdentity.ofWindowsPath(spelling).id, "c:\\program files\\sample\\sample.exe");
    assert.equal(AppIdentity.ofWindowsPath("\\\\Server\\Share\\Sample.exe").id, "\\\\server\\share\\sample.exe");
  });

  for (const path of ["", "sample.exe", "C:sample.exe", "\\Sample\\sample.exe", "C:\\Sample\\"])
    it(`refuses the Windows program path "${path}"`, () => {
      assert.throws(() => AppIdentity.ofWindowsPath(path), ProgramPathInvalidException);
      assert.throws(() => AppIdentity.ofWindowsPath(path), {
        message: `The program path "${path}" must be a full path to a file, from a drive or a network share.`,
        programPath: path
      });
      assert.equal(AppIdentity.isWindowsPath(path), false);
    });

  it("takes a full path to a file from a drive or a network share as a Windows path", () => {
    assert.equal(AppIdentity.isWindowsPath("C:\\Program Files\\Sample\\sample.exe"), true);
    assert.equal(AppIdentity.isWindowsPath("\\\\Server\\Share\\Sample.exe"), true);
  });

  it("gives every spelling of one bundle identifier the same identity", () => {
    for (const spelling of ["com.apple.TextEdit", "COM.APPLE.TEXTEDIT", "com.apple.textedit"])
      assert.equal(AppIdentity.ofMacBundleId(spelling).id, "com.apple.textedit");
  });

  for (const bundleId of ["", "com.example app", "com/example", "com\\example"])
    it(`refuses the bundle identifier "${bundleId}"`, () => {
      assert.throws(() => AppIdentity.ofMacBundleId(bundleId), BundleIdInvalidException);
      assert.throws(() => AppIdentity.ofMacBundleId(bundleId), {
        message: `"${bundleId}" is not a bundle identifier: it is empty or holds a space or a slash.`,
        bundleId
      });
    });
});
