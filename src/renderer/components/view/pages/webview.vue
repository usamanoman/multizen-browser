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
import type { ContextMenuParams, WebviewTag } from "electron";
import get from "lodash/get";
import { mapGetters, mapMutations } from "vuex";
import { defaultLanguage } from "@renderer/data/main";
import { configureSessionLanguage } from "@renderer/ipc/browser";

function getIpcRenderer() {
    return window.electron?.ipcRenderer;
}

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
    },
    data() {
        return {
            view: null as WebviewTag | null,
            loading: false,
            chromeInstalled: null as null | boolean,
            checkingChrome: false,
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
    },

    watch: {
        isChromeBrowser: {
            immediate: true,
            handler(isChrome: boolean) {
                if (isChrome) {
                    this.switchToChromeMode();
                }
            },
        },
        "currentSession.settings.language": {
            immediate: true,
            handler(language: string | null | undefined) {
                const normalized = this.normalizeLanguage(language);
                void this.configureLanguage(normalized);
            },
        },
    },

    mounted() {
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
