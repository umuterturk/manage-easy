import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, connectAuthEmulator } from 'firebase/auth';

// Firebase configuration for manage-easy project
const firebaseConfig = {
  apiKey: "AIzaSyAVUayNBidD1uNFT5r8VpeU4rgiLnxJpG8",
  authDomain: "manage-easy-1768423759.firebaseapp.com",
  projectId: "manage-easy-1768423759",
  storageBucket: "manage-easy-1768423759.firebasestorage.app",
  messagingSenderId: "583952897021",
  appId: "1:583952897021:web:e693f9ede2a0920ad57f94"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firebase Auth
const auth = getAuth(app);

// Initialize Google Auth Provider
const googleProvider = new GoogleAuthProvider();

// Connect to emulator in development mode
// Commented out until emulators are properly configured
// if (import.meta.env.DEV) {
//   try {
//     connectAuthEmulator(auth, 'http://127.0.0.1:9099', { disableWarnings: true });
//   } catch (error) {
//     // Already connected, ignore
//   }
// }

export { auth, googleProvider };
export default app;
