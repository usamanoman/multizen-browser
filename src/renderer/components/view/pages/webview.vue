<template>
    <div class="view-container">
        <div v-if="view" class="controls-bar">
            <button
                class="controls-button"
                @click="view.canGoBack() ? view.goBack() : null"
            >
                <i class="fa fa-arrow-left" />
            </button>

            <button
                class="controls-button"
                @click="view.canGoForward() ? view.goForward() : null"
            >
                <i class="fa fa-arrow-right" />
            </button>

            <button
                class="controls-button"
                @click="loading ? view.stop() : view.reload()"
            >
                <i :class="!loading ? 'fa fa-refresh' : 'fa fa-times'" />
            </button>

            <url :value="currentTab.url" @navigate="navigate($event)" />
        </div>

        <extensions-bar
            v-if="availableExtensions.length"
            :extensions="availableExtensions"
            :executing="extensionExecuting"
            @activate="handleExtensionActivation"
        />

        <div
            v-if="extensionFeedback"
            class="extension-feedback"
            :class="{ 'is-error': extensionFeedbackType === 'error' }"
        >
            {{ extensionFeedback }}
        </div>

        <div v-if="extensionPanel" class="extension-panel">
            <div class="extension-panel__header">
                <div class="extension-panel__summary">
                    <h3>{{ extensionPanel.extension.name }}</h3>
                    <p>{{ extensionPanel.extension.description }}</p>
                </div>
                <button
                    type="button"
                    class="extension-panel__close"
                    @click="closeExtensionPanel"
                    aria-label="Close extension panel"
                >
                    <i class="fa fa-times" aria-hidden="true" />
                </button>
            </div>
            <div class="extension-panel__body">
                <p
                    v-if="!extensionPanel.cookies.length"
                    class="extension-panel__empty"
                >
                    No cookies were found for this site.
                </p>
                <pre v-else class="extension-panel__code">{{
                    extensionPanel.copiedText
                }}</pre>
            </div>
            <div class="extension-panel__actions">
                <button
                    type="button"
                    class="extension-panel__action"
                    @click="copyCookiesAgain"
                >
                    <i class="fa fa-clipboard" aria-hidden="true" />
                    Copy cookies
                </button>
            </div>
        </div>

        <div
            v-if="
                isChromeBrowser &&
                (checkingChrome || chromeInstalled === false)
            "
            class="chrome-info"
        >
            <p v-if="checkingChrome">Checking for Google Chrome...</p>
            <div v-else-if="chromeInstalled === false">
                <p>Google Chrome is not installed on this device.</p>
                <button
                    type="button"
                    class="chrome-install-btn"
                    @click="installChrome"
                >
                    <i class="fa fa-download" /> Install Chrome
                </button>
            </div>
        </div>

        <div class="view-container-content">
            <webview
                v-show="currentTab"
                ref="view"
                :key="webviewKey"
                autosize
                class="webview"
                :src="currentTab.url"
                :partition="webviewPartition"
                :useragent="currentSession.settings.userAgent"
                @dom-ready="loaded"
            />
        </div>
    </div>
</template>

<script lang="ts">
import Url from "./../controls/url.vue";
import ExtensionsBar from "../controls/extensions.vue";
import type { Cookie, ContextMenuParams, WebviewTag } from "electron";
import get from "lodash/get";
import { mapGetters, mapMutations } from "vuex";
import { defaultLanguage } from "@renderer/data/main";
import { configureSessionLanguage } from "@renderer/ipc/browser";
import type { InstalledExtension } from "@shared/extensions";

function getIpcRenderer() {
    return window.electron?.ipcRenderer;
}

type ExtensionPanelState = {
    extension: InstalledExtension;
    cookies: Cookie[];
    copiedText: string;
};

const events = {
    "did-finish-load": "didFinishLoad",
    "page-favicon-updated": "pageFaviconUpdated",
    "did-start-loading": "didStartLoading",
    "did-stop-loading": "didStopLoading",
    "did-navigate": "didNavigate",
    "did-fail-load": "didFailLoad",
    "new-window": "didOpenNewWindow",
};

export default {
    components: {
        Url,
        ExtensionsBar,
    },
    data() {
        return {
            view: null as WebviewTag | null,
            loading: false,
            chromeInstalled: null as null | boolean,
            checkingChrome: false,
            extensions: [] as InstalledExtension[],
            extensionPanel: null as ExtensionPanelState | null,
            extensionExecuting: false,
            extensionFeedback: null as string | null,
            extensionFeedbackType: "success" as "success" | "error",
            extensionFeedbackTimer: null as number | null,
        };
    },

    computed: {
        ...mapGetters("sessions", [
            "currentSession",
            "currentTab",
            "currentSessionIndex",
        ]),
        isChromeBrowser(): boolean {
            return (
                this.currentSession?.settings?.browser === "chrome" || false
            );
        },
        webviewPartition(): string | null {
            const sessionId = this.currentTab?.session;
            if (!sessionId) {
                return "persist:chrome-default";
            }

            return `persist:chrome-${sessionId}`;
        },
        webviewKey(): string {
            const sessionId = this.currentTab?.session ?? "unknown";
            return `${sessionId}-chrome`;
        },
        availableExtensions(): InstalledExtension[] {
            if (!this.isChromeBrowser) {
                return [];
            }

            return this.extensions;
        },
    },

    watch: {
        isChromeBrowser: {
            immediate: true,
            handler(isChrome: boolean) {
                if (isChrome) {
                    this.switchToChromeMode();
                    this.loadExtensions();
                    return;
                }

                this.extensionPanel = null;
                this.extensions = [];
            },
        },
        "currentSession.settings.language": {
            immediate: true,
            handler(language: string | null | undefined) {
                const normalized = this.normalizeLanguage(language);
                void this.configureLanguage(normalized);
            },
        },
        "currentTab.url"(newUrl: string | undefined, oldUrl: string | undefined) {
            if (newUrl !== oldUrl) {
                this.extensionPanel = null;
            }
        },
    },

    mounted() {
        this.loadExtensions();
        const ipcRenderer = getIpcRenderer();
        ipcRenderer?.on("webview:context-open-tab", this.handleContextMenuCommand);
        ipcRenderer?.on(
            "webview:chrome-availability",
            this.handleChromeAvailabilityEvent,
        );
    },

    beforeUnmount() {
        const ipcRenderer = getIpcRenderer();
        ipcRenderer?.removeListener(
            "webview:context-open-tab",
            this.handleContextMenuCommand,
        );
        ipcRenderer?.removeListener(
            "webview:chrome-availability",
            this.handleChromeAvailabilityEvent,
        );
        this.clearExtensionFeedbackTimer();
        this.removeEventListeners();
    },

    methods: {
        ...mapMutations("sessions", ["updateTab", "addTab"]),

        normalizeLanguage(value?: string | null): string {
            const candidate = typeof value === "string" ? value.trim() : "";

            if (!candidate) {
                return defaultLanguage;
            }

            return candidate;
        },

        async configureLanguage(language: string) {
            const sessionId = this.currentSession?.id ?? null;
            await configureSessionLanguage(sessionId, language);
        },

        async loadExtensions() {
            try {
                const ipcRenderer = getIpcRenderer();

                if (!ipcRenderer) {
                    return;
                }

                const result = await ipcRenderer.invoke("extensions:list");

                if (Array.isArray(result)) {
                    this.extensions = result as InstalledExtension[];
                } else {
                    this.extensions = [];
                }
            } catch (error) {
                console.error("Failed to load extensions", error);
            }
        },

        clearExtensionFeedbackTimer() {
            if (this.extensionFeedbackTimer !== null) {
                window.clearTimeout(this.extensionFeedbackTimer);
                this.extensionFeedbackTimer = null;
            }
        },

        showExtensionFeedback(message: string, isError = false) {
            this.clearExtensionFeedbackTimer();
            this.extensionFeedback = message;
            this.extensionFeedbackType = isError ? "error" : "success";

            this.extensionFeedbackTimer = window.setTimeout(() => {
                this.extensionFeedback = null;
                this.extensionFeedbackTimer = null;
            }, 5000);
        },

        async checkChromeAvailability() {
            this.chromeInstalled = null;
            this.checkingChrome = true;

            try {
                const ipcRenderer = getIpcRenderer();
                if (!ipcRenderer) {
                    throw new Error("IPC renderer bridge is unavailable");
                }

                const result = await ipcRenderer.invoke("browser:check-chrome");
                this.chromeInstalled = Boolean(result?.installed);
            } catch (error) {
                console.error("Failed to check Chrome availability", error);
                this.chromeInstalled = false;
            } finally {
                this.checkingChrome = false;
            }
        },

        async installChrome() {
            try {
                const ipcRenderer = getIpcRenderer();
                if (!ipcRenderer) {
                    throw new Error("IPC renderer bridge is unavailable");
                }

                await ipcRenderer.invoke("browser:install-chrome");
            } catch (error) {
                console.error("Failed to open Chrome download page", error);
            }
        },

        switchToChromeMode() {
            this.removeEventListeners();
            this.view = null;
            this.loading = false;
            const language = this.normalizeLanguage(
                this.currentSession?.settings?.language,
            );
            void this.configureLanguage(language);
            this.checkChromeAvailability();
        },

        formatCookiesForClipboard(cookies: Cookie[]): string {
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
        },

        async handleExtensionActivation(extension: InstalledExtension) {
            if (!extension || this.extensionExecuting) {
                return;
            }

            const ipcRenderer = getIpcRenderer();

            if (!ipcRenderer) {
                this.showExtensionFeedback(
                    "Extension bridge is unavailable.",
                    true,
                );
                return;
            }

            this.extensionExecuting = true;

            try {
                const result = await ipcRenderer.invoke(
                    "extensions:execute",
                    {
                        id: extension.id,
                        partition: this.webviewPartition,
                        url: this.currentTab?.url ?? null,
                    },
                );

                const message =
                    typeof result?.message === "string"
                        ? result.message
                        : `${extension.name} finished running.`;

                if (result?.success) {
                    const cookies = Array.isArray(result.cookies)
                        ? (result.cookies as Cookie[])
                        : [];
                    const copiedText =
                        typeof result.copiedText === "string"
                            ? result.copiedText
                            : this.formatCookiesForClipboard(cookies);

                    this.extensionPanel = {
                        extension,
                        cookies,
                        copiedText,
                    };
                } else {
                    this.extensionPanel = null;
                }

                this.showExtensionFeedback(message, !result?.success);
            } catch (error) {
                console.error("Failed to execute extension", error);
                this.extensionPanel = null;
                this.showExtensionFeedback(
                    `Failed to run ${extension.name}.`,
                    true,
                );
            } finally {
                this.extensionExecuting = false;
            }
        },

        closeExtensionPanel() {
            this.extensionPanel = null;
        },

        async copyCookiesAgain() {
            if (!this.extensionPanel) {
                return;
            }

            const text =
                this.extensionPanel.copiedText ||
                this.formatCookiesForClipboard(this.extensionPanel.cookies);

            if (!text) {
                this.showExtensionFeedback(
                    "There are no cookies to copy.",
                    true,
                );
                return;
            }

            try {
                if (navigator?.clipboard?.writeText) {
                    await navigator.clipboard.writeText(text);
                } else {
                    const ipcRenderer = getIpcRenderer();
                    if (ipcRenderer) {
                        await ipcRenderer.invoke("extensions:write-clipboard", {
                            text,
                        });
                    }
                }

                this.showExtensionFeedback("Cookies copied to the clipboard.");
            } catch (error) {
                console.error("Failed to copy cookies from extension", error);

                try {
                    const ipcRenderer = getIpcRenderer();
                    if (ipcRenderer) {
                        const success = await ipcRenderer.invoke(
                            "extensions:write-clipboard",
                            { text },
                        );

                        if (success) {
                            this.showExtensionFeedback(
                                "Cookies copied to the clipboard.",
                            );
                            return;
                        }
                    }
                } catch (ipcError) {
                    console.error(
                        "Failed to copy cookies via IPC fallback",
                        ipcError,
                    );
                }

                this.showExtensionFeedback(
                    "Unable to copy cookies to the clipboard.",
                    true,
                );
            }
        },

        navigate(url: string) {
            if (url === this.view?.getURL()) {
                return;
            }

            const promise = this.view?.loadURL(url);

            if (promise && typeof promise.catch === "function") {
                promise.catch((error: Error & { code?: number | string; errno?: number | string }) => {
                    const errorCode = error?.errno ?? error?.code;

                    if (
                        errorCode === -3 ||
                        errorCode === "ERR_ABORTED" ||
                        error?.message?.includes?.("-3")
                    ) {
                        return;
                    }

                    console.warn("Failed to navigate webview", error);
                });
            }
        },

        didFinishLoad() {
            this.view?.removeEventListener(
                "did-finish-load",
                this.didFinishLoad,
            );
            this.navigate(this.currentTab.url);
        },

        didNavigate(e) {
            const session = this.currentSession;
            if (!session) {
                return;
            }

            this.updateTab({
                sessionIndex: this.currentSessionIndex,
                tabIndex: session.currentTabIndex,
                k: "url",
                v: e.url,
            });
        },

        pageFaviconUpdated(r) {
            const session = this.currentSession;
            if (!session) {
                return;
            }

            this.updateTab({
                sessionIndex: this.currentSessionIndex,
                tabIndex: session.currentTabIndex,
                k: "favicon",
                v: get(r, "favicons.0", null),
            });
        },

        didStartLoading() {
            this.loading = true;
        },

        loaded() {
            this.view = this.$refs.view as WebviewTag;
            Object.keys(events).forEach((event) =>
                this.view?.addEventListener(event, this[events[event]]),
            );
            this.view?.addEventListener("context-menu", this.handleContextMenu);
        },

        didStopLoading() {
            this.loading = false;

            const session = this.currentSession;
            if (!session) {
                return;
            }

            this.updateTab({
                sessionIndex: this.currentSessionIndex,
                tabIndex: session.currentTabIndex,
                k: "title",
                v: this.view?.getTitle(),
            });
        },

        didFailLoad(e) {
            console.info("Load failed with error code: ", e.errorCode);
        },

        didOpenNewWindow(event) {
            const targetUrl = event?.url;

            if (!targetUrl) {
                return;
            }

            if (typeof event.preventDefault === "function") {
                event.preventDefault();
            }

            if (!this.currentSession) {
                return;
            }

            if (!/^https?:/i.test(targetUrl)) {
                const ipcRenderer = getIpcRenderer();

                if (ipcRenderer) {
                    ipcRenderer.invoke("browser:open-external", targetUrl);
                }

                return;
            }

            const disposition = event.disposition || "";
            const shouldActivate = disposition !== "background-tab";
            const providedTitle = event.title?.trim?.();
            const fallbackTitle = providedTitle || targetUrl;

            this.addTab({
                sessionIndex: this.currentSessionIndex,
                url: targetUrl,
                title: fallbackTitle,
                activate: shouldActivate,
            });
        },

        handleContextMenu(event: Event) {
            const ipcRenderer = getIpcRenderer();
            if (!ipcRenderer) {
                return;
            }

            const typedEvent = event as Event & {
                preventDefault?: () => void;
                params?: ContextMenuParams;
            };

            typedEvent.preventDefault?.();

            const params = typedEvent.params;
            if (!params) {
                return;
            }

            ipcRenderer.invoke("webview:context-menu", {
                params,
                sessionId: this.currentSession?.id ?? null,
                chromeInstalled: this.chromeInstalled,
                language: this.currentSession?.settings?.language ?? null,
            });
        },

        handleContextMenuCommand(_event, payload) {
            if (!payload || payload.sessionId !== (this.currentSession?.id ?? null)) {
                return;
            }

            const targetUrl = payload.url;

            if (!targetUrl) {
                return;
            }

            this.addTab({
                sessionIndex: this.currentSessionIndex,
                url: targetUrl,
                title: payload.title || targetUrl,
                activate: payload.activate !== false,
            });
        },

        handleChromeAvailabilityEvent(_event, payload) {
            if (!payload || payload.sessionId !== (this.currentSession?.id ?? null)) {
                return;
            }

            if (typeof payload.installed === "boolean") {
                this.chromeInstalled = payload.installed;
            }

            this.checkingChrome = false;
        },

        removeEventListeners() {
            Object.keys(events).forEach((event) =>
                this.view?.removeEventListener(event, this[events[event]]),
            );
            this.view?.removeEventListener("context-menu", this.handleContextMenu);
        },
    },
};
</script>

<style scoped lang="scss">
.controls-bar {
    height: 40px;
    min-height: 40px;
    max-height: 40px;
    background-color: #ffca83;
    display: flex;
    align-items: center;
    font-size: 12px;
    border-bottom: 1px solid #f0a94a;
    z-index: 1;
    padding: 10px;

    button {
        color: #3f2a08;
        width: 25px;
        height: 25px;
        border-radius: 50%;
        border: 0;
        background: transparent;
        font-size: 12px;

        &:hover {
            background: rgba(255, 215, 163, 0.5);
        }
    }
}

.controls-button {
    display: flex;
    align-items: center;
    justify-content: center;
    margin: 0 5px;
    transition: 0.2s ease;
    cursor: pointer;
}

.view-container {
    height: 100%;
    display: flex;
    flex-direction: column;
    background: #ffd7a3;

    .view-container-content {
        height: 100%;
        position: relative;

        .webview {
            position: absolute;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            min-width: 100%;
            min-height: 100%;
            display: inline-flex !important;

            &:focus {
                outline: 0;
                border: 0;
            }
        }
    }
}

.extension-feedback {
    padding: 6px 10px;
    background: #ffe2b5;
    border-bottom: 1px solid #f0a94a;
    color: #3f2a08;
    font-size: 12px;
}

.extension-feedback.is-error {
    background: #f6c1b5;
    border-color: #e69385;
    color: #5b1f12;
}

.extension-panel {
    margin: 10px;
    padding: 12px;
    border-radius: 10px;
    background: rgba(255, 255, 255, 0.78);
    border: 1px solid #f0a94a;
    display: flex;
    flex-direction: column;
    gap: 12px;
}

.extension-panel__header {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 12px;
}

.extension-panel__summary h3 {
    margin: 0;
    font-size: 14px;
    color: #3f2a08;
}

.extension-panel__summary p {
    margin: 4px 0 0;
    font-size: 12px;
    color: #514325;
}

.extension-panel__close {
    border: 0;
    background: transparent;
    color: #3f2a08;
    cursor: pointer;
    padding: 4px;
    border-radius: 50%;
    transition: background-color 0.2s ease;
}

.extension-panel__close:hover {
    background-color: rgba(63, 42, 8, 0.12);
}

.extension-panel__body {
    max-height: 240px;
    overflow: auto;
    background: rgba(255, 249, 238, 0.9);
    border: 1px dashed rgba(63, 42, 8, 0.3);
    border-radius: 8px;
    padding: 10px;
}

.extension-panel__code {
    margin: 0;
    font-size: 12px;
    line-height: 1.5;
    white-space: pre-wrap;
    word-break: break-word;
    color: #2a1d08;
    font-family: "SFMono-Regular", Consolas, "Liberation Mono", Menlo, monospace;
}

.extension-panel__empty {
    margin: 0;
    color: #5b4b2b;
    font-size: 12px;
}

.extension-panel__actions {
    display: flex;
    justify-content: flex-end;
}

.extension-panel__action {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 6px 12px;
    border-radius: 6px;
    border: 0;
    background-color: #3f2a08;
    color: #ffd7a3;
    cursor: pointer;
    font-size: 12px;
    text-transform: uppercase;
    letter-spacing: 0.5px;
}

.extension-panel__action:hover {
    background-color: #6b4512;
}

.chrome-install-btn {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 8px 14px;
    border-radius: 6px;
    border: 0;
    background-color: #697ca6;
    color: #f3f3f3;
    cursor: pointer;
    font-size: 12px;
    text-transform: uppercase;
    font-family: monospace;
    transition: background-color 0.2s ease, opacity 0.2s ease;
}

.chrome-install-btn:hover {
    background-color: #9baed7;
}

.chrome-info {
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    padding: 24px;
    gap: 12px;
    color: #6c6969;
    font-size: 14px;
    background-color: #15132b;
    border-bottom: 1px solid #1d224a;
    width: 100%;
}

.chrome-info p {
    margin: 0;
}

.chrome-info div {
    display: flex;
    align-items: center;
    gap: 12px;
}
</style>
