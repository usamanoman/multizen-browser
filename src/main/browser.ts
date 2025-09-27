import { existsSync } from "fs";
import { join } from "path";
import { spawn, spawnSync } from "child_process";
import { shell } from "electron";
import logger from "electron-log";

type ChromeCheckResult = {
    installed: boolean;
    path: string | null;
};

const CHROME_DOWNLOAD_URL = "https://www.google.com/chrome/";

function getEnvChromePath(): string | null {
    const envPath = process.env.CHROME_PATH || process.env.GOOGLE_CHROME_PATH;

    if (envPath && existsSync(envPath)) {
        return envPath;
    }

    return null;
}

function findChromeOnWindows(): string | null {
    const suffix = join("Google", "Chrome", "Application", "chrome.exe");
    const prefixes = [
        process.env["PROGRAMFILES"],
        process.env["PROGRAMFILES(X86)"],
        process.env["LOCALAPPDATA"],
    ];

    for (const prefix of prefixes) {
        if (!prefix) continue;

        const candidate = join(prefix, suffix);
        if (existsSync(candidate)) {
            return candidate;
        }
    }

    return null;
}

function findChromeOnMac(): string | null {
    const candidates = [
        "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
        "/Applications/Google Chrome Canary.app/Contents/MacOS/Google Chrome Canary",
    ];

    const home = process.env["HOME"];
    if (home) {
        candidates.push(
            join(
                home,
                "Applications",
                "Google Chrome.app",
                "Contents",
                "MacOS",
                "Google Chrome",
            ),
        );
    }

    for (const candidate of candidates) {
        if (existsSync(candidate)) {
            return candidate;
        }
    }

    return null;
}

function findChromeOnLinux(): string | null {
    const whichCandidates = [
        "google-chrome-stable",
        "google-chrome",
        "chromium-browser",
        "chromium",
    ];

    for (const command of whichCandidates) {
        try {
            const result = spawnSync("which", [command], {
                encoding: "utf-8",
            });

            if (result.status === 0) {
                const output = result.stdout?.trim();
                if (output && existsSync(output)) {
                    return output;
                }
            }
        } catch (error) {
            logger.warn("Failed to execute 'which' for", command, error);
        }
    }

    const fallbackPaths = [
        "/usr/bin/google-chrome-stable",
        "/usr/bin/google-chrome",
        "/usr/bin/chromium-browser",
        "/snap/bin/chromium",
    ];

    for (const candidate of fallbackPaths) {
        if (existsSync(candidate)) {
            return candidate;
        }
    }

    return null;
}

export function getChromeInstallation(): ChromeCheckResult {
    const envPath = getEnvChromePath();
    if (envPath) {
        return { installed: true, path: envPath };
    }

    let chromePath: string | null = null;

    switch (process.platform) {
        case "win32":
            chromePath = findChromeOnWindows();
            break;
        case "darwin":
            chromePath = findChromeOnMac();
            break;
        default:
            chromePath = findChromeOnLinux();
            break;
    }

    return { installed: Boolean(chromePath), path: chromePath };
}

export function launchChrome(url: string): ChromeCheckResult {
    const { installed, path } = getChromeInstallation();

    if (!installed || !path) {
        return { installed: false, path: null };
    }

    try {
        const child = spawn(path, [url], {
            detached: true,
            stdio: "ignore",
        });

        child.unref();
        return { installed: true, path };
    } catch (error) {
        logger.error("Failed to launch Chrome", error);
        return { installed: true, path };
    }
}

export function openChromeDownloadPage(): void {
    shell.openExternal(CHROME_DOWNLOAD_URL);
}
