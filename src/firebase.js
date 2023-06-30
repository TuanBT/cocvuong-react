import { initializeApp } from "firebase/app";
import { getDatabase } from "firebase/database";

function Firebase() {
  //Dev
  const firebaseConfig = {
    apiKey: "AIzaSyDN_BFuEJOqHqNzQN1w1v-6hWRDIeNgf9I",
    authDomain: "fvc-score.firebaseapp.com",
    databaseURL: "https://fvc-score.firebaseio.com",
    projectId: "fvc-score",
    storageBucket: "fvc-score.appspot.com",
    messagingSenderId: "1052570611922",
    appId: "1:1052570611922:web:d80a668f5fe7e251d5bd0b"
  };

  //Prod
  // const firebaseConfig = {
  //   apiKey: "AIzaSyAYhgRYFeTWBjYZhQ0qlFsx16XAq4xae24-6hWRDIeNgf9I",
  //   authDomain: "cocvuong-se60824.firebaseapp.com",
  //   databaseURL: "https://cocvuong-se60824-default-rtdb.asia-southeast1.firebasedatabase.app",
  //   projectId: "cocvuong-se60824",
  //   storageBucket: "cocvuong-se60824.appspot.com",
  //   messagingSenderId: "18642638149",
  //   appId: "1:18642638149:web:1695a62cd7947249619a2c"
  // };

  // Initialize Firebase
  const app = initializeApp(firebaseConfig);
  // Initialize Realtime Database and get a reference to the service
  return getDatabase(app);
}

export default Firebase;