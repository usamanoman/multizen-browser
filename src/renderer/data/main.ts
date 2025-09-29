export const defaultHomePage = "https://browserscan.net";

const fallbackUserAgent =
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";

export const defaultUserAgent =
    typeof navigator !== "undefined" && navigator.userAgent
        ? navigator.userAgent
        : fallbackUserAgent;

export const defaultBrowserPreference = "chrome";
