import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { Provider } from "react-redux";
import CssBaseline from "@mui/material/CssBaseline";
import IconButton from "@mui/material/IconButton";
import CloseIcon from "@mui/icons-material/Close";
import { SnackbarProvider, closeSnackbar } from "notistack";

import App from "./App.tsx";
import AuthInitializer from "./components/AuthInitializer";
import { ThemeModeProvider } from "./contexts/ThemeModeContext";
import { store } from "./store";
import "./index.css";
import "./App.css";

ReactDOM.createRoot(document.getElementById("root")!).render(
    <React.StrictMode>
        <Provider store={store}>
            <BrowserRouter>
                <ThemeModeProvider>
                    <CssBaseline />
                    <SnackbarProvider
                        maxSnack={3}
                        anchorOrigin={{
                            vertical: "bottom",
                            horizontal: "right",
                        }}
                        autoHideDuration={3000}
                        action={(snackbarId) => (
                            <IconButton
                                size="small"
                                color="inherit"
                                aria-label="Zatvori"
                                onClick={() => closeSnackbar(snackbarId)}
                            >
                                <CloseIcon fontSize="small" />
                            </IconButton>
                        )}
                    >
                        <AuthInitializer>
                            <App />
                        </AuthInitializer>
                    </SnackbarProvider>
                </ThemeModeProvider>
            </BrowserRouter>
        </Provider>
    </React.StrictMode>,
);
