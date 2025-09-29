import {
    BrowserWindow,
    Menu,
    MenuItemConstructorOptions,
    NativeImage,
    Tray,
    app,
    nativeImage,
    shell,
} from "electron";
import env from "./env";
import { getPath, logsPath } from "./util";

export default class TrayMenuBuilder {
    mainWindow: BrowserWindow;

    tray: Tray | null;

    isForceClose: boolean;

    constructor(mainWindow: BrowserWindow) {
        this.mainWindow = mainWindow;
        this.tray = null;
        this.isForceClose = false;
    }

    buildMenu() {
        const icon = this.createTrayIcon();
        this.tray = new Tray(icon);

        this.tray.setToolTip(env.main.appName);
        this.refreshTrayMenu();

        this.tray.on("click", () => {
            this.mainWindow.show();
            this.refreshTrayMenu();
        });
    }

    createTrayIcon(): NativeImage {
        if (env.platform.isMac) {
            const svgMarkup = `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 18 18"><circle cx="9" cy="9" r="6" fill="#FFFFFF"/></svg>`;
            const dataUrl = `data:image/svg+xml;base64,${Buffer.from(svgMarkup).toString(
                "base64",
            )}`;
            const sizedIcon = nativeImage
                .createFromDataURL(dataUrl)
                .resize({ width: 18, height: 18 });
            sizedIcon.setTemplateImage(true);
            return sizedIcon;
        }

        return nativeImage.createFromPath(getPath("resources/icons/icon.png"));
    }

    refreshTrayMenu() {
        if (!this.tray) {
            return;
        }

        this.tray.setContextMenu(this.buildTray());
    }

    buildTray(): Menu {
        return Menu.buildFromTemplate(this.buildTemplate());
    }

    buildTemplate(): MenuItemConstructorOptions[] {
        const isVisible = this.mainWindow.isVisible();

        return [
            {
                label: "Open ReachOwl Runner",
                click: () => {
                    this.mainWindow.show();
                    this.refreshTrayMenu();
                },
            },
            {
                label: isVisible ? "Hide Window" : "Show Window",
                click: () => {
                    if (this.mainWindow.isVisible()) {
                        this.mainWindow.hide();
                    } else {
                        this.mainWindow.show();
                    }

                    this.refreshTrayMenu();
                },
            },
            {
                label: "Reload Interface",
                click: () => {
                    this.mainWindow.reload();
                },
            },
            { type: "separator" },
            {
                label: "Show Logs Folder",
                click: () => {
                    shell.openPath(logsPath);
                },
            },
            {
                label: "Close Daemon",
                click: async () => {
                    app.exit();
                    app.quit();
                },
            },
        ];
    }

    destroyMenu() {
        this.tray?.destroy();
    }
}
