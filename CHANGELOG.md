# Changelog

**Scope:** What each published version of computer use's packages holds, newest first.

Each version's section is written by the pull request that changes the version, from the pull requests merged since the previous version; other pull requests don't edit this file.

## 0.0.3

- The packages take Noldova Desktop's `@noldova/desktop.*` at `>=0.0.17 <0.1.0`, context's `@noldova/context.exceptions` and `@noldova/context.json` at `>=0.0.12 <0.1.0`, and the window package's optional `@angular/core` at `>=22.3.0 <23.0.0`; `module.json` names `>=0.0.17 <0.1.0` as its `noldovaDesktop` range.
- Each session of a conversation uses only the apps it asked for itself: the screenshot mask, window reads, input and `computer_list_apps` no longer let one session use an app another session of the conversation was granted.
- An app's grant stays while any session that asked for it still runs, rather than ending with whichever of those sessions asked last.
- Control stays while any session of the conversation that acted on the screen remains, so an earlier session's work isn't cut off when a later one ends.
- On Windows:
  - the person's pointer input counts from the input monitor's start;
  - a long key or type batch no longer stops control as the person's input when nobody touches anything;
  - text typed with an Enter or Tab releases that key when Windows inserts only part of the batch;
  - input reaches an app under a path with a letter Windows folds differently, such as "İ", and that app shows its name and icon; an app's identity now lowercases only A to Z, so an app under a path with another capital letter, such as "Ö" or "Σ", no longer matches the grant remembered for it and is asked for once more;
  - a window read keeps the first 15 of the window's popups rather than none, ends at its limit with its time counted after UI Automation's start, loads UI Automation's lookup libraries as its start ends, and reports a time-out, rather than a missing window or control, when UI Automation or another process's controls run out of time.
- On macOS:
  - a drag releases its mouse button and modifiers however it ends;
  - the person's input is reported when the input process ends during a watch.

## 0.0.2

- The packages are the same as 0.0.1's but for their version: no pull request since 0.0.1 changed them.
  0.0.2 is the first version published through npm's trusted publishing, since 0.0.1 had to use a one-time token, and #2 took that token out.

## 0.0.1

- The first version of `@noldova/computer-use`, `@noldova/computer-use.protocol`, `@noldova/computer-use.runtime` and `@noldova/computer-use.window`, under the MIT License.
  The four packages move together.
- `@noldova/computer-use` holds `module.json` and `settings.json`, and exports `./runtime` and `./window`, which give Noldova Desktop the runtime part and the window part.
  `module.json` names Windows and macOS as its platforms, so on Linux Noldova Desktop shows the module as unavailable and never activates it, and names `>=0.0.1 <0.1.0` as its `noldovaDesktop` range.
  Its two settings are "Computer use (preview)", `computer-use.enabled`, off by default, and "Show a border while an agent uses the computer", `computer-use.showBorder`, on by default.
- The runtime part gives an agent 13 tools to see the screen and use the pointer and keyboard: `computer_list_apps`, `computer_request_apps`, `computer_list_displays`, `computer_screenshot`, `computer_zoom`, `computer_read_window`, `computer_click`, `computer_scroll`, `computer_move`, `computer_drag`, `computer_type`, `computer_key` and `computer_batch`.
  Each has a risk level, and the module asks the app for the person's permission for each conversation and each app before it acts; a screenshot masks every app the session isn't granted.
- While a tool sends input, the person's own pointer input, on Windows a key press into a window that isn't the app's own, or an input monitor that stops answering stops control and ends the agent's call; the window part's status bar item shows while a session controls the screen, and its click stops control.
- `@noldova/computer-use.runtime` exports `RuntimePart`, the backend interfaces and the models they exchange, and `./windows` and `./macos`, the operating-system backends' own APIs.
  On Windows it ships its addon built for x64 and arm64; on macOS it needs no native code, and the person gives Screen Recording and Accessibility to the app that runs it.
- `@noldova/computer-use.protocol` holds what the runtime and window parts exchange: `SessionStatus`, `ControlState`, `StatusReadRequest`, `StopRequest` and `BorderColorSetRequest`, with `ProtocolException` as the base of its exceptions.
- `@noldova/computer-use.window` exports `ComputerUseWindowPart`, which takes no arguments and builds its command and status bar item with Noldova Desktop's own window classes.
- The packages take Noldova Desktop's `@noldova/desktop.*` at `>=0.0.1 <0.1.0` and context's `@noldova/context.exceptions` and `@noldova/context.json` at `>=0.0.7 <0.1.0` as peers; the window package's `@noldova/desktop.window` and `@angular/core` peers are optional.
