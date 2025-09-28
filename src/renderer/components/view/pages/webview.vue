<template>
    <div class="view-container">
        <template v-if="!isChromeBrowser">
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

            <div class="view-container-content">
                <webview
                    v-show="currentTab"
                    ref="view"
                    :key="currentTab.session"
                    autosize
                    class="webview"
                    :src="currentTab.url"
                    :partition="`persist:${currentTab.session}`"
                    :useragent="currentSession.settings.userAgent"
                    @dom-ready="loaded"
                />
            </div>
        </template>

        <template v-else>
            <div class="chrome-controls">
                <div class="chrome-url">
                    <url
                        :value="currentTabUrl || ''"
                        @navigate="navigate($event)"
                    />
                </div>
                <button
                    type="button"
                    class="chrome-open-btn"
                    :disabled="!currentTabUrl"
                    @click="openCurrentTabInChrome"
                >
                    <i class="fa fa-external-link" /> Open in Chrome
                </button>
            </div>
            <div class="chrome-info">
                <p v-if="checkingChrome">Checking for Google Chrome...</p>
                <p v-else-if="chromeInstalled">
                    Google Chrome detected. Links from this session open in your
                    local Chrome browser.
                </p>
                <div v-else>
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
        </template>
    </div>
</template>

<script lang="ts">
import Url from "./../controls/url.vue";
import type { WebviewTag } from "electron";
import get from "lodash/get";
import { mapGetters, mapMutations } from "vuex";
import { defaultBrowserPreference } from "@renderer/data/main";

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
            lastLaunchedChromeUrl: null as string | null,
        };
    },

    computed: {
        ...mapGetters("sessions", [
            "currentSession",
            "currentTab",
            "currentSessionIndex",
        ]),
        currentTabUrl(): string | null {
            return this.currentTab?.url ?? null;
        },
        isChromeBrowser(): boolean {
            const browser =
                this.currentSession?.settings?.browser ?? defaultBrowserPreference;
            return browser === "chrome";
        },
    },

    watch: {
        isChromeBrowser: {
            immediate: true,
            handler(isChrome: boolean, wasChrome: boolean | undefined) {
                if (isChrome) {
                    this.switchToChromeMode();
                } else if (wasChrome) {
                    this.switchToWebviewMode();
                }
            },
        },

        currentTabUrl(url: string | null) {
            if (
                this.isChromeBrowser &&
                this.chromeInstalled &&
                url &&
                url !== this.lastLaunchedChromeUrl
            ) {
                this.openInChrome(url);
            }
        },

        chromeInstalled(installed: boolean | null) {
            if (
                installed &&
                this.isChromeBrowser &&
                this.currentTabUrl &&
                this.currentTabUrl !== this.lastLaunchedChromeUrl
            ) {
                this.openInChrome(this.currentTabUrl);
            }
        },
    },

    mounted() {
        this.$nextTick(() => {
            if (!this.isChromeBrowser) {
                this.initView();
            }
        });
    },

    beforeUnmount() {
        this.removeEventListeners();
    },

    methods: {
        ...mapMutations("sessions", ["updateTab"]),

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

        async openInChrome(url: string) {
            const targetUrl = (url || "").trim();

            if (!targetUrl || targetUrl === this.lastLaunchedChromeUrl) {
                return;
            }

            this.lastLaunchedChromeUrl = targetUrl;

            try {
                const ipcRenderer = getIpcRenderer();
                if (!ipcRenderer) {
                    throw new Error("IPC renderer bridge is unavailable");
                }

                const result = await ipcRenderer.invoke("browser:launch-chrome", {
                    url: targetUrl,
                });

                this.chromeInstalled = Boolean(result?.installed);

                if (!this.chromeInstalled) {
                    this.lastLaunchedChromeUrl = null;
                }
            } catch (error) {
                console.error("Failed to launch Chrome", error);
                this.chromeInstalled = false;
                this.lastLaunchedChromeUrl = null;
            }
        },

        openCurrentTabInChrome() {
            if (this.currentTab?.url) {
                this.openInChrome(this.currentTab.url);
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
            this.lastLaunchedChromeUrl = null;
            this.checkChromeAvailability();
        },

        switchToWebviewMode() {
            this.lastLaunchedChromeUrl = null;
            this.chromeInstalled = null;
            this.checkingChrome = false;

            this.$nextTick(() => {
                if (!this.isChromeBrowser) {
                    this.initView();
                }
            });
        },

        navigate(url: string) {
            if (this.isChromeBrowser) {
                const session = this.currentSession;
                if (!session) {
                    return;
                }

                this.updateTab({
                    sessionIndex: this.currentSessionIndex,
                    tabIndex: session.currentTabIndex,
                    k: "url",
                    v: url,
                });
                this.openInChrome(url);
                return;
            }

            if (url !== this.view?.getURL()) {
                this.view?.loadURL(url);
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
            if (this.isChromeBrowser) {
                return;
            }

            this.view = this.$refs.view as WebviewTag;
            Object.keys(events).forEach((event) =>
                this.view?.addEventListener(event, this[events[event]]),
            );
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

        initView() {
            if (this.isChromeBrowser) {
                return;
            }

            this.view = this.$refs.view as WebviewTag;
            Object.keys(events).forEach((event) =>
                this.view?.addEventListener(event, this[events[event]]),
            );
        },

        removeEventListeners() {
            Object.keys(events).forEach((event) =>
                this.view?.removeEventListener(event, this[events[event]]),
            );
        },
    },
};
</script>

<style scoped lang="scss">
.controls-bar {
    height: 40px;
    min-height: 40px;
    max-height: 40px;
    background-color: #1d1c3b;
    display: flex;
    align-items: center;
    font-size: 12px;
    border-bottom: 1px solid #1d224a;
    z-index: 1;
    padding: 10px;

    button {
        color: #f3f3f3;
        width: 25px;
        height: 25px;
        border-radius: 50%;
        border: 0;
        background: transparent;
        font-size: 12px;

        &:hover {
            background: rgba(247, 247, 247, 0.2);
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

.chrome-controls {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 10px;
    background-color: #1d1c3b;
    border-bottom: 1px solid #1d224a;
}

.chrome-url {
    flex: 1;
}

.chrome-open-btn,
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

.chrome-open-btn:disabled {
    cursor: not-allowed;
    opacity: 0.6;
}

.chrome-open-btn:not(:disabled):hover,
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
