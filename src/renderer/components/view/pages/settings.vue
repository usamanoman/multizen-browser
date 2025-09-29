<template>
    <div class="view-settings">
        <div v-if="currentSession" class="settings-wrap">
            <h1>Session Settings</h1>
            <div class="session-info">
                <p>Session ID: {{ currentSession.id }}</p>
                <p>These settings apply to the current session only.</p>
                <button class="close-session-btn" @click="closeSession">
                    Close session
                </button>
            </div>
            <hr />
            <div>
                <div class="settings-block">
                    <h4>Home page</h4>
                    <div class="input-block">
                        <input
                            v-model.trim="homePage"
                            class="d-block"
                            type="url"
                            @blur="persistHomePage"
                            @keyup.enter="persistHomePage"
                        />
                    </div>
                </div>
                <hr />
                <div class="settings-block">
                    <h4>Browser</h4>
                    <div class="input-block">
                        <select
                            v-model="browserPreference"
                            class="browser-select d-block"
                            disabled
                        >
                            <option value="chrome">Google Chrome</option>
                        </select>
                        <p
                            v-if="
                                browserPreference === 'chrome' &&
                                (checkingChrome || !chromeInstalled)
                            "
                            class="chrome-status"
                        >
                            <span v-if="checkingChrome"
                                >Checking for Google Chrome...</span
                            >
                            <span v-else>
                                Google Chrome was not found on this device.
                                <button
                                    type="button"
                                    class="set-ua-btn install-chrome-btn"
                                    @click="installChrome"
                                >
                                    <i class="fa fa-download" /> Install Chrome
                                </button>
                            </span>
                        </p>
                    </div>
                </div>
                <hr />
                <div class="settings-block">
                    <h4>User Agent</h4>
                    <div class="input-block">
                        <input
                            :value="enforcedUserAgent"
                            class="d-block"
                            type="text"
                            readonly
                        />
                        <p class="field-hint">
                            Your current user agent is enforced for all
                            sessions.
                        </p>
                    </div>
                </div>
                <hr />

                <div class="settings-block">
                    <div class="input-block">
                        <label class="checkbox-block disabled">
                            <input type="checkbox" disabled />
                            <span
                                >Disable Ads
                                <span style="font-style: italic"
                                    >(COMING SOON!)</span
                                ></span
                            >
                        </label>
                    </div>
                </div>
                <hr />

                <div class="settings-block">
                    <div class="input-block">
                        <label class="checkbox-block disabled">
                            <input type="checkbox" disabled />
                            <span
                                >Enable Proxy
                                <span style="font-style: italic"
                                    >(COMING SOON!)</span
                                ></span
                            >
                        </label>
                    </div>
                </div>
                <hr />

                <div class="settings-block">
                    <div class="input-block">
                        <label class="checkbox-block disabled">
                            <input type="checkbox" disabled />
                            <span
                                >Default Search Engine
                                <span style="font-style: italic"
                                    >(COMING SOON!)</span
                                ></span
                            >
                        </label>
                    </div>
                </div>
                <hr />
            </div>
        </div>
    </div>
</template>

<script lang="ts">
import { mapGetters, mapMutations } from "vuex";
import {
    defaultBrowserPreference,
    defaultHomePage,
    defaultUserAgent,
} from "@renderer/data/main";

function getIpcRenderer() {
    return window.electron?.ipcRenderer;
}

export default {
    data() {
        return {
            homePage: defaultHomePage,
            browserPreference: defaultBrowserPreference,
            chromeInstalled: null as null | boolean,
            checkingChrome: false,
        };
    },

    computed: {
        ...mapGetters("sessions", ["currentSession", "currentSessionIndex"]),
        enforcedUserAgent(): string {
            return defaultUserAgent;
        },
    },

    watch: {
        currentSession: {
            immediate: true,
            handler(session) {
                if (!session?.settings) {
                    return;
                }

                const sessionHomePage = session.settings.homePage?.trim();
                const resolvedHomePage = sessionHomePage || defaultHomePage;
                this.homePage = resolvedHomePage;

                if (session.settings.homePage !== resolvedHomePage) {
                    this.updateSessionSetting({
                        sessionIndex: this.currentSessionIndex,
                        k: "homePage",
                        v: resolvedHomePage,
                    });
                }

                const enforcedBrowser = defaultBrowserPreference;
                this.browserPreference = enforcedBrowser;

                if (session.settings.browser !== enforcedBrowser) {
                    this.updateSessionSetting({
                        sessionIndex: this.currentSessionIndex,
                        k: "browser",
                        v: enforcedBrowser,
                    });
                }

                const enforcedUserAgent = defaultUserAgent;

                if (session.settings.userAgent !== enforcedUserAgent) {
                    this.updateSessionSetting({
                        sessionIndex: this.currentSessionIndex,
                        k: "userAgent",
                        v: enforcedUserAgent,
                    });
                }

                if (this.browserPreference === "chrome") {
                    this.checkChromeAvailability();
                } else {
                    this.chromeInstalled = null;
                    this.checkingChrome = false;
                }
            },
        },
    },

    methods: {
        ...mapMutations("sessions", ["updateSessionSetting", "removeSession"]),

        persistHomePage() {
            if (!this.currentSession) {
                return;
            }

            const trimmedHomePage = this.homePage?.trim();
            const nextHomePage = trimmedHomePage || defaultHomePage;

            if (this.homePage !== nextHomePage) {
                this.homePage = nextHomePage;
            }

            if (this.currentSession.settings?.homePage !== nextHomePage) {
                this.updateSessionSetting({
                    sessionIndex: this.currentSessionIndex,
                    k: "homePage",
                    v: nextHomePage,
                });
            }
        },

        async checkChromeAvailability() {
            if (this.browserPreference !== "chrome") {
                this.chromeInstalled = null;
                this.checkingChrome = false;
                return;
            }

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
                this.chromeInstalled = false;
            } finally {
                this.checkingChrome = false;
            }
        },

        closeSession() {
            this.removeSession({ sessionIndex: this.currentSessionIndex });
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
    },
};
</script>

<style scoped lang="scss">
.view-settings {
    height: 100%;
    width: 100%;
    display: flex;
    flex-direction: column;
    justify-content: center;
    align-items: center;
    text-align: left;
    font-size: 16px;
    color: #3f2a08;
    overflow: auto;
    background: #ffd7a3;
    padding: 40px 20px;
}

.settings-wrap {
    width: 100%;
    max-width: 800px;
    background: #ffffff;
    border-radius: 20px;
    padding: 48px 56px;
    box-shadow: 0 12px 30px rgba(63, 42, 8, 0.12);
}

h1 {
    color: #3f2a08;
    margin-bottom: 24px;
}

.close-session-btn {
    font-family: monospace;
    text-transform: uppercase;
    background-color: #ffe1cc;
    border: 1px solid #f0a94a;
    border-radius: 8px;
    outline: 0;
    padding: 7px 12px;
    cursor: pointer;
    white-space: nowrap;
    font-weight: bold;
    color: #7a4a00;

    &:hover {
        background-color: #ffd7a3;
        border: 1px solid #e1922c;
    }
}

.session-info {
    margin-bottom: 20px;
    font-size: 14px;
    color: #7a4a00;
}

h4 {
    font-size: 13px;
    text-transform: uppercase;
    margin-bottom: 6px;
    color: #7a4a00;
}

hr {
    width: 100%;
    height: 1px;
    display: block;
    background-color: #ffca83;
    border: 0;
    opacity: 0.5;
    margin: 24px 0;
}

.settings-block {
    text-align: left;
}

.input-block {
    label {
        color: #3f2a08;
        font-size: 14px;
    }

    input[type="text"],
    input[type="url"] {
        width: 100%;
        padding: 6px;
        outline: 0;
        border: 2px solid #ffca83;
        border-radius: 6px;
        transition: 0.3s ease;

        &:read-only {
            cursor: default;
            color: gray;
            border: 2px solid #e7b26a;
        }

        &:focus {
            border: 2px solid #f0a94a;
        }
    }

    select {
        width: 100%;
        padding: 6px;
        outline: 0;
        border: 2px solid #d9d9ff;
        border-radius: 3px;
        background-color: white;
        transition: 0.3s ease;

        &:focus {
            border: 2px solid #7575dc;
        }
    }

    .radio-block {
        margin: 7px 0;
        display: block;
    }

    .checkbox-block {
        font-size: 13px;
        font-weight: bold;
        text-transform: uppercase;

        &.disabled {
            color: #c28c3d;
            cursor: not-allowed;
        }
    }
}

.set-ua-btn {
    font-family: monospace;
    text-transform: uppercase;
    background-color: #ffca83;
    border: 1px solid #f0a94a;
    border-radius: 8px;
    outline: 0;
    padding: 7px 12px;
    margin-left: 12px;
    cursor: pointer;
    white-space: nowrap;
    color: #3f2a08;

    &:hover {
        background-color: #ffd7a3;
        border: 1px solid #e1922c;

        i {
            transform: rotate(360deg);
        }
    }

    i {
        transition: 0.5s ease;
    }
}

.chrome-status {
    margin-top: 8px;
    font-size: 13px;
    color: #27262e;
}

.install-chrome-btn {
    margin-left: 8px;
}

.field-hint {
    margin-top: 8px;
    font-size: 12px;
    color: #999;
}
</style>
