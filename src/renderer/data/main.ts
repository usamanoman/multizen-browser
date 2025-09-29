import { DEFAULT_LANGUAGE } from "../../shared/constants";

export const defaultHomePage = "https://browserscan.net";

const fallbackUserAgent =
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";

function sanitizeUserAgent(raw: string | undefined | null): string | null {
    if (!raw) {
        return null;
    }

    const withoutAppSignature = raw
        .replace(/Electron\/[\d.]+\s*/gi, "")
        .replace(/Multizen\/[\d.]+\s*/gi, "")
        .trim();

    if (/Chrome\/[\d.]+/.test(withoutAppSignature)) {
        return withoutAppSignature.replace(/\s{2,}/g, " ").trim();
    }

    return null;
}

export const defaultUserAgent =
    sanitizeUserAgent(
        typeof navigator !== "undefined" ? navigator.userAgent : undefined,
    ) || fallbackUserAgent;

export const defaultBrowserPreference = "chrome";

export const defaultLanguage = DEFAULT_LANGUAGE;
