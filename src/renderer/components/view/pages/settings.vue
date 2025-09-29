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
                            v-model="homePage"
                            class="d-block"
                            type="url"
                            required
                            @blur="saveHomePage"
                            @change="saveHomePage"
                        />
                    </div>
                </div>
                <hr />
                <div class="settings-block">
                    <h4>User Agent</h4>
                    <div class="input-block">
                        <div class="d-flex">
                            <input
                                v-model="userAgent"
                                class="d-block"
                                type="text"
                                @blur="saveUserAgent"
                                @change="saveUserAgent"
                            />
                            <button
                                class="set-ua-btn"
                                @click="setDefaultUserAgent"
                            >
                                <i class="fa fa-globe" /> Set default
                            </button>

                            <button
                                class="set-ua-btn"
                                @click="setRandomUserAgent"
                            >
                                <i class="fa fa-refresh" /> Get random
                            </button>
                        </div>
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
import userAgents from "@renderer/user-agents/useragents.json";

const defaultUserAgent = window.navigator.userAgent;

export default {
    data() {
        return {
            userAgent: "",
            homePage: "",
            defaultUserAgent,
        };
    },

    computed: {
        ...mapGetters("sessions", ["currentSession", "currentSessionIndex"]),
    },

    created() {
        this.userAgent = this.currentSession.settings.userAgent;
        this.homePage = this.currentSession.settings.homePage;
    },

    methods: {
        ...mapMutations("sessions", ["updateSessionSetting", "removeSession"]),

        saveHomePage() {
            this.homePage = this.urlify(this.homePage.trim());
            this.updateSessionSetting({
                sessionIndex: this.currentSessionIndex,
                k: "homePage",
                v: this.homePage,
            });
        },

        setDefaultUserAgent() {
            this.userAgent = defaultUserAgent;
            this.saveUserAgent();
        },

        setRandomUserAgent() {
            this.userAgent = this.getRandomUserAgent();
            this.saveUserAgent();
        },

        saveUserAgent() {
            this.updateSessionSetting({
                sessionIndex: this.currentSessionIndex,
                k: "userAgent",
                v: this.userAgent,
            });
        },

        closeSession() {
            this.removeSession({ sessionIndex: this.currentSessionIndex });
        },

        urlify(url) {
            return url.indexOf("://") === -1 ? "https://" + url : url;
        },

        getRandomUserAgent() {
            return userAgents[Math.floor(Math.random() * userAgents.length)];
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
</style>
