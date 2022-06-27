import firebase from 'firebase';

const config = {
  apiKey: "AIzaSyDN_BFuEJOqHqNzQN1w1v-6hWRDIeNgf9I",
  authDomain: "fvc-score.firebaseapp.com",
  databaseURL: "https://fvc-score.firebaseio.com",
  projectId: "fvc-score",
  storageBucket: "fvc-score.appspot.com",
  messagingSenderId: "1052570611922",
  appId: "1:1052570611922:web:d80a668f5fe7e251d5bd0b"
};

firebase.initializeApp(config);

export default firebase;

export const database = firebase.database();
export const auth = firebase.auth();
export const storage = firebase.storage();
export const googleAuthProvider = new firebase.auth.GoogleAuthProvider();
export const messaging = firebase.messaging();