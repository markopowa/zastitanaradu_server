import { alpha, type ThemeOptions } from "@mui/material/styles";

const CH_LIGHT_BCCCDC = "#BCCCDC";
const CH_LIGHT_9AA6B2 = "#9AA6B2";

const CH_DARK_0C2B4E = "#0C2B4E";
const CH_DARK_1A3D64 = "#1A3D64";
const CH_DARK_1D546C = "#1D546C";
const CH_DARK_F4F4F4 = "#F4F4F4";

const LIGHT_BG = "#EAF3FC";
const LIGHT_BG_PAPER = "#F5F9FD";

const LIGHT_PRIMARY_MAIN = "#4A6FA5";
const LIGHT_PRIMARY_LIGHT = CH_LIGHT_BCCCDC;
const LIGHT_PRIMARY_DARK = "#355A7A";

const LIGHT_SECONDARY_MAIN = CH_LIGHT_9AA6B2;
const LIGHT_SECONDARY_LIGHT = CH_LIGHT_BCCCDC;
const LIGHT_SECONDARY_DARK = "#7A8794";

const LIGHT_TEXT_PRIMARY = "#1E293B";
const LIGHT_TEXT_SECONDARY = CH_LIGHT_9AA6B2;

const LIGHT_DIVIDER = alpha(CH_LIGHT_BCCCDC, 0.65);

const LIGHT_SUCCESS = "#22C55E";
const LIGHT_INFO = "#38BDF8";
const LIGHT_WARNING = "#F59E0B";
const LIGHT_ERROR = "#EF4444";

const DARK_BG = CH_DARK_0C2B4E;
const DARK_BG_PAPER = CH_DARK_1A3D64;

const DARK_PRIMARY_MAIN = CH_DARK_1D546C;
const DARK_PRIMARY_LIGHT = "#3E87A8";
const DARK_PRIMARY_DARK = CH_DARK_0C2B4E;

const DARK_SECONDARY_MAIN = "#356B88";
const DARK_SECONDARY_LIGHT = "#5E9AB8";
const DARK_SECONDARY_DARK = CH_DARK_1A3D64;

const DARK_TEXT_PRIMARY = CH_DARK_F4F4F4;
const DARK_TEXT_SECONDARY = alpha(CH_DARK_F4F4F4, 0.62);

const DARK_DIVIDER = alpha(CH_DARK_F4F4F4, 0.14);

const DARK_SUCCESS = "#34D399";
const DARK_INFO = "#60A5FA";
const DARK_WARNING = "#FBBF24";
const DARK_ERROR = "#F87171";

const commonComponents: ThemeOptions["components"] = {
    MuiButton: {
        styleOverrides: {
            root: ({ theme }) => ({
                borderRadius: 999,
                textTransform: "none",
                fontWeight: 600,
                minHeight: 40,
                padding: "0 16px",
                whiteSpace: "nowrap",
                "&.MuiButton-sizeSmall": {
                    minHeight: 32,
                    padding: "6px 12px",
                    fontSize: "0.8125rem",
                },
                "&.MuiButton-containedPrimary, &.MuiButton-contained.MuiButton-colorPrimary":
                    {
                        color: theme.palette.primary.contrastText,
                        backgroundColor: theme.palette.primary.main,
                        backgroundImage: `linear-gradient(135deg, ${theme.palette.primary.dark}, ${theme.palette.primary.main})`,
                        boxShadow:
                            theme.palette.mode === "light"
                                ? `0 4px 14px ${alpha(theme.palette.primary.dark, 0.28)}`
                                : `0 4px 14px ${alpha(theme.palette.primary.dark, 0.45)}`,
                        "&:hover": {
                            color: theme.palette.primary.contrastText,
                            backgroundColor: theme.palette.primary.dark,
                            backgroundImage: `linear-gradient(135deg, ${theme.palette.primary.dark}, ${alpha(theme.palette.primary.main, 0.92)})`,
                        },
                        "& .MuiButton-startIcon, & .MuiButton-endIcon": {
                            color: "inherit",
                        },
                    },
                "&.MuiButton-containedSecondary, &.MuiButton-contained.MuiButton-colorSecondary":
                    {
                        color: theme.palette.secondary.contrastText,
                        backgroundColor: theme.palette.secondary.main,
                        backgroundImage: `linear-gradient(135deg, ${theme.palette.secondary.main}, ${theme.palette.secondary.dark})`,
                        boxShadow:
                            theme.palette.mode === "light"
                                ? `0 3px 10px ${alpha(theme.palette.secondary.dark, 0.22)}`
                                : `0 3px 10px ${alpha(CH_DARK_0C2B4E, 0.5)}`,
                        "&:hover": {
                            color: theme.palette.secondary.contrastText,
                            backgroundColor: theme.palette.secondary.dark,
                        },
                        "& .MuiButton-startIcon, & .MuiButton-endIcon": {
                            color: "inherit",
                        },
                    },
                "&.MuiButton-outlinedPrimary":
                    theme.palette.mode === "dark"
                        ? {
                              color: theme.palette.common.white,
                              borderColor: alpha(
                                  theme.palette.common.white,
                                  0.42,
                              ),
                              "&:hover": {
                                  borderColor: alpha(
                                      theme.palette.common.white,
                                      0.65,
                                  ),
                                  backgroundColor: alpha(
                                      theme.palette.common.white,
                                      0.07,
                                  ),
                                  color: theme.palette.common.white,
                              },
                          }
                        : {
                              color: theme.palette.text.primary,
                              borderColor: alpha(
                                  theme.palette.primary.main,
                                  0.45,
                              ),
                              "&:hover": {
                                  borderColor: theme.palette.primary.main,
                                  backgroundColor: alpha(
                                      theme.palette.primary.main,
                                      0.06,
                                  ),
                                  color: theme.palette.primary.main,
                              },
                          },
                "&.MuiButton-outlinedSecondary":
                    theme.palette.mode === "dark"
                        ? {
                              color: theme.palette.common.white,
                              borderColor: alpha(
                                  theme.palette.common.white,
                                  0.42,
                              ),
                              "&:hover": {
                                  borderColor: alpha(
                                      theme.palette.common.white,
                                      0.65,
                                  ),
                                  backgroundColor: alpha(
                                      theme.palette.common.white,
                                      0.07,
                                  ),
                                  color: theme.palette.common.white,
                              },
                          }
                        : {},
                "&.MuiButton-textPrimary":
                    theme.palette.mode === "dark"
                        ? {
                              color: theme.palette.common.white,
                              "&:hover": {
                                  backgroundColor: alpha(
                                      theme.palette.common.white,
                                      0.08,
                                  ),
                                  color: theme.palette.common.white,
                              },
                          }
                        : {
                              color: theme.palette.text.primary,
                              "&:hover": {
                                  backgroundColor: alpha(
                                      theme.palette.primary.main,
                                      0.08,
                                  ),
                                  color: theme.palette.primary.main,
                              },
                          },
                "&.MuiButton-textSecondary":
                    theme.palette.mode === "dark"
                        ? {
                              color: alpha(theme.palette.common.white, 0.88),
                              "&:hover": {
                                  backgroundColor: alpha(
                                      theme.palette.common.white,
                                      0.08,
                                  ),
                                  color: theme.palette.common.white,
                              },
                          }
                        : {
                              color: theme.palette.text.secondary,
                              "&:hover": {
                                  backgroundColor: alpha(
                                      theme.palette.primary.main,
                                      0.06,
                                  ),
                                  color: theme.palette.text.primary,
                              },
                          },
            }),
        },
    },
    MuiToggleButton: {
        styleOverrides: {
            root: ({ theme }) =>
                theme.palette.mode === "dark"
                    ? {
                          "&.MuiToggleButton-primary": {
                              "&:not(.MuiToggleButton-selected)": {
                                  color: theme.palette.text.primary,
                              },
                              "&.MuiToggleButton-selected": {
                                  color: theme.palette.common.white,
                                  backgroundColor: alpha(
                                      theme.palette.primary.light,
                                      0.4,
                                  ),
                                  "&:hover": {
                                      backgroundColor: alpha(
                                          theme.palette.primary.light,
                                          0.52,
                                      ),
                                  },
                              },
                          },
                      }
                    : {},
        },
    },
    MuiPaper: {
        styleOverrides: {
            root: ({ theme }) => ({
                borderRadius: 12,
                boxShadow:
                    theme.palette.mode === "light"
                        ? `0 1px 2px ${alpha("#1E293B", 0.04)}, 0 1px 8px ${alpha(CH_LIGHT_BCCCDC, 0.35)}`
                        : `0 1px 2px ${alpha(CH_DARK_0C2B4E, 0.5)}, 0 1px 8px ${alpha(CH_DARK_0C2B4E, 0.35)}`,
            }),
        },
    },
    MuiTextField: {
        defaultProps: {
            variant: "outlined",
            size: "small",
        },
    },
    MuiFormControl: {
        defaultProps: {
            size: "small",
        },
    },
    MuiSelect: {
        styleOverrides: {
            select: {
                display: "flex",
                alignItems: "center",
                minHeight: 0,
            },
        },
    },
    MuiOutlinedInput: {
        styleOverrides: {
            root: ({ theme }) => ({
                borderRadius: 10,
                "& .MuiOutlinedInput-notchedOutline": {
                    borderColor:
                        theme.palette.mode === "light"
                            ? alpha(CH_LIGHT_BCCCDC, 0.95)
                            : alpha(CH_DARK_F4F4F4, 0.18),
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
                            ? alpha(CH_LIGHT_BCCCDC, 0.35)
                            : theme.palette.action.hover,
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
                    color:
                        theme.palette.mode === "light"
                            ? theme.palette.primary.main
                            : theme.palette.secondary.main,
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
            contrastText: "#F8FAFC",
        },
        success: {
            main: LIGHT_SUCCESS,
        },
        info: {
            main: LIGHT_INFO,
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
        action: {
            hover: alpha(CH_LIGHT_BCCCDC, 0.55),
            selected: alpha(LIGHT_PRIMARY_MAIN, 0.14),
        },
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
            contrastText: CH_DARK_F4F4F4,
        },
        success: {
            main: DARK_SUCCESS,
        },
        info: {
            main: DARK_INFO,
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
        action: {
            hover: alpha(CH_DARK_1D546C, 0.35),
            selected: alpha(CH_DARK_1D546C, 0.22),
        },
    },
    components: commonComponents,
};
