import { io, Socket } from "socket.io-client";

import { ClientToServerEvents, ServerToClientEvents } from "./transport.type";

import {
  ConnectionState,
  getBinaryNodeChild,
  jidNormalizedUser,
  S_WHATSAPP_NET,
  USyncQuery,
  USyncUser,
  WAConnectionState,
  WASocket
} from "baileys";

export const useVoiceCallsBaileys = async (
  wavoip_token: string,
  baileys_sock: WASocket,
  softwareBase: string,
  logger?: boolean
) => {
  const deriveConnectionState = (): WAConnectionState => {
    if (baileys_sock.ws.isOpen) return "open";
    if (baileys_sock.ws.isConnecting) return "connecting";
    return "close";
  };

  let baileys_connection_state: WAConnectionState = deriveConnectionState();
  let device_info = { isCoex: false, devicesConnected: -1 };

  const extractNumber = (jid: string) => jid.split("@")[0].split(":")[0];

  const refreshDeviceInfo = async () => {
    try {
      const me = baileys_sock.authState.creds.me;
      const wppID = me?.id ?? "";
      const phone = wppID.includes("lid") ? extractNumber(me?.phoneNumber ?? "") : extractNumber(wppID);

      if (!phone) return;

      const devices = await baileys_sock.getUSyncDevices([`${phone}@s.whatsapp.net`], false, false);

      device_info = {
        isCoex: devices.some((device) => device.device === 99),
        devicesConnected: devices.length
      };
    } catch (error) {
      if (logger) console.log("[Wavoip] - Failed to refresh device info, error: ", error);
    }
  };

  const socket: Socket<ServerToClientEvents, ClientToServerEvents> = io(
    "https://devices.wavoip.com/baileys",
    {
      transports: ["websocket"],
      path: `/${wavoip_token}/websocket`
    }
  );

  socket.on("connect", async () => {
    if (logger) console.log("[Wavoip] - Connected", socket.id);

    baileys_connection_state = deriveConnectionState();

    if (baileys_connection_state === "open") await refreshDeviceInfo();

    socket.emit(
      "init",
      baileys_sock.authState.creds.me,
      baileys_sock.authState.creds.account,
      baileys_connection_state,
      softwareBase,
      device_info.isCoex,
      device_info.devicesConnected
    );
  });

  socket.on("disconnect", () => {
    if (logger) console.log("[Wavoip] - Disconnected");
  });

  socket.on("connect_error", (error) => {
    if (logger) console.log("[Wavoip] - Connection lost");
  });

  socket.on("onWhatsApp", async (jid, callback) => {
    try {
      const usyncQuery = new USyncQuery().withContactProtocol().withLIDProtocol();
      const phone = `+${jid.replace("+", "").split("@")[0].split(":")[0]}`;
      usyncQuery.withUser(new USyncUser().withPhone(phone));

      const results = await baileys_sock.executeUSyncQuery(usyncQuery);
      const contacts = (results?.list ?? [])
        .filter((entry) => !!entry.contact)
        .map((entry) => ({ id: entry.id, jid: entry.id, lid: (entry.lid as string | null) ?? null }));

      callback(contacts);
    } catch (error) {
      callback({wavoipStatus: "error", result: error});
      if (logger) console.log("[Wavoip] - Failed to call onWhatsapp, error: ", error)
    }
  });

  socket.on("profilePictureUrl", async (jid, type, timeoutMs, callback) => {
    try {
      const result = await baileys_sock.query({
        tag: "iq",
        attrs: {
          target: jidNormalizedUser(jid),
          to: S_WHATSAPP_NET,
          type: "get",
          xmlns: "w:profile:picture"
        },
        content: [{ tag: "picture", attrs: { type, query: "url" } }]
      }, timeoutMs);

      const picture = getBinaryNodeChild(result, "picture");
      callback(picture?.attrs?.url);
    } catch (error) {
      callback({wavoipStatus: "error", result: error});
      if (logger) console.log("[Wavoip] - Failed to call profilePictureUrl, error: ", error)
    }
  });

  socket.on("assertSessions", async (jids, force, callback) => {
    baileys_sock.assertSessions(jids, force)
      .then((response) => callback(response))
      .catch((error) => {
        callback({wavoipStatus: "error", result: error});
        if (logger) console.log("[Wavoip] - Failed to call assertSessions, error: ", error)
      });
  });

  socket.on("createParticipantNodes", async (jids, message, extraAttrs, callback) => {
    baileys_sock.createParticipantNodes(jids, message, extraAttrs)
      .then((response) => callback(response.nodes, response.shouldIncludeDeviceIdentity))
      .catch((error) => {
        callback({wavoipStatus: "error", result: error});
        if (logger) console.log("[Wavoip] - Failed to call createParticipantNodes, error: ", error)
      });
  });

  socket.on("getUSyncDevices", async (jids, useCache, ignoreZeroDevices, callback) => {
    baileys_sock.getUSyncDevices(jids, useCache, ignoreZeroDevices)
      .then((response) => callback(response))
      .catch((error) => {
        callback({wavoipStatus: "error", result: error});
        if (logger) console.log("[Wavoip] - Failed to call getUSyncDevices, error: ", error)
      });
  });

  socket.on("generateMessageTag", (callback) => callback(baileys_sock.generateMessageTag()));

  socket.on("sendNode", async (stanza, callback) => {
    baileys_sock.sendNode(stanza)
      .then((response) => callback(true))
      .catch((error) => {
        callback({wavoipStatus: "error", result: error});
        if (logger) console.log("[Wavoip] - Failed to call sendNode, error: ", error)
      });
  });

  socket.on("signalRepository:decryptMessage", async (jid, type, ciphertext, callback) => {
    baileys_sock.signalRepository.decryptMessage({jid: jid, type: type, ciphertext: ciphertext})
      .then((response) => callback(response))
      .catch((error) => {
        callback({wavoipStatus: "error", result: error});
        if (logger) console.log("[Wavoip] - Failed to call decryptMessage, error: ", error)
      });
  });

  baileys_sock.ev.on("connection.update", async (update: Partial<ConnectionState>) => {
      const { connection } = update;

      if (connection) {
        baileys_connection_state = connection;
        if (logger) console.log("[Wavoip] - Connection update:", connection)

        if (connection === "open") await refreshDeviceInfo();

        socket.timeout(1000).emit("connection.update:status",
          baileys_sock.authState.creds.me,
          baileys_sock.authState.creds.account,
          connection,
          device_info.isCoex,
          device_info.devicesConnected
        );
      }

      if (update.qr) {
        socket.timeout(1000).emit("connection.update:qr", update.qr);
      }
    }
  );

  baileys_sock.ws.on("CB:call", (packet) => {
    socket.volatile.timeout(1000).emit("CB:call", packet);
  });

  baileys_sock.ws.on("CB:ack,class:call", (packet) => {
    socket.volatile.timeout(1000).emit("CB:ack,class:call", packet);
  });

  return socket;
};
