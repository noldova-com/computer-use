# Testing

**Scope:** How the module's tests are layered, the targets and operating-system grants they need, how native tests keep input inside their own window, its timing checks and end-to-end tests, and the exclusions and exceptions this repository grants.

The organization's testing standard owns the general rules: coverage, determinism, isolation, results and evidence.
This document adds only what the module needs.
[ARCHITECTURE.md](ARCHITECTURE.md) owns the module's parts, its tools and their risk levels.

## 1. Layers

| Layer | Needs | Proves | Does not prove |
|---|---|---|---|
| Package tests | Fakes of the operating system, and the base's published runtime package | The module's own logic, and its tools in the base's real tool registry and permission center | Any operating-system behavior, or what the app's permission card shows |
| Native tests without grants | A desktop session, no grant | Capture and input end to end where no grant is needed, and the module's refusals where a grant is missing | Capture and input on macOS, native Wayland |
| Native tests with grants | A desktop session and the grants in [section 3](#3-operating-system-grants) | Capture and input on macOS | What the operating system shows the person |
| End-to-end tests | A fixture app on Noldova Desktop 0.0.1 holding the module from its packed packages; a signed-in desktop session for the full in-app test | The module inside a real app: unavailable on Linux, and on Windows and macOS its grants, tools, status bar item and stop key | What the app's own permission card shows |
| Checks by a person | A person at the machine | The operating system's prompts and settings, and what the person sees | Anything automatic |

### Package tests

Package tests replace the operating system with doubles of the module's own backend interfaces, and the parts of the base around the tools with Noldova Desktop 0.0.1's own fakes, from `@noldova/desktop.runtime/testing`, `@noldova/desktop.window/testing` and `@noldova/desktop.protocol/testing`, each answer given by the test or by a fixture that subclasses the fake to add answers:
- the operating-system layer: capture, input, the window list, the window in front, and display geometry; each double records what it was asked and answers what the test sets, as a real backend would: input checks the target against the window double's window in front, the control double answers the tree set for a handle, the capture double draws a window as the part of the screen at its frame, and the window double's stack is the window in front alone until the test sets stacks, with an empty list failing as a backend does;
- the runtime part's context, `FakeRuntimePartContext`, answered with its methods, events, services, work items, program starts, the app's windows and the app's shortcuts; its settings, `FakeModuleSettings`, which calls no listener once the part deactivates; its log, `FakeModuleLog`; and its tools, `FakeToolsContext`, over the base's real `ToolRegistry`;
- the window part's context, `FakeWindowPartContext`, answering `registerStatusBarItem` with the base's real `StatusBarItem` and each request by its method, failing a method the test didn't answer;
- the person who answers permission requests, as the app's answerer, a double of the base's `IPermissionAnswerer`, over the base's real `PermissionCenter`.

No fake is looser than Noldova Desktop: a member Noldova Desktop adds or changes reaches the tests through its fakes.
The window part's tests load Noldova Desktop's window package, whose kit ships in Angular's partial compilation, so each first imports `@angular/compiler`, a root development dependency.

The tools run in the base's own `ToolRegistry` and `PermissionCenter`, from the version this repository's lockfile pins, so a test sees what the registry does with a call: its schema check, its stop, its deadline, and its `OutcomeUncertain` after a tool's point of no return.
The registry settles a stopped or cancelled call before the tool's handler returns, so a test that checks the module's state after such a call first waits for the handlers to end.
A test of what the registry never hands a tool, such as arguments its schema refuses, or of the tool's own answer to a signal the test aborts, calls the tool's handler directly, with its requests still going to the center.

They cover:
- each agent tool's arguments and errors: coordinates outside every display, unknown keys, empty or oversized text;
- permission requests through the center: granted, denied, expired (an expired request counts as denied), remembered for a scope, revoked during a session, and withdrawn by a stop;
- per-app approval: an action on an app the person hasn't approved is refused before any operating-system call;
- the stop control: a stop during an action, a stop with actions queued, a second stop, a stop from another module or the base, and a resume through the base; switching the module off after its own stop, after a stop from another module or the base, and while one of its calls still finishes, each of which stays until the person resumes it; no operating-system call follows an acknowledged stop;
- each tool's registration: its risk range, its deadline, whether it is resumable and marks its point of no return, and the tool it names next;
- the mapping between screenshot and screen coordinates: the display's scale, a different scale per display, and negative coordinates for a display left of or above the main one;
- the switch setting: `module.json` names the preview setting as its switch setting, which Noldova Desktop's declaration reader accepts. Switching the module off deactivates the part, which withdraws the tools and ends their calls; switching it on builds a new part, which offers them again; and a backend that fails to load fails the activation;
- redaction of logs and diagnostics;
- describing an app: each backend's name, publisher and icon, from doubles of the addon and the input process, with the icon read back from its PNG with its alpha; a program's file read once; no description for an absent app; an icon that can't be read leaving the description without one; the apps service published at activation, describing through the backend while the part is active and giving null once it deactivates, as the module is switched off; and its null on a failure and past its time limit, and its rejection when the caller ends the call;
- the window part, against `FakeWindowPartContext`, with the base's real window classes: the item hidden while no session controls the screen and shown with its text, glyph, tooltip and command while one does; the status read as the part activates and reconnects, and a change during that read winning over its answer; the stop command, offered only during control, sending the stop request, and a rejected stop request reaching the command's caller with the item kept; a malformed status event thrown out of the event's dispatch, as Noldova Desktop's dispatch does, with the item kept; and deactivation;
- the app's own shortcuts and windows: `computer_key` refusing the base's stop key and every chord `context.shortcuts.list()` gives, following a chord the list adds and removes, and the input tools refusing while one of `context.appWindows.list()`'s windows is in front;
- the module's own package: its `./runtime` and `./window` give the parts' exports, `module.json` has the package's version, as Noldova Desktop requires, and it depends only on its own parts, with Noldova Desktop's runtime and protocol packages as its only peers, each in the module's `noldovaDesktop` range, which runs from the root `package.json`'s pin of Noldova Desktop to the next minor below 1.0 and the next major from 1.0, so an app's root install holds no Angular; it names no peer on Noldova Desktop's window package, optional or not, since npm would install that package at the app's root, where its exact Angular peers clash with a newer Angular 22; each package's sources import by name only the package itself, its dependencies, its peers and Node's own modules, so a strict install resolves them; `module.json` names `windows` and `macos` as its `platforms`; no package depends on a `@noldova/desktop.` package, which Noldova Desktop keeps for its own; and the window part is named `@noldova/computer-use.window` and takes `@angular/core` and Noldova Desktop's window package as optional peers, Angular from the version Noldova Desktop's window package pins up to the next Angular major and Noldova Desktop's window package in the module's range.

### Clocks

Every timer of the code under test is set by the test: through `mock.timers`, with the code on the default import of `node:timers/promises`, or through an interval the test passes inside the package.
The runtime harness's heartbeat interval is 600 000 ms, past every hang limit, so the real clock never decides a harness test, and after each test the harness stops control on any harness whose watch still runs, so no heartbeat deadline outlives its test; the tests of the watch's deadline pass their own interval and drive it with `mock.timers`.
`HangGuard`, in `tests/services/hang-guard.fixture.ts`, bounds a call over a double by the real clock, 10 s, below the unit suite's 30 s hang limit, so the guard names a stuck call before the runner's limit does; it is a hang guard only, which no test asserts on.
A wait is on an event or a promise that the code or the double gives, and "nothing happened" is asserted once the operation has ended, its promise awaited or an ordered sentinel after it.

### Direct calls

A direct call, `callDirectlyAsync`, shows the tool's own answer where the registry would settle the call itself, such as an input its schema refuses or an error that isn't a tool's failure.

### Native tests without grants

Native tests drive the real application and a test window ([section 4](#4-keeping-input-inside-the-test-window)), with real capture and real input.
They are the parts' `tests/native/*.native.ts` files, which the package tests leave out; `npm test -- --native`, with no other option, runs them one at a time, on test computers only, which are used only for tests and each have a person's desktop session signed in, after `npm run build` puts the host's addons into the runtime package's `native/<platform>-<arch>/` and the macOS input process's script into its `jxa/mac-desktop.js`, and installs the packages.
The run writes its report, with each test's diagnostics, to `_build/native-tests.log` as well as to the screen, so a failing run keeps its log until the next run.
No native file sets a `timeout` of its own: the native suite's one hang limit applies, 180 s, five times the slowest native test measured, 35 s on macOS x64 ([README.md](../README.md#checks)).
Each window start may wait 60 s, since a new Windows PowerShell that loads Windows Forms or WPF took 5 s at the median and up to 12 s, and an `Add-Type` compile ran past 10 s on a Windows 11 computer.

- **Linux, X11 (planned, not built yet):** Linux has no backend yet, so it runs the package tests only.
  The plan is that each test process starts its own Xvfb display, so tests capture, move the pointer and type on a display no other process uses, and run in parallel.
- **Windows:** in the signed-in desktop session, with the app running elevated and not elevated.
  When the app isn't elevated, an action on an elevated window must be refused with that reason, never pass silently.
  Node's own program is described with its file's description as its name and its icon, whose clear pixels keep their alpha.
- **macOS:** the refusals, with the development app started by a process that holds no grant.
  The module reports the missing grant, which the person gives in the system's settings.
  It refuses a capture that would show only the desktop picture and its own windows, rather than handing it to the agent.
  It refuses input that macOS would drop, rather than reporting it sent.
  Finder is described with its name, Apple's signer as its publisher and its icon, whose clear pixels keep their alpha, and an unknown bundle identifier with none.
  TextEdit, whose bundle identifier has capitals, is described by its lowercase identity.
- **Linux, Wayland (GNOME and KDE Plasma; planned, not built yet):** the plan is that the module detects the Wayland session and reports that native windows can't be captured or driven, rather than returning a black or partial image.

### Native tests with grants

Only macOS needs grants; Windows needs none, and X11, planned and not built yet, would need none.
These tests run in the signed-in desktop session of a macOS test computer; CI doesn't run them yet.

On GitHub's `macos-15` image (macOS 15.7.9, ARM64), one probe found that every process a job starts already holds Screen Recording and Accessibility.
The image grants them to the runner's own processes, which are responsible for the processes a job starts, and runs with System Integrity Protection off.
Members never change these grants, with one exception, the end-to-end job of [section 3](#3-operating-system-grants).
An image update could drop them; the grant check before the first test then fails the run and names them.

They cover capture of other apps' windows and of the whole screen, input into the test window, the coordinate check of [section 4](#4-keeping-input-inside-the-test-window) at that display's scale, and the stop control halting input.
With the grants on the process that starts the development app ([section 3](#3-operating-system-grants)), they prove capture and input, but not the app's own responsible-process chain, which stays a check by a person.

Before the first test, the run reads the grant state that the module reports.
It fails at once, naming each missing grant and the code signature of the process that should hold it, so no test waits on dropped input or an empty capture.

### Checks by a person

A person checks these, and the evidence on the issue names them as manual checks:
- macOS's first prompt for each grant, the System Settings pane it opens, the app's name and icon there, and the restart macOS asks for after a Screen Recording grant;
- macOS 15's periodic question whether to keep allowing screen capture;
- revoking a grant during a session;
- that the status indicator is noticeable while the agent acts, and that the person can stop it with the real mouse and keyboard during an action;
- real multiple displays and high-density displays;
- that a person's grants go to the app whether Finder or a terminal starts it, as Noldova Desktop makes the runtime its own responsible process.

## 2. Targets

The module's delivery targets are the base's: Windows, Linux and macOS, each on x64 and ARM64.

| Target | Package tests | Native tests without grants | Native tests with grants |
|---|---|---|---|
| Linux x64 | CI | None yet, with no Linux backend; planned, not built yet: X11 under Xvfb on test computers (Ubuntu 26.04), and Wayland detection on test computers with GNOME and KDE Plasma | Not needed |
| Linux ARM64 | CI, on pushes to `main` and runs started by hand | No CI job yet | Not needed |
| Windows x64 | CI | Test computers (Windows 11), with the app elevated and not | Not needed |
| Windows ARM64 | CI, on pushes to `main` and runs started by hand | No CI job yet | Not needed |
| macOS x64 | CI, on pushes to `main` and runs started by hand | Test computer (macOS 15) | Test computer (macOS 15) |
| macOS ARM64 | CI | No CI job yet | No CI job yet |

A pass on one architecture doesn't certify the other.

CI runs one job each for Linux x64, Windows x64 and macOS arm64 on every pull request, draft or ready, and on pushes to `main` and runs started by hand one for each of the six targets, Linux arm64, Windows arm64 and macOS x64 too, each on the GitHub-hosted runner that the organization's shared `versions.yml` names for its target.
Each job checks the Node.js and npm versions but not Node.js's architecture, which the runner sets, and the required check, "Build and test / All targets", passes only when every target passes.
The flake proof, `.github/workflows/flake-proof.yml`, calls the `.github` repository's shared one to run an npm script, `npm test` unless another is named, many times over on the same runners, to prove a flaky test fixed or to hunt one.
A member starts it by hand, with the ref, the filter, the script, the npm scripts each job runs once before the runs, such as `test:e2e:prepare` before `test:e2e`, whether each run on Linux runs under a virtual display, which `test:e2e` needs, the number of runs and parallel jobs, and the targets, such as `linux-x64 windows-x64`; it runs no native test.
A proof waits while one of the same ref, script, preparation, display and filter runs, and a newer one of them takes its place in the wait.
An empty filter makes each run the whole suite with its coverage gate, about 12 s on a Linux x64 computer.
A flaky test's fix is proven by 10 runs of that test alone, or of its file when its tests depend on each other, through the filter, which each run passes to `npm test` as arguments, as `npm test -- <filters>` does.
A filter ending in `.ts` names a test file from the repository root with forward slashes, such as `src/noldova.computer-use.runtime/tests/services/runtime-part.test.ts`, and any other is a regular expression Node.js's test runner takes as `--test-name-pattern`; the filters are separated by spaces, so a pattern writes a space as `s`.
Patterns with no file look through every test file, and files with no pattern run whole.
A filtered run measures no coverage, since only the whole suite can meet the gate, so it is never the gate; and it fails when no test passes, so a mistyped filter can't prove a fix.
Each native report names the machine's operating system and architecture.

### Native tests

The native tests need a desktop session with a display, and CI runs none of them: no workflow runs `npm test -- --native`.
By what each test needs, most of them could run on the GitHub-hosted runners CI uses, whose Windows and macOS images have a desktop session, and whose macOS ARM64 image gives every process a job starts both grants; none has run there yet.
The files are in `src/noldova.computer-use.runtime/tests/native/`.

| File | Tests | Could run on a hosted runner | Need a test computer, and why |
|---|---|---|---|
| `mac-backend.native.ts` | 46 | 45, on macOS ARM64 | 1: the screenshot and zoom at the display's scale needs a display at scale 2, and skips itself below it |
| `mac-test-window.native.ts` | 11 | 11, on macOS ARM64 | None |
| `windows-backend.native.ts` | 34 | 33, on Windows | 1: typing into Calculator needs Windows 11's own UWP Calculator, which the Windows Server image doesn't ship |
| `step-timing.native.ts` | 1 | 1, on Windows and macOS ARM64, though a shared runner's times say little about a test computer's | None |
| `mac-backend.timing.native.ts` | 6 timing checks | None: a shared runner's times say nothing of the promise | All 6, by `npm run test:timing -- --native` ([Timing checks](#timing-checks)) |
| `windows-backend.timing.native.ts` | 4 timing checks | None: a shared runner's times say nothing of the promise | All 4, by `npm run test:timing -- --native` ([Timing checks](#timing-checks)) |

`npm test -- --native` leaves out the `*.timing.native.ts` files.

Two native checks this document names have no test yet:
- **Windows, elevation:** an action on an elevated window refused with that reason while the app isn't elevated.
  A hosted Windows runner runs every process elevated, so this needs a test computer.
- **macOS, no grant:** the refusals with the development app started by a process that holds no grant.
  The hosted macOS image grants every process, so this needs a test computer ([open decision 4](#7-open-decisions)).

### End-to-end tests

The end-to-end tests run the module inside a real app on Noldova Desktop 0.0.1, installed from its packed archives, with its real runtime and window parts in Noldova Desktop's real runtime, registry, permission center and window; the README's Checks section says how they run ([README.md](../README.md#end-to-end-tests)).
- **In CI, Linux x64:** the module shows as unavailable in the app's Modules document, with no switch and no actions, no module shows as failed, no status bar item shows, its setting isn't offered, and an agent session lists no `computer_` tool.
- **In CI, Linux x64, the fixture's own start:** a command run while the app's window still shows its start, held there by data from before the shell until the test moves it aside, waits for the start to end and then opens the Modules document.
- **In CI, Windows x64, and on the Windows test computers:** the job "Desktop end-to-end, Windows x64" of `.github/workflows/build-and-test.yml` runs it in the hosted runner's interactive desktop session; with the module switched on, the session grant and an app grant for the native test window's app, a screenshot, a window read that lists the Save button, a click on it by its control, the status bar item while the session controls the screen, the system-wide stop key pressed through the operating system, Resume, the item's click, Resume again, and the item hiding when the session ends.
- **In CI, macOS arm64:** the job "Desktop end-to-end, macOS arm64" runs the same spec on GitHub's hosted `macos-15` image. The app's runtime is its own responsible process there, so the runner's own grants don't reach it, and before the spec the job's step "Grant the test app on the hosted macOS runner" writes Screen Recording and Accessibility for the test app into the runner's TCC database, by the app's bundle identifier and designated requirement, and approves its screen capture so that macOS's alert about the window picker doesn't cover the test window ([section 3](#3-operating-system-grants)). No test computer runs it, since there only a person gives the grants and an ad-hoc signed app's grant doesn't outlast its code hash.

The fixture app's only other module is its own agent host, `agent-double`, which an app brings anyway, since Noldova Desktop has no agent host or permission card of its own: it answers each request with the answer the test planned before the call, falling back from Allow always to Allow once when a request doesn't offer it, and denies anything unplanned, so an unexpected request fails the call.
The prepare step pins the module's package to its exact version, as Noldova Desktop's build requires, after npm installs it from its archive, since the archives change with every commit and a committed lockfile for them would always be stale.
Each test gives the app its data and device folders in a new folder under the system's temporary folder, named in the test's annotations, since the runtime's socket lies in the data folder and a Unix socket path is limited to about 100 bytes, which a path under the test's results passes.
The desktop test ends its agent session also when it fails, since Noldova Desktop's quit asks the person before it ends running work, and no person answers in a test.
Each test ends with Noldova Desktop's command-line quit, given 30 s through its `--timeout`, which must succeed; it attaches every file in the app's logs folder and the main process's output to the test's results, and then closes the app through Playwright, as Noldova Desktop's own end-to-end tests do, since on macOS the app's process stays open after the quit; an app that hasn't closed 30 s later has its process ended, and the test fails, naming it.
Each test starts once the app's window has ended its start, and a command search waits for that too: Noldova Desktop 0.0.1's window shows its workspace as soon as the runtime is ready, but enables the shell's commands, such as Modules, only after it has activated the modules, and its command search reads the commands once, when the text is typed, so a search typed earlier stays empty.
The end of the start is the window row's Settings button turning enabled, since the window enables it in the same step as those commands, and holds it disabled again while it reconnects.
While the app's window connects to its runtime, a setting change answers `Disconnected`, so the tests repeat it until the window is connected.
The CI test's limit, 120 s, covers a cold start of the development app and its runtime on a hosted runner, and the quit; the desktop test's, 240 s, covers that, the test window's start and every tool call; each suite's `expect` timeout equals its test's, so the test's limit is the only one.
The stop key is pressed through the operating system, since Noldova Desktop takes it system-wide while a session is open; injected keys don't count as the person's input for the module's watch, so the stop comes from the key alone.

## 3. Operating-system grants

| Target | Grant | Needed for |
|---|---|---|
| macOS | Screen Recording | Capturing other apps' windows; without it, macOS shows only the desktop picture, the menu bar and the app's own windows |
| macOS | Accessibility | Sending mouse and keyboard events, which macOS otherwise drops without an error |
| Windows | None | Input into an elevated window needs the app to run elevated too |
| Linux, X11 (planned, not built yet) | None | |

On macOS the module asks for no Input Monitoring and no Automation grant: there it listens to no global keyboard events and drives no app through Apple Events.
On Windows its addon's low-level input hook needs no grant ([ARCHITECTURE.md](ARCHITECTURE.md#stop-and-resume)).

macOS gives a grant to the responsible process, not to the process that makes the call.
- The app's processes, helpers and runtime count as the app when the app starts them.
- A process that a terminal starts counts as that terminal, so Noldova Desktop starts the runtime as its own responsible process, the app's executable, also when a terminal started the app ([ARCHITECTURE.md](ARCHITECTURE.md#5-what-the-module-needs-from-the-base)).
- A process that starts the app as its child is responsible for the app and for everything the app starts.

The native tests rely on this: on a macOS test computer the grants are given to the process that starts the development app in the tests, and to nothing else ([open decision 1](#7-open-decisions)).
The refusal tests start the development app from a process that holds no grant.

macOS ties the grant of ad-hoc signed code to its code hash.
A rebuild of the development app keeps the grants, because the app doesn't hold them; an update of the program that starts it may drop them ([open decision 2](#7-open-decisions)).
The grant check before the first test ([section 1](#native-tests-with-grants)) reports a dropped grant by the code signature of the process that should hold it.

Members never change privacy or security settings, with one exception: the CI job "Desktop end-to-end, macOS arm64", on GitHub's hosted image only, writes Screen Recording and Accessibility for the test app into that runner's TCC database before its spec, through `npm run test:e2e:grant-hosted-macos`, which refuses to run anywhere but a GitHub-hosted macOS runner.
The same step writes a far-future date for the test app's executable into that runner's `~/Library/Group Containers/group.com.apple.replayd/ScreenCaptureApprovals.plist`, as GitHub's image does for its own runner: from macOS 15 a Screen Recording grant alone still lets the system ask, in an alert over the screen, whether the app may keep capturing without the window picker, and that alert covers the test window.
It never runs on a test computer or a member's own computer.
A test computer's grants are given by a person at it.

## 4. Keeping input inside the test window

Native tests share the machine's pointer, keyboard and the window in front.
Every native test that sends input or captures the screen keeps to these rules:

1. **A test window.**
   The test opens its own window, with a unique title and a known pattern, and every action targets it.
   On Windows a wait for the test window's next line that times out names the window in front, by its process, image, class and title, which it reads within 5 s, as when another program's window keeps the test window from coming in front.
   On macOS the test window reports when its own loop stops turning for a second, by the system's uptime, with the run loop mode and any modal alert's text, as when an error opens the applet's alert, and reports again when the loop turns; while its last stall has no such report, a wait for its next line fails at once with that stall.
   On macOS a test that finds no window in front names what is: the frontmost app by its name, bundle identifier and process, and the top windows by their owner, process and bounds, with no window's title.
   Before each test of the macOS backend's suite, the test window comes back to the front if another app has it, through `open`, so the tests after one that lost the front don't fail on that.
   The hook reads the front through a new process rather than the backend it tests, whose own read once kept a front that had changed.
   The test it comes back for reports, as a diagnostic, the test before it and what was in front; the test that lost the front fails only if it found the loss itself.
   After a test of the Windows backend's suite fails, the hook closes its test window and opens a new one, so no late line reaches the next test.
   After a test of the macOS backend's suite fails, the hook takes the lines up to a sentinel ([section 5](#5-tests-that-run-one-at-a-time)), or what is pending when the sentinel fails, and names them in that test's report, as a diagnostic, so the next test doesn't read them.
2. **A check before each input.**
   Through the operating system, not the app, the test checks that the window in front belongs to its own process and that the target point lies inside that window, away from its edges.
   When either check fails, the test fails without sending the input.
   On macOS the check of the macOS backend's suite reads the window in front through the backend again until the test window is there, up to the test's time limit, and each read that finds no window or another one goes in the test's report, as a diagnostic, with what is in front.
   The pointer glides from where it is to each point, so the pointer is put inside the test window when it opens, and each glide starts and ends inside it.
   On Windows the test window puts it there; on macOS the test does, from a process it starts, since the applet that `open` starts holds no grant to move the pointer, and macOS would ask a person for one.
3. **A coordinate check.**
   The test window draws a marker; the test captures the test window itself, finds the marker, clicks it, and the window reports where the click landed.
   This proves the mapping from screenshot to input, scale included.
4. **Keys only into the test window.**
   The test types only while the test window has keyboard focus, from a fixed set of harmless text.
   It sends no shortcut that acts outside the app, such as quitting, switching apps or the Windows key, unless the test checks that shortcut and the app is in front.
5. **Clean up.**
   The pointer goes back where it was, and the test's time limit ends its input through the module's stop control and then by ending the test's own processes.
6. **Captures of the test window only.**
   On macOS and Windows, a test keeps only the test window's own capture.
   No capture is posted before it is checked for private content.
7. **Secure input on macOS.**
   While any app has secure keyboard entry on, for example in a password field, macOS drops synthetic keys.
   The test checks for it first and fails with that reason.
8. **Approval for the test app only.**
   The tests approve only the test app, and one test checks that an action on another app is refused.

On Linux, once its backend is built, the plan is that the test's own Xvfb display keeps its input away from every other process, with the rules still applying.

One exception departs from rules 1 and 2. It runs on the test computers only, never on a person's computer.
A Windows native test opens a File Explorer folder window of its own and checks that it is in front, instead of the test window.
It then aims one pointer move at an empty spot of the desktop, outside that window and away from the taskbar's buttons.
The move must be refused as `OtherWindowAtPoint` with nothing sent, since the desktop belongs to no app though File Explorer's process draws it.
It puts the pointer back and closes the folder window after.

A second exception departs from rules 1 and 8. It runs on the test computers only, never on a person's computer.
A Windows native test starts Calculator, a UWP app, fresh, and fails to start it when it already runs.
Its content runs in its own process, inside a window that `ApplicationFrameHost`'s process draws, so its keyboard focus belongs to another process than its window.
The test brings that window in front, checks that it is in front, instead of the test window, and types one digit, which must be sent, since the content's process counts as the window's, and must then show on Calculator's display, which Windows PowerShell reads through UI Automation.
It then ends Calculator by its process ID and fails when Calculator still runs.

A third exception departs from rule 8, in `step-timing.native.ts` only.
To time a step over ordinary apps, that test opens Character Map and winver on Windows, or TextEdit and Calculator on macOS, fresh and with no documents, before the test window opens in front of them.
It fails to start an app that already runs.
On macOS it starts each app as a new instance through Launch Services, which macOS requires of its own apps, and reads the process ID from the launch.
It approves the apps so that each screenshot captures their windows.
The approval itself would let input reach them, so the test sends them none by its own checks.
Before the steps and again before each click, untimed, it checks through the operating system that the test window's process and window are in front and that the click's point lies inside that window, away from its edges.
Its `after` hook closes the test window and ends each app by its process ID, each apart from the others, so one failure leaves nothing running.
On Windows that also ends the processes the app started.
The hook fails when an app's own process is still running.

### The test windows

- **Windows:** `test-window.ps1` is a WinForms window with a focused text box, a password box that reports nothing, a Save button and a 48-pixel magenta marker.
  It reports `ready <handle>` once it is the foreground window, and each input it gets, such as `click`, `drag`, `text`, `enter`, `wheel <delta>` and `pressed save`, and on stdin it takes commands, such as `hold`, `release`, `move` and `move-on-press`.
  It shows without its opening animation, so the first capture finds the marker, and puts the pointer 40 by 280 pixels into its content, so the first glide stays inside it.
  `password-window.ps1` is a WPF window whose `PasswordBox` isn't a classic `Edit` control, so only UI Automation's `IsPassword` tells it is a password field; it reports the user name's text, the password's length only, its focus and its clicks.
  `bring-to-front.ps1` takes the foreground by sharing the front window's input state for a moment, which sends no input; `cover-window.ps1` and `backdrop-window.ps1` show topmost without activation; `child-window.ps1` is a borderless form that the test window makes its child.
- **macOS:** the test window is an applet compiled into its own folder, given a bundle identifier with `plutil` and signed again, and started by `open` with `-ApplePersistenceIgnoreState YES`, so an earlier crash never holds it at AppKit's question whether to reopen windows.
  It never posts events or moves the pointer, since `open` starts it without the test process's grants; it logs each event in the view that gets it, and a press that reaches it while inactive, and opens at the left of the main display, away from the alerts macOS centres.
  macOS gives no app the front back when the app in front ends, so a test brings the window in front through `open`, as a click in the Dock would, and waits for `front`.
  Its `hold` command runs its run loop until the test writes a resume file, and its web view logs `web ready` from its navigation delegate once the page has loaded.
- **Barriers and sentinels:** input is delivered in order on a window's thread, so an input sent after a refused one, and awaited in the window's report, proves nothing earlier arrived: on Windows an Enter, a click on the WPF window's empty area, or a `z` typed into the user name box; on macOS a click posted at the HID level at the window's start point, only while the window server lists the test window's process on top there, or a `z` posted to the key panel.
  A hold blocks the window's thread until the test sends `release`, so neither the window nor its UI Automation answers meanwhile, whatever the machine's speed.

## 5. Tests that run one at a time

On Windows and macOS, the pointer, the keyboard and the window in front belong to the whole desktop session.
Native tests that send input or depend on the window in front run last, one at a time, and each is listed here by file.

| Test file | The shared resource |
|---|---|
| `src/noldova.computer-use.runtime/tests/native/windows-backend.native.ts` | The pointer, the keyboard and the window in front, through a Windows PowerShell test window: Node's program described with its icon; the test window read in front, not elevated, and listed with its program and frame; the border shown out of the window list, passing hit tests through and leaving the focus where it was; a notification's immersive window listed in front of it; the marker captured and clicked where the window reports it; a drag from the marker with Shift held; a drag whose stop flag is set before its press answered as stopped with nothing sent, and a flag over memory that isn't shared refused; once the test window has moved away from the marker's point, a glide there refused as `OtherWindowAtPoint` with the pointer where it was and no click, and a drag from the moved marker to that point refused before its press, with nothing pressed; a scroll of more than 50 notches along either axis refused before anything is sent; the test window's own capture under another window over its marker, with none of that window's colour; a capture while the window's thread is held, off the JavaScript thread; two captures of a window at once, and a later one; a window with an acrylic backdrop captured with none of the window behind it, skipped below build 22621, which has no system backdrops; typing into the text box; the controls read through UI Automation, the Save button found again and pressed by a click at its point, and a read's handles freed by a new read but kept by one that fails before it finds the window; typing, a key press, a click and a drag refused as the person's input when the addon's seam raises the person's input count before the send, the click and the drag with the pointer already at their point so their own checks refuse them, with nothing sent, and typing sent without it ([README.md](../README.md#internal-test-seams)); Escape closing the test window, and a close at the test's request putting the pointer back; a test window brought in front by being minimized and restored, its frame and marker where they were; a wait that names the window in front when the test window reports no line in time; another process's window inside the test window read only as a row of its app, and typed into once it has the focus, as WebView2's content takes it; typing refused as `FocusOutsideTarget` while another process's window outside the target has the focus; a carriage return, a line feed and the pair each typed as one Enter, with the text after it refused; typing and a key press refused in a WPF password box, which isn't a classic `Edit` control; a user name and a Tab typed, with the text after the Tab refused, and refused again in the password box the Tab moves to; typing refused as `FocusUnknown`, with nothing sent, into a window whose thread is held past the half-second focus budget; a pointer move from a File Explorer folder window to the desktop refused; and a digit typed into Calculator, a UWP app whose content runs in another process than its window. Every "nothing was sent" is decided by an ordered barrier after the refusal, an Enter, a click on the WPF window's empty area or a sentinel character, whose report proves nothing earlier arrived ([section 4](#the-test-windows)) |
| `src/noldova.computer-use.runtime/tests/native/mac-backend.native.ts` | The pointer, the keyboard and the window in front, through a JavaScript applet that the test compiles and gives a bundle identifier; the window in front read by the input process, which runs for the whole suite, as a second test window's once its app takes the front, and as the test window again once that window closes, at the first read after a new process reads each change; an app with a bundle identifier of its own listed running by that process once it starts, and no longer once it ends, at the first list after a new process reads each change; the marker clicked and double-clicked, a drag with Shift held, a drag stopped when its end leaves the test window or by its stop file after the press, released where the pointer is, and a drag whose stop file is there before its press answered as stopped with nothing sent; four malformed requests sent straight to the input process, a click count of 4, a scroll of 51 notches, an `x` as text and a target with no bundle identifier, each refused with the field's own failure, with nothing sent; the person's-input watch beating, with no report of the module's own glides, drags, clicks and scrolls, and refusing a click once a warp, which posts no event, has put the pointer elsewhere; once another process has posted one pointer move at the HID level, as a person's hand, after the watch started, a glide stopped at its first step with nothing sent, both when the move takes the pointer off where the watch left it and when only the window server's count shows it, and a click at the pointer refused by its own check after a move only that count shows; a glide refused as `OtherWindowAtPoint`, with the pointer where it was and no click, once the test window has moved away from the marker's point; the test window's own capture under another process's window over its marker, with none of that window's colour; a long text typed in chunks while the person's-input watch runs, and the window getting it whole; the test window's controls read through the Accessibility API, with the text field's first 402 units of its longer value, the password field with no value, and its Save button found again, hit at its point and not at the marker's, and pressed by a click there, and an earlier read's handles freed by a new read but kept by one that runs out of time before it finds the window; a web view's page, which WebKit's web content process draws, read only as rows of that app, with none of its text and nothing under them, and never found again; typing refused as `FocusUnknown`, with nothing typed, while the test window's thread is held until the test releases it, so the app doesn't answer what is focused; typing and a Tab sent while a view with no Accessibility element has the test window's keyboard focus, so its app answers that no element has the focus and the system-wide element that no app has it; typing and a Tab refused as `FocusOutsideTarget`, with none reaching it, while another process's non-activating panel has the keyboard focus over the test window; and refused as `FocusUnknown`, with none reaching it, while such a panel's app doesn't answer which app has the keyboard focus; typing stopped after the first Tab, sent as the Tab key, which moves the focus to the secure field, where a new call is refused, and after the first line break, a line feed, a carriage return or the pair of them, sent as one Return, which puts no character in the field, each with the rest refused as a possible password field and none of it typed; typing refused as the person's input, with nothing sent, when the test window moves the pointer while the app answers what is focused, after the check before it and before the last; typing and a key refused the same way when the input process starts with its seam, and typed without it ([README.md](../README.md#internal-test-seams)); input for another app's bundle identifier and a click outside the test window refused; Mission Control's Dock windows listed whole over the test window, with a click under them refused; a screenshot and a zoom through the tools at the display's scale, with that window covered and the marker's uncovered half where the scale puts it; and the border shown twice over every display, with none of its windows listed, one window on the screen at each display's top strip, read through the window server, whose point a click passes through to the window below, a one-point-wide capture of each display's top strip, which the test reads and removes, in the border's colour as AppKit converts it to that display's colour space, and the test window still in front. Every "nothing was sent" is decided by a sentinel: a click at the window's start point, or a `z` key to the key panel, posted only while the test window's process is on top there, whose report proves nothing earlier arrived ([section 4](#the-test-windows)) |
| `src/noldova.computer-use.runtime/tests/native/mac-test-window.native.ts` | The window in front, through test windows of its own: the macOS test window failing the next wait at once, with the stall, once an error escapes its loop and opens the applet's alert; a stall that recovers, held by the test's `hold` command until it writes the resume file, after which its waits go on; the pointer put at the window's start once it is ready, and back where it was once it closes; what is in front described by its app and its windows' owners and bounds, with no window's title, and a cancelled description answered as text; the window coming back to the front from another app's window; an open that is cancelled leaving no folder of its own; the window closing by itself once its folder is gone; a failed open ending an applet that runs, by its folder, while the applet's loop is held; the close throwing both errors when it and the pointer's restore both fail; and an applet started with its folder already gone ending with no window in the window server's list, watched from the watch's first list, before the start, until `open -W` answers that it has ended |
| `src/noldova.computer-use.runtime/tests/native/step-timing.native.ts` | The pointer and the window in front, through the platform's test window, with ordinary apps open behind it: each step's time, end to end, over a screenshot and a click, by the backend's parts and the platform calls inside them, as a table of medians and 95th percentiles, to take again after each change |

### Timing checks

A time the module promises, such as a glide under a quarter of a second, is a timing check in a `*.timing.ts` file, or `*.timing.native.ts` for a native one, which only `npm run test:timing` runs, never `npm test` and never CI ([README.md](../README.md#checks)).
A check measures without asserting its time and reports it, with its limit, through `t.diagnostic`, and the run fails it from the median of five runs with a 10% margin, so one run slowed by a busy machine doesn't decide it.
Each check's `describe` or `it` name, or a constant's name, says why that limit and what a busy machine does to it.
No outcome that the machine's speed can change is asserted: where an event decides the outcome, the check asserts it; where the time decides it, the check reports it as an `outcome:` diagnostic beside its time.

| File | Check | Limit | Outcome |
|---|---|---|---|
| `windows-backend.timing.native.ts` | The glide to the marker, from the pointer's samples | 250 ms: the product's glide is at most 0.2 s, long enough to follow and short enough to stop, and the samples, read on the JavaScript thread while the addon glides on its own, lag | Event-decided: the arrival, the path within 2 pixels of straight, and the window's click line |
| `windows-backend.timing.native.ts` | The window's move after the pointer leaves the start of a far glide | 200 ms, the product's longest glide | Reported: whether the click was refused and reached the window; the move itself, which the window reports, is asserted |
| `windows-backend.timing.native.ts` | The window's move after a drag's call | 1000 ms, the addon's longest glide, which holds the pointer on the press point, since every change at the end waits on some window's thread | Reported: whether the drag was refused; the button's release, which happens either way, is asserted |
| `windows-backend.timing.native.ts` | The stop flag's setting after a slow drag's call | 1000 ms: the JavaScript thread sets it as soon as its sampling sees the pointer leave, so a thread stalled for the second lets the drag complete | Reported: stopped or completed; the pointer leaving, the window's drag matching the pointer and the button released are asserted |
| `mac-backend.timing.native.ts` | The glide to the marker | 250 ms, the longest glide a person still follows as one motion | Event-decided: the arrival, the straight path and the window's click line |
| `mac-backend.timing.native.ts` | The longest gap between the watch's heartbeats while it types | three heartbeat intervals, the gap at which the runtime counts the watch as lost | Event-decided: the whole text in the field |
| `mac-backend.timing.native.ts` | When the window server lists the window's move, told 40 ms into a glide | The glide's own planned length, so the move lands within the glide | Reported: whether the glide was refused; it sends no click, and the sentinel asserts none arrived |
| `mac-backend.timing.native.ts` | The hand's move off a glide's path, before its second step, 400 ms after its first | 360 ms: the step gap less the window server's 40 ms merge | Reported: whether the glide stopped |
| `mac-backend.timing.native.ts` | The hand's move seen only in the window server's count, before a glide's last step | 360 ms, as above | Reported: whether the glide stopped |
| `mac-backend.timing.native.ts` | The hand's count after the glide's last move, before a click | 160 ms: the hand's 80 ms plus twice the merge | Reported: whether the click was refused, or untried after a merged count; the sentinel asserts one click when it was sent, none otherwise |

The window server may merge a person's move that comes within about 40 ms of the module's (2 of 70 runs, at 35 and 43 ms), so the hand moves 80 ms after the count, and its two steps are 400 ms apart; the backend's own glides step a few milliseconds apart, so no move during them is clear of the merge.
`step-timing.native.ts` measures and reports a table of medians and 95th percentiles per part, with no promised limit, so it is a native test, not a timing check.

## 6. Exclusions and fixed pauses

The README's Checks section grants the coverage exclusions and lists the test files with a fixed pause, each with its reason; `npm test` names each exclusion when it runs, and its test-wait check fails on a pause in a file the list doesn't name ([README.md](../README.md#checks)).
Each such pause is a bounded poll of what gives the test no event, such as another process's window or a log file an `osascript` child writes, or a stand-in program that stays running as a hung one does, and no pause decides a result; the one exception is the macOS timing check that tells the test window to move 40 ms into a glide, a pause that is what it times.

The organization's [Automation rule](https://github.com/noldova-com/.github/blob/main/standards/CODE.md#automation) lets a project name an exception for a test fixture that is itself the program under test. These PowerShell files in `src/noldova.computer-use.runtime/tests/native/fixtures/` are such fixtures: Windows programs that the native Windows tests start and drive, as a person's apps would be.

| Fixture | Why it is a PowerShell program |
|---|---|
| `test-window.ps1` | The test window: a text box with the focus, a password box, a Save button and a marker of one colour, which every Windows input targets. |
| `password-window.ps1` | A WPF window with a user name box above a password box that isn't a classic `Edit` control, for the password and focus checks. |
| `cover-window.ps1` | A window of one colour that the tests put over the test window, as another app's window would lie over it. |
| `child-window.ps1` | A window of another process that the tests place inside the test window, as a reparented child window is. |
| `backdrop-window.ps1` | A window with the system's acrylic backdrop, which blurs what lies behind it, for the capture tests. |
| `bring-to-front.ps1` | The function that brings a window to the front, which `WindowsTestWindow` puts into the test window's and the password window's scripts. |

## 7. Open decisions

1. **The responsible binary on macOS.**
   One probe on a macOS test computer confirms which binary macOS holds responsible when the tests start the development app, and whether its grants survive a rebuild of the app and an update of the program that starts it.
2. **A stable signature.**
   A stable code-signing identity is needed only if the probe of [open decision 1](#7-open-decisions) finds the responsible binary unstable, so that a rebuild or an update drops its grants.
3. **Native Wayland.**
   Capture and input through the desktop portal need a portal-enabled desktop session, which the test computers don't offer; the proposal is to leave native Wayland out of the preview, so Linux means X11.
4. **macOS ARM64 without grants.**
   On GitHub's macOS ARM64 image, every process a CI job started held the image's grants, so refusal tests there would need the development app to start with none, for example by making it its own responsible process.
   CI's macOS ARM64 job runs the package tests only; the refusals on macOS run on a test computer until a CI job runs the native tests there.
