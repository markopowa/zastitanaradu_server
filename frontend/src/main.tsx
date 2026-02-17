import { StrictMode, useEffect, useMemo, useState } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { Provider } from "react-redux";
import { ThemeProvider, createTheme } from "@mui/material/styles";
import CssBaseline from "@mui/material/CssBaseline";
import { SnackbarProvider } from "notistack";

import App from "./App.tsx";
import "./index.css";
import "./App.css";
import { store } from "./store";
import { loadMe } from "./store/authSlice";
import { darkThemeOptions, lightThemeOptions } from "./theme";

store.dispatch(loadMe());

function getPrefersDark(): boolean {
    if (typeof matchMedia !== "undefined") {
        return matchMedia("(prefers-color-scheme: dark)").matches;
    }
    return false;
}

function ThemeWrapper({ children }: { children: React.ReactNode }) {
    const [prefersDark, setPrefersDark] = useState(getPrefersDark);

    useEffect(() => {
        const m = matchMedia("(prefers-color-scheme: dark)");
        const handler = (): void => setPrefersDark(m.matches);
        m.addEventListener("change", handler);
        return () => m.removeEventListener("change", handler);
    }, []);

    const theme = useMemo(
        () => createTheme(prefersDark ? darkThemeOptions : lightThemeOptions),
        [prefersDark],
    );

    return <ThemeProvider theme={theme}>{children}</ThemeProvider>;
}

createRoot(document.getElementById("root") as HTMLElement).render(
    <StrictMode>
        <Provider store={store}>
            <BrowserRouter>
                <ThemeWrapper>
                    <CssBaseline />
                    <SnackbarProvider
                        maxSnack={3}
                        anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
                        autoHideDuration={3000}
                    >
                        <App />
                    </SnackbarProvider>
                </ThemeWrapper>
            </BrowserRouter>
        </Provider>
    </StrictMode>,
);
