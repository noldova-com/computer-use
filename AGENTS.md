# Agent instructions

Noldova owns this repository and makes the final decisions.

## Documents

Read the owner before you work on its subject, and change a rule there.

| When you… | Read |
|---|---|
| explain what the module is or who uses it | [README.md](README.md) |
| change the module's parts, its tools, their risk levels or its boundaries with Noldova Desktop and the app | [documents/ARCHITECTURE.md](documents/ARCHITECTURE.md) |
| write tests or change what the checks cover | [documents/TESTING.md](documents/TESTING.md) |
| write code, tests, styles, documents or commits | the organization's standards, `https://github.com/noldova-com/.github/blob/main/standards/AGENTS.md` |
| prepare or run a release | [README.md, Releases](README.md#releases) |

## Work

- Every pull request names the issue it resolves in this repository, such as `Closes #N`, and passes the checks [README.md](README.md#checks) lists.

## Computer use

- The module names no app: an app adds it, hosts its tools and answers its permission requests ([ARCHITECTURE.md](documents/ARCHITECTURE.md#3-boundaries)).
- It installs Noldova Desktop's packages and `@noldova/ui.components.angular` as published versions; never copy, fork or override their files, and ask for a change through an issue in their repositories.
- It never changes the operating system's privacy or security settings: it reports a missing grant, and the person grants it.
- A test that sends input keeps it inside its own test window, as [TESTING.md](documents/TESTING.md) says.
