import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { App } from "./app";
import "./styles.css";

const root = document.getElementById("root");
if (!root) throw new Error("Missing #root element");

// No StrictMode: the WebGL scenes own their own rAF loops and mount cleanly
// once. Double-mounting in dev would create two renderers per canvas.
createRoot(root).render(
  <BrowserRouter>
    <App />
  </BrowserRouter>
);
