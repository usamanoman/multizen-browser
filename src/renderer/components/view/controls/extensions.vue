<template>
    <div class="extensions-bar">
        <button
            v-for="extension in extensions"
            :key="extension.id"
            class="extensions-button"
            :disabled="executing"
            :title="extension.description || extension.name"
            type="button"
            @click="$emit('activate', extension)"
        >
            <span class="extensions-button-badge">{{ extension.badge || extension.name.charAt(0) }}</span>
            <span class="extensions-button-label">{{ extension.name }}</span>
        </button>
    </div>
</template>

<script lang="ts">
import type { PropType } from "vue";
import type { InstalledExtension } from "@shared/extensions";

export default {
    name: "ExtensionsBar",
    props: {
        extensions: {
            type: Array as PropType<InstalledExtension[]>,
            default: () => [],
        },
        executing: {
            type: Boolean,
            default: false,
        },
    },
    emits: ["activate"],
};
</script>

<style scoped lang="scss">
.extensions-bar {
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 6px 10px;
    background: #f3ba6c;
    border-bottom: 1px solid #f0a94a;
}

.extensions-button {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    border: 0;
    border-radius: 16px;
    padding: 6px 12px;
    background: rgba(63, 42, 8, 0.1);
    color: #3f2a08;
    font-size: 12px;
    cursor: pointer;
    transition: background-color 0.2s ease, opacity 0.2s ease;

    &:hover:not(:disabled) {
        background: rgba(63, 42, 8, 0.18);
    }

    &:disabled {
        cursor: wait;
        opacity: 0.7;
    }
}

.extensions-button-badge {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 20px;
    height: 20px;
    border-radius: 10px;
    background: #3f2a08;
    color: #ffd7a3;
    font-weight: 600;
    font-size: 10px;
    text-transform: uppercase;
}

.extensions-button-label {
    white-space: nowrap;
}
</style>
