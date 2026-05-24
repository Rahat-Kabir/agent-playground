import React from "react";
import ReactDOM from "react-dom/client";

import App from "./App";
import { initThemeBeforeRender } from "./lib/theme-init";
import "./styles.css";

initThemeBeforeRender();

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
