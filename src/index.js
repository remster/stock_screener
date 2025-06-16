import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import SectorDetailPage from "./SectorDetailPage";

const path = window.location.pathname;

const isSectorPage = path.startsWith("/sector/");
const RootComponent = isSectorPage ? SectorDetailPage : App;

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <RootComponent />
  </React.StrictMode>
);
