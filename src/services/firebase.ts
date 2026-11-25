import { initializeApp } from "firebase/app";
import {
  getAuth,
  connectAuthEmulator,
  setPersistence,
  browserSessionPersistence,
} from "firebase/auth";
import { getFirestore, connectFirestoreEmulator } from "firebase/firestore";
import { getStorage, connectStorageEmulator } from "firebase/storage";

const emulated = import.meta.env.VITE_FIREBASE_EMULATORS === "true";
const app = initializeApp({
  apiKey: "AIzaSyCHZ962H7hAe40Wu343n-dHFjgH06Vv0ko",
  authDomain: "local-resolve-a9edd.firebaseapp.com",
  projectId: emulated ? "demo-local-resolve" : "local-resolve-a9edd",
  storageBucket: emulated
    ? "demo-local-resolve.appspot.com"
    : "local-resolve-a9edd.firebasestorage.app",
  messagingSenderId: "32109507648",
  appId: "1:32109507648:web:1172e4ceb19320c7de9ba5",
  measurementId: "G-9K998TQJYZ",
});
export const auth = getAuth(app),
  database = getFirestore(app),
  storage = getStorage(app);
if (emulated) {
  connectAuthEmulator(auth, "http://127.0.0.1:9099", { disableWarnings: true });
  connectFirestoreEmulator(database, "127.0.0.1", 8181);
  connectStorageEmulator(storage, "127.0.0.1", 9199);
}
export const authReady = setPersistence(auth, browserSessionPersistence).then(
  () => auth.authStateReady(),
);
