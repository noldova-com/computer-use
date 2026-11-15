# Computer use

## Purpose

Lets an agent see the screen and use the pointer and keyboard on the person's behalf, with the person's permission.
An app offers it behind a preview setting; while the setting is off, the module offers no tool and reaches no operating-system call.
The module names no app; [ARCHITECTURE.md](https://github.com/noldova-com/computer-use/blob/main/documents/ARCHITECTURE.md#1-purpose) says what it is and how an app uses it.

## Parts and dependencies

| Part | Package | Owns |
|---|---|---|
| `runtime` | `@noldova/computer-use.runtime` | The agent tools, the session and its action queue, each tool's risk level and permission request, and the interfaces each operating-system backend implements. |
| `window` | `@noldova/computer-use.window` | The status bar item that shows while a session controls the screen, and its stop command. |

An app lists the module's own package, `@noldova/computer-use`, in this folder: it holds `module.json` and `settings.json`, and its `./runtime` and `./window` give Noldova Desktop the runtime part's class and the window part.
The window part builds its command and status bar item with Noldova Desktop's own window classes, from `@noldova/desktop.window`.
The module package depends only on the two part packages and takes Noldova Desktop's `@noldova/desktop.runtime` and `@noldova/desktop.protocol` as peers. The window part takes `@angular/core` and `@noldova/desktop.window` as optional peers, which Noldova Desktop requires of a module's window package: the app holds both in its window workspace alone, and Noldova Desktop's build installs there the packages the module's `./window` imports. No part's package is named `@noldova/desktop.`, which Noldova Desktop keeps for its own.
Each peer on a Noldova Desktop package names the range of Noldova Desktop versions the module accepts, which `module.json` names as `noldovaDesktop`.
The module's protocol package, `@noldova/computer-use.protocol` in the `protocol` folder, holds the models the two parts exchange: the session's status, its control state, and the status read and stop requests.
Both parts depend on it.
It has operating-system backends for Windows and macOS, which `module.json` names as its `platforms`, so on Linux Noldova Desktop shows the module as unavailable.
The module depends on no other module; its runtime part builds on Noldova Desktop's published `@noldova/desktop.runtime` and `@noldova/desktop.protocol`, as peers it shares with the app ([ARCHITECTURE.md](https://github.com/noldova-com/computer-use/blob/main/documents/ARCHITECTURE.md#5-what-the-module-needs-from-the-base)).

## Published API

- `@noldova/computer-use.protocol`: the protocol's models and their JSON forms; its exceptions, `ProtocolException` and a class for each rule a model breaks, such as `BorderColorInvalidException`; a value that isn't a model's wire form fails with `JsonException` from `@noldova/context.json`.
- `@noldova/computer-use.runtime`: the runtime part; the apps service, `AppsService`, which describes an app for a permission prompt; the displays; a permission request's `PermissionDetail`; a tool's own interfaces, `IComputerTool` and `IToolCallContext`, and `IProgramStarter`, the part of the runtime part's context that starts the macOS programs; the backend interfaces each operating system implements, `IDisplayBackend` among them, with their models; and its exceptions, on `ComputerUseException`, such as `RefusalException`.
- `@noldova/computer-use.window`: the window part's class, `ComputerUseWindowPart`.
- `@noldova/computer-use`: `./runtime` gives `RuntimePart`, and `./window` gives `windowPart`.

Each part package's `src/api/index.d.ts` documents what it exports, and the module package's `api/runtime.d.ts` and `api/window.d.ts`.

## Contributions

`module.json` contributes the methods `computer-use.stop` and `computer-use.statusRead`, which the window part calls, and the event `computer-use.statusChanged`, which it receives.
It contributes the method `computer-use.borderColorSet`, which the app calls with its theme's accent colour for the border ([ARCHITECTURE.md](https://github.com/noldova-com/computer-use/blob/main/documents/ARCHITECTURE.md#border)).
It contributes the window part's status bar item `computer-use.status`, which shows "Controlling the screen" on the status bar's right while a session controls the screen, and its command `computer-use.stopControl`, "Stop computer use", which the item's click runs and which command search offers while a session controls the screen.
It lists the module's 13 tools, each named with the `computer_` prefix, which the runtime part registers in the base's tool registry ([ARCHITECTURE.md](https://github.com/noldova-com/computer-use/blob/main/documents/ARCHITECTURE.md#tools)), and the preview setting `computer-use.enabled`, off by default, which is its switch setting: Noldova Desktop activates the module only while the setting is on, and deactivates it, withdrawing its tools, when the person turns the setting off.
It lists the setting `computer-use.showBorder`, on by default, which shows a border along every display while a session controls the screen ([ARCHITECTURE.md](https://github.com/noldova-com/computer-use/blob/main/documents/ARCHITECTURE.md#border)).

## Data

The module keeps no database and writes no file.
The runtime holds each conversation's app grants and each session's latest screenshot frame in memory, and drops them when the session ends.
A remembered grant is the base's permission center's to keep, and the app's settings list and revoke it.

## Behaviour

- Each tool is one action, at a risk level that sets which permission it asks for ([ARCHITECTURE.md](https://github.com/noldova-com/computer-use/blob/main/documents/ARCHITECTURE.md#4-tools-and-risk-levels)).
- A screenshot shows only the windows of the apps granted to the conversation and covers everything else, failing closed ([ARCHITECTURE.md](https://github.com/noldova-com/computer-use/blob/main/documents/ARCHITECTURE.md#screenshots)).
- Every input method of a backend takes an `InputTarget`, and the backend contract asks each backend to check in the same call that the target window is still in front, refusing with `RefusalReason.NotForeground` otherwise ([ARCHITECTURE.md](https://github.com/noldova-com/computer-use/blob/main/documents/ARCHITECTURE.md#target-check)).
- The person stops control from the window part's status bar item, the base's stop key or tray, or by using the pointer or keyboard while a tool sends input; each stop goes through the base, which stops every module's agent tools until the person resumes them from the base's Resume control, and a call the stop ends before its point of no return fails as `Stopped`. Switching computer use off resumes no stop, its own included: the stop stays until the person resumes it ([ARCHITECTURE.md](https://github.com/noldova-com/computer-use/blob/main/documents/ARCHITECTURE.md#stop-and-resume)).

## Open points

- The macOS responsible process and a stable signature for macOS development builds: [ARCHITECTURE.md](https://github.com/noldova-com/computer-use/blob/main/documents/ARCHITECTURE.md#6-missing-decisions).
- What the module needs from the base before an app can offer its tools: [ARCHITECTURE.md](https://github.com/noldova-com/computer-use/blob/main/documents/ARCHITECTURE.md#5-what-the-module-needs-from-the-base).
