import { ipcMain } from "electron";
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
        async (_event, payload: { url?: string } | string) => {
            const targetUrl =
                typeof payload === "string" ? payload : payload?.url ?? "";

            if (!targetUrl) {
                return { installed: false, path: null };
            }

            return launchChrome(targetUrl);
        },
    );

    ipcMain.handle("browser:install-chrome", async () => {
        openChromeDownloadPage();
        return true;
    });
}

export default initBrowserIPC;
