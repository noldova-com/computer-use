# Computer use

The computer-use module for Noldova's desktop apps.
It lets an agent see the screen and use the pointer and keyboard on the person's behalf.
It asks the person's permission through the app, and shows the person a stop control while the agent acts.

Apps built on [Noldova Desktop](https://github.com/noldova-com/desktop) add the module and offer it behind a preview setting.
The app hosts the agent tools and answers the module's permission requests; the module names no app and works the same in each.
[documents/ARCHITECTURE.md](documents/ARCHITECTURE.md) describes its parts and boundaries.

It builds and tests on Windows and Linux x64 and macOS arm64 for every pull request, and on all six targets, Windows, Linux and macOS each on x64 and ARM64, for every push to `main` and every run started by hand. It has operating-system backends for Windows and macOS, which `module.json` names as its `platforms`, so on Linux Noldova Desktop shows it as unavailable and never activates it; Linux on X11 comes next.
On macOS it needs no native code: the person gives Screen Recording and Accessibility to the app that runs it.
Every package is below 1.0 for now, and its API may change from one version to the next.
To report a bug or ask for a change, open an issue in this repository, as the organization's [contributing guide](https://github.com/noldova-com/.github/blob/main/CONTRIBUTING.md) says.
Report a security problem privately, as its [security policy](https://github.com/noldova-com/.github/blob/main/SECURITY.md) says.

## Getting started

An app installs the module's package, pinned exactly, and adds the module as its desktop base's module contract says:

```bash
npm install --save-exact @noldova/computer-use
```

| Package | What it is |
|---|---|
| `@noldova/computer-use` | The module: its `module.json` and `settings.json`, and the entry points that give the base its runtime part and its window part. |
| `@noldova/computer-use.runtime` | The runtime part: the agent tools, the session, each tool's risk level and permission request, and the operating-system backends, with the Windows addon built for each target. |
| `@noldova/computer-use.window` | The window part: the status bar item that shows while a session controls the screen, and its stop command. |
| `@noldova/computer-use.protocol` | The models the runtime and window parts exchange. |

## Building from source

```bash
npm ci
npm run build
npm test
```

`npm ci` installs the exact versions the lockfile records, which `npm run build` also does when `node_modules` is missing, `npm run build` builds every package, and `npm test` runs every check.
The tests that drive the operating system for real need a person's signed-in desktop session, so `npm test` leaves them out; [documents/TESTING.md](documents/TESTING.md) says how they run.

## Releases

The pull request that changes the version writes that version's section in [CHANGELOG.md](CHANGELOG.md) from the pull requests merged since the previous version, and no other pull request edits the file.

The module's packages are published together at one version to npm, by the Release workflow, `.github/workflows/release-npm.yml`, through npm's trusted publishing, so no token is stored, and a release never deletes a published version.

- **It starts by hand only,** with two inputs: the version, which `version.json` and the root `package.json` hold, and the full hash of the commit on `main` to release.
- **It calls the organization's shared npm release workflow,** `release-npm.yml` in `noldova-com/.github`, pinned to v2.34.0's commit, whose README says what each job does and with which permissions, in the `release` environment, which holds the publish approval.
- **After the release, its dependents job** calls the organization's shared `update-dependents.yml`, v2.34.0, with the version and the commit, which proposes the version to the repositories that pin the module, as the shared workflow's README says.

The shared workflow reads the version from `version.json`, checks that the commit is on `main` and holds it, tags the commit, builds the addons each part declares, runs `npm ci` and `npm run build` with `RELEASE_ADDONS`, `RELEASE_VERSION`, `RELEASE_COMMIT` and `RELEASE_SCOPE` set, checks the archives in `_packages`, and publishes them, with npm's provenance.
The repository's own release code is only the build's `check`, in `scripts/services/release.ts`.
The release job grants `packages: write` and the dependents job `packages: read`, though no package goes to GitHub Packages: the shared workflows' own jobs ask for them, and GitHub refuses to start a called job that asks for more than its caller grants.

## Checks

Every pull request into `main` must pass every check below before it merges.

| Check | What it verifies |
|---|---|
| Check / Linked issue | The organization's shared check, which `.github/workflows/require-linked-issue.yml` calls from its `check` job: the PR description has a standalone `Issue: #N`, `Issue #N` or closing reference, such as `Closes #N`, that names an issue in this repository. |
| Build and test / All targets | Every target's job and the end-to-end job passed. |
| Desktop end-to-end, Windows x64 | The in-app suite, `npm run test:e2e:desktop`, passed with the module switched on, on a GitHub-hosted Windows runner's desktop session. |
| Desktop end-to-end, macOS arm64 | The same suite passed on a GitHub-hosted macOS arm64 runner, after the job granted the test app there. |

`.github/workflows/build-and-test.yml` calls the organization's shared `build-and-test.yml`, v2.34.0, with `publishes: true` and its end-to-end inputs, as the `.github` repository's README describes it.
It grants `packages: read`, though no package comes from GitHub Packages, since the shared workflow's jobs ask for it and a called job can't get more than its caller grants; the flake proof and the relock grant it for the same reason.
Each target's job runs on a GitHub-hosted runner, which the organization's shared `versions.yml` names for each target, for every pull request, draft or ready, every push to `main` and every run a member starts by hand: a pull request runs Linux x64, Windows x64 and macOS arm64, and a push or a run by hand runs all six targets, Linux arm64, Windows arm64 and macOS x64 too.
Each target's job builds, checks the toolchain, Node.js 26.13.1 with npm 11.20.0, and the line endings, `* text=auto eol=lf` in `.gitattributes` and LF only with exactly one final newline in every tracked text file, with the shared pipelines tool, then runs `npm run test -- --skip-test-details --skip-coverage-details` and checks that the build and the tests changed no tracked file, within 20 minutes.
On Linux x64 it also builds a second time in a clean worktree and checks that the archives are the same, byte for byte, and on every target it checks the archives as the release does, with `pipelines archive`: each archive's name, version, `gitHead`, scope and licence, and a byte-for-byte copy of every file `npm run build --silent -- --list-copies` lists, at its path, which refuses a copy that differs.
`npm test` leaves out `--skip-test-details` and `--skip-coverage-details` and runs as it does without them.
A Linux x64 job of its own, the end-to-end job, runs `npm run build`, `npm run test:e2e:prepare` and `npm run test:e2e` under a virtual display, and keeps `_build/e2e` as its report when the test fails; "Build and test / All targets" passes only when it passes too ([End-to-end tests](#end-to-end-tests)).
A Windows x64 job of its own, on the `windows-2025` image, with the Node.js version `versions.yml` names, runs `npm ci`, `npm run build`, `npm run test:e2e:prepare` and `npm run test:e2e:desktop` in the runner's interactive desktop session within 30 minutes, and keeps `_build/e2e` as its artifact for 14 days when it fails.

The steps CI runs beyond `npm test` run locally after `npm run build`, which needs a commit, since each package's `gitHead` comes from `HEAD`.
The shared pipelines tool is installed into a folder outside the copy, such as `<tools>`, whose `node_modules/.bin` then goes on `PATH`:

```bash
npm install --prefix <tools> --registry https://registry.npmjs.org/ --no-audit --no-fund @noldova/tools.pipelines.github@0.0.20
pipelines toolchain 26.13.1 11.20.0
pipelines line-endings
npm run test -- --skip-test-details --skip-coverage-details
pipelines unchanged
pipelines reproducible _packages
pipelines archive _packages "$(node -p 'require("./version.json").version')" "$(git rev-parse HEAD)" @noldova
```

CI runs `pipelines reproducible` on Linux x64 only.
`.github/workflows/module-range.yml` calls Noldova Desktop's "Module range" workflow, pinned to Noldova Desktop 0.0.1's commit, with `src/noldova.computer-use`, on every pull request, every night and by hand: it runs `npm run build` and `npm test` against the newest Noldova Desktop inside the module's `noldovaDesktop` range, and a failing nightly run opens or comments on an issue in this repository, so it grants `issues: write`.
Its build step first runs `npm run peers:newest`, `scripts/move-peers.ts`, which installs at the root, without saving it, the newest published version of each `@noldova/context.` package inside the peer ranges of the parts' `package.json` files, and that same version of each other `@noldova/context.` package the root `package.json` pins, since the context packages are released together at one version, so one copy of each is installed.
In the same install it names the version `node_modules` holds of each other `@noldova/` package the root `package.json` pins, as the build does, so the Noldova Desktop version the run moved to stays.
It then checks that `node_modules` holds each moved version, so the build and the tests run on it, and the newest `@noldova/context.exceptions` and `@noldova/context.json` inside the runtime's and the protocol's `>=0.0.7 <0.1.0` ranges are tested every night too.
Only GitHub runs the release, the dependents update, the relock, the flake proof, the Module range run, the linked-issue check and the versions job.

`npm run build` first installs the dependencies with `npm ci` when `node_modules` is missing, since the shared workflow runs no install of its own.
It then refuses to build when `version.json` and the root `package.json` hold different versions, since the release reads the first and builds the second.
It then checks that each part's package is named `@noldova/<module ID>.<part>`, with the ID from the module's `module.json` and the part from its folder, `src/noldova.<module ID>.<part>`, beside the module's `src/noldova.<module ID>`.
It then builds the parts one at a time, each after the parts it depends on, each into its staged package, `_build/packages/<folder>/`, such as `_build/packages/noldova.computer-use.runtime/`.
For each part it first compiles the part's scripts for macOS's JavaScript for Automation host, the TypeScript in its `src/jxa/` with its own `tsconfig.json`, into the staged package's `jxa/` folder as the classic scripts that `osascript -l JavaScript` runs, such as the runtime's `jxa/mac-desktop.js`; the scripts take the part's other sources as types only.
It writes the kit's accent colour, the `--nol-accent` of `@noldova/ui.components.angular`'s theme, into the file a part's `package.json` names under `noldova.kitAccent`, such as the runtime's `generated/kit-accent.json`, and fails when the theme has none.
It then puts each addon that the part's `package.json` lists under `noldova.windowsAddons` or `noldova.posixAddons` at the staged package's `native/<platform>-<arch>/<addon>.node`.
When `RELEASE_ADDONS` is set, to an absolute folder, the release has built every addon for each target of its kind, two for Windows and four for Linux and macOS, at `RELEASE_ADDONS/<package path>/<platform>-<arch>/<addon>.node`, such as `RELEASE_ADDONS/src/noldova.computer-use.runtime/win32-arm64/windows-desktop.node`; the build copies them, and a missing one fails it.
Otherwise the build compiles the host's own target from the part's `src/native/<addon>.c` against Node-API 8.
It then compiles the part's sources, or the module package's `api`, with `tsc`, which type-checks them, into the staged package, and packs that into `_packages`.
Before it builds a part that depends on one packed since the last install, and again once every part is packed, it installs the archives packed so far into `node_modules` with `npm install --no-save`, so the lockfile and the root `package.json` don't change, and names in the same install the version `node_modules` holds of each `@noldova/` package the root `package.json` pins, since an install otherwise takes the lockfile's version back: a run that moved one, as the Module range run does, keeps it.
With every package installed, it type-checks each part's tests, the scripts and the parts' API declarations with `tsc`, against the installed packages, and the tests run against them too: each part's `tests/package.json` makes its tests ES modules and has no name, so a test that imports a part by its package name gets the installed package from `node_modules`, never the part's own source.
Each package records the commit it was built from as its `gitHead`: the checkout's `HEAD`, or `RELEASE_COMMIT` in a release, which sets `RELEASE_VERSION`; a release's build then runs the release's `check` on `_packages`, failing on any finding.
`npm run build --silent -- --list-copies` builds nothing and prints each file the build copies into a package unchanged, which the shared release compares with the archives: each line holds the source from the root, the package's name and the path inside the package, separated by tabs, and the last line is `end of copies`.
The copies are `LICENSE` and the package folder's `README.md` in every package, the module's `module.json` and `settings.json`, any scripts beside a part's sources, and what the build put in a part's staged `jxa`, `native` and `generated` folders; the compiled scripts and the declarations, whose imports the build rewrites, aren't copies.
Any other option beside `--list-copies` fails the build.
Each package's `README.md` is the page npm shows for it, so its links are absolute, to this repository on GitHub; the build refuses a part without one.
The runtime loads the build for its own `process.platform` and `process.arch`, and fails naming them when that build is missing.
`npm test` runs the parts' tests with Node.js's test runner, and fails below 100% of the lines, branches and functions of the parts' sources, but for the files this table excludes.
It names each exclusion with its reason before the tests run, passes it to the test runner as excluded, and fails before any test runs when an exclusion names no file.

| Coverage exclusion | Why |
|---|---|
| `src/noldova.computer-use.runtime/src/jxa/mac-desktop.ts` | The macOS input process's script, which macOS's JavaScript for Automation host runs as `jxa/mac-desktop.js`, with that host's globals, so Node.js can't load it and no package test does. `mac-backend.native.ts` covers it on macOS through the runtime's backend. |

Before the suite, `npm test` runs the test-wait check: it reads every `.ts`, `.cjs`, `.js` and `.mjs` file under the parts' `tests/` folders, and the `.ts` files under `e2e/tests/`, and fails on a fixed pause, or a fixed number of event-loop turns, in a file this table doesn't list, and on a listed file that no longer pauses.
A pause is an import or a `require` of `timers/promises`, `scheduler.wait`, `Atomics.wait`, a `setTimeout` with a fixed time, or a `setImmediate`.

| Test file | Why it pauses |
|---|---|
| `src/noldova.computer-use.runtime/tests/fixtures/mac-capture-double.cjs` | The screencapture stand-in: with `--hang` it writes its file, says so on stdout, and then stays running, as a capture that never ends does, until the test's cancel or the program's deadline ends it. |
| `src/noldova.computer-use.runtime/tests/fixtures/mac-codesign-double.cjs` | The codesign stand-in: for a bundle it has no answer for, it stays running, as a check that never ends does, until the program's deadline ends it. |
| `src/noldova.computer-use.runtime/tests/native/mac-backend.native.ts` | Bounded polls of what gives the test no event: the frontmost app and the running apps (100 ms), the test window's return to the front before each test (50 ms), the cover window's place in the window server's list (100 ms), and Mission Control's Dock windows and the test window's frame once it closes (250 ms); each ends at the test's time limit. |
| `src/noldova.computer-use.runtime/tests/native/mac-backend.timing.native.ts` | The window-move timing check tells the test window to move 40 ms into the glide; that pause is what it times. |
| `src/noldova.computer-use.runtime/tests/native/mac-cover-window.fixture.ts` | A 50 ms poll of the cover window's log file, which its osascript child writes whole and which is its only channel; it ends at the wait's time limit. |
| `src/noldova.computer-use.runtime/tests/native/mac-key-panel.fixture.ts` | A 50 ms poll of the key panel's log file, which its osascript child writes whole and which is its only channel; it ends at the wait's time limit. |
| `src/noldova.computer-use.runtime/tests/native/mac-test-window.fixture.ts` | 50 ms polls of the applet's log, its exit, its release pipe's opening and an unready window's folder: `open` starts the applet, so none of them gives the test an event; each ends at its time limit. |
| `src/noldova.computer-use.runtime/tests/native/mac-test-window.native.ts` | 100 ms polls of the app in front and of the window watch's ready file, which an osascript process writes with no event to the test; each ends at the test's time limit. |
| `src/noldova.computer-use.runtime/tests/native/step-timing.native.ts` | Polls of the ordinary apps' first windows in the window server's list (200 ms) and of an app's end after Launch Services started it (100 ms), neither of which gives the test an event; each ends at its time limit. |
| `src/noldova.computer-use.runtime/tests/native/windows-backend.native.ts` | Bounded polls, 100 ms and 250 ms for the notification, of other processes' state that no event reaches the test from: a notification's immersive window in the window list, the cover window's place in the stack, File Explorer's new folder window, and Calculator's process, window, display and end; each ends at the test's time limit. |
| `src/noldova.computer-use.runtime/tests/native/windows-desktop-session.fixture.ts` | A 100 ms poll of the window in front after Windows PowerShell brings a test window there, which gives no event; and the timing file's pointer recording, which samples on every event-loop turn while the addon glides on its own thread, and ends on the input's promise and the pointer's arrival, never after a count of turns. |
| `src/noldova.computer-use.runtime/tests/services/program-deadline.test.ts` | Under mock timers, a `timers/promises` timer set after the deadline's and ticked to 1 ms before the limit, which fires after the deadline's would, so the test checks the program is still running once an early deadline would already have ended it; no real time passes. |

The suite then runs under the coverage gate.
It writes a record of every test and suite to `_build/test-records.jsonl`, beside the spec report on the screen.
After the suite it names each test file whose top-level tests took over 1 s, from the records, and fails nothing for that time; only `npm run test:timing` fails on time.
Run alone, through `npm test -- <file>`, every test file takes under 1 s on every test computer.
In the whole suite, which runs the files side by side, the files below took over 1 s, at most the time shown, while they waited for the processor, most on the slowest test computer, a 6-core Intel Mac from 2018; a maintainer accepts each for that reason, with what makes it the heavier:

| File | Windows x64 | macOS x64 | Linux x64 | Why it is heavier |
|---|---|---|---|---|
| `src/noldova.computer-use.runtime/tests/services/backend-failures.test.ts` | under 1 s | 1.3 s | under 1 s | Its cases run through the whole runtime. |
| `src/noldova.computer-use.runtime/tests/services/batch-tool.test.ts` | under 1 s | 3.6 s | under 1 s | Its cases run lists of actions through the whole runtime. |
| `src/noldova.computer-use.runtime/tests/services/click-tool.test.ts` | under 1 s | 1.7 s | under 1 s | Its cases run through the whole runtime. |
| `src/noldova.computer-use.runtime/tests/services/drag-tool.test.ts` | 1.1 s | 3.9 s | under 1 s | Its cases run through the whole runtime. |
| `src/noldova.computer-use.runtime/tests/services/foreground-input.test.ts` | under 1 s | 1.6 s | under 1 s | Its cases run through the whole runtime. |
| `src/noldova.computer-use.runtime/tests/services/image-scaler.test.ts` | under 1 s | 2.9 s | under 1 s | Its cases scale real images. |
| `src/noldova.computer-use.runtime/tests/services/mac-screen-capture-program.test.ts` | 2.6 s | 3.1 s | under 1 s | Each case starts a real Node process as the screencapture double, since what it proves is how the program reads a real process's exit, output and files; a process starts slowest on a busy processor. |
| `src/noldova.computer-use.runtime/tests/services/mac-script-process.test.ts` | 1.8 s | 3.6 s | 1.1 s | Each case starts a real Node process as the input process, since what it proves is the line protocol over a real process's pipes, its exit and its stderr. |
| `src/noldova.computer-use.runtime/tests/services/move-tool.test.ts` | under 1 s | 2.3 s | under 1 s | Its cases run through the whole runtime. |
| `src/noldova.computer-use.runtime/tests/services/pointer-aim.test.ts` | under 1 s | 1.5 s | under 1 s | Its cases run through the whole runtime. |
| `src/noldova.computer-use.runtime/tests/services/pointer-fields.test.ts` | 1.1 s | 3.7 s | under 1 s | Its cases check every pointer tool's fields through the whole runtime. |
| `src/noldova.computer-use.runtime/tests/services/screen-imager.test.ts` | 1.7 s | 4.9 s | 1.1 s | Two cases encode images that come out over the 1 MiB the model takes, again at each smaller size, to prove the image shrinks until it fits and fails once it can't. |
| `src/noldova.computer-use.runtime/tests/services/scroll-tool.test.ts` | 1.0 s | 3.7 s | under 1 s | Its cases run through the whole runtime. |
| `src/noldova.computer-use.runtime/tests/services/zoom-tool.test.ts` | 1.3 s | 2.7 s | under 1 s | Its cases encode real images through the whole runtime. |

macOS arm64 runs every file under 1 s in the whole suite; Linux arm64 and Windows arm64 aren't measured yet, as no test computer has them.

It fails a test skipped without a reason.
Each suite has one hang limit, which the runner prints with its reason before the suite runs, and a test that reaches it fails, named:

| Suite | Hang limit | Why |
|---|---|---|
| Unit tests, `npm test` | 30 s | The slowest unit test measured took 3.2 s, on macOS x64, so a test ten times slower is stuck, not slow. |
| Native tests, `npm test -- --native` | 180 s | The slowest native test measured took 35 s, on macOS x64, as it opens real windows and apps on a signed-in desktop and waits for them, so a test five times slower is stuck, not slow. |
| Timing checks, `npm run test:timing` | 30 s | No package has a timing check outside the native ones yet; a timing check measures one step of under a second, so one that runs this long is stuck. |
| Native timing checks, `npm run test:timing -- --native` | 30 s | The slowest native timing check measured took 1.9 s, on macOS x64, with the windows it opens before it measures, so a check fifteen times slower is stuck, not slow. |

A test that sets its own `timeout` replaces its suite's limit for itself.

`npm test` runs the `*.test.ts` files and `npm test -- --native` the `tests/native/*.native.ts` files, and neither runs a timing file.
`npm run test:timing` runs the `*.timing.ts` files, and with `--native` the `*.timing.native.ts` ones, five times each, one file at a time, and takes no other option.
A timing check measures without asserting its time and reports `timing: <measured> ms, limit <limit> ms` through `t.diagnostic`; the run fails a check whose median of the five runs is more than 10% over its limit, so one run slowed by a busy machine doesn't move it and the margin covers a quiet machine's jitter.
CI runs no timing check: each runs on a test computer ([documents/TESTING.md](documents/TESTING.md#timing-checks)).

### Declared test seams

Three parameters of the runtime package's exported `RuntimePart` exist for the tests, declared in its `src/api/index.d.ts` with this reason: the tests run against the installed package, whose exports reach no internal class, and the real backend drives the real screen, pointer and keyboard.
The base constructs the part with no arguments, so an app never passes them.

| Seam | Why |
|---|---|
| `RuntimePart`'s `loadBackend` | Tests hand the part doubles of the operating system's backend in place of the Windows addon or the macOS input process. |
| `RuntimePart`'s `kitAccentFile` | Tests give the border's colour from a file of their own, missing, unreadable or malformed, in place of the package's `generated/kit-accent.json`. |
| `RuntimePart.loadPlatformBackend`'s `platform` | The part passes `process.platform`; a test on one platform checks the backend chosen for each. |

### Internal test seams

Five inputs exist only for the native tests, since no test can make input that the operating system counts as the person's, make Windows insert only part of a send, or make a drag's step check fail or its input process end while its button is down.
None is declared, and the runtime never uses any. All ship in the published package, inert unless a test calls them, and each can only make input be refused or cut short, or a drag end early, so without them the code reads the person's real input, sends whole and drags to the end. The Windows marks are taken as the next input call starts, so a call refused before its send doesn't leave them for a later one.

| Seam | File | Why |
|---|---|---|
| The Windows addon's export `personInputBeforeNextSend()` | `src/noldova.computer-use.runtime/src/native/windows-desktop.c` | Windows flags every input a test sends as injected, which the addon never counts as the person's, so the export marks one person's input that the next input call takes as it starts: its checks before `SendInput` see the person's input count one higher, so a test proves a typed text, a key press, a click and a drag are refused there with nothing sent. |
| The Windows addon's export `partialNextSend(count)` | `src/noldova.computer-use.runtime/src/native/windows-desktop.c` | Windows inserts only part of a send when another thread blocks input, which no test can arrange, so the export makes the next input call's `SendInput` insert only its first `count` events: a test proves a typed text's partial send releases the Enter or Tab it pressed. |
| The macOS input process's launch argument `--fail-drag-step` | `src/noldova.computer-use.runtime/src/jxa/mac-desktop.ts` | A step's check throws only when the system fails, such as with no screen during a display change, which no test can arrange, so with the argument each drag step after the press throws: a test proves the drag still releases its button and modifiers. |
| The macOS input process's launch argument `--hold-drag-step` | `src/noldova.computer-use.runtime/src/jxa/mac-desktop.ts` | The call's timer ends the input process only after 10 s, so with the argument each drag step after the press waits 60 s: a test whose call times out sooner proves the backend releases the button and modifiers through a new process. |
| The macOS input process's launch argument `--person-input-before-send` | `src/noldova.computer-use.runtime/src/jxa/mac-desktop.ts` | A test can't place a person's move inside a slow focus read that still succeeds, so with the argument the target check's last step before sending reports the person's input; only that step reads it. |

### End-to-end tests

`npm run test:e2e:prepare` copies the fixture app in `e2e/app/` to `_build/e2e-app`, installs the module there from its packed archives in `_packages`, and prepares the development app of the Noldova Desktop version `e2e/app/package.json` pins, which moves with the root `package.json`'s pin, so it runs after `npm run build`.
`npm run test:e2e` type-checks `e2e/` and runs the CI suite, `e2e/specs/`: on Linux, a real app on that Noldova Desktop version shows the module as unavailable, with no switch, no failed module, no status bar item and no `computer_` tool, and a command run while the app's window is still starting waits for the start to end.
CI runs it on Linux x64; locally it runs after the same two steps, under a display.
`npm run test:e2e:desktop` runs the full in-app suite, `e2e/desktop/`, with the module switched on: the session grant and an app grant, a screenshot, a window read, a click on the native test window's Save button, the status bar item, the system-wide stop key pressed through the operating system, the item's click, and Resume.
CI runs it on Windows x64, in the hosted runner's interactive desktop session; it also runs on the Windows test computers, one test at a time and never beside the native tests, since it drives the real screen, pointer and keyboard.
CI runs it on macOS arm64 too, on GitHub's hosted runner: there the app's runtime is its own responsible process and needs Screen Recording and Accessibility for the development app, so first `npm run test:e2e:grant-hosted-macos` writes those two grants for the test app into that runner's TCC database and approves its screen capture there, so macOS doesn't cover the test window with its window-picker alert; it refuses to run anywhere but a GitHub-hosted macOS runner, and a flake proof of the spec on macOS names it in its `prepare` input, after `test:e2e:prepare` ([TESTING.md](documents/TESTING.md#3-operating-system-grants)).

"Build and test / All targets" also runs on every push to `main` and every run started by hand.
[documents/TESTING.md](documents/TESTING.md) says how the tests are layered and what each target runs.

## License

Computer use is licensed under the [MIT License](LICENSE).
Its third-party packages keep their own licenses, which their packages carry.

Chrome, Electron, GitHub, Linux, macOS, Node.js, npm, Windows, X11 and the other product and app names used here, including those the app classifier lists, are names of their owners.

## Trademarks

The code is under the MIT License, while the name "Noldova" and its logo are not: the MIT License grants no right to them.
A build from this code that is published by anyone but Noldova uses another name and its own logo.
