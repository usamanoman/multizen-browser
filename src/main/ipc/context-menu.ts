import {
    BrowserWindow,
    Menu,
    clipboard,
    ipcMain,
    shell,
    type ContextMenuParams,
    type MenuItemConstructorOptions,
} from "electron";
import { launchChrome, openChromeDownloadPage } from "../browser";

type ContextMenuRequest = {
    params?: ContextMenuParams | null;
    sessionId?: string | null;
    chromeInstalled?: boolean | null;
};

function buildNavigationItems(target: Electron.WebContents) {
    const items: MenuItemConstructorOptions[] = [];

    if (target.canGoBack()) {
        items.push({
            label: "Back",
            click: () => target.goBack(),
        });
    }

    if (target.canGoForward()) {
        items.push({
            label: "Forward",
            click: () => target.goForward(),
        });
    }

    items.push({
        label: "Reload",
        click: () => target.reload(),
    });

    return items;
}

function buildSelectionItems(params: ContextMenuParams) {
    const items: MenuItemConstructorOptions[] = [];

    items.push({
        role: "cut",
        enabled: params.editFlags.canCut,
    });
    items.push({
        role: "copy",
        enabled: params.editFlags.canCopy,
    });
    items.push({
        role: "paste",
        enabled: params.editFlags.canPaste,
    });
    items.push({
        role: "selectAll",
        enabled: params.editFlags.canSelectAll,
    });

    return items;
}

function buildLinkItems(
    params: ContextMenuParams,
    host: Electron.WebContents | null,
    request: ContextMenuRequest,
) {
    if (!params.linkURL) {
        return [] as MenuItemConstructorOptions[];
    }

    const items: MenuItemConstructorOptions[] = [];
    const linkUrl = params.linkURL;

    items.push({
        label: "Open Link in New Tab",
        click: () => {
            host?.send("webview:context-open-tab", {
                url: linkUrl,
                sessionId: request.sessionId ?? null,
            });
        },
    });

    const chromeMenuLabel =
        request.chromeInstalled === false
            ? "Google Chrome Not Available"
            : "Open Link in Chrome";

    items.push({
        label: chromeMenuLabel,
        enabled: request.chromeInstalled !== false,
        click: () => {
            const result = launchChrome(linkUrl, {
                sessionId: request.sessionId ?? undefined,
            });

            host?.send("webview:chrome-availability", {
                sessionId: request.sessionId ?? null,
                installed: result.installed && Boolean(result.path),
            });
        },
    });

    if (request.chromeInstalled === false) {
        items.push({
            label: "Install Google Chrome…",
            click: () => {
                openChromeDownloadPage();
            },
        });
    }

    items.push({
        label: "Open Link Externally",
        click: () => {
            void shell.openExternal(linkUrl);
        },
    });

    items.push({
        label: "Copy Link Address",
        click: () => clipboard.writeText(linkUrl),
    });

    return items;
}

export default function initContextMenuIPC(window: BrowserWindow) {
    ipcMain.handle("webview:context-menu", (event, request: ContextMenuRequest) => {
        if (!request?.params) {
            return false;
        }

        const params = request.params;
        const target = event.sender;
        const host = target.hostWebContents || window.webContents;
        const ownerWindow =
            BrowserWindow.fromWebContents(host) || BrowserWindow.fromWebContents(target) || window;

        const template: MenuItemConstructorOptions[] = [];
        const navigationItems = buildNavigationItems(target);

        template.push(...navigationItems);

        const linkItems = buildLinkItems(params, host, request);
        if (linkItems.length > 0) {
            template.push({ type: "separator" }, ...linkItems);
        }

        template.push({ type: "separator" }, ...buildSelectionItems(params));

        template.push({ type: "separator" });
        template.push({
            label: "Inspect Element",
            click: () => target.inspectElement(params.x, params.y),
        });

        const menu = Menu.buildFromTemplate(template);
        menu.popup({
            window: ownerWindow,
            x: Math.round(params.x),
            y: Math.round(params.y),
        });

        return true;
    });
}
