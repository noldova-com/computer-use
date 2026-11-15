# @noldova/computer-use.protocol

The models the computer use module's runtime and window parts exchange: the session's status, its control state, the status read and stop requests, and the border colour request, with their JSON forms.
A model built from values it refuses throws a subclass of `ProtocolException`; a value that isn't a model's JSON form fails with `JsonException` from [`@noldova/context.json`](https://www.npmjs.com/package/@noldova/context.json), whose path names the model and the field.
It takes `@noldova/context.exceptions` and `@noldova/context.json` as peers.

Both parts of [`@noldova/computer-use`](https://github.com/noldova-com/computer-use/tree/main/src/noldova.computer-use) depend on it, and the module pins it at its own version.
[documents/ARCHITECTURE.md](https://github.com/noldova-com/computer-use/blob/main/documents/ARCHITECTURE.md) says how the parts talk, and the [README](https://github.com/noldova-com/computer-use#readme) how to build and test it.
It is licensed under the [MIT License](https://github.com/noldova-com/computer-use/blob/main/LICENSE).
