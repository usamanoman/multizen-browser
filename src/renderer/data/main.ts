import { DEFAULT_CHROME_VERSION, DEFAULT_LANGUAGE } from "../../shared/constants";

export const defaultHomePage = "https://browserscan.net";

const fallbackUserAgent =
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko)" +
    ` Chrome/${DEFAULT_CHROME_VERSION} Safari/537.36`;

function compareVersions(current: string, target: string): number {
    const currentParts = current.split(".").map((part) => Number.parseInt(part, 10) || 0);
    const targetParts = target.split(".").map((part) => Number.parseInt(part, 10) || 0);
    const length = Math.max(currentParts.length, targetParts.length);

    for (let index = 0; index < length; index += 1) {
        const currentValue = currentParts[index] ?? 0;
        const targetValue = targetParts[index] ?? 0;

        if (currentValue > targetValue) {
            return 1;
        }

        if (currentValue < targetValue) {
            return -1;
        }
    }

    return 0;
}

function normalizeChromeVersion(userAgent: string): string {
    const match = userAgent.match(/Chrome\/(\d+(?:\.\d+){3})/);

    if (!match) {
        return userAgent;
    }

    const [, currentVersion] = match;

    if (compareVersions(currentVersion, DEFAULT_CHROME_VERSION) >= 0) {
        return userAgent;
    }

    return userAgent.replace(
        `Chrome/${currentVersion}`,
        `Chrome/${DEFAULT_CHROME_VERSION}`,
    );
}

function sanitizeUserAgent(raw: string | undefined | null): string | null {
    if (!raw) {
        return null;
    }

    const withoutAppSignature = raw
        .replace(/Electron\/[\d.]+\s*/gi, "")
        .replace(/Multizen\/[\d.]+\s*/gi, "")
        .trim();

    if (/Chrome\/[\d.]+/.test(withoutAppSignature)) {
        const normalized = withoutAppSignature.replace(/\s{2,}/g, " ").trim();
        return normalizeChromeVersion(normalized);
    }

    return null;
}

export const defaultUserAgent =
    normalizeChromeVersion(
        sanitizeUserAgent(
            typeof navigator !== "undefined" ? navigator.userAgent : undefined,
        ) || fallbackUserAgent,
    );

export const defaultBrowserPreference = "chrome";

export const defaultLanguage = DEFAULT_LANGUAGE;
