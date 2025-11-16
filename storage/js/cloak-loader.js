document.addEventListener("DOMContentLoaded", () => {
    const savedPreset = document.cookie
        .split("; ")
        .find(row => row.startsWith("tabCloakPreset="));

    if (!savedPreset) return;

    const preset = savedPreset.split("=")[1];
    if (preset) {
        setCloak(preset);
    }
});

// storage/js/cloak.js