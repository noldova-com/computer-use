# @noldova/computer-use.runtime

The computer use module's runtime part: the agent tools that take screenshots and send pointer and keyboard input, each at a risk level that sets the permission it asks for, the session and its action queue, and the operating-system backends for Windows and macOS.

It exports the runtime part, the apps service, the displays, a permission request's `PermissionDetail`, a tool's own interfaces, the backend interfaces each operating system implements with their models, and its exceptions; its `src/api/index.d.ts` documents them.
Its `./macos` entry exports the macOS backend, its programs and their exceptions, and its `./windows` entry the Windows backend, its addon's interfaces and their exceptions; `src/api/macos/index.d.ts` and `src/api/windows/index.d.ts` document them.
The module's own package, [`@noldova/computer-use`](https://github.com/noldova-com/computer-use/tree/main/src/noldova.computer-use), gives it to the app and pins it at its own version.
[documents/ARCHITECTURE.md](https://github.com/noldova-com/computer-use/blob/main/documents/ARCHITECTURE.md) says how it is built, and the [README](https://github.com/noldova-com/computer-use#readme) how to build and test it.
It is licensed under the [MIT License](https://github.com/noldova-com/computer-use/blob/main/LICENSE).
