<template>
    <div class="side-footer">
        <button class="open-info-modal-btn" @click="openInfoModal">
            <i class="fa fa-question" />
        </button>
        <span>{{ version }}</span>
    </div>
</template>

<script lang="ts">
import { EventBus } from "@renderer/utils/event-bus";
import { version } from "./../../../../package.json";

export default {
    computed: {
        version() {
            return version;
        },
    },

    methods: {
        openInfoModal() {
            EventBus.emit("open-info-modal");
        },
    },
};
</script>

<style scoped lang="scss">
.side-footer {
    display: flex;
    flex-direction: column;
    justify-content: center;
    align-items: center;
    min-height: 20px;
    padding-bottom: 10px;
    font-size: 10px;
    text-align: center;
    color: #7a4a00;

    a {
        margin: 2px 0;
        color: inherit;
        text-decoration: none;
        cursor: pointer;
        transition: 0.2s ease;

        &:hover {
            color: #5f3200;
        }
    }
}

.open-info-modal-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    background-color: #ffca83;
    border: 1px solid #f0a94a;
    outline: 0;
    border-radius: 8px;
    margin-bottom: 5px;
    cursor: pointer;
    color: #3f2a08;
    width: 28px;
    height: 28px;
    transition: 0.3s ease;

    &:hover {
        background-color: #ffd7a3;
    }
}
</style>
