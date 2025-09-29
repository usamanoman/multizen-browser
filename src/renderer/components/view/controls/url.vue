<template>
    <input
        ref="urlInput"
        type="text"
        class="input-url"
        placeholder="Type URL here"
        spellcheck="false"
        :value="value"
        @focus="onFocus($event)"
        @keyup.enter="(e: any) => $emit('navigate', getWebUri(e.target?.value))"
    />
</template>

<script lang="ts">
import URI from "urijs";
import { InputHTMLAttributes, ref } from "vue";
import { mapGetters } from "vuex";

const urlInput = ref<InputHTMLAttributes | null>(null);

const props = {
    value: {
        type: String,
        default: null,
    },
};

export default {
    props,
    emits: ["navigate"],
    computed: {
        ...mapGetters("sessions", ["currentSession"]),
    },

    mounted() {
        if (
            urlInput.value &&
            urlInput.value === this.currentSession.settings.homePage
        ) {
            urlInput.value.value.focus();
            urlInput.value.value.select();
        }
    },

    methods: {
        getWebUri(value: string) {
            const trimmed = value?.trim?.() ?? "";

            if (!trimmed) {
                return "";
            }

            if (this.looksLikeSearchQuery(trimmed)) {
                return `https://www.google.com/search?q=${encodeURIComponent(trimmed)}`;
            }

            const uri = URI(trimmed);
            const protocol = uri.protocol();

            if (!protocol) {
                uri.protocol("https");
            }

            return uri.toString();
        },

        looksLikeSearchQuery(value: string) {
            if (!value) {
                return true;
            }

            if (/\s/.test(value)) {
                return true;
            }

            const lowerValue = value.toLowerCase();

            const hasProtocol = /^[a-z][a-z0-9+.-]*:\/\//.test(lowerValue);
            if (hasProtocol) {
                return false;
            }

            if (lowerValue.startsWith("localhost")) {
                return false;
            }

            if (/^(?:\d{1,3}\.){3}\d{1,3}(?::\d+)?(\/.*)?$/.test(lowerValue)) {
                return false;
            }

            if (/^[\w-]+(\.[\w-]+)+(?:[:\/].*)?$/.test(lowerValue)) {
                return false;
            }

            if (/^www\./.test(lowerValue)) {
                return false;
            }

            return true;
        },

        onFocus(event) {
            event.target.focus();
        },
    },
};
</script>

<style scoped lang="scss">
.input-url {
    height: 100%;
    width: 100%;
    padding: 12px;
    color: #3f2a08;
    border: 1px solid #f0a94a;
    background-color: #ffffff;
    border-radius: 12px;
    font-family: monospace;

    &:focus {
        outline: 2px solid #ffca83;
    }
}
</style>
