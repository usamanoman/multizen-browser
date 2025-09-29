import { BrowserWindow } from "electron";
import initWindowIPC from "./window";
import initBrowserIPC from "./browser";
import initContextMenuIPC from "./context-menu";
import initExtensionsIPC from "./extensions";

function ipcInit(window: BrowserWindow) {
    initWindowIPC(window);
    initBrowserIPC();
    initContextMenuIPC(window);
    initExtensionsIPC();
}

export default ipcInit;
