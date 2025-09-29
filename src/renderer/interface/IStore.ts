export type BrowserPreference = "chrome";

export interface ITab {
    id: string;
    type?: "settings";
    favicon?: string | null;
    title: string;
    url?: string;
    session: string;
}

export interface ISession {
    tabs: ITab[];
    settings: {
        homePage: string;
        userAgent: string;
        browser: BrowserPreference;
    };
    id: string;
    currentTabIndex: number;
}

export interface IState {
    currentSessionIndex: number;
    sessions: ISession[];
}
