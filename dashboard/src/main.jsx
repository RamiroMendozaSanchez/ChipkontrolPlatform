import React from "react";
import ReactDOM from "react-dom/client";
import { Toaster } from "react-hot-toast";

import App from "./App";
import "./styles.css";

ReactDOM.createRoot(
  document.getElementById("root")
).render(
  <>
    <Toaster
      position="top-right"
      toastOptions={{
        duration: 3000,
        style: {
          background: "#111827",
          color: "#fff",
          border: "1px solid #1f2937",
          borderRadius: "12px",
        },
      }}
    />

    <App />
  </>
);