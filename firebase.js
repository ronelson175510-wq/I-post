// firebase.js
import { initializeApp } from "firebase/app";

const firebaseConfig = {
  apiKey: "AIzaSyBAnPo7WP5SeFoz-hSKWil6v0tWI1oUeCw",
  authDomain: "my-book-d3907.firebaseapp.com",
  projectId: "my-book-d3907",
  messagingSenderId: "376744576799",
  appId: "1:376744576799:web:f913314bbe68364f8b522a"
};

const app = initializeApp(firebaseConfig);

export { app };
