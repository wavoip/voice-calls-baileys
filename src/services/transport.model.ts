import { io, Socket } from "socket.io-client";

import { ClientToServerEvents, ServerToClientEvents } from "./transport.type";

import { ConnectionState, WAConnectionState, WASocket } from "baileys";

let baileys_connection_state: WAConnectionState = "close";

export const useVoiceCallsBaileys = async (
  wavoip_token: string,
  baileys_sock: WASocket,
  softwareBase: string,
  status?: WAConnectionState,
  logger?: boolean
) => {
  const socket: Socket<ServerToClientEvents, ClientToServerEvents> = io(
    "https://devices.wavoip.com/baileys",
    {
      transports: ["websocket"],
      path: `/${wavoip_token}/websocket`
    }
  );

  socket.on("connect", () => {
    if (logger) console.log("[Wavoip] - Connected", socket.id);

    socket.emit(
      "init", 
      baileys_sock.authState.creds.me,
      baileys_sock.authState.creds.account, 
      status ?? "close", 
      softwareBase
    );
  });

  socket.on("disconnect", () => {
    if (logger) console.log("[Wavoip] - Disconnected");
  });

  socket.on("connect_error", (error) => {
    if (logger) console.log("[Wavoip] - Connection lost");
  });

  socket.on("onWhatsApp", (jid, callback) => {
    baileys_sock.onWhatsApp(jid)
      .then((response) => callback(response))
      .catch((error) => {
        callback({wavoipStatus: "error", result: error});
        if (logger) console.log("[Wavoip] - Failed to call onWhatsapp, error: ", error)
      });
  });

  socket.on("profilePictureUrl", async (jid, type, timeoutMs, callback) => {
    baileys_sock.profilePictureUrl(jid, type, timeoutMs)
      .then((response) => callback(response))
      .catch((error) => {
        callback({wavoipStatus: "error", result: error});
        if (logger) console.log("[Wavoip] - Failed to call profilePictureUrl, error: ", error)
      });
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
        if (logger) console.log("[Wavoip] - Failed to call createParticipantNodes, error: ", error)
      });
  });

  socket.on("generateMessageTag", (callback) => callback(baileys_sock.generateMessageTag()));

  socket.on("sendNode", async (stanza, callback) => {
    baileys_sock.sendNode(stanza)
      .then((response) => callback(true))
      .catch((error) => {
        callback({wavoipStatus: "error", result: error});
        if (logger) console.log("[Wavoip] - Failed to call createParticipantNodes, error: ", error)
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

  baileys_sock.ev.on("connection.update", (update: Partial<ConnectionState>) => {
      const { connection } = update;

      if (connection) {
        console.log(connection)
        socket.timeout(1000).emit("connection.update:status", 
          baileys_sock.authState.creds.me,
          baileys_sock.authState.creds.account,
          connection
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
