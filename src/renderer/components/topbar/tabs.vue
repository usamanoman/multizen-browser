<template>
    <div v-if="currentSession" class="tabs-container">
        <div
            v-for="(tab, index) in tabs"
            :key="tab.id"
            class="tab"
            :class="{ active: currentSession.currentTabIndex === index }"
            @click.stop="
                setActiveTab({
                    sessionIndex: currentSessionIndex,
                    tabIndex: index,
                })
            "
        >
            <div v-if="tab.type === 'settings'" class="tab-name">
                <img class="tab-favicon" src="../../assets/icons/icon.png" />
                <div>Session settings</div>
            </div>

            <div v-if="tab.type !== 'settings'" class="tab-name">
                <img
                    v-if="tab.favicon"
                    class="tab-favicon"
                    :src="tab.favicon"
                />
                <img
                    v-else
                    class="tab-favicon"
                    src="../../assets/icons/icon.png"
                />
                <div class="tab-title">
                    {{ tab.title || "New Tab" }}
                </div>

                <button
                    class="tab-close-btn"
                    @click.stop="removeTabWithIndex(index)"
                >
                    <i class="fa fa-times" />
                </button>
            </div>
        </div>

        <button class="new-tab-btn" @click="newTab">
            <i class="fa fa-plus" />
        </button>
    </div>
</template>

<script lang="ts">
import { mapGetters, mapMutations } from "vuex";

export default {
    computed: {
        ...mapGetters("sessions", [
            "currentSession",
            "currentTab",
            "sessions",
            "currentSessionIndex",
        ]),

        tabs() {
            return this.currentSession.tabs;
        },
    },

    methods: {
        ...mapMutations("sessions", ["addTab", "removeTab", "setActiveTab"]),

        newTab() {
            this.addTab({ sessionIndex: this.currentSessionIndex });
        },

        removeTabWithIndex(index: number) {
            this.removeTab({
                sessionIndex: this.currentSessionIndex,
                tabIndex: index,
            });
        },
    },
};
</script>

<style scoped lang="scss">
.tabs-container {
    display: flex;
    color: #3f2a08;
    padding-right: 5px;
    padding-left: 56px;
    margin-top: auto;
    overflow: visible;
    -webkit-app-region: no-drag;
}

.tab {
    display: flex;
    position: relative;
    background-color: rgba(255, 215, 163, 0.7);
    padding: 8px 10px 6px 10px;
    margin-right: 6px;
    border-radius: 5px 5px 0 0;
    color: inherit;
    box-shadow: 0 1px 2px rgba(63, 42, 8, 0.12);
    border: 1px solid transparent;
    transition: background-color 0.2s ease, box-shadow 0.2s ease;

    &:hover {
        background-color: rgba(255, 215, 163, 0.9);
    }

    &.active {
        background-color: #ffffff;
        border-color: #ffca83;
        box-shadow: 0 2px 6px rgba(63, 42, 8, 0.18);
    }

    .tab-name {
        display: flex;
        max-width: 150px;
        align-items: center;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
    }

    .tab-favicon {
        width: 16px;
        height: 16px;
        margin-right: 6px;
    }

    .tab-title {
        padding-right: 18px;
        text-overflow: ellipsis;
        overflow: hidden;
    }

    .tab-close-btn {
        position: absolute;
        right: 5px;
        width: 20px;
        height: 20px;
        font-size: 10px;
        background-color: transparent;
        border: 0;
        outline: 0;
        color: #7a4a00;
        border-radius: 50%;

        &:hover {
            background-color: rgba(255, 202, 131, 0.35);
        }
    }
}

.new-tab-btn {
    display: flex;
    justify-content: center;
    align-items: center;
    width: 26px;
    height: 26px;
    background-color: transparent;
    border: 0;
    outline: 0;
    color: #3f2a08;
    border-radius: 50%;
    transition: background-color 0.2s ease;

    &:hover {
        background-color: rgba(255, 202, 131, 0.25);
    }
}
</style>
