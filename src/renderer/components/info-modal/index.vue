<template>
    <div v-if="showModal" class="modal" @click.self="showModal = false">
        <div class="modal-content">
            <span class="close" @click="showModal = false">&times;</span>
            <h2>Welcome to ReachOwl Runner v.{{ version }}!</h2>
            <p>
                We're excited to have you here. ReachOwl Runner is an open-source
                browser built for calm, multi-session focus.
            </p>
            <p>
                If you need any assistance or want to contribute, please reach
                out:
            </p>
            <a
                href="https://github.com/multizenteam/multizen-browser.git"
                target="_blank"
                >Contribute on github</a
            >
            <span> or </span>
            <a href="https://discord.gg/pd6MhzPbJ3" target="_blank"
                >Join Discord community</a
            >
        </div>
    </div>
</template>

<script lang="ts">
import { EventBus } from "@renderer/utils/event-bus";
import { version } from "../../../../package.json";

export default {
    data() {
        return {
            showModal: false,
            version: version,
        };
    },

    created() {
        EventBus.on("open-info-modal", () => {
            this.showModal = true;
        });
    },
};
</script>

<style scoped lang="scss">
.modal {
    display: flex;
    justify-content: center;
    align-items: center;
    position: fixed;
    z-index: 1;
    left: 0;
    top: 0;
    width: 100%;
    height: 100%;
    overflow: auto;
    background-color: rgba(0, 0, 0, 0.4);
    cursor: default;
    color: #3f2a08;

    h2 {
        margin-bottom: 20px;
    }

    a {
        color: #8f4b00;
        font-weight: bold;
        text-decoration: none;

        &:hover {
            color: #5f3200;
            text-decoration: underline;
        }
    }
}

.modal-content {
    margin: auto;
    padding: 20px 30px 30px 30px;
    border: 2px solid #ffca83;
    width: 650px;
    border-radius: 6px;
    background-color: #ffffff;
    box-shadow: 0 18px 36px rgba(63, 42, 8, 0.16);
}

.close {
    color: #8f4b00;
    float: right;
    font-size: 28px;
    font-weight: bold;
}

.close:hover,
.close:focus {
    color: #5f3200;
    text-decoration: none;
    cursor: pointer;
}
</style>
