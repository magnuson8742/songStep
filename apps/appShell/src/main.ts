import "./shared/styles/global.css";
import { startApp } from "./app/startApp";

const appRoot = document.querySelector<HTMLDivElement>("#app");

if (!appRoot) {
  throw new Error("App root element was not found");
}

startApp(appRoot);
