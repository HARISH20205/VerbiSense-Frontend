import { doc, getDoc, setDoc, updateDoc } from "firebase/firestore";
import { auth, db } from "../../config/firebase";
import { AuthUserModel } from "../../models/auth/AuthUserModel";
import {
  AuthCredential,
  EmailAuthProvider,
  GoogleAuthProvider,
  User,
  UserCredential,
  createUserWithEmailAndPassword,
  reauthenticateWithCredential,
  sendEmailVerification,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut,
  updatePassword,
} from "firebase/auth";

export async function logout() {
  try {
    await signOut(auth);
  } catch (e) {}
}

export async function changePassword(
  email: string,
  oldPassword: string,
  newPassword: string
): Promise<User | string> {
  const user = auth.currentUser;
  if (!user) {
    return "User not Authenticated";
  }
  const credential: AuthCredential = EmailAuthProvider.credential(
    email,
    oldPassword
  );
  try {
    await reauthenticateWithCredential(user, credential);
    await updatePassword(user, newPassword);
    return user;
  } catch (e) {
    return "Incorrect current password";
  }
}

export async function updateName(userName: string): Promise<boolean> {
  const user = auth.currentUser;
  if (!user) {
    return false;
  }
  try {
    await updateDoc(doc(db, "users", user.uid), {
      userName: userName,
    });
    return true;
  } catch (e) {
    return false;
  }
}

export async function login(
  email: string,
  password: string
): Promise<UserCredential | null> {
  try {
    const userCrendential = await signInWithEmailAndPassword(
      auth,
      email,
      password
    );
    return userCrendential;
  } catch (e) {
    return null;
  }
}

export async function googleLogin(): Promise<UserCredential | null> {
  try {
    const provider = new GoogleAuthProvider();
    const userCredential = await signInWithPopup(auth, provider);
    const user = userCredential.user;
    await setDoc(doc(db, "users", user.uid), {
      email: user.email,
      userName: user.displayName,
    });
    return userCredential;
  } catch (e) {
    console.error(e);
    return null;
  }
}

export async function signup(
  userName: string,
  email: string,
  password: string
): Promise<UserCredential | null> {
  try {
    const userCredential = await createUserWithEmailAndPassword(
      auth,
      email,
      password
    );
    const user = userCredential.user;
    await sendEmailVerification(user);
    await setDoc(doc(db, "users", user.uid), {
      email: email,
      userName: userName,
    });
    return userCredential;
  } catch (e) {
    return null;
  }
}

export async function getUser(uid: string): Promise<AuthUserModel | null> {
  try {
    const userDoc = await getDoc(doc(db, "users", uid));

    if (userDoc.exists()) {
      const userData = userDoc.data();
      const authUser: AuthUserModel = {
        email: userData.email,
        id: uid,
        userName: userData.userName,
      };
      return authUser;
    }
    return null;
  } catch (e) {
    return null;
  }
}
