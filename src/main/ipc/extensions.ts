import { clipboard, ipcMain, session } from "electron";
import type { Cookie } from "electron";
import logger from "electron-log";
import { INSTALLED_EXTENSIONS } from "../../shared/extensions";
import { CHROME_EXTENSION_ID } from "../../shared/constants";

interface ExtensionExecutionRequest {
    id?: string | null;
    partition?: string | null;
    url?: string | null;
}

interface ExtensionExecutionResult {
    success: boolean;
    message: string;
    cookies?: Cookie[];
    copiedText?: string;
}

function resolveSession(partition?: string | null) {
    const normalized = typeof partition === "string" ? partition.trim() : "";

    if (!normalized) {
        return session.defaultSession;
    }

    try {
        return session.fromPartition(normalized, { cache: true });
    } catch (error) {
        logger.warn("Failed to resolve session partition", normalized, error);
        return null;
    }
}

function formatCookiesForClipboard(cookies: Cookie[]): string {
    if (!cookies.length) {
        return "";
    }

    const serialized = cookies.map((cookie) => ({
        name: cookie.name,
        value: cookie.value,
        domain: cookie.domain,
        hostOnly: cookie.hostOnly,
        path: cookie.path,
        secure: cookie.secure,
        httpOnly: cookie.httpOnly,
        sameSite: cookie.sameSite,
        session: cookie.session,
        expirationDate: cookie.expirationDate ?? null,
    }));

    return JSON.stringify(serialized, null, 2);
}

async function executeReachOwlCopyCookies(
    request: ExtensionExecutionRequest,
): Promise<ExtensionExecutionResult> {
    const activeUrl = typeof request.url === "string" ? request.url : "";

    if (!activeUrl) {
        return {
            success: false,
            message: "No active tab URL is available for cookie extraction.",
        };
    }

    let parsedUrl: URL;

    try {
        parsedUrl = new URL(activeUrl);
    } catch (error) {
        logger.warn("Failed to parse active tab URL for cookie extraction", error);
        return {
            success: false,
            message: "The active tab URL is invalid.",
        };
    }

    const targetSession = resolveSession(request.partition);

    if (!targetSession) {
        return {
            success: false,
            message: "Unable to access the browsing session for cookie extraction.",
        };
    }

    let cookies: Cookie[] = [];

    try {
        cookies = await targetSession.cookies.get({ domain: parsedUrl.hostname });
    } catch (error) {
        logger.warn("Failed to read cookies for ReachOwl extension", error);
        return {
            success: false,
            message: "Failed to read cookies for the current site.",
        };
    }

    const clipboardPayload = formatCookiesForClipboard(cookies);

    try {
        clipboard.writeText(clipboardPayload);
    } catch (error) {
        logger.warn("Failed to write cookies to the clipboard", error);
    }

    const message = cookies.length
        ? `Copied ${cookies.length} cookie${cookies.length === 1 ? "" : "s"} to the clipboard.`
        : "No cookies were found for this site.";

    return {
        success: true,
        message,
        cookies,
        copiedText: clipboardPayload,
    };
}

function executeExtension(
    request: ExtensionExecutionRequest,
): Promise<ExtensionExecutionResult> {
    if (request.id === CHROME_EXTENSION_ID) {
        return executeReachOwlCopyCookies(request);
    }

    return Promise.resolve({
        success: false,
        message: "The requested extension is not available.",
    });
}

export default function initExtensionsIPC() {
    ipcMain.handle("extensions:list", () => INSTALLED_EXTENSIONS);

    ipcMain.handle("extensions:execute", async (_event, request: ExtensionExecutionRequest) => {
        try {
            return await executeExtension(request ?? {});
        } catch (error) {
            logger.error("Unhandled error while executing extension", error);
            return {
                success: false,
                message: "The extension failed to run due to an unexpected error.",
            };
        }
    });

    ipcMain.handle("extensions:write-clipboard", (_event, payload: { text?: string | null }) => {
        const rawText = payload?.text;
        const text =
            typeof rawText === "string"
                ? rawText
                : rawText != null
                    ? String(rawText)
                    : "";

        try {
            clipboard.writeText(text);
            return true;
        } catch (error) {
            logger.warn("Failed to write text to clipboard via IPC", error);
            return false;
        }
    });
}
