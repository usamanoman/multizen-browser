import { ipcMain, session, shell } from "electron";
import logger from "electron-log";
import {
    getChromeInstallation,
    launchChrome,
    openChromeDownloadPage,
} from "../browser";
import { DEFAULT_LANGUAGE } from "../../shared/constants";

function initBrowserIPC() {
    ipcMain.handle("browser:check-chrome", async () => {
        return getChromeInstallation();
    });

    ipcMain.handle(
        "browser:launch-chrome",
        async (
            _event,
            payload:
                | { url?: string; sessionId?: string; language?: string }
                | string,
        ) => {
            const targetUrl =
                typeof payload === "string" ? payload : payload?.url ?? "";

            if (!targetUrl) {
                return { installed: false, path: null };
            }

            const sessionId =
                typeof payload === "string" ? undefined : payload?.sessionId;
            const language =
                typeof payload === "string" ? undefined : payload?.language;

            return launchChrome(targetUrl, {
                sessionId,
                language,
            });
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

    ipcMain.handle(
        "browser:configure-session",
        async (
            _event,
            payload?: { sessionId?: string | null; language?: string | null },
        ) => {
            const sessionId = payload?.sessionId ?? null;
            const requestedLanguage =
                typeof payload?.language === "string"
                    ? payload?.language.trim()
                    : "";
            const normalizedLanguage =
                requestedLanguage || DEFAULT_LANGUAGE;

            const partition = sessionId
                ? `persist:chrome-${sessionId}`
                : "persist:chrome-default";

            const targetSession = session.fromPartition(partition, {
                cache: true,
            });

            targetSession.webRequest.onBeforeSendHeaders(null);
            targetSession.webRequest.onBeforeSendHeaders(
                { urls: ["*://*/*"] },
                (details, callback) => {
                    const headers = {
                        ...details.requestHeaders,
                        "Accept-Language": normalizedLanguage,
                    };

                    callback({ cancel: false, requestHeaders: headers });
                },
            );

            try {
                targetSession.setSpellCheckerLanguages([normalizedLanguage]);
            } catch (error) {
                logger.warn("Failed to configure spell checker language", error);
            }

            return true;
        },
    );
}

export default initBrowserIPC;
