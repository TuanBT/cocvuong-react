import firebase from 'firebase';

//Dev
const config = {
  apiKey: "AIzaSyDN_BFuEJOqHqNzQN1w1v-6hWRDIeNgf9I",
  authDomain: "fvc-score.firebaseapp.com",
  databaseURL: "https://fvc-score.firebaseio.com",
  projectId: "fvc-score",
  storageBucket: "fvc-score.appspot.com",
  messagingSenderId: "1052570611922",
  appId: "1:1052570611922:web:d80a668f5fe7e251d5bd0b"
};

//Prod
// const config = {
//   apiKey: "AIzaSyAYhgRYFeTWBjYZhQ0qlFsx16XAq4xae24-6hWRDIeNgf9I",
//   authDomain: "cocvuong-se60824.firebaseapp.com",
//   databaseURL: "https://cocvuong-se60824-default-rtdb.asia-southeast1.firebasedatabase.app",
//   projectId: "cocvuong-se60824",
//   storageBucket: "cocvuong-se60824.appspot.com",
//   messagingSenderId: "18642638149",
//   appId: "1:18642638149:web:1695a62cd7947249619a2c"
// };

firebase.initializeApp(config);

export default firebase;

export const database = firebase.database();
export const auth = firebase.auth();
export const storage = firebase.storage();
export const googleAuthProvider = new firebase.auth.GoogleAuthProvider();
export const messaging = firebase.messaging();