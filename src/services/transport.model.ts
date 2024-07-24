import { io, Socket } from "socket.io-client";

import { ClientToServerEvents, ServerToClientEvents } from "./transport.type";

import { ConnectionState, WAConnectionState, WASocket } from "baileys";

import { Logger } from "pino";

let baileys_connection_state: WAConnectionState = "close";

export const useVoiceCallsBaileys = async ( wavoip_token: string, baileys_sock: WASocket, logger?: Logger) => {
  const socket: Socket<ServerToClientEvents, ClientToServerEvents> = io("https://devices.wavoip.com/baileys", {
    transports: ['websocket'],
    path: `/${wavoip_token}/websocket`,
    forceNew: true
  });

  socket.on("connect", () => {
    logger?.debug("[*] - Wavoip connected", socket.id);

    socket.emit("init", baileys_sock.authState.creds.me, baileys_sock.authState.creds.account, baileys_connection_state);
  });
  
  socket.on("disconnect", () => {
    logger?.debug("[*] - Wavoip disconnect");
  });

  socket.on("connect_error", (error) => {
    if (socket.active) {
      logger?.debug("[*] - Wavoip connection error temporary failure, the socket will automatically try to reconnect", error); 
    } else {
      logger?.debug("[*] - Wavoip connection error", error.message); 
    }
  });

  socket.on("onWhatsApp", async (jid, callback) => {
    try {
      const response = await baileys_sock.onWhatsApp(jid);

      callback(response);

      logger?.debug("[*] Success on call onWhatsApp function", response, jid);
    } catch (error) {
      logger?.error("[*] Error on call onWhatsApp function", error);
    }
  });

  socket.on("profilePictureUrl", async (jid, type, timeoutMs, callback) => {
    try {
      const response = await baileys_sock.profilePictureUrl(jid, type, timeoutMs);

      callback(response);

      logger?.debug("[*] Success on call profilePictureUrl function", response);
    } catch (error) {
      logger?.error("[*] Error on call profilePictureUrl function", error);
    }
  });

  socket.on("assertSessions", async (jids, force, callback) => {
    try {
      const response = await baileys_sock.assertSessions(jids, force);

      callback(response);

      logger?.debug("[*] Success on call assertSessions function", response);
    } catch (error) {
      logger?.error("[*] Error on call assertSessions function", error);
    }
  });

  socket.on("createParticipantNodes", async (jids, message, extraAttrs, callback) => {
    try {
      const response = await baileys_sock.createParticipantNodes(jids, message, extraAttrs);

      callback(response);

      logger?.debug("[*] Success on call createParticipantNodes function", response);
    } catch (error) {
      logger?.error("[*] Error on call createParticipantNodes function", error);
    }
  });

  socket.on("getUSyncDevices", async (jids, useCache, ignoreZeroDevices, callback) => {
    try {
      const response = await baileys_sock.getUSyncDevices(jids, useCache, ignoreZeroDevices);

      callback(response);

      logger?.debug("[*] Success on call getUSyncDevices function", response);
    } catch (error) {
      logger?.error("[*] Error on call getUSyncDevices function", error);
    }
  });

  socket.on("generateMessageTag", async (callback) => {
    try {
      const response = await baileys_sock.generateMessageTag();

      callback(response);

      logger?.debug("[*] Success on call generateMessageTag function", response);
    } catch (error) {
      logger?.error("[*] Error on call generateMessageTag function", error);
    }
  });

  socket.on("sendNode", async (stanza, callback) => {
    try {
      const response = await baileys_sock.sendNode(stanza);

      callback(true);

      logger?.debug("[*] Success on call sendNode function", response);
    } catch (error) {
      logger?.error("[*] Error on call sendNode function", error);
    }
  });

  socket.on("signalRepository:decryptMessage", async (jid, type, ciphertext, callback) => {
    try {
      const response = await baileys_sock.signalRepository.decryptMessage({ jid: jid, type: type, ciphertext: ciphertext });

      callback(response);

      logger?.debug("[*] Success on call signalRepository:decryptMessage function", response);
    } catch (error) {
      logger?.error("[*] Error on call signalRepository:decryptMessage function", error);
    }
  });

  // we only use this connection data to inform the webphone that the device is connected and creeds account to generate e2e whatsapp key for make call packets
  baileys_sock.ev.on("connection.update", (update: Partial<ConnectionState>) => {
    const { connection } = update;

    if (connection) {
      baileys_connection_state = connection;
      socket.timeout(5000).emit("connection.update:status", baileys_sock.authState.creds.me, baileys_sock.authState.creds.account, connection);
    }

    if (update.qr) {
      socket.timeout(5000).emit("connection.update:qr", update.qr);
    }
  });

  baileys_sock.ws.on("CB:call", (packet) => {
    logger?.debug("[*] Signling received")
    socket.volatile.timeout(5000).emit("CB:call", packet);
  });

  baileys_sock.ws.on("CB:ack,class:call", (packet) => {
    logger?.debug("[*] Signling ack received")
    socket.volatile.timeout(5000).emit("CB:ack,class:call", packet);
  });

  return socket;
}