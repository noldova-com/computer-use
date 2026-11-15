/**
 * @license
 * Copyright (c) Noldova.
 *
 * This source code is licensed under the license found in the
 * LICENSE file in the root directory of this source tree.
 */

const readline = require("node:readline");

const lines = readline.createInterface({ input: process.stdin });
lines.on("line", line => {
  const request = JSON.parse(line);
  const isAscii = /^[\x20-\x7e]*$/u.test(line);
  const reply = value => process.stdout.write(`${JSON.stringify(value)}\n`);
  switch (request.method) {
    case "echo":
      reply({ id: request.id, result: { parameters: request.parameters, isAscii } });
      break;
    case "fail":
      reply({ id: request.id, error: "The method failed." });
      break;
    case "empty":
      reply({ id: request.id });
      break;
    case "none":
      reply({ id: request.id, result: null });
      break;
    case "badError":
      reply({ id: request.id, error: 5 });
      break;
    case "hang":
      break;
    case "endless": {
      const chunk = "x".repeat(64 * 1024);
      const send = sent => {
        if (sent <= request.parameters.length)
          process.stdout.write(chunk, () => send(sent + chunk.length));
      };
      send(0);
      break;
    }
    case "long": {
      const empty = JSON.stringify({ id: request.id, result: "" });
      reply({ id: request.id, result: "x".repeat(request.parameters.length - empty.length) });
      break;
    }
    case "garbage":
      process.stdout.write("not json\n");
      break;
    case "null":
      process.stdout.write("null\n");
      break;
    case "number":
      process.stdout.write("42\n");
      break;
    case "stranger":
      reply({ id: request.id + 1000, result: 1 });
      break;
    case "exit":
      process.exit(3);
      break;
    case "exitWithError":
      process.stderr.write("first line\nlast line\n", () => process.exit(4));
      break;
    case "exitWithLongError":
      process.stderr.write(`first line\n${"x".repeat(request.parameters.length)}`, () => process.exit(4));
      break;
    case "unterminated":
      process.stdout.write(JSON.stringify({ id: request.id, result: "last" }), () => process.exit(0));
      break;
    default:
      reply({ id: request.id, error: `Unknown method ${request.method}.` });
  }
});
