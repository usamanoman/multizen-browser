import { CHROME_EXTENSION_ID } from "./constants";

export type InstalledExtension = {
    id: string;
    name: string;
    description: string;
    badge?: string | null;
};

export const INSTALLED_EXTENSIONS: InstalledExtension[] = [
    {
        id: CHROME_EXTENSION_ID,
        name: "ReachOwl Copy Cookies",
        description: "Copy cookies from the active tab to your clipboard.",
        badge: "RC",
    },
];
