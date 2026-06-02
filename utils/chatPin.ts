import {
  DocumentReference,
  deleteField,
  serverTimestamp,
  updateDoc,
} from "firebase/firestore";
import { Message } from "../types";

export type PinnedChatMeta = {
  pinnedMessageId?: string | null;
  pinnedMessagePreview?: string;
  pinnedMessageSenderId?: string;
  pinnedBy?: string;
  pinnedAt?: unknown;
};

export function messagePreview(msg: Pick<Message, "text" | "mediaType" | "fileName">): string {
  const t = msg.text?.trim();
  if (t) return t.length > 120 ? `${t.slice(0, 117)}…` : t;
  if (msg.mediaType === "image") return "📷 Photo";
  if (msg.mediaType === "video") return "🎥 Video";
  if (msg.mediaType === "file") return `📎 ${msg.fileName || "File"}`;
  return "Message";
}

export async function pinChatMessage(
  chatDocRef: DocumentReference,
  message: Pick<Message, "id" | "text" | "mediaType" | "fileName" | "senderId">,
  userId: string
): Promise<void> {
  await updateDoc(chatDocRef, {
    pinnedMessageId: message.id,
    pinnedMessagePreview: messagePreview(message),
    pinnedMessageSenderId: message.senderId,
    pinnedBy: userId,
    pinnedAt: serverTimestamp(),
  });
}

export async function unpinChatMessage(chatDocRef: DocumentReference): Promise<void> {
  await updateDoc(chatDocRef, {
    pinnedMessageId: deleteField(),
    pinnedMessagePreview: deleteField(),
    pinnedMessageSenderId: deleteField(),
    pinnedBy: deleteField(),
    pinnedAt: deleteField(),
  });
}
