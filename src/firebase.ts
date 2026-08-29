import { initializeApp, FirebaseApp } from 'firebase/app';
import { getDatabase, Database } from 'firebase/database';
import { getAuth, Auth, setPersistence, browserLocalPersistence } from 'firebase/auth';

// Firebase configuration
const firebaseConfig = {
  apiKey: process.env.REACT_APP_FIREBASE_API_KEY,
  authDomain: process.env.REACT_APP_FIREBASE_AUTH_DOMAIN,
  databaseURL: process.env.REACT_APP_FIREBASE_DATABASE_URL,
  projectId: process.env.REACT_APP_FIREBASE_PROJECT_ID,
  storageBucket: process.env.REACT_APP_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.REACT_APP_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.REACT_APP_FIREBASE_APP_ID
};

// Initialize Firebase
const app: FirebaseApp = initializeApp(firebaseConfig);
const database: Database = getDatabase(app);
const auth: Auth = getAuth(app);

/**
 * Phien dang nhap phai song qua reload VA qua lan mo app sau.
 *
 * Quan trong voi hai nhom: giam sat dung laptop dung chung (mo lai la vao
 * thang dung san), va giam dinh ky an danh ngam - mat phien la uid doi, ma
 * da claim se bao "da co nguoi dung".
 *
 * Trinh duyet chan storage (che do rieng tu, cookie bi khoa) thi lenh nay
 * that bai; khong chan duong chay tiep - app van dung duoc trong mot phien.
 */
setPersistence(auth, browserLocalPersistence).catch(() => {
  /* trinh duyet khong cho luu - chap nhan phien tam thoi */
});

export { database, auth };
export default app;
