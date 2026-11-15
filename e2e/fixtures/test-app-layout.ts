/**
 * @license
 * Copyright (c) Noldova.
 *
 * This source code is licensed under the license found in the
 * LICENSE file in the root directory of this source tree.
 */

import path from "node:path";

export class TestAppLayout {
  public static readonly REPOSITORY_ROOT: string = path.resolve(import.meta.dirname, "..", "..");
  public static readonly TEMPLATE_FOLDER: string = path.join(TestAppLayout.REPOSITORY_ROOT, "e2e", "app");
  public static readonly ARCHIVES_FOLDER: string = path.join(TestAppLayout.REPOSITORY_ROOT, "_packages");
  public static readonly APP_FOLDER: string = path.join(TestAppLayout.REPOSITORY_ROOT, "_build", "e2e-app");
  public static readonly REPORT_FOLDER: string = path.join(TestAppLayout.REPOSITORY_ROOT, "_build", "e2e");
  public static readonly EXECUTABLE_RECORD: string = path.join(TestAppLayout.APP_FOLDER, "_build", "development-app", "path.txt");
  public static readonly DEVELOPMENT_PACKAGE: string = path.join(TestAppLayout.APP_FOLDER, "_build", "development-package");
  public static readonly BUILD_COMMAND_LINE: string = path.join(TestAppLayout.APP_FOLDER, "node_modules", "@noldova", "desktop.build", "services", "build-command-line.js");
}
