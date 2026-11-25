import { createRoot } from "react-dom/client";
import App from "./App";
import "@fontsource-variable/manrope/index.css";
import "./index.css";
import "./landing.css";
import { lazy, Suspense } from "react";
import { cloudOwner } from "./services/workspace";
const Root = cloudOwner ? lazy(() => import("./CloudApp")) : App;
createRoot(document.getElementById("root")!).render(
  <Suspense fallback={<p role="status">Opening workspace?</p>}>
    <Root />
  </Suspense>,
);
