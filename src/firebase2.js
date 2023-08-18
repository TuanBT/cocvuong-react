import { initializeApp } from "firebase/app";
import { getDatabase } from "firebase/database";

function Firebase2() {
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

  // Initialize Firebase
  const app2 = initializeApp(firebaseConfig);
  // Initialize Realtime Database and get a reference to the service
  return getDatabase(app2);
}

export default Firebase2;