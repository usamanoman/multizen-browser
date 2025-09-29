import { app, type BrowserWindow } from "electron";
import { join } from "path";
import logger from "electron-log";
import { AUTOMATION_DELAY_MS, runAutomation } from "../../puppetteer/automation";

export function schedulePuppeteerAutomation(window: BrowserWindow): void {
    const scheduleRun = () => {
        const timeout = setTimeout(() => {
            const screenshotPath = join(app.getPath("userData"), "google.png");

            void runAutomation({
                targetUrl: window.webContents.getURL(),
                screenshotPath,
            }).catch((error: unknown) => {
                logger.error("Failed to execute Puppeteer automation:", error);
            });
        }, AUTOMATION_DELAY_MS);

        window.once("closed", () => clearTimeout(timeout));
    };

    if (window.webContents.isLoading()) {
        window.webContents.once("did-finish-load", scheduleRun);
    } else {
        scheduleRun();
    }
}
