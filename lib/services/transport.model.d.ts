import { Socket } from "socket.io-client";
import { ClientToServerEvents, ServerToClientEvents } from "./transport.type";
import { WASocket } from "baileys";
import { Logger } from "pino";
export declare const useVoiceCallsBaileys: (wavoip_token: string, baileys_sock: WASocket, logger?: Logger) => Promise<Socket<ServerToClientEvents, ClientToServerEvents>>;
