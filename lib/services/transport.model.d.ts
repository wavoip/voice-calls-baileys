import { Socket } from "socket.io-client";
import { ClientToServerEvents, ServerToClientEvents } from "./transport.type";
import { WAConnectionState, WASocket } from "baileys";
import { Logger } from "pino";
export declare const useVoiceCallsBaileys: (wavoip_token: string, baileys_sock: WASocket, status?: WAConnectionState, logger?: Logger) => Promise<Socket<ServerToClientEvents, ClientToServerEvents>>;
