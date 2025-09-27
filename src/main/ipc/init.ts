import { BrowserWindow } from "electron";
import initWindowIPC from "./window";
import initBrowserIPC from "./browser";

function ipcInit(window: BrowserWindow) {
    initWindowIPC(window);
    initBrowserIPC();
}

export default ipcInit;
