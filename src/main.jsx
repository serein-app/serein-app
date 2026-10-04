import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App.jsx";
import "./index.css";

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

// Enregistre le service worker : nécessaire pour que l'appli soit "installable"
// sur téléphone (icône sur l'écran d'accueil, ouverture en plein écran).
if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("/sw.js").catch(() => {
      // Si ça échoue (ex. navigation privée), l'appli continue de fonctionner normalement.
    });
  });
}
