import type { ThemeOptions } from "@mui/material/styles";

export const lightThemeOptions: ThemeOptions = {
  palette: {
    mode: "light",
    primary: {
      main: "#2563eb",
    },
    warning: {
      main: "#f59e0b",
      light: "#fef3c7",
      contrastText: "#92400e",
    },
    background: {
      default: "#f3f4f6",
      paper: "#ffffff",
    },
  },
};

export const darkThemeOptions: ThemeOptions = {
  palette: {
    mode: "dark",
    primary: {
      main: "#3b82f6",
    },
    warning: {
      main: "#f59e0b",
      light: "#78350f",
      contrastText: "#fef3c7",
    },
    background: {
      default: "#0f172a",
      paper: "#1e293b",
    },
  },
};

function getThemePreference(): boolean {
  if (typeof matchMedia !== "undefined") {
    return matchMedia("(prefers-color-scheme: dark)").matches;
  }
  return false;
}

export function getPreferredThemeOptions(): ThemeOptions {
  return getThemePreference() ? darkThemeOptions : lightThemeOptions;
}
