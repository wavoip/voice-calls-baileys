import { WAConnectionState, JidWithDevice, Contact, BinaryNode, proto } from "baileys";

export interface ServerToClientEvents {
  withAck: (d: string, callback: (e: number) => void) => void;
  onWhatsApp: onWhatsAppType;
  profilePictureUrl: ProfilePictureUrlType;
  assertSessions: AssertSessionsType;
  createParticipantNodes: CreateParticipantNodesType;
  getUSyncDevices: GetUSyncDevicesType;
  generateMessageTag: GenerateMessageTagType;
  sendNode: SendNodeType;
  "signalRepository:decryptMessage": SignalRepositoryDecryptMessageType;
}

export interface ClientToServerEvents {
  "init": (me: Contact | undefined, account: proto.IADVSignedDeviceIdentity | undefined, status: WAConnectionState, softwareBase: string) => void;
  "CB:call": (packet: any) => void;
  "CB:ack,class:call": (packet: any) => void;
  "connection.update:status": (me: Contact | undefined, account: proto.IADVSignedDeviceIdentity | undefined, status: WAConnectionState) => void;
  "connection.update:qr": (qr: string) => void;
}

export type FailedResponseType = {wavoipStatus: string, result: any};

export type onWhatsAppType = (jid: string, callback: onWhatsAppCallback) => void;
export type onWhatsAppCallback = (response: {
  exists: boolean;
  jid: string;
}[] | FailedResponseType | undefined) => void;

export type ProfilePictureUrlType = (jid: string, type: "image" | "preview", timeoutMs: number | undefined, callback: ProfilePictureUrlCallback) => void;
export type ProfilePictureUrlCallback = (response: string | FailedResponseType | undefined) => void;

export type AssertSessionsType = (jids: string[], force: boolean, callback: AssertSessionsCallback) => void;
export type  AssertSessionsCallback = (response: boolean | FailedResponseType) => void;

export type CreateParticipantNodesType = (jids: string[], message: any, extraAttrs: any, callback: CreateParticipantNodesCallback) => void;
export type CreateParticipantNodesCallback = {
  (nodes: any, shouldIncludeDeviceIdentity: boolean): void;
  (response: FailedResponseType): void;
}

export type GetUSyncDevicesType = (jids: string[], useCache: boolean, ignoreZeroDevices: boolean, callback: GetUSyncDevicesTypeCallback) => void
export type GetUSyncDevicesTypeCallback = (jids: JidWithDevice[] | FailedResponseType) => void;

export type GenerateMessageTagType = (callback: GenerateMessageTagTypeCallback) => void
export type GenerateMessageTagTypeCallback = (response: string | FailedResponseType) => void;

export type SendNodeType = (stanza: BinaryNode, callback: SendNodeTypeCallback) => void
export type SendNodeTypeCallback = (response: boolean | FailedResponseType) => void;

export type SignalRepositoryDecryptMessageType = (jid: string, type: "pkmsg" | "msg", ciphertext: Buffer, callback: SignalRepositoryDecryptMessageCallback) => void
export type SignalRepositoryDecryptMessageCallback = (response: Uint8Array | FailedResponseType) => void;
