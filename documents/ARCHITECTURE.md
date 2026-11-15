# Architecture

**Scope:** The computer-use module's parts, its boundaries with Noldova Desktop and with the app that hosts it, its tools and their risk levels, what it needs from Noldova Desktop, its missing decisions, how an app uses it, and the two forms it ships in.

[TESTING.md](TESTING.md) owns how each part is tested and the operating-system grants the tests need.

## 1. Purpose

The module lets an agent see the screen and use the pointer and keyboard on the person's behalf.
It is a module of [Noldova Desktop](https://github.com/noldova-com/desktop), the base Noldova's desktop apps are built on, shipped as npm packages that an app adds to its list of modules.
The app offers it behind a preview setting; while the setting is off, the module offers no tool and reaches no operating-system call.
The module stays product-neutral: it names no app, and an app configures it only through its public interface.

## 2. Parts

The module has the layout of the base's module contract, with a package for each part and its document in [`src/noldova.computer-use/README.md`](../src/noldova.computer-use/README.md), and declares itself in `module.json`.
An app lists the module's own package, `@noldova/computer-use`, which holds `module.json` and `settings.json` at its root; its `./runtime` gives Noldova Desktop the runtime part's class, and its `./window` the window part ([section 5](#5-what-the-module-needs-from-the-base)):

| Part | Owns |
|---|---|
| `protocol` | The models the runtime and window parts exchange. |
| `runtime` | The agent tools, which it registers in the base's tool registry; the session and its action queue; each tool's risk range and its permission requests; the operating-system backends; and the apps service it publishes for other modules ([Describing an app](#describing-an-app)). |
| `window` | The status bar item that shows while a session controls the screen, and its stop command, `computer-use.stopControl`. |

The base constructs the runtime part with no arguments and activates it only while the switch setting is on, building a new part each time it is turned on again.
The backend reaches the operating system only on a tool's call: Windows through its addon, and macOS through programs that start on the first call that needs them.
A backend that fails to load fails the activation, which withdraws what the part registered, so the next activation starts afresh.
The window's stop and status read are registered on each activation; a call that reaches them while the base switches the module off answers as idle.

The module has no command-line part.
A command-line command adds one only when it earns it.

```text
agent ──▶ the app's MCP server ──▶ base tool registry ──▶ runtime part ──▶ operating-system backend
                                                              │
                                                              ├── permission request ──▶ base permission center ──▶ the app's permission card
                                                              │
                                                              └── session status ──▶ window part (status bar item, stop command)
```

## 3. Boundaries

- **Agent tools.**
  The runtime part registers each tool's descriptor and handler in the base's product-neutral tool registry, through its context's `tools`, and lists the tools in `module.json`.
  The app hosts the one MCP server that agents reach, so the module bundles no MCP SDK.
- **Permissions.**
  The module owns its tools, their risk levels and the details each permission request carries.
  It asks through each call's permission request, which the base's permission center answers, and shows no permission prompt of its own.
  The app owns the permission card and the policy that answers requests.
- **Operating-system grants.**
  The person grants the operating system's own prompts, such as macOS Screen Recording and Accessibility.
  The module never changes privacy or security settings: it reports a missing grant.
- **The base.**
  The module reaches the base only through its published packages, `@noldova/desktop.runtime` and `@noldova/desktop.protocol`, as peers it shares with the app, and the window part through `@noldova/desktop.window`, as an optional peer the app's window workspace holds ([section 7](#7-how-an-app-uses-it)), in the range of Noldova Desktop versions it accepts.
  `module.json` names that range as `noldovaDesktop`, `>=0.0.1 <0.1.0`: from the version it builds and tests against, the root `package.json`'s exact pin, to the next minor, which a Noldova Desktop release that may break modules raises before 1.0, as Noldova Desktop's module contract says.
  What it needs from the base is listed in [section 5](#5-what-the-module-needs-from-the-base).
- **Context.**
  The runtime and protocol packages take `@noldova/context.exceptions` and `@noldova/context.json` as peers, `>=0.0.7 <0.1.0`, from the first version they run on to the next minor, as Noldova Desktop's packages take them, so an app installs one copy of each; the root `package.json` pins the version the checks run on, inside that range.

## 4. Tools and risk levels

Each tool is one action, except `computer_batch`, which runs a short list of input actions in one call ([Lists of actions](#lists-of-actions)).
Its registered name carries the `computer_` prefix, such as `computer_click`, so it stays distinct among other modules' tools.
The calling agent session comes from the connection, never from a tool's arguments.

### Risk levels

- **Low (read-only):** the tool is on the module's read-only list and raises no request of its own; it runs once the session grant is given.
- **Medium (input):** the tool raises a `computer-use.controlApp` request whose subject is an app: `computer_request_apps` asks the person, and the permission center answers each input action from that app's grant ([app grants](#app-grants)).
- **High:** the tool raises a request that the person answers, and the app's policy shouldn't remember the answer by default.
  Two high-risk requests offer to be remembered, each for its conversation only: the session grant ([Session grant](#session-grant)) and a broad-reach app's grant ([App grants](#app-grants)).

The module owns each tool's risk level, and the app never changes it.
Each descriptor declares its range to the registry: Low to High for the read-only tools, Medium to High for the others, since each session's first call raises the High session grant ([Session grant](#session-grant)).

### Session grant

The first call of each session raises one high-risk request, `computer-use.controlScreen`, through the base's permission center, to see and control the screen.
It offers Allow once, Allow always and Deny; the app shows Allow always as allowing it in this chat.
Only a session that was granted runs without a request; any other session raises its own, also while another session of the same conversation holds the screen.
Allow once holds for its session only, and every other session of the conversation, at the same time or later, is asked again.
Allow always is remembered for the conversation's scope, so the center answers the first call of the conversation's other sessions from it without asking, and another conversation asks for its own.
A grant revoked in the app's settings takes effect when the conversation's next session asks, whether or not another of its sessions still holds the screen; a session that was granted keeps it until it ends or the person stops it, as each app is still asked for on its own and every input checks its app's grant ([App grants](#app-grants)).
The stop stays the immediate way to end control, whatever was allowed ([Stop and resume](#stop-and-resume)).
Nothing reaches the operating system before it is granted, and a denied or expired request fails the call.
Once it is granted, the read-only tools run, with screenshots masked to the apps granted to the session.
One conversation controls the screen at a time: while one holds it, another conversation's first call fails at once as `Unavailable`, never queued; the screen is free again once the last of its granted sessions ends.
A conversation's grants end when it ends or loses its connection.

### App grants

`computer_request_apps` raises one `computer-use.controlApp` request per app, with the app's identity as its subject.
The center remembers a grant for the conversation's scope in its store, so the app's settings can list and revoke it.
The module also keeps its own record of the grants given in the conversation.

Each input action raises a request with the same action, `computer-use.controlApp`, and the target app's identity as its subject, and names the input, such as `click` or `type`, and its exact arguments in the details.
The center answers it from the remembered grant, which matches on both the action and the subject, so every action leaves one record and the person isn't asked per click.
Each screenshot and zoom leaves one such record too, for each granted app on its display, from the check that covers a revoked app ([Screenshots](#screenshots)).

Before raising anything, the module checks its own record.
Without a grant for the target app, the action fails as `Refused` because the app isn't granted, with nothing sent, and the failure says to call `computer_request_apps`; the person isn't asked.
The record can only refuse an input: it never answers a request and never stands in for a remembered answer, which lives only in the center's store.
With a recorded grant, the module still raises the request, and the center decides.
A grant revoked in the app's settings during the conversation is still in the module's record, so the input's request asks the center to answer only from what it remembers (`isRememberedOnly`), and the center denies it without asking.

A system key combination needs the app's grant too.
It then raises its own high-risk request, `computer-use.systemKeys`, with the app as its subject, which the person answers; the app's grant never covers it.

### Permission points

Each request's details are the input for a `computer-use.controlApp` request, the tool's exact arguments, the target app's name and identity, and the agent's `summary`.
The `summary` is the agent's own text, marked as such in the details: the person's decision rests on the exact arguments, never on the summary alone.
The module cuts the arguments it shows at 12,000 characters, marked with an ellipsis.

### Tools

Coordinates are pixels of the session's frame: the latest full screenshot's, or the one a read of a window sets ([Reading a window](#reading-a-window)).
A pointer tool's point is a whole pixel of that frame, and the input goes to the desktop point under the pixel's centre.
Before raising anything, the tool refuses a point outside the frame, and fails as `Stale` when the display moved or changed size after it.
A drag without `from` starts where the pointer is, read once before the request, which shows it as the frame's pixel under it; a pointer outside the frame is refused as such a point is.
A tool's result is the base's tool result: a list of content items, text or images, and optional structured fields, which its descriptor's output shape describes.
An item that holds content from outside the module names its origin, such as `computer-use:screen`, and the host marks it untrusted; the host passes structured fields as untrusted data.
The module's own text, such as a screenshot's frame, names no origin.

| Tool | Arguments | Risk | Permission point | Refused when |
|---|---|---|---|---|
| `computer_list_apps` | none | low | none | never |
| `computer_request_apps` | `apps: string[]`, `reason: string` | medium; high for a broad-reach app | `computer-use.controlApp`, one request per app, subject the app; details: name, identity, publisher, tier, and a warning for a broad-reach app | the app is never grantable, or isn't running or installed |
| `computer_list_displays` | none | low | none | never |
| `computer_screenshot` | `display?: string`, `scale?: number` (0.1–1) | low | none | never; it masks every app the session isn't granted |
| `computer_zoom` | `region: [x0, y0, x1, y1]`, `scale?: number` (0.1–1) | low | none | the session has no frame yet, or the region is outside it |
| `computer_read_window` | `control?: string` | low | none | the window in front belongs to an app that isn't granted or is never grantable; a `control` that isn't an ID of the session's read fails as `Stale` |
| `computer_click` | `x`, `y` or `control: string`, `button?: "left" \| "right" \| "middle"`, `count?: 1 \| 2 \| 3`, `modifiers?: string`, `summary: string` | medium | `computer-use.controlApp`, subject the target app, input `click` | the target check fails; or, in a click-only app, the button is right, the count is 3 or modifiers are given |
| `computer_scroll` | `x`, `y` or `control: string`, `direction: "up" \| "down" \| "left" \| "right"`, `amount: number` (1–50), `summary: string` | medium | `computer-use.controlApp`, subject the target app, input `scroll` | the target check fails |
| `computer_move` | `x`, `y` or `control: string` | medium | `computer-use.controlApp`, subject the target app, input `move`, with no summary | the target check fails, or the app isn't full tier |
| `computer_drag` | `to: [x, y] \| string`, `from?: [x, y] \| string`, `button?`, `modifiers?`, `summary: string` | medium | `computer-use.controlApp`, subject the target app, input `drag` | the target check fails at either end, or the app isn't full tier |
| `computer_type` | `text: string` (at most 4,000 characters), `summary: string` | medium | `computer-use.controlApp`, subject the target app, input `type` | the target check fails, the app isn't full tier, or the backend detects a password field or secure input, or the text goes on after a Tab or Enter |
| `computer_key` | `keys: string`, `repeat?: number` (1–100), `summary: string` | medium; high for a system combination | `computer-use.controlApp`, subject the target app, input `key`; then `computer-use.systemKeys` for a system combination | the target check fails, the app isn't full tier, or the keys are one of the app's own shortcuts, such as the stop key |
| `computer_batch` | `actions`: 1 to 10 items, each `action: "click" \| "scroll" \| "move" \| "drag" \| "type" \| "key"` with its tool's arguments except `summary`; `summary: string` | medium | each action's own, as its tool raises it, with the list's summary | a key action is a system combination or one of the app's own shortcuts, before anything runs; then each action as its tool is, and the first refused one ends the list |

A system combination is a key combination that the operating system handles rather than the app, such as switching or closing apps, opening the run dialog, the start menu or system search, or locking the screen.
Each backend names its system's combinations: on Windows, any with the Windows key, and Alt+Tab, Alt+Shift+Tab, Control+Alt+Tab, Control+Alt+Shift+Tab, Alt+Escape, Alt+Shift+Escape, Alt+F4, Alt+Space, Control+Escape, Control+Shift+Escape and Control+Alt+Delete.
On macOS, where Meta is Command and Alt is Option, they are Command+Tab, Command+Shift+Tab, Command+Space, Control+Space, Command+Q, Command+H, Command+Option+Escape, Control+Command+Q, Command+Shift+Q, Command+Option+Shift+Q, Command+Shift+3, 4 and 5, Control+Command+Shift+3 and 4, which copy the screen to the clipboard, Command+Option+D, F11, and Control with an arrow key; any other combination with Command is an app's own.
`keys` names the modifiers, each once, then one key, such as `Control+Shift+S`.
`computer_key` refuses, with nothing sent, every chord that Noldova Desktop lists as one of the app's shortcuts, the stop key among them, in both readings of the base's `Mod`, as Control and as Meta; it reads `context.shortcuts.list()` at each call, so a shortcut the person rebinds or the app adds is refused from the next call.
A listed shortcut whose key the module can't name, such as the stop key's `Mod+Shift+Period`, is one `keys` can't name either, so `computer_key` refuses it at its keys.
The arrow keys are `Up`, `Down`, `Left` and `Right`, and the module also reads the base's `ArrowUp`, `ArrowDown`, `ArrowLeft` and `ArrowRight`, in `keys` and in the app's shortcuts.

Every tool fails when the session grant is denied or has expired, and when another conversation holds the screen.

Every input tool also fails when:
- the target app has no grant for the conversation;
- control is stopped;
- a coordinate is outside the session's frame, or the display layout changed after the frame was set;
- one of the app's own windows is in front ([section 5](#5-what-the-module-needs-from-the-base)).

A call that fails returns a failure from [the computer-use failure set](#failures) that says why.
Every input tool declares itself non-resumable in its descriptor: it finishes or fails within its deadline, and a later call never continues it.
It also declares that it marks its point of no return, which it marks just before its first input, a glide of the pointer or a key press, and names `computer_screenshot` as the tool to call next.
A cancel before that point sends nothing.
After it, the backend finishes that step and releases every button and key it pressed, and the registry fails the call as `OutcomeUncertain`.
No tool holds a button or a key past its own call.

### Lists of actions

Most of a step's time is the agent's round trip, so `computer_batch` runs a short list of input actions in one call, in order, with no screenshot between them:
- A list holds 1 to 10 actions, each a click, a scroll, a move, a drag, a type or a key, with its tool's arguments and no summary of its own; the list's `summary` stands for each one.
  Ten fill a form's fields or walk a few steps of a menu, and keep short the time a list runs without the agent seeing the screen.
- Every coordinate is a pixel of the session's frame before the call, and every control ID one of its read then, as for the single tools.
- The list is one call: it waits for one turn, its deadline covers the whole list, and a first call's session request shows the whole list.
- Before anything runs, the list is refused when a key action is one of the app's own shortcuts, as `computer_key` refuses it, or a system combination: a system combination's `computer-use.systemKeys` request is the person's to answer each time, and the person's answer during the list would stop it, so it goes in a `computer_key` call of its own.
- Each action then runs as its tool does: the target check when its turn comes, at the window in front then, so a list may act in several granted apps; its own `computer-use.controlApp` request, with its input, its exact arguments and the list's summary, answered from that app's grant; and the backend's check in the same step as the input.
- The watch for the person runs from before the first action to the end of the last, across the checks and requests between actions, which the center answers from what it remembers without asking the person.
  So the person's input stops a list between its actions as during them, except while one of the app's own windows is in front, as for a single tool's input.
- Of an action's own checks, only a system combination and one of the app's own shortcuts are refused before anything runs: an action's malformed arguments are refused when its turn comes, as its tool refuses them, so the actions before it have run.
- The first action that fails ends the list, and no later action runs.
  The call fails with that action's code and reason, and the message says how many actions ran before it, such as "2 of 4 actions ran; action 3 (click) failed: ...".
  The code describes the action that ended the list: a third action that fails as `Stale` sent nothing itself, though the two before it did, so the agent takes a screenshot before acting again whatever the code.
- A list that runs to its end returns `ran`, the number of actions, and `results`, each action's structured fields in order, as its tool returns them.

### Failures

Every tool fails with one of the base's shared failure codes, so the agent can act on it, and a refusal carries a module code beside it that names its reason, such as `computer-use.passwordField`.
The registry gives some of them itself: it fails a call while control is stopped, refuses an input that doesn't fit the descriptor's shape or is over 64 KiB, and settles a call that is cancelled, stopped or past its deadline with its own message.

| Code | Means | The agent should |
|---|---|---|
| `Refused` | the call's input is invalid, or the action is forbidden without a request; the failure names the reason | act on the reason |
| `Denied` | the person denied a request, including the session grant | not retry without the person |
| `Expired` | a request expired without an answer | ask again only if the person is there |
| `Withdrawn` | the caller cancelled the call, or its session ended, while its permission request was still waiting | retry if it still needs to |
| `Cancelled` | the caller or the host cancelled the call, or its session ended, with no request waiting and before any input reached the target | retry if it still needs to |
| `Stale` | the call's coordinates refer to an older frame, the display layout changed after the session's frame was set, or the target check when the call arrives found the target changed; or a control's ID is from an older read | take a new screenshot, or read the window again |
| `TimedOut` | the call passed its deadline before any input was sent | retry if it still needs to |
| `TooLarge` | an image result can't fit its limits ([screenshots](#screenshots)) | ask for a smaller region or scale |
| `Unavailable` | another conversation holds the screen, the module is switched off, or the tool, the backend or what it needs isn't available, such as a backend that failed before sending | not retry, or wait for the other conversation to end |
| `Stopped` | control is stopped: the person stopped it, or took over the pointer or keyboard, before the call's point of no return | wait for the person to resume, and don't retry |
| `OutcomeUncertain` | the call ended after its point of no return, for any reason: a stop, a takeover, a cancel, the deadline, a backend failure or refusal, or a target that changed after the glide | call `computer_screenshot` before acting again |

The registry checks a call's input against its descriptor's input shape first, and an input that doesn't fit fails as `Refused` there.
The module refuses only what the shape can't express, such as a region outside the latest screenshot.

`Refused` names its reason:
- the app has no grant for the conversation, so call `computer_request_apps`, or its tier doesn't allow the input;
- the target is forbidden outright: the host app's own window, an elevated window, an operating-system prompt, or an app that is never grantable;
- the runtime's target check when the call arrives failed: the target isn't frontmost, or another window is at the point;
- the operating system's grant that the action needs is missing;
- the backend detected a password field or secure input, or couldn't tell which field has the keyboard focus;
- a coordinate is outside the session's frame.

The backend reports a refusal by throwing `RefusalException`, with its reason and whether input was already sent.
The runtime maps it by what happened:
- any refusal after input may have been sent fails as `OutcomeUncertain`;
- before any input, the person's physical input fails as `Stopped`;
- a target that changed since the call arrived fails as `Stale`;
- a target that is forbidden fails as `Refused`.

The backend's own check runs in the same step as the input, after the call's point of no return, so the registry turns its refusal into `OutcomeUncertain`, keeping the module's message and module code, even when the backend sent nothing.
The base has no way yet to hear that nothing was sent after that point ([section 5](#5-what-the-module-needs-from-the-base)).

`CallFailures` is the one mapping from how a call ended to its code in the base's failure set, with a refusal's reason as the module code; `TargetRightsUnknown` fails as `Refused`, as `ElevatedTarget` does.
The base sets a `ToolAbortReason` as the signal's reason before it aborts a call, and the module's own switch-off aborts with `SwitchedOff`; a reason the base doesn't name counts as a cancel.
A failure translated from a backend's error keeps that error as its cause, which the registry writes to the module's log and never passes to the agent: the display list, the window read, the window in front and the window stack read for an input, the start of the person's-input watch, every input tool's backend failure, pointer and keyboard alike, and a list of actions keep it.

The runtime's and the protocol's exceptions take the form of `@noldova/context.exceptions`.
Each package has one base on that package's `Exception`, `ComputerUseException` in the runtime and `ProtocolException` in the protocol, and a class for each condition, which builds its message from the package's resources from the facts it keeps as fields, and carries any error that caused it as its `cause`.
The runtime's models check plain arguments with that package's `ArgumentException` and `ArgumentOutOfRangeException`; the runtime's own classes are for its own conditions, such as a refusal, and for values a backend gives that it can't use.
A value that isn't a protocol model's wire form fails with `JsonException` from `@noldova/context.json`.
A value from the macOS backend that the runtime can't use has its own class, so nothing of it larger than a bound is ever read:
- `MacScriptLineUnreadableException`: the input process answered a line, or text with no line break, longer than `Resources.macScriptMaxLineLength`, 4 Mi characters, or a line that isn't an answer; it keeps the line's length only, never its text, which can hold window content, and ends the process;
- `PngHeaderLengthException`: a capture's PNG header isn't 13 bytes long;
- `PngTooLargeException`: a capture's PNG is more than 8192 by 8192 pixels, refused before it is inflated, which inflates to the image's size at most;
- `MacCaptureFileTooLargeException`: a capture's file holds more than twice the bytes of such an image's RGBA pixels, `Resources.maxCaptureFileBytes`, refused before it is read.

The macOS input process is a classic `osascript` script, outside Node, so it can't import `@noldova/context.exceptions` and is outside the rule that a package throws only its own exceptions: it throws plain errors, with texts from its own `Resources` class.
None reaches a caller as it is: only its text crosses the process boundary, on the process's answer line, and `MacScriptProcess` wraps each in `MacScriptFailedException`, which keeps the method and the script's text as its facts, `method` and `scriptMessage`, and formats its message from the runtime's resources.
The script refuses a request's malformed fields, by type and range, before it acts.

The protocol's exceptions write out their `name`, since the window part ships minified.

### Tiers

An app's tier comes from its category, which the module owns, and neither the agent nor the app changes it.

| Tier | The agent may | Categories |
|---|---|---|
| View only | see it in screenshots | web browsers, and the trading apps the module lists |
| Click only | click with the left or middle button, and scroll | terminals, shells, code editors and IDEs |
| Full | use every input tool | every other grantable app |

A terminal, a shell or the file manager is a broad-reach app: its grant request carries a warning and has high risk.

Never grantable:
- the app the module runs in, and the module's own windows;
- the operating system's permission, elevation and sign-in prompts, and the lock screen;
- system settings and control panels, security centers, registry editors, and credential and key stores;
- elevated windows: the system drops input to them silently, so the target check reads the target process's elevation and refuses with that reason.

The app's policy may also deny apps; that is its decision, not the module's.
The category lists match a Windows app by its program's file name and a macOS app by its bundle identifier, each without regard to case, and an app on no list is Full.
A remembered grant matches its subject exactly, so every Windows identity takes one lowercase form of its path, and every macOS identity is its bundle identifier in lowercase.

### Target check

The target of an action is an app, one of its windows and that window's process.
The app is identified by its identity, never by its display name:
- Windows: the process's image path, compared without regard to case;
- macOS: the application's bundle identifier;
- Linux on X11, planned and not built yet: the window in `_NET_ACTIVE_WINDOW` and its `_NET_WM_PID`.

A mouse action also checks the top-level window under its point, since the input lands there whatever is frontmost.
That window must belong to a granted app, or be a menu or popup owned by the frontmost granted window.
On Windows, File Explorer's windows other than its folder windows belong to no app, as in [Screenshots](#screenshots): the desktop, the taskbar and the window switcher, and also File Explorer's own menus and dialogs.
So input is refused when one of them is in front, or under a point, though File Explorer's process draws it.

The runtime checks the target when the call arrives, and for a mouse action the topmost window under each point in the window list, which must be the target app's own; a point another window covers is refused there, naming that window's app.
The operating-system backend checks it again in the same step as the input it sends: the frontmost window is the target's, every point is inside it and uncovered, and the target isn't elevated; then it sends.
The runtime alone can't make that step atomic, so the backend owns it: one call into the Windows addon, and one step of the macOS input process.
After sending, the backend checks that the frontmost window is unchanged, and a change ends the action.
A refusal names its reason and whether any input was already sent.

Before a move, a click, a scroll and each end of a drag, the pointer glides from where it is to the input's point, so the person can follow where the input goes:
- the path is straight and eased out, by a cubic ease-out, in steps 16 ms apart, a frame of a 60 Hz display;
- its time grows with the distance as a pointing movement's does, 40 × log₂(1 + d / 20) ms for d desktop units: 40 ms for 20 units, about 100 ms for 100, 160 ms for 300, and 200 ms at most, from about 600;
- a step whose time has passed gives way to the latest one due, so a slow step never makes the glide longer;
- before each step the backend makes the input's own check, at the input's points rather than the step's, and checks that the person's input hasn't arrived since the call; a failed check stops the glide and refuses the input with no input sent, since the glide's moves only show the way;
- a drag's second glide carries the button from one end to the other, checking the end it goes to, and a failed check after the press releases the button and the modifiers where the pointer is, with input sent;
- on Windows the addon glides off the JavaScript thread, on a thread of Node's pool, and times the steps with a high-resolution waitable timer, which leaves the system's timer resolution as it is; on macOS a glide is one step of the input process.

On Windows 11 and macOS 15, a glide of about 300 units took 145 ms on Windows and 156 ms on macOS, with about 80% of the way covered at half the time.
That doubles a step of a screenshot and a click on Windows, from 140 to 307 ms at the median, and adds about 16% on macOS, from 989 to 1153 ms.

A stop or a timeout during a glide lets it end, 0.2 seconds at most, and nothing more is sent.
A stop or a timeout during a drag whose button is down reaches it before its next step, within a step of 16 ms on Windows and a step and its window check on macOS: the drag releases the button and the modifiers where the pointer is, never at its end point, and nothing more is sent, so the call fails as `OutcomeUncertain`.
The drag is one platform call, so the call's signal reaches it through a flag the platform reads before each step:
- on Windows a shared 32-bit integer that the runtime sets and the drag's thread reads with an interlocked read;
- on macOS a file the drag's request names, in a folder of the module's own that only the person can read, which the runtime creates and the input process looks for, since the process reads one request at a time and a drag is one of them.

Both read it again right before the press, so a stop before the press sends no press: on Windows nothing, since the move to the press point, the modifiers and the press go in one batch; on macOS at most that move and the modifiers, which it releases, and the call then fails as `OutcomeUncertain`.
A pointer the backend can't read, as while another desktop is in front on Windows, has no glide, and the input's own check refuses.
`computer_type` sends its text in chunks no longer than the backend allows, and the backend checks the target before each chunk; typing stops after the first Tab or Enter, as below.
A chunk may end in a Tab or a line break, which the backend then sends as done, so the tool ends the call after such a chunk when text follows it and refuses the rest as a possible password field, with the input sent: the next chunk's check could run before the focus moves.
On macOS each posted event waits 30 ms before the next: mouse events posted 5 ms apart were sometimes lost on macOS 15, and without the Input Monitoring grant the module can't see whether an event arrived.
A glide's moves are the exception, posted at their own times: a lost move only skips a step, and the input's own move to its point, which keeps the gap, ends the glide.
So a macOS chunk is at most 40 UTF-16 units, two Unicode events and four posts, and a stop, a takeover or the person's-input beat waits about 0.12 seconds at most behind it.

The backend refuses keyboard input when it detects a password field or secure input, and on both platforms the check fails closed.
- On Windows, in the same step as the send, it checks the keyboard focus first and the foreground last, right before the send, since the focus check may wait; a target with higher rights than the module is refused as `ElevatedTarget` before the focus check, which UI Automation can't answer across the rights, and a target whose rights can't be read, as when its process's token can't be opened, is refused as `TargetRightsUnknown` there and again after the foreground check, so input never goes to a window whose rights are unknown; the window in front reads as elevated only when its rights are known to be higher.
  Every input reads the person's input count as the call starts, and compares it again right before `SendInput`, refusing as `PhysicalInput` with nothing sent, and after it, refusing with the input sent.
  It refuses keyboard input when the focused window is a classic `Edit` control with the `ES_PASSWORD` style, or UI Automation reports the focused element as `IsPassword` (`PasswordField`); WPF's `PasswordBox` and the password fields of browsers and UWP apps report `IsPassword`.
  It also refuses it when the focused element is outside the target (`FocusOutsideTarget`): it belongs to another process than the target's, and its window, or its nearest one's, as for an element of a web page, isn't a window of that process inside the target's.
  So content in a child process's window inside the target, such as WebView2's in Teams or the new Outlook, takes the keys; for a UWP app's window, which `ApplicationFrameHost` draws around the app, the process of the app's content, its `Windows.UI.Core.CoreWindow` child window, counts as the target's.
  The addon asks its control thread, the one that reads controls, which starts with UI Automation as the addon loads, and waits for the backend's focus budget at most, half a second: an element that doesn't answer in time, a control thread still busy with an earlier request then, or a read that fails refuses the input as `FocusUnknown`, since the focused field may be a password field; its text tells the agent to click the field and try again, or to ask the person.
  The check runs on the JavaScript thread, which it holds for the focus budget and 50 milliseconds more at most for each chunk, the 50 milliseconds for the control thread to hand back its answer: 0.55 seconds.
  A Tab or an Enter may move the focus, as from a user name field to a password field, and no app tells when it has handled the key and moved the focus, so typing stops after the first Tab or Enter and refuses the rest of the text as a possible password field, with the input sent; the tool's description tells the agent to type the text after it in a new call, which is checked again.
  A custom field that reports neither isn't detected; that is the documented limit.
- On macOS, in the same step as the send, it refuses keyboard input first while secure keyboard entry is on (`SecureInput`), then while the system-wide Accessibility element names another app than the target's as the one with the keyboard focus (`FocusOutsideTarget`); when it answers that no app has it, as while the app in front has no key window or a view with no Accessibility element has its keyboard focus, the keys go to the app in front, which the check already found to be the target's, then while the target's focused element's subrole is `AXSecureTextField` (`PasswordField`).
  Another process's non-activating panel, as a launcher's or a password manager's, has the keyboard focus while the target stays in front, and the target still names its own focused element then, so only the system-wide element tells.
  It answers only a process that has made its shared application, so the input process makes it, with the policy that keeps the process out of the Dock and the app switcher.
  The check fails closed: it also refuses keyboard input as `FocusUnknown` unless the system-wide element names the target's app as the one with the keyboard focus, or answers that no app has it, and the target names its focused element and that element answers with another subrole, or that it has none, or the target answers that no element has the focus, each read within 0.5 seconds; an app that answers that no element has the focus, as a game's or a remote desktop's window may, gets the keys.
  As on Windows, the target check asks whether the person's input has arrived since the call once more as its last step, right before the process sends.
  Typing stops after the first Tab or line break, a line feed, a carriage return or the pair of them, any of which may move the focus, and refuses the rest of the text as a possible password field, with the input sent; macOS sends the Tab as the Tab key and a line break as one Return, with no modifier, as a person's keys move the focus, Windows sends a line break as one Enter and a Tab as the Tab key, and the tool never ends a chunk between the two units of a carriage return and line feed, so the pair stops typing once.
  Pointer input is never refused for either.

A field that reports neither isn't detected.

### Screenshots

A screenshot shows only the apps granted to the session.
Every other window, the desktop, and every window of the app the module runs in, is covered with a solid fill.
Only granted windows are ever captured: the runtime never captures the screen, but has each granted window on the display capture itself on its own, as the window draws itself, whatever lies in front of it.
So no pixel of another app's window, menu, tooltip or notification, or of the desktop, is ever captured, however the windows move or animate and however late the screen's own frame is.
The runtime draws each window's image at its frame on the fill, back to front, and covers every window the session isn't granted, so what lies in front of a granted window stays covered.
A window that renders black through its capture, such as protected video, shows black.
The backend lists the windows that may show, from the front, before and after the captures, and the runtime captures again, three times at most, while the two lists differ.
The runtime shows a pixel only when it lies wholly inside a granted window that both lists hold alike, with the same windows in front of it in both lists, and no window in front of it covers it.
A window that moved, opened or closed during the captures may have passed over any window behind it, so everything from the first window the lists differ on back is covered.
A granted window that has gone or moved from the frame the list gave, or that doesn't respond, has no image, so it is covered.
Before it captures, the runtime asks the center, answered only from what it remembers, whether each granted app on the display is still granted, so an app whose grant is revoked in the app's settings is neither captured nor shown from the next screenshot.
A window the backend can't place makes its list incomplete, and an incomplete list covers the whole screen.
A window whose program the operating system won't name belongs to no app, so it is covered.
The backends list the windows this way:
- On Windows, the addon walks the top-level windows with `FindWindowExW`, which, unlike `EnumWindows`, also finds the immersive ones, such as notifications, Start and Search, and lists those that are visible and not minimized or cloaked, with their handles, bounds, programs and window classes.
  A window's menus and popups are top-level windows of its own process, so they are listed, granted and captured as its app's windows.
  It captures a window with `PrintWindow` and `PW_RENDERFULLCONTENT`, which has the window draw itself, and keeps the part inside its bounds; a system backdrop such as acrylic, which blurs the windows behind, isn't part of the capture.
  The window's own thread draws it, so the drawing runs on a thread of its own, and the capture waits for it for 500 milliseconds at most, off the JavaScript thread; a window that hasn't drawn by then, or that still draws for an earlier capture, has no image, so it is covered.
  File Explorer's process also draws the desktop, the taskbar and the window switcher, which show other apps' names and thumbnails, so only its folder windows, of class `CabinetWClass`, belong to it.
- On macOS, the input process lists the window server's on-screen windows with their numbers, bounds and their apps' bundle identifiers, leaving out the windows drawn fully transparent.
  The Dock's resting window, named `Dock` at the Dock's window level, is as large as the display, though the Dock draws only outside the visible frame macOS gives apps, where it and the menu bar draw.
  The backend counts it as those parts, and, when the Dock hides itself or magnifies, also as a band of 152 points along its edge, the deepest its largest icons reach.
  Every other Dock window, such as Mission Control's, App Exposé's, Launchpad's or a stack's, counts as its whole bounds.
  It captures a window with `screencapture -l` and the window's number, without its shadow, which has the window server draw that window alone, and only while the window lies at the bounds listed, so the resting Dock's parts have no image and are covered.
  A capture's file, a granted window's pixels, goes in a folder of the module's own that only the person can read, and each capture first removes the files that processes no longer running left there.
- On Linux on X11, planned and not built yet, it would use the stacking order in `_NET_CLIENT_LIST_STACKING`.

Its long edge is at most 1,568 pixels and it has at most 1.15 million pixels; the agent's `scale` shrinks it further, each pixel the average of those it covers.
It is at most 1 MiB encoded as PNG.
An image over that is shrunk to 80% of its width and height, at most twice, and one still over it fails as `TooLarge`.
It returns the image, from `computer-use:screen`, and the module's own text with the frame: an ID, the display, the image size, and the scale, the image's pixels for each desktop unit.
The frame becomes the session's latest full screenshot until the next one or the session's end.
The backend works in desktop coordinates: physical pixels on Windows, where the module is aware of per-monitor scaling, and points on macOS.
A capture carries its display's frame in those coordinates and its image's size in pixels, which the backend measures for the display, and the module maps a screenshot coordinate back to the desktop through them.

`computer_zoom` takes a new capture of the frame's display, composed in the same way.
It shows the desktop rectangle the region covers at the capture's own pixels, within the same limits.
It never changes the frame, and fails as `Stale` when the display moved or changed size after the screenshot.

### Reading a window

`computer_read_window` lists the controls of the window in front as compact text, which costs the agent far less than an image and names each control, so an input tool can act on it by its ID.

What it reads:
- Only the window in front, and the menus and popups its app has open in front of it, which the target check counts as that window's; never a window behind it or another app's.
  On Windows a menu or a popup is a top-level window of its own, so after the window the backend reads each window of the same process that the window stack lists in front of it; on macOS they are children of the app's element.
- The app that hosts the conversation is usually in front when the agent starts, and its windows are the app's own, which the module leaves alone, so that read is refused, as an input is; a granted app's window comes to the front first, which the module has no tool for.
- The window's app must be granted to the session, whatever its tier: a view-only app's controls are read, though its tier still refuses input.
  Before reading, the runtime asks the center, answered only from what it remembers, whether the app is still granted, which leaves one record, as a screenshot does.
  A window of an app that isn't granted, or that is never grantable, is refused as input to it is, and nothing is read from it.
- Each control is checked by the process it belongs to, UI Automation's `ProcessId` or the Accessibility API's `AXUIElementGetPid`, before anything else of it is asked: a control of another process inside the window, such as a WebView2 or a reparented child window of another program, a UWP app's content in its frame host, a web view's page, or a macOS view service, is read only for its process and bounds, never its name, value or the controls under it.
  The backend gives it as a row of that app only, with the role `other`; on Windows a control's children of other processes come after its own.
  The runtime lists that row only when that app is granted too, which it asks the center as for the window's app, and leaves out the row of an app that isn't granted.
  A `control` naming a listed row reads under it, the controls of that row's process, by the same rule; a click on the row's own ID fails as `Stale` before anything of the control is asked, since the backend never finds such a row again: its role and name were never read.
- Only controls on screen: a control the platform reports off screen, with no area, or outside the window is left out with everything under it.
- A container with no name and no value of its own, such as an unnamed group or pane, is left out, and its controls take its place.
- A password field, one that UI Automation reports as `IsPassword` or whose subrole is `AXSecureTextField`, is listed with its name and the `password` state; its value is never read, nor asked for.
  The backend asks for values in a second request, once the first has given each control's role, subrole and `IsPassword`, and only for the controls known not to be password fields.
- Every other name and value is cut to 200 characters, marked with `…`.
  A text control's value is read only to its first 402 UTF-16 units, at least 201 characters, through UI Automation's `TextPattern` (`DocumentRange.GetText(402)`) or the Accessibility API's `AXStringForRange`, so a long document's text never crosses processes; a value the platform gives only whole, such as a combo box's `ValuePattern.Value`, and a name are cut to as many units once they arrive.

The result holds two texts.
The module's own names the frame the bounds are in, the window's app, the control a read under one names, how many controls it listed and left out, and whether it ran out of time:

```json
{"frame":{"id":"3","display":"\\\\.\\DISPLAY1","width":1280,"height":720,"scale":1},"window":{"app":"Notepad","identity":"C:\\Windows\\notepad.exe"},"listed":5,"leftOut":0,"timedOut":false}
```

The other is the window's own: each control has a line, indented two spaces for each level, with its role, its name in quotes, its value after `=`, its states, its bounds and its ID:

```text
- menubar "Application"
  - menuitem "File" at 12,40 34x20 [c1]
- edit "Text editor" = "Dear team," focused at 8,64 1180x700 [c2]
- edit "Password" password at 8,770 300x24 [c3]
- button "Save" disabled at 1100,790 80x24 [c4]
```

- Roles come from one list for both platforms, to which each backend maps UI Automation's control types or the Accessibility API's roles and subroles: window, dialog, menubar, menu, menuitem, toolbar, button, checkbox, radio, combobox, edit, text, link, image, list, listitem, tree, treeitem, table, row, cell, header, tab, tablist, slider, progressbar, scrollbar, group, pane, document and other.
- States are listed only when they hold: focused, disabled, readonly, checked, mixed, selected, expanded, collapsed and password.
- Bounds are the visible part of the control, in pixels of the session's frame, as the top-left corner `x,y` and the size `wxh`.
- Each control with bounds in the frame has an ID, `c` and a number, in the order listed; the numbers go on across the session's reads, so an older read's ID never names a control of a newer one.
- The listing comes from `computer-use:window`, so the host marks it untrusted: names and values are the app's own text.

Limits:
- The backend reads breadth first, so a window's top levels come before deep lists, with at most 200 controls under one control, 50 levels and 2,000 controls in all.
- A list holds at most 500 controls and 24,000 characters, about 6,000 tokens; `control` reads the part under one control.
  `leftOut` in the module's own text counts the controls the read reached and didn't list; the backend's limits stop it before the controls under those, so a list cut short left out at least that many.
- A read takes 2 seconds, checked before each request to the platform, and one that runs out ends its list there, which the module's own text says; a control whose app doesn't answer within its timeout adds nothing under it.
  On Windows one request can't be cancelled and waits up to its own timeouts, two of a second each, so the backend answers at the limit with what it read, marked as timed out, while its read thread finishes the blocked request and drops its answer.
  On macOS the input process reads in slices of about a tenth of a second, one call each, so the person's-input watch's poll every half second and the input calls run between them; each step of a slice makes two requests at most, a quarter of a second each, and the process ends the read itself at the limit, so the last slice answers at most half a second late.
  Finding the window's element among its app's windows and the scan for the menus its app has open are steps of the slices too, so no call of the read holds the process longer than a slice and a step.
  A read or a control's search that comes while that thread is still blocked waits for it within its own limit, and fails as `Unavailable` when the limit passes; keyboard input's focus check asks that thread too, and refuses the input as `FocusUnknown` when it doesn't answer within the focus budget.
- `control`, an ID of the session's read, reads only the controls under that one, within the same limits; their IDs continue the read's, whose IDs stay valid.

The frame:
- Bounds are pixels of the session's frame, the one the latest full screenshot or read set.
- When the session has no frame, the window lies on another display, or the display layout changed after the frame, the read sets a new frame of the window's display, as a screenshot at the default scale would, captures nothing, and returns the frame's text; coordinates then refer to that frame, as after a new screenshot.
- A read's IDs hold while the session's frame shows the same display at the same place, size and scale: a new screenshot of that display at the read's scale keeps them, and one of another display or at another scale ends them.

Acting on a control:
- `computer_click`, `computer_scroll` and `computer_move` take `control`, an ID, in place of `x` and `y`, and `computer_drag`'s `from` and `to` each take an ID in place of `[x, y]`; so do those actions in `computer_batch`.
  `computer_type` and `computer_key` act on the focused control, so the agent clicks a control first, in the same list if it likes.
- The session's IDs are those of its latest read, with the `control` reads under it; a new read of the whole window, another window in front, a frame of another display or scale, a change of the display, or the session's end ends them; a read under a control ends those of the read under a control before it; and an older ID fails as `Stale`, telling the agent to read the window again.
- The input is always real input at a point, never the platform's own actions on a control, such as UI Automation's `Invoke` or `SetValue` or the Accessibility API's `AXPress`: so the tiers, the target check, the glide and the watch for the person apply as for a point, and the app sees what a person's click gives.
- Before the request, the backend finds the control again by the reference it kept from the read.
  It must still exist with the same role and name, be enabled and on screen, and its point, the clickable point UI Automation gives or else the centre of its rectangle, which is all the Accessibility API gives, must lie inside the bounds the read gave; otherwise the call fails as `Stale` with nothing sent.
- The request's details name the control's role and name as read, and the point, beside the input's other arguments.
  The point may lie over a control under the one named, such as a list item's text, which then takes the input as a person's click on the item would give it.
- The input then runs as at that point.
  After the glide, the backend searches for the control once more, on its control thread within a second: it must still be there with the same role and name, enabled, with its point inside the bounds the read gave, and the element at the point (UI Automation's `ElementFromPoint`, the Accessibility API's `AXUIElementCopyElementAtPosition`, then up their parents) must be the control or one under it.
  A control that changed, moved or was covered, or that the search can't find again within the second, fails the call as `Stale` with nothing sent; a call that ends meanwhile is `Cancelled`.
  Then the input's own window check, which makes no accessibility call, runs again right before the send, so the slower search never stands between the last check and the input.
- A drag searches for both ends' controls after its first glide and before the press.
  Once the button is down, its `to` end is checked as a point is, by the window check before each step of the second glide, so a control that moved after the press isn't seen; a failed check there releases the button where the pointer is and fails as `OutcomeUncertain`, as for a drag between points.
- The backend keeps a reference to each control of the latest read, and frees them at the next read: a read of the whole window frees every earlier one, and a read under a control those of the read under a control before it.

The backends:
- **Windows:** the addon reads through UI Automation's COM client, in the multithreaded apartment on a thread of its own, never the JavaScript thread, and walks its control view.
  One cache request for each control's children (`FindAllBuildCache`) gets each child's name, control type, bounds, its enabled, off-screen, focus, password and read-only properties, its process ID, and its toggle, expand and selection states; then each child that isn't a password field is asked for its value, through `TextPattern` to 402 UTF-16 units where it has it, else `ValuePattern`.
  The addon keeps each listed control's element as its reference, with handles such as `1.4`, the read's number and the control's: a read of the whole window frees the earlier reads' elements, and a read under a control those of the read under a control before it.
  The client's connection and transaction timeouts are a second each, except for the focus check's read below.
  Chromium and Electron apps turn on their full accessibility mode once a UI Automation client asks, and keep their accessibility tree up to date from then on while they run, which costs them memory and speed ([section 6](#6-missing-decisions)); a first read of such a window may list few controls, and the next one lists them.
  The same client reads `IsPassword` and the process of the focused element for the keyboard input's focus check, on the control thread, within the focus budget of the input that asks.
  Each of that read's calls has the budget's time left as the client's timeouts, more or less than a second, so a target whose thread answers within the budget answers in time and none holds the control thread past it; only the control thread uses the client, so no other call has them, and the thread sets them back to a second before its next request, which fails if it can't, leaving the next one to try again.
- **macOS:** the input process reads through the Accessibility API it already uses, under the Accessibility grant input already needs, from the app's element to the window's, the app's window whose frame is the target window's; a menu the app has open, such as a context menu, is a child of the app's element and comes at the top of the read.
  One `AXUIElementCopyMultipleAttributeValues` for each control gets its role, subrole, title, description, enabled, focused, selected, expanded and disclosing attributes, position, size and number of characters, and `AXUIElementGetPid` its process; a second request gets the value of a control that isn't a secure text field, a text control's longer than 402 units through `AXStringForRange` to 402 units, and any other's through `AXValue`; its children come as a range of at most 200; and each request waits a quarter of a second at most.
  A control's name is its title, else its description; macOS has no read-only state to read in the same request, so its controls have none.
  The script bridge can't read an `AXValue`'s point or size, and reading it through `AXValueGetValue` ends the process, so the process reads them from the value's description; it makes the range for `AXStringForRange` from its bytes, through `AXValueCreate` bound to take them.
  The search after the glide asks the system-wide element for the element at the point, which is whatever app is on top there, and walks up its parents.
  It sets neither `AXManualAccessibility` nor `AXEnhancedUserInterface`, which change how an app runs, so Electron apps and Chrome list few controls there ([section 6](#6-missing-decisions)).
- **Linux:** after Windows and macOS, with the X11 backend.

Left out of the preview: windows other than the one in front; a document's text beyond a value's 200 characters; the platform's own actions on a control; marking what changed since the last read; and apps whose toolkit lists no controls, such as Java apps without the Java Access Bridge, which the agent reads from screenshots.

### Describing an app

The runtime part publishes the apps service, `computer-use.apps`, an `AppsService` from the runtime package, through Noldova Desktop's service registry while it runs.
Its `describeAsync(identity, signal)` takes the app's identity as text, the subject a remembered grant names, so the call needs none of the runtime package's classes, and gives an installed app's name, its publisher where the system names one, and its icon as an RGBA PNG 64 pixels a side, so another module can show an app the person granted as they know it, rather than by its identity.
Finding it is another matter: `getService(name, AppsService)` checks the service against `AppsService` as a value, so a module that calls it imports the runtime package's class.
Noldova Desktop's optional dependencies settle the lookup: a module names computer use among them, so a computer use that fails to activate never blocks it, and finds the service with `findService` and a type guard of its own, importing `AppsService` as a type only.
It describes one app at a time, since on macOS the descriptions share the input process's channel with every other call and can't be stopped once sent: the next description waits for the backend's read to end, even when the caller's answer came at the time limit, so descriptions never stack up in the channel ahead of the agent's input. Each description's 5 seconds start at its turn; a call whose caller ends it while it waits leaves at once, never read.
- **Windows:** the name is the program file's description, or the file's name without one, and the publisher its signer, as in the app list; the addon draws the program's icon at the size asked through `SHDefExtractIconW`, taking the alpha from the icon's mask when its colours have none.
- **macOS:** the input process finds the app by its bundle identifier through Launch Services, or, when Launch Services doesn't find the identity, which holds the identifier in lowercase, among the apps the app list reads, without case; it names the app as the app list does, and draws the icon `NSWorkspace` gives the bundle into a bitmap of the size asked.
  The publisher comes from the bundle's signing certificate, the first authority `codesign -d --verbose=2` writes, started through the runtime part's context: a Developer ID certificate's publisher without its team's identifier, or "Apple" for Apple's own apps, whose certificate is "Software Signing". Any other certificate names none: the App Store's, "Apple Mac OS Application Signing", and TestFlight's sign other publishers' apps, so their name isn't the publisher's. An ad hoc signed or unsigned bundle, or one whose signature can't be read, has none either. The app list names no publisher, since reading every bundle's signature would hold it.
- An icon that can't be read leaves the description without one.
- While the preview setting is off, or on a platform `module.json` doesn't name, the module is off and the base offers no apps service. When no app has the identity, when the backend fails, or after 5 seconds, it gives no description, and it logs nothing about the app, as an app the person uses is theirs.

### Stop and resume

The person can stop control from:
- the base's tray or menu-bar work item;
- the base's system-wide stop key, `desktop.stopAgentControl`;
- the module's status bar item, shown while a session controls the screen, whose click runs the module's stop command, `computer-use.stopControl`.

The module's stops go through the base's `context.tools.stopAll`, which stops every module's agent tools, and the module follows the base's stop and resume, also when another module or the base stops them.
Stop ends control for every session until the person resumes it from the base's Resume control; the module has no Resume control of its own, and an agent never resumes it.
A resume keeps the conversations' grants, and the next call starts control again.
Switching the module off, by its setting or as it deactivates, resumes no stop, its own included, from its status bar item, its work item or the person's input: as Noldova Desktop's TOOLS.md says, only the person resumes, through a command the person runs, so a stop of every module's agents stays until the person resumes it.
Switched on while control is stopped, the module reads the base's `context.tools.isStopped` and shows stopped from the start, sending it to a window that stayed open since it was switched off.

While a session controls the screen, the module lists its control as running work in the base's tray, so the person can stop it there, and it sends the window part each change of state: idle, controlling with the session's ID, or stopped.
It answers `computer-use.statusRead` with the state as it is now, which the window part reads as it activates and reconnects, so a window that opens during control shows the item; a change that reaches the window during that read wins over the read's answer.
Switching the module off, by its setting or as it deactivates, sends idle before it withdraws the event, so the item hides when the module is switched off during control or a stop.

The person's own input stops control too, through the base as Stop does, since the person may have taken over:
- the module records each position it sets, and keeps a glide's earlier positions until the pointer reaches one, so a pointer behind the glide's moves isn't taken for the person;
- it compares the pointer with that position by polling, and again before each input it sends and each step of a glide;
- a difference stops control at once.

The person types the next message to the agent in the app's own windows, and answers permission requests there, so that input must not stop control.
The module leaves the app's own windows alone, through `context.appWindows`, read at each call: the agent's own input into them, and a window read of them, is refused with nothing sent or read while one of them is in front, and the person's key presses while one of them is in front never stop control ([section 5](#5-what-the-module-needs-from-the-base)).
The watch judges the person's key presses by the process whose window was in front at the key event, which Windows' keyboard hook reads as the key comes in and reports with it: a process `context.appWindows.list()` gives leaves control running, while another process, no window, an empty list, or keys that went to more than one process before the report reached the module stops it. The person's pointer input stops control whatever is in front, since the hook doesn't report the window it went to; the monitor's deadline and the base's stop key stop it whatever is in front. macOS reports only the pointer.
It watches for the person only while a tool sends input, so between calls nothing the person does stops control either.
A granted app's window comes to the front through the person, since no tool brings a window forward.
It never watches while a call waits for its turn or for a permission answer, or between calls, with one exception: a list of actions is watched from its first action to the end of its last, across the requests between them, which the center answers from what it remembers ([Lists of actions](#lists-of-actions)).
Switching the module off ends the watch only once a start in progress has landed and stopped, so a start that lands late never stops the monitor under the watch of the module switched on again, which keeps the same backend ([Border](#border)).

Each platform adds its own signal of the person's input:
- **Windows:** a low-level input hook in the module's addon also stops control on physical key presses and pointer moves, telling them apart from sent input by their injected flag.
  The hook runs only while a tool sends input, or across a whole list of actions.
  The hook's thread only flags the event and posts it to the runtime, since Windows silently removes a hook that answers later than its timeout.
  The hook sends a heartbeat.
  A hook that can't start fails the input as `Unavailable` with nothing sent, and a hook that didn't stop fails every later start, since it may still run.
  Other software's synthetic input, such as a remote-desktop session's, also carries the injected flag and doesn't stop control.
- **macOS:** the pointer only, so the person's key presses don't stop control there, but their pointer moves do.
  A key hook needs the Input Monitoring grant, which the module doesn't ask for.
  Besides the pointer's position, the input process reads the window server's counts of the pointer's events that entered at the HID level: presses, releases, moves, drags and scrolls of every button.
  They need no grant, and count every HID source alike: a person's hand, and any process's events posted at the HID tap, the module's own among them, but neither a warp of the pointer nor events posted at the session tap.
  The process counts its own posts from the watch's start, so a count above them stops control, even for a move the glide's next move overwrote before any check read the pointer: a move during a check's reads of the windows was lost that way, in 18 of 120 tries on macOS 15.
  The window server counts a post up to a moment after it, a process's first one 15 to 21 ms after it on macOS 15, and the person's move counted meanwhile would leave the count at the process's own. So a check that follows the process's own posts first posts a null event, which no pointer count includes, and waits, 100 ms at most, until the window server has counted it: the window server counts events in the order they come, as each of 200 null events posted just after a move showed on macOS 15, so the process's own posts are counted by then, and the count must equal them. A null event still uncounted stops control too, and another process's null event counted during that wait would end it early.
  A person's move within about 40 ms of a move of the module's isn't seen: the window server may merge the two and count them once, and on macOS 15, in 2 of 70 runs, a hand's move 35 and 43 ms after the module's was never counted.
  The merged move ends at one of the two points: the module's own, where its input was aimed, or the person's, which the pointer check refuses; and the person's next move stops control as before.
  Seeing every such move would take an event tap that tells the person's events from the module's, which the module doesn't open, so it asks for no further grant.
  So another process's pointer events posted at the HID tap stop control too, unlike other software's synthetic input on Windows.
  The system's idle time can't tell the person from the module either: on macOS 15 every key and move posted at the HID tap reset it, and at the session tap a third of them still did, 8 of 24 in each of two runs, while 20 seconds with nothing posted left it untouched.
- **Linux on X11, planned and not built yet:** the module would stop control by pointer polling only.

If the monitor stops responding, control stops: the watch arms one deadline of three heartbeat intervals (`missedBeatsToStop`) as it starts and re-arms it on each heartbeat, so a monitor silent that long stops control, through the base's `stopAll` as the person's input does.
A monitor that didn't stop fails the next watch's start, which reports it.
Each monitor run has its own number, so a late post from an earlier run reaches no listener.
Stopping cancels the action in progress between steps and releases held buttons and keys; the base withdraws pending permission requests and fails each later call as `Stopped` until the person resumes.
It depends on neither the agent nor the MCP connection.

### Border

While a session controls the screen, a border 0.25rem wide shows along the edges of every display, so the person sees at a glance that an agent uses the computer.
It hides when control stops or ends, and when the module is switched off.
The person's setting `computer-use.showBorder`, on by default, turns it off; the app shows it among the module's settings.
- **Colour:** the app's accent.
  The app calls `computer-use.borderColorSet` with `{ "color": "#RRGGBB" }` when computer use starts and when its theme changes.
  Switched on again, the module has a new runtime part, which starts in the kit's accent until the app sends its colour again, as it does once it sees the module come back as an optional dependency.
  Until the app sends one, the border has the kit's accent: the build reads `--nol-accent` from the first `:root` block of the `styles/theme.css` of `@noldova/ui.components.angular`, the installed kit's token source, into the runtime package's `generated/kit-accent.json`, and fails when that block sets none, so the module holds no second copy of the token.
  If that file can't be read, which only a broken install gives, the border has #005FB8 until the app sends its colour, the module's log says why, and computer use still turns on.
- **Size:** 0.25rem is 4 CSS pixels, as the UI standard counts widths, in each display's own units: physical pixels on Windows, so a display at a scale of 1.5 has a border 6 pixels wide, and points on macOS.
- **Windows:** four windows along each display's edges, never one over a display's middle, which take no click, no key and no focus, and stay out of the taskbar, the Dock and the window switcher.
- **Following the displays:** while it shows, the runtime shows it again every second over the displays as they are then, so it follows a display that was added, removed, moved or rescaled.
  The backend only brings a border with the same frames and colour back to the front, so a later topmost window doesn't stay over it, and it shows again after the macOS input process restarts.
  A show or hide that fails goes to the module's log, and the next check tries again.
  As the module is switched off or deactivates, it tries a hide that fails up to three times, a second apart, and then stops trying: what is left goes with the input process on macOS, which the base stops once the part deactivates, and with the runtime's process on Windows.
  Switched on again, the module has a new runtime part with a new backend, whose border shows nothing until a session controls the screen.
- **The agent's screenshots leave it out:** each backend's own window lists leave out the border's windows by their identity, so a screenshot never captures them, never counts them in front of a granted window, and the target check never finds them under a point.
  Every other capture, such as a recording or a screen share, shows the border: it is a signal to people, and that includes anyone watching one.

The backends draw it this way:
- On Windows, the addon draws it on a thread of its own, in the per-monitor DPI context, with layered windows that are transparent to input, tool windows that never activate, and topmost.
  The window list leaves out every window of that thread, and the target check's `WindowFromPoint` passes through them, as through any layered window that is transparent to input.
- On macOS, the input process draws it with borderless windows at the screen saver's window level, on every Space and beside a full-screen window, that ignore the pointer; its policy keeps it out of the Dock and the app switcher.
  The process waits in a read, not in a run loop, so it draws each window and commits the drawing as it shows it.
  Its window lists leave out those windows by their window numbers.
- On Linux, which the module doesn't support yet, X11 allows the same with override-redirect windows above the others, which the window manager neither lists nor focuses, and an input shape that passes the pointer through.
  Wayland lets a client place a window at a display's edge above the others only through a layer-shell protocol, which KDE and wlroots compositors offer and GNOME doesn't, so there the border would need a GNOME Shell extension or wouldn't show.

## 5. What the module needs from the base

The runtime part builds on Noldova Desktop's published runtime package, `@noldova/desktop.runtime`: its context, its tool registry and its permission center.
Its tests run the tools in the base's own registry and center, with Noldova Desktop's own fakes for the parts' contexts, and doubles only of the module's own backend interfaces and of the person who answers ([TESTING.md](TESTING.md#package-tests)).
Where each need stands:

| Need | Where the base stands |
|---|---|
| The runtime part's context and activation, and starting a program through that context | **Met**, published: `osascript` and `screencapture` start through the context's `startProcessAsync`. |
| A file the module hands another program, kept outside a packaged app's archive | **Met**: `noldovaDesktop.unpacked` and `PackagedPath.unpacked`, for the macOS input process's script. |
| The tool registry, with the tools listed in `module.json` | **Met**, published. |
| The permission center, with a subject and the conversation's scope on each request, remembered under both | **Met**, published. |
| A request answered only from what is remembered | **Met**: `isRememberedOnly`. |
| A descriptor field that declares a tool non-resumable | **Met**: `isResumable`, with `marksSending` and `nextTool`. |
| `Cancelled`, `Stopped` and `OutcomeUncertain` as shared failure codes, the last naming the read tool to call next | **Met**: the base's failure codes and `nextTool`. |
| Numeric output limits in the descriptor for image results | **Met**: `limits` gives the image's bytes, long edge and pixels. |
| Registry events with no call in flight | **Met** for a session's end, stop and resume. **Missing** for one tool switched off; turning the preview setting off withdraws all of the module's tools. |
| Running work the person can stop from the tray and menu bar, methods the window part calls, events it receives, and a stop key | **Met**: work items, methods, events, and `desktop.stopAgentControl` with its system-wide key; the base shows Resume above the module's views. |
| The preview setting, off by default, with nothing active while it is off | **Met** through Noldova Desktop's switch setting. `module.json` names `computer-use.enabled` as its `switchSetting`, so the base keeps the module off, with no part active, no tool and no backend, until the person turns the setting on. It deactivates the module when they turn it off, builds a new runtime part when they turn it on again, and shows the setting meanwhile. |
| A module that runs only on some platforms shown as unavailable on the others | **Met**: `module.json` names `"platforms": ["windows", "macos"]`, so on Linux Noldova Desktop shows the module as unavailable, with its cause, offers no switch, and never activates it. Only `platforms` keeps the module off there: the runtime part picks the Windows backend on Windows and the macOS one on any other platform, and has no Linux failure of its own. |
| The app's own shortcuts, among them the stop key, as key chords, so `computer_key` never sends them | **Met**: `context.shortcuts`. `computer_key` refuses every chord `context.shortcuts.list()` gives, read at each call, so it follows the list's changes ([Tools](#tools)). |
| The app's own windows, with their process IDs, so the module leaves them alone | **Met**: `context.appWindows`. `AppWindowGuard` wraps the window backend for the input tools and the window read, and refuses, with nothing sent or read, while the window in front belongs to one of the processes `context.appWindows.list()` gives, read at each call. The input watch ignores the person's key presses while one of those windows is in front, and the module watches only while a tool sends input, or across a whole list of actions, so between the agent's actions the person's input into the app's windows never stops control, and while one sends only their pointer input does ([Stop and resume](#stop-and-resume)). |
| On macOS, the app, never a terminal, is the responsible process for the runtime, so grants go to the app | **Met**: the base starts the runtime as its own responsible process, the app's executable, also when a terminal started the app. |
| A module from installed packages joins an app's list of modules, and its declaration is checked | **Met**: Noldova Desktop's build reads the app's `desktop.modules` list and checks each listed package's `module.json`, which the module's own package holds. |
| The module's Windows addon is built for each target and left unpacked in the packaged app | **Partly met**: the organization's shared release builds each addon a package lists, for every target, on GitHub-hosted runners for a public repository; packaging the app is Noldova Desktop's, still to come. |
| A status bar item for the session's status, and a command for the stop control | **Met**: Noldova Desktop's window package, `@noldova/desktop.window`, registers both. A status bar item runs only a command of its own module or its dependencies, so the item runs the module's `computer-use.stopControl`, which stops through the runtime part, rather than `desktop.stopAgentControl`. The window part implements Noldova Desktop's `IWindowPart` and builds its command and item with `@noldova/desktop.window`'s own classes, `CommandContribution`, `StatusBarItemContribution` and `StatusBarItemState`, and the module package's `./window` gives a `ComputerUseWindowPart`. |

The published registry differs from what section 4 asked for in ways the module lives with, and these are asks of the base:
- **Nothing sent after the point of no return.**
  An input tool marks that point before its glide and its input, and the backend checks the target in the same step as the input, so a refusal there, or a target that changed after the glide, comes back as `OutcomeUncertain` though nothing was sent.
  A way for the handler to say that nothing was sent would give the agent `Stale` or `Refused` there.
- **The module's own messages for an ended call.**
  The registry settles a cancelled, stopped or timed-out call with its own message before the handler returns, so the module's messages for those, which say whether a step was sent, are never seen.

## 6. Missing decisions

1. **The operating-system backends.**
   The proposal for the preview:
   - **Windows:** one C addon on Node-API 8, `src/native/windows-desktop.c`, built for each Windows target, capturing each window through `PrintWindow` and sending input through `SendInput`.
     Windows needs no grant; the target check refuses an elevated window with that reason ([section 4](#target-check)).
   - **Keys, on both systems:** a key press names the editing and navigation keys, F1 to F12, the letters and the digits, with Shift, Control, Alt and Meta.
     Text, punctuation included, goes through typing; punctuation keys, Insert and the numpad keys come later.
   - **macOS:** no native code, no entitlements and no Info.plist keys.
     Input goes through one long-lived `osascript -l JavaScript` process that posts Core Graphics events, and the capture of each window through the system's `screencapture` program.
     The process runs `jxa/mac-desktop.js`, which the build compiles from the runtime's `src/jxa/mac-desktop.ts`, typed against the runtime's models of its answers and the bridge's globals that `src/jxa/jxa-bridge.d.ts` declares.
     macOS runs it as a classic script with no imports, so it can't read the runtime's `Resources`, and keeps its own texts and numbers in a `Resources` class at its top; its errors reach the runtime as text only ([Failures](#failures)).
     `osascript` runs it as a child of the runtime, so macOS checks the runtime's responsible process for its grants; it reads one JSON request a line, answers each with one line, and checks the target and sends the input in one step.
     The runtime starts it on the first call that needs it; the module needs no entitlement and no Info.plist key, since neither it nor `screencapture` is native code of the module's.
     The runtime package lists the script under `noldovaDesktop.unpacked`, so a packaged app keeps a copy of it outside its `app.asar` archive, which `osascript` can't read, and the module runs that copy through `PackagedPath.unpacked`.
     Before each capture and each input, the module checks the Screen Recording grant through Core Graphics and the Accessibility grant through the Accessibility API.
     It refuses a capture that would show only the desktop picture, and input that macOS would drop.
     It drives no app through Apple Events, so it needs no Automation grant.
   - **Linux, X11:** after Windows and macOS; how it captures and sends input is decided then, and a new external package is a decision for the repository's maintainers.
   - **Linux, Wayland:** not supported in the preview.
     The plan, not built yet, is that the module detects a Wayland session and reports that it can't capture or drive native windows, rather than returning a black or partial image.
2. **The responsible process on macOS.**
   macOS gives a grant to the responsible process, and a runtime that a terminal starts would make the terminal responsible.
   Decided: `osascript` and `screencapture` run as children of the runtime, with no native code and no disclaiming, so macOS checks the grants of the runtime's responsible process, which Noldova Desktop makes the runtime itself, the app's executable, however the app started.
   Before each capture and each input, the backend checks the grants and refuses, naming the missing one: `DesktopOnlyCapture` for Screen Recording, `MissingGrant` for Accessibility.
   The base decides how it starts the runtime so the app is responsible ([section 5](#5-what-the-module-needs-from-the-base)).
3. **A stable signature for macOS development builds.**
   macOS ties a grant for ad-hoc signed code to its code hash.
   The tests give the grants to the process that starts the development app, so a rebuild of the app keeps them.
   A stable signing identity is needed only if the probe in [TESTING.md](TESTING.md#7-open-decisions) finds that responsible binary unstable.
   With this setup, the tests with grants prove capture and input but not the app's own responsible-process chain, which stays a check by a person.
   It concerns the app's signing, not the base.
4. **Reading a window's controls** ([Reading a window](#reading-a-window)).
   The design:
   - **Windows:** UI Automation's COM client in the existing C addon, from the Windows SDK's headers and the system's `ole32` and `oleaut32` libraries; no new package.
   - **macOS:** no native code: the Accessibility API through the input process, as for the password-field check today, and no new grant.
   - **Chromium and Electron apps on Windows:** the UI Automation client itself turns on full accessibility mode in each such app it reads, which then keeps its accessibility tree up to date for as long as it runs, costing it memory and speed; the other way is to leave their windows unread, as on macOS, and read them from screenshots.
   - **Electron apps and Chrome on macOS:** the module sets neither `AXManualAccessibility` nor `AXEnhancedUserInterface`, which would let it read them but change how they run, such as Chrome's window animations and placement; the agent reads them from screenshots.
   - **Acting on a control:** always real input at the control's point, never the platform's own actions on it.

## 7. How an app uses it

- The app lists the module's own package in its `desktop.modules`, as `{ "id": "computer-use", "package": "@noldova/computer-use" }`, installs it at one exact version, and ships the runtime package's addon build for each target.
  The module package depends only on the two part packages, and takes Noldova Desktop's runtime and protocol packages as peers, which the app's root install holds.
  Its `./window` gives the window part, a `ComputerUseWindowPart`, and imports only the window part's package; Noldova Desktop's build resolves `./window`'s imports in the window workspace, which always holds Noldova Desktop's own window package.
  The module package names no peer on Noldova Desktop's window package: npm installs a module package's peer on that package at the app's root, optional or not, where its exact Angular peers clash with the newest Angular 22 that `@angular/cdk`'s ranges take, so the app's install fails with ERESOLVE, and Noldova Desktop's build refuses an app whose root install holds Angular.
  The part packages are named `@noldova/computer-use.<part>`, and the window part carries the name Noldova Desktop gives a module's window package, `@noldova/computer-use.window`.
  Noldova Desktop requires that package to be an Angular package, so it takes `@angular/core` and Noldova Desktop's window package, `@noldova/desktop.window`, whose classes it builds its command and status bar item with, as optional peers, and imports no Angular itself: Angular as `>=22.2.6 <23.0.0`, from the version Noldova Desktop's window package pins to the next Angular major, since only a new Angular major may break a module, and Noldova Desktop's window package in the module's `noldovaDesktop` range, each of which must hold the version the app's window workspace has.
  Noldova Desktop 0.0.1, the first published on npm as the `@noldova/desktop.*` packages, takes an Angular range in its build, so `noldovaDesktop` starts there.
  Noldova Desktop's build installs into that workspace the packages the module package's `./window` imports, so the app adds nothing there for the module.
- It offers the module behind a preview setting, `computer-use.enabled`, off by default: its switch setting, which Noldova Desktop turns the module on and off with ([section 5](#5-what-the-module-needs-from-the-base)). While the setting is off, the module offers no tool and reaches no operating-system call.
- It hosts the one MCP server its agents reach, and offers them the tools the module registers in the base's tool registry.
- It sends its theme's accent colour for the border with `computer-use.borderColorSet` when computer use starts and when its theme changes ([Border](#border)).
- It answers the module's permission requests with its own permission card and policy, and lets the person list and revoke remembered grants in its settings.
- Its policy may deny apps, but it never changes a tool's risk level, an app's tier or the never-grantable list.
- On macOS the person gives Screen Recording and Accessibility to the app, since Noldova Desktop starts the runtime as its own responsible process, the app's executable, also when a terminal started the app.

## 8. Two forms

Computer use is one module, `computer-use`, delivered in two forms from this repository.

| Form | What it is | Who gives the identity and the agents |
|---|---|---|
| The module | The module's own package, `@noldova/computer-use`, with the module's declaration, and the part packages of [section 2](#2-parts), which an app on Noldova Desktop lists among its modules | The app that includes it |
| The app form | An app on Noldova Desktop whose only module is `computer-use`, built, packaged and released from this repository | This repository's root `package.json`, under `desktop` |

- Both forms run the same packages; the app form adds no code to the module, and the module never knows which form it runs in.
- The module declares itself in `module.json` with the fields Noldova Desktop's module contract sets: `id` is `computer-use`, its `parts` are `runtime` and `window`, and it has no module dependencies.
- The app form is an app as [section 7](#7-how-an-app-uses-it) describes: it hosts the MCP server its agents reach, answers the module's permission requests, ships the module's addon builds, and on macOS is the process the person grants Screen Recording and Accessibility to.
- The app form's root `package.json` gives the app's identity and lists `computer-use` as its one module, as Noldova Desktop's build reads them.
  **Not yet:** the root `package.json` has no `desktop` section; the app's name and identity aren't chosen yet, and the app needs Noldova Desktop's packages and app tooling published.
- An app that includes the module installs the module's published packages at one version.
  **Not yet:** no app includes the module yet.
- Each part's package holds its sources compiled to JavaScript with source maps, its handwritten declarations as its types, the scripts it loads and its addon builds for every target.
  The module's own package holds `module.json`, `settings.json`, and its `api`, which gives the parts, compiled the same way.
  `npm run build` packs them into `_packages`, and `release-npm.yml` publishes them through the organization's shared npm release.
