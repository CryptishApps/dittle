import { doc, serverTimestamp, updateDoc } from "firebase/firestore";
import type { CalculatedColumn } from "@/features/notes/fact";
import { db } from "@/lib/firestore";

export async function saveColumns(uid: string, collectionId: string, columns: CalculatedColumn[]): Promise<void> {
  await updateDoc(doc(db, "users", uid, "collections", collectionId), { columns, updatedAt: serverTimestamp() });
}
