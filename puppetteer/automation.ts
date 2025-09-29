import puppeteer from "puppeteer";

export const REMOTE_DEBUGGING_PORT = 8315;
export const AUTOMATION_DELAY_MS = 60_000;

export interface AutomationOptions {
    /**
     * Optional URL of the page that should be automated.
     * When provided we try to pick the matching page from the
     * currently connected browser instance.
     */
    targetUrl?: string;
    /**
     * Optional path for the screenshot that the automation produces.
     * Defaults to "google.png" in the current working directory.
     */
    screenshotPath?: string;
}

function normalizeUrl(url: string | undefined): string | undefined {
    if (!url) {
        return undefined;
    }

    const trimmed = url.trim();

    if (trimmed === "") {
        return undefined;
    }

    return trimmed.replace(/\/+$/, "");
}

export async function runAutomation(options: AutomationOptions = {}): Promise<void> {
    const browser = await puppeteer.connect({
        browserURL: `http://127.0.0.1:${REMOTE_DEBUGGING_PORT}`,
    });

    try {
        const pages = await browser.pages();

        if (pages.length === 0) {
            throw new Error("No pages available in the current browser session.");
        }

        const normalizedTargetUrl = normalizeUrl(options.targetUrl);
        const page =
            pages.find((candidate) => normalizeUrl(candidate.url()) === normalizedTargetUrl) ??
            pages.find((candidate) => normalizeUrl(candidate.url()) && candidate.url() !== "about:blank") ??
            pages[0];

        await page.bringToFront();
        await page.setViewport({ width: 1280, height: 800 });

        if (page.url() === "about:blank") {
            await Promise.race([
                page.waitForNavigation({ waitUntil: "domcontentloaded" }),
                new Promise((resolve) => setTimeout(resolve, 2_000)),
            ]);
        } else {
            await page.waitForNetworkIdle({ idleTime: 500, timeout: 5_000 }).catch(() => undefined);
        }

        await page.screenshot({
            path: options.screenshotPath ?? "google.png",
            fullPage: true,
        });
    } finally {
        await browser.disconnect();
    }
}
