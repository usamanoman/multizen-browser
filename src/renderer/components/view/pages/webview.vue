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

        <div v-if="isChromeBrowser" class="chrome-info">
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
import type { WebviewTag } from "electron";
import get from "lodash/get";
import { mapGetters, mapMutations } from "vuex";

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
        };
    },

    computed: {
        ...mapGetters("sessions", [
            "currentSession",
            "currentTab",
            "currentSessionIndex",
        ]),
        isChromeBrowser(): boolean {
            return true;
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
            this.checkChromeAvailability();
        },

        navigate(url: string) {
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
