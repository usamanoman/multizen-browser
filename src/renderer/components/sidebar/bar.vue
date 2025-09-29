<template>
    <div class="sidebar-container">
        <session-tabs>
            <session-tab
                title="New session"
                class="new-session"
                @click.enter="setNewSession"
            >
                <i class="fa fa-plus" />
            </session-tab>

            <session-tab
                v-for="(s, k) in sessions"
                :key="s.id"
                :style="{ filter: `hue-rotate(${k * 42}deg)` }"
                :active="k === currentSessionIndex"
                @click.enter="setActiveSession(k)"
            />
        </session-tabs>
        <side-footer />
    </div>
</template>

<script lang="ts">
import SideFooter from "./footer.vue";
import SessionTabs from "./session-tabs/session-tabs.vue";
import SessionTab from "./session-tabs/session-tab.vue";
import { mapGetters, mapMutations } from "vuex";

export default {
    components: {
        SessionTab,
        SessionTabs,
        SideFooter,
    },

    computed: {
        ...mapGetters("sessions", [
            "currentSession",
            "sessions",
            "currentSessionIndex",
        ]),
    },

    methods: {
        ...mapMutations("sessions", [
            "addSession",
            "removeSession",
            "setActiveSession",
        ]),

        setNewSession() {
            this.addSession();
        },
    },
};
</script>

<style scoped lang="scss">
.sidebar-container {
    width: 56px;
    background: #ffd7a3;
    height: 100%;
    color: #3f2a08;
    display: flex;
    flex-direction: column;
    user-select: none;
    box-shadow: 4px 0 12px rgba(63, 42, 8, 0.12);
}
</style>
