import type { ThemeOptions } from "@mui/material/styles";

const LIGHT_PRIMARY_MAIN = "#3B82F6";
const LIGHT_PRIMARY_LIGHT = "#93C5FD";
const LIGHT_PRIMARY_DARK = "#1D4ED8";

const LIGHT_SECONDARY_MAIN = "#FACC15";
const LIGHT_SECONDARY_LIGHT = "#FEF08A";
const LIGHT_SECONDARY_DARK = "#CA8A04";

const LIGHT_BG = "#F8FAFC";
const LIGHT_BG_PAPER = "#FFFFFF";

const LIGHT_TEXT_PRIMARY = "#0F172A";
const LIGHT_TEXT_SECONDARY = "#475569";

const LIGHT_DIVIDER = "rgba(15, 23, 42, 0.08)";

const LIGHT_SUCCESS = "#22C55E";
const LIGHT_WARNING = "#F59E0B";
const LIGHT_ERROR = "#EF4444";

const DARK_PRIMARY_MAIN = "#8B5CF6";
const DARK_PRIMARY_LIGHT = "#C4B5FD";
const DARK_PRIMARY_DARK = "#6D28D9";

const DARK_SECONDARY_MAIN = "#0EA5E9";
const DARK_SECONDARY_LIGHT = "#67E8F9";
const DARK_SECONDARY_DARK = "#0369A1";

const DARK_BG = "#020617";
const DARK_BG_PAPER = "#0B1120";

const DARK_TEXT_PRIMARY = "#E2E8F0";
const DARK_TEXT_SECONDARY = "#94A3B8";

const DARK_DIVIDER = "rgba(148, 163, 184, 0.2)";

const DARK_SUCCESS = "#34D399";
const DARK_WARNING = "#FBBF24";
const DARK_ERROR = "#F87171";

const commonComponents: ThemeOptions["components"] = {
    MuiButton: {
        styleOverrides: {
            root: {
                borderRadius: 999,
                textTransform: "none",
                fontWeight: 600,
                height: 40,
                padding: "0 16px",
            },
            containedPrimary: ({ theme }) => ({
                backgroundImage:
                    theme.palette.mode === "light"
                        ? "linear-gradient(135deg, #3B82F6, #2563EB)"
                        : "linear-gradient(135deg, #8B5CF6, #0EA5E9)",
                boxShadow: "0 4px 12px rgba(0,0,0,0.12)",
            }),
            containedSecondary: ({ theme }) => ({
                backgroundImage: `linear-gradient(135deg, ${theme.palette.secondary.main}, ${theme.palette.secondary.dark})`,
                boxShadow: "0 4px 12px rgba(0,0,0,0.12)",
            }),
        },
    },
    MuiPaper: {
        styleOverrides: {
            root: {
                borderRadius: 12,
                boxShadow: "0 1px 3px rgba(0,0,0,0.08)",
            },
        },
    },
    MuiTextField: {
        defaultProps: {
            variant: "outlined",
        },
    },
    MuiOutlinedInput: {
        styleOverrides: {
            root: ({ theme }) => ({
                borderRadius: 10,
                height: 40,
                "& .MuiOutlinedInput-notchedOutline": {
                    borderColor:
                        theme.palette.mode === "light"
                            ? "rgba(15, 23, 42, 0.15)"
                            : "rgba(148, 163, 184, 0.3)",
                },
                "&:hover .MuiOutlinedInput-notchedOutline": {
                    borderColor: theme.palette.secondary.main,
                },
                "&.Mui-focused .MuiOutlinedInput-notchedOutline": {
                    borderColor: theme.palette.primary.main,
                    borderWidth: 2,
                },
            }),
        },
    },
    MuiTableRow: {
        styleOverrides: {
            root: ({ theme }) => ({
                height: 48,
                "&:hover": {
                    backgroundColor:
                        theme.palette.mode === "light"
                            ? "rgba(0,0,0,0.02)"
                            : "rgba(255,255,255,0.04)",
                },
            }),
        },
    },
    MuiChip: {
        styleOverrides: {
            root: {
                borderRadius: 8,
                fontWeight: 500,
            },
        },
    },
    MuiBottomNavigationAction: {
        styleOverrides: {
            root: ({ theme }) => ({
                "&.Mui-selected": {
                    color: theme.palette.secondary.main,
                },
            }),
        },
    },
};

export const lightThemeOptions: ThemeOptions = {
    palette: {
        mode: "light",
        primary: {
            main: LIGHT_PRIMARY_MAIN,
            light: LIGHT_PRIMARY_LIGHT,
            dark: LIGHT_PRIMARY_DARK,
            contrastText: "#ffffff",
        },
        secondary: {
            main: LIGHT_SECONDARY_MAIN,
            light: LIGHT_SECONDARY_LIGHT,
            dark: LIGHT_SECONDARY_DARK,
            contrastText: "#1f2937",
        },
        success: {
            main: LIGHT_SUCCESS,
        },
        warning: {
            main: LIGHT_WARNING,
        },
        error: {
            main: LIGHT_ERROR,
        },
        background: {
            default: LIGHT_BG,
            paper: LIGHT_BG_PAPER,
        },
        text: {
            primary: LIGHT_TEXT_PRIMARY,
            secondary: LIGHT_TEXT_SECONDARY,
        },
        divider: LIGHT_DIVIDER,
    },
    components: commonComponents,
};

export const darkThemeOptions: ThemeOptions = {
    palette: {
        mode: "dark",
        primary: {
            main: DARK_PRIMARY_MAIN,
            light: DARK_PRIMARY_LIGHT,
            dark: DARK_PRIMARY_DARK,
            contrastText: "#ffffff",
        },
        secondary: {
            main: DARK_SECONDARY_MAIN,
            light: DARK_SECONDARY_LIGHT,
            dark: DARK_SECONDARY_DARK,
            contrastText: "#020617",
        },
        success: {
            main: DARK_SUCCESS,
        },
        warning: {
            main: DARK_WARNING,
        },
        error: {
            main: DARK_ERROR,
        },
        background: {
            default: DARK_BG,
            paper: DARK_BG_PAPER,
        },
        text: {
            primary: DARK_TEXT_PRIMARY,
            secondary: DARK_TEXT_SECONDARY,
        },
        divider: DARK_DIVIDER,
    },
    components: commonComponents,
};
