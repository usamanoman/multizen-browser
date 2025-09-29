import { BrowserWindow } from "electron";
import initWindowIPC from "./window";
import initBrowserIPC from "./browser";
import initContextMenuIPC from "./context-menu";

function ipcInit(window: BrowserWindow) {
    initWindowIPC(window);
    initBrowserIPC();
    initContextMenuIPC(window);
}

export default ipcInit;
