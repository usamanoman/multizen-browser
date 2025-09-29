<template>
    <div class="session-tab" :class="{ active }">
        <slot>
            <img
                src="@renderer/assets/icons/icon.png"
                class="session-tab-icon"
            />
        </slot>
    </div>
</template>

<script lang="ts">
const props = {
    active: {
        type: Boolean,
        default: false,
    },
};

export default {
    props,
};
</script>

<style scoped lang="scss">
.session-tab {
    -webkit-app-region: no-drag;
    width: 48px;
    height: 48px;
    margin: 3px 0;
    padding: 8px;
    border: 1px solid transparent;
    cursor: pointer;
    transition: 0.3s ease;
    border-radius: 16px;

    &:hover {
        background-color: rgba(255, 202, 131, 0.35);
        border-radius: 50%;
    }

    &.active {
        background-color: rgba(255, 202, 131, 0.8);
        border-radius: 50%;
    }

    i {
        color: #7a4a00;
    }

    &.new-session {
        width: 42px;
        height: 42px;
        display: flex;
        align-items: center;
        justify-content: center;
        margin: 10px 0;
        border: 1px solid rgba(255, 202, 131, 0.6);
        border-radius: 12px;
        color: #7a4a00;
        font-size: 18px;
        transition: 0.5s ease;
        background-color: rgba(255, 215, 163, 0.6);

        &:hover {
            color: #5f3200;
            border-color: rgba(255, 202, 131, 0.9);
            background-color: rgba(255, 215, 163, 0.85);
        }

        i {
            color: #7a4a00;
        }
    }

    .session-tab-icon {
        width: 100%;
        height: 100%;
    }
}
</style>
