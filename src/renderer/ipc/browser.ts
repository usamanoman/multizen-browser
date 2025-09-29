function getIpcRenderer() {
    return window.electron?.ipcRenderer;
}

export async function configureSessionLanguage(
    sessionId: string | null,
    language: string | null,
): Promise<boolean> {
    const ipcRenderer = getIpcRenderer();

    if (!ipcRenderer) {
        return false;
    }

    try {
        await ipcRenderer.invoke("browser:configure-session", {
            sessionId,
            language,
        });

        return true;
    } catch (error) {
        console.error("Failed to configure session language", error);
        return false;
    }
}
