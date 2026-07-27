# voice-calls-baileys

Bridge that exposes a [Baileys](https://github.com/WhiskeySockets/Baileys) socket to the Wavoip
infrastructure so it can place and receive WhatsApp voice calls.

It opens a `socket.io` connection to `https://devices.wavoip.com/baileys`, relays the call
signaling stanzas (`CB:call` / `CB:ack,class:call`) and answers the RPCs Wavoip needs
(`onWhatsApp`, `profilePictureUrl`, `assertSessions`, `createParticipantNodes`,
`getUSyncDevices`, `generateMessageTag`, `sendNode`, `signalRepository:decryptMessage`).

## Requirements

- `baileys@7.0.0-rc13` (pinned — the bundled patch targets this exact version)

## Install

```bash
npm install voice-calls-baileys baileys@7.0.0-rc13
```

### Baileys patch

> [!WARNING]
> **The Baileys patch is mandatory.** Without it, calls won't get voice through. Always
> confirm the patch was applied (see below) before reporting audio issues.

Voice calls require a patched `validate-connection.js` so Baileys advertises a desktop/UWP
client. The patch lives in `patches/validate-connection.js` and is applied automatically on
`postinstall`. It is version-guarded: if the installed Baileys is not `7.0.0-rc13` it is skipped
with a warning instead of corrupting your install — meaning calls won't get voice through until
you pin Baileys to `7.0.0-rc13` and re-apply the patch.

Confirm it was applied — `postinstall` prints:

```
[voice-calls-baileys] Patched baileys@7.0.0-rc13 (lib\Utils\validate-connection.js).
```

If you see a skip warning instead, calls won't get voice through until you fix the Baileys
version and run `npm run patch-baileys`.

Re-apply manually at any time (e.g. after reinstalling Baileys):

```bash
npm run patch-baileys
```

## Usage

```ts
import makeWASocket, { useMultiFileAuthState, Browsers } from "baileys";
import { useVoiceCallsBaileys } from "voice-calls-baileys";

const { state, saveCreds } = await useMultiFileAuthState("voice_call_baileys");

const sock = makeWASocket({
  auth: state,
  browser: Browsers.windows("UWP"),
  // @ts-expect-error WA accepts the 5-part build id
  version: [2, 3000, 1039498983, 261700, 0],
  markOnlineOnConnect: false,
});

sock.ev.on("creds.update", saveCreds);

useVoiceCallsBaileys(
  "<Your Wavoip Token>",
  sock,
  "<Your Software Name>",
  true, // enable logging
);
```

See `src/demo.ts` for a complete runnable example.
