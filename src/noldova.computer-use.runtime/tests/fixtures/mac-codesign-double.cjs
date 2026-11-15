/**
 * @license
 * Copyright (c) Noldova.
 *
 * This source code is licensed under the license found in the
 * LICENSE file in the root directory of this source tree.
 */

const path = require("node:path");

const DETAILS_LIMIT = 16_384;
const DEVELOPER = "Authority=Developer ID Application: Example Corp (A1B2C3D4E5)";
const developerEndingAt = length => `${"Identifier=com.example.long\nNote=".padEnd(length - DEVELOPER.length - 1, "-")}\n${DEVELOPER}\n`;

const answers = {
  "Developer.app": [0, "Identifier=com.example.notes\nAuthority=Developer ID Application: Example Corp (A1B2C3D4E5)\nAuthority=Developer ID Certification Authority\nAuthority=Apple Root CA\n"],
  "Apple.app": [0, "Identifier=com.apple.finder\nAuthority=Software Signing\nAuthority=Apple Code Signing Certification Authority\nAuthority=Apple Root CA\n"],
  "AppStore.app": [0, "Identifier=com.example.store\nAuthority=Apple Mac OS Application Signing\nAuthority=Apple Worldwide Developer Relations Certification Authority\nAuthority=Apple Root CA\n"],
  "TestFlight.app": [0, "Identifier=com.example.beta\nAuthority=TestFlight Beta Distribution\nAuthority=Apple Worldwide Developer Relations Certification Authority\nAuthority=Apple Root CA\n"],
  "Adhoc.app": [0, "Identifier=com.example.adhoc\nSignature=adhoc\n"],
  "Unsigned.app": [1, "code object is not signed at all\n"],
  "AtLimit.app": [0, developerEndingAt(DETAILS_LIMIT)],
  "OverLimit.app": [0, developerEndingAt(DETAILS_LIMIT + 1)]
};
const answer = answers[path.basename(process.argv.at(-1))];
if (answer === undefined)
  setTimeout(() => undefined, 60_000);
else
  process.stderr.write(answer[1], () => process.exit(answer[0]));
