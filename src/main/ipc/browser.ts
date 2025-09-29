import { ipcMain, shell } from "electron";
import {
    getChromeInstallation,
    launchChrome,
    openChromeDownloadPage,
} from "../browser";

function initBrowserIPC() {
    ipcMain.handle("browser:check-chrome", async () => {
        return getChromeInstallation();
    });

    ipcMain.handle(
        "browser:launch-chrome",
        async (
            _event,
            payload: { url?: string; sessionId?: string } | string,
        ) => {
            const targetUrl =
                typeof payload === "string" ? payload : payload?.url ?? "";

            if (!targetUrl) {
                return { installed: false, path: null };
            }

            const sessionId =
                typeof payload === "string" ? undefined : payload?.sessionId;

            return launchChrome(targetUrl, { sessionId });
        },
    );

    ipcMain.handle("browser:install-chrome", async () => {
        openChromeDownloadPage();
        return true;
    });

    ipcMain.handle("browser:open-external", async (_event, url?: string) => {
        if (!url) {
            return false;
        }

        await shell.openExternal(url);
        return true;
    });
}

export default initBrowserIPC;
