import "./shared/styles/global.css";
import { renderHomeScreen } from "./features/homeScreen/renderHomeScreen";

const appRoot = document.querySelector<HTMLDivElement>("#app");

if (!appRoot) {
  throw new Error("App root element was not found");
}

renderHomeScreen(appRoot);
