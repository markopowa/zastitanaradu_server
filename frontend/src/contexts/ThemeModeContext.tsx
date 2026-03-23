import {
    createContext,
    useCallback,
    useContext,
    useMemo,
    useState,
    type ReactNode,
} from "react";
import {
    ThemeProvider as MuiThemeProvider,
    createTheme,
} from "@mui/material/styles";

import { lightThemeOptions, darkThemeOptions } from "../theme";
import {
    getStoredPaletteMode,
    setStoredPaletteMode,
    type PaletteMode,
} from "../themePreference";

type ThemeModeContextValue = {
    mode: PaletteMode;
    setMode: (mode: PaletteMode) => void;
};

const ThemeModeContext = createContext<ThemeModeContextValue | null>(null);

export function ThemeModeProvider({ children }: { children: ReactNode }) {
    const [mode, setModeState] = useState<PaletteMode>(() =>
        getStoredPaletteMode(),
    );
    const setMode = useCallback((m: PaletteMode) => {
        setModeState(m);
        setStoredPaletteMode(m);
    }, []);
    const theme = useMemo(
        () =>
            createTheme(mode === "dark" ? darkThemeOptions : lightThemeOptions),
        [mode],
    );
    const value = useMemo(() => ({ mode, setMode }), [mode, setMode]);
    return (
        <ThemeModeContext.Provider value={value}>
            <MuiThemeProvider theme={theme}>{children}</MuiThemeProvider>
        </ThemeModeContext.Provider>
    );
}

export function useThemeMode(): ThemeModeContextValue {
    const ctx = useContext(ThemeModeContext);
    if (!ctx) {
        throw new Error("useThemeMode must be used within ThemeModeProvider");
    }
    return ctx;
}
