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
                            :value="homePage"
                            class="d-block"
                            type="url"
                            readonly
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
                            Chrome's default user agent is enforced for all
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
    defaultUserAgent as chromeLikeUserAgent,
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
            return chromeLikeUserAgent;
        },
    },

    watch: {
        currentSession: {
            immediate: true,
            handler(session) {
                if (!session?.settings) {
                    return;
                }

                const enforcedHomePage = defaultHomePage;
                this.homePage = enforcedHomePage;

                if (session.settings.homePage !== enforcedHomePage) {
                    this.updateSessionSetting({
                        sessionIndex: this.currentSessionIndex,
                        k: "homePage",
                        v: enforcedHomePage,
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

                const enforcedUserAgent = chromeLikeUserAgent;

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
    color: #6c6969;
    overflow: auto;
}

.settings-wrap {
    width: 100%;
    max-width: 800px;
    height: 100%;
    padding-top: 100px;
}

.close-session-btn {
    font-family: monospace;
    text-transform: uppercase;
    background-color: #f8c9c9;
    border: 1px solid #dc7575;
    border-radius: 5px;
    outline: 0;
    padding: 5px 9px;
    cursor: pointer;
    white-space: nowrap;
    font-weight: bold;

    &:hover {
        background-color: #f8d8d8;
        border: 1px solid #cc4242;
    }
}

.session-info {
    margin-bottom: 20px;
    font-size: 14px;
}

h4 {
    font-size: 13px;
    text-transform: uppercase;
    margin-bottom: 6px;
}

hr {
    width: 100%;
    height: 1px;
    display: block;
    background-color: #d8d8d8;
    border: 0;
    margin: 16px 0;
}

.settings-block {
    text-align: left;
}

.input-block {
    label {
        color: #27262e;
        font-size: 14px;
    }

    input[type="text"],
    input[type="url"] {
        width: 100%;
        padding: 6px;
        outline: 0;
        border: 2px solid #d9d9ff;
        border-radius: 3px;
        transition: 0.3s ease;

        &:read-only {
            cursor: default;
            color: gray;
            border: 2px solid #bebebe;
        }

        &:focus {
            border: 2px solid #7575dc;
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
            color: #999;
            cursor: not-allowed;
        }
    }
}

.set-ua-btn {
    font-family: monospace;
    text-transform: uppercase;
    background-color: #c9c9f8;
    border: 1px solid #7575dc;
    border-radius: 5px;
    outline: 0;
    padding: 5px 9px;
    margin-left: 12px;
    cursor: pointer;
    white-space: nowrap;

    &:hover {
        background-color: #d8d8f8;
        border: 1px solid #4242cc;

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
