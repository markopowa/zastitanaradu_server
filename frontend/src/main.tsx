import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { Provider } from "react-redux";
import { ThemeProvider, createTheme } from "@mui/material/styles";
import CssBaseline from "@mui/material/CssBaseline";
import { SnackbarProvider } from "notistack";

import App from "./App.tsx";
import AuthInitializer from "./components/AuthInitializer";
import { store } from "./store";
import { lightThemeOptions, darkThemeOptions } from "./theme";
import "./index.css";
import "./App.css";

const getThemePreference = (): boolean => {
    if (typeof matchMedia !== "undefined") {
        return matchMedia("(prefers-color-scheme: dark)").matches;
    }
    return false;
};

const theme = createTheme(
    getThemePreference() ? darkThemeOptions : lightThemeOptions,
);

ReactDOM.createRoot(document.getElementById("root")!).render(
    <React.StrictMode>
        <Provider store={store}>
            <BrowserRouter>
                <ThemeProvider theme={theme}>
                    <CssBaseline />
                    <SnackbarProvider
                        maxSnack={3}
                        anchorOrigin={{
                            vertical: "bottom",
                            horizontal: "right",
                        }}
                        autoHideDuration={3000}
                    >
                        <AuthInitializer>
                            <App />
                        </AuthInitializer>
                    </SnackbarProvider>
                </ThemeProvider>
            </BrowserRouter>
        </Provider>
    </React.StrictMode>,
);
