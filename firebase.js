// firebase.js
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";

const firebaseConfig = {
  apiKey: "AIzaSyBAnPo7WP5SeFoz-hSKWil6v0tWI1oUeCw",
  authDomain: "my-book-d3907.firebaseapp.com",
  projectId: "my-book-d3907",
  storageBucket: "my-book-d3907.firebasestorage.app",
  messagingSenderId: "376744576799",
  appId: "1:376744576799:web:f913314bbe68364f8b522a",
  measurementId: "G-M8PGSMBP97"
};

const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);

export { app };
