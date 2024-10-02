import {
  deleteObject,
  getDownloadURL,
  getStorage,
  listAll,
  ref,
  uploadBytes,
} from "firebase/storage";

import { auth, db } from "../../config/firebase";
import { ChatModel } from "../../models/chat/ChatModel";
import {
  addDoc,
  collection,
  doc,
  getDocs,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
} from "firebase/firestore";
import { formatDateAsString } from "../../utils/helper";

export async function uploadFile(file: File): Promise<string | null> {
  try {
    const storage = getStorage();
    const user = auth.currentUser;
    const fileRef = ref(storage, `uploads/${user!.uid}/${file.name}`);
    await uploadBytes(fileRef, file);
    const downloadUrl = await getDownloadURL(fileRef);
    return downloadUrl;
  } catch (e) {
    return null;
  }
}

export async function getHistory(): Promise<any[] | null> {
  const user = auth.currentUser;

  if (!user) return null;
  try {
    const formattedDate = formatDateAsString();
    const userChatsRef = collection(db, "users", user.uid, "chats");
    const querySnapshot = await getDocs(userChatsRef);

    const chats = await Promise.all(
      querySnapshot.docs
        .filter((doc) => doc.id !== formattedDate)
        .map(async (doc) => {
          const messagesRef = collection(
            db,
            "users",
            user.uid,
            "chats",
            doc.id,
            "messages"
          );

          const messagesQuery = query(messagesRef, orderBy("timestamp"));
          const messagesSnapshot = await getDocs(messagesQuery);

          const heading1 =
            messagesSnapshot.docs.length > 0
              ? messagesSnapshot.docs[0].data().heading1
              : undefined;

          return { [doc.id]: heading1 };
        })
    );

    return chats;
  } catch (e) {
    console.error("Error fetching user chats:", e);
    return null;
  }
}

export async function getFiles(): Promise<string[] | null> {
  try {
    const storage = getStorage();
    const user = auth.currentUser;

    const filesRef = ref(storage, `uploads/${user!.uid}/`);
    const filesList = await listAll(filesRef);

    const fileUrls = await Promise.all(
      filesList.items.map((itemRef) => getDownloadURL(itemRef))
    );

    return fileUrls;
  } catch (e) {
    return null;
  }
}

async function saveInFireStore(
  chatData: ChatModel,
  date: string | undefined
): Promise<boolean> {
  const user = auth.currentUser;

  if (!user) return false;
  try {
    const formattedDate = formatDateAsString();

    const userChatsRef = collection(db, "users", user.uid, "chats");
    const dateDocRef = doc(
      userChatsRef,
      date == undefined ? formattedDate : date
    );

    await setDoc(dateDocRef, {
      timestamp: serverTimestamp(),
    });

    const messagesRef = collection(dateDocRef, "messages");
    const chatDataWithTimestamp = {
      ...chatData,
      timestamp: serverTimestamp(),
    };

    await addDoc(messagesRef, chatDataWithTimestamp);
    return true;
  } catch (e) {
    console.error("Error writing document:", e);
    return false;
  }
}

export async function getChatData(
  date: string | undefined
): Promise<ChatModel[] | []> {
  const user = auth.currentUser;

  if (!user) return [];

  try {
    const formattedDate = formatDateAsString();

    const userChatsRef = collection(db, "users", user.uid, "chats");
    const dateDocRef = doc(
      userChatsRef,
      date == undefined ? formattedDate : date
    );
    const messagesCollectionRef = collection(dateDocRef, "messages");

    const q = query(messagesCollectionRef, orderBy("timestamp", "asc"));

    const querySnapshot = await getDocs(q);

    const messages = querySnapshot.docs.map((doc) => {
      const data = doc.data();

      const chatModel: ChatModel = {
        query: data.query || "",
        heading1: data.heading1 || "",
        heading2: data.heading2 || [],
        key_takeaways: data.key_takeaways || "",
        points: data.points || {},
        example: data.example || [],
        summary: data.summary || "",
      };

      return chatModel;
    });

    return messages;
  } catch (e) {
    console.error("Error fetching messages:", e);
    return [];
  }
}

export async function sendMessage(
  query: string,
  files: string[],
  date: string | undefined
): Promise<ChatModel | null> {
  try {
    const user = auth.currentUser;

    if (!user) {
      return null;
    }

    const response = await fetch("http://localhost:5000/chat", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        query: query,
        files: files,
        userId: user.uid,
      }),
    });
    if (response.ok) {
      const data = await response.json();

      const chatData: ChatModel = {
        query: data.query,
        heading1: data.response.heading1,
        heading2: data.response.heading2,
        key_takeaways: data.response.key_takeaways,
        points: data.response.points,
        example: data.response.example,
        summary: data.response.summary,
      };
      const savedInFireStore = await saveInFireStore(chatData, date);
      if (savedInFireStore) {
        return chatData;
      }
      return null;
    }
    return null;
  } catch (e) {
    return null;
  }
}

export async function deleteFile(fileName: string): Promise<boolean> {
  try {
    const storage = getStorage();
    const user = auth.currentUser;

    if (!user) {
      throw new Error("User not authenticated");
    }

    const fileRef = ref(storage, `uploads/${user.uid}/${fileName}`);
    await deleteObject(fileRef);
    return true;
  } catch (e) {
    console.error("Error deleting file:", e);
    return false;
  }
}
