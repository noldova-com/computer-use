/**
 * @license
 * Copyright (c) Noldova.
 *
 * This source code is licensed under the license found in the
 * LICENSE file in the root directory of this source tree.
 */

const fs = require("node:fs");

const parameters = process.argv.slice(2);
if (parameters[0] === "--fail") {
  process.stderr.write("could not create image from window\n");
  process.exit(1);
}
if (parameters[0] !== "--no-file")
  fs.writeFileSync(parameters.at(-1), parameters.join("\n"));
if (parameters[0] === "--hang")
  process.stdout.write("written\n", () => setTimeout(() => undefined, 60_000));
if (parameters[0] === "--fail-after-file") {
  process.stderr.write("could not finish the image\n");
  process.exit(1);
}
