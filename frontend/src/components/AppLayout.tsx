import {
    Component,
    type MouseEvent,
    type ReactElement,
    type ReactNode,
} from "react";
import { Outlet, useLocation, useNavigate } from "react-router-dom";
import type { AuthUser } from "../types/auth";
import { connect } from "react-redux";
import {
    Box,
    Typography,
    Avatar,
    Menu,
    MenuItem,
    IconButton,
    BottomNavigation,
    BottomNavigationAction,
    Divider,
} from "@mui/material";
import { alpha } from "@mui/material/styles";
import PersonIcon from "@mui/icons-material/Person";
import PeopleIcon from "@mui/icons-material/People";
import BadgeIcon from "@mui/icons-material/Badge";
import FolderIcon from "@mui/icons-material/Folder";
import CategoryIcon from "@mui/icons-material/Category";
import SchoolIcon from "@mui/icons-material/School";
import ReportProblemIcon from "@mui/icons-material/ReportProblem";
import EventIcon from "@mui/icons-material/Event";
import MenuBookIcon from "@mui/icons-material/MenuBook";
import LogoutIcon from "@mui/icons-material/Logout";
import DashboardIcon from "@mui/icons-material/Dashboard";
import BusinessIcon from "@mui/icons-material/Business";
import BuildIcon from "@mui/icons-material/Build";
import { enqueueSnackbar } from "notistack";

import type { RootState, AppDispatch } from "../store";
import { loadMe, logout } from "../store/authSlice";
import { hasPermissionWithPrefix } from "../utils/permissions";
import { AppBreadcrumbs } from "./Breadcrumbs";
import { getPageTitle } from "../locations";
import {
    ensureClientCompanies,
    ensureProcessTypes,
} from "../store/processesSlice";

const SIDEBAR_WIDTH = 260;
const MOBILE_BREAKPOINT = 600;
const APP_TITLE = "Zaštita na radu";

type NavGroup =
    | "overview"
    | "companies"
    | "operations"
    | "documents"
    | "settings_admin"
    | "users";

interface NavItem {
    path: string;
    label: string;
    icon: ReactNode;
    group: NavGroup;
    permissionPrefix?: string;
    showInBottomNav?: boolean;
}

const STATIC_NAV_ITEMS: NavItem[] = [
    {
        path: "/dashboard",
        label: "Kontrolna tabla",
        icon: <DashboardIcon />,
        group: "overview",
        permissionPrefix: "processes.view_processrun",
    },
    {
        path: "/processes/upcoming",
        label: "Predstojeći rokovi",
        icon: <EventIcon />,
        group: "overview",
        permissionPrefix: "processes.view_processrun",
    },
    {
        path: "/client-companies",
        label: "Firme",
        icon: <BusinessIcon />,
        group: "companies",
        permissionPrefix: "partners.view_clientcompany",
    },
    {
        path: "/client-companies-employees",
        label: "Zaposleni",
        icon: <PeopleIcon />,
        group: "companies",
        permissionPrefix: "partners.view_employee",
    },
    {
        path: "/equipment",
        label: "Oprema",
        icon: <BuildIcon />,
        group: "companies",
        permissionPrefix: "partners.view_equipmentitem",
    },
    {
        path: "/processes/bindings",
        label: "Obaveze",
        icon: <EventIcon />,
        group: "operations",
        permissionPrefix: "processes.view_processbinding",
    },
    {
        path: "/processes/runs",
        label: "Aktivnosti",
        icon: <EventIcon />,
        group: "operations",
        permissionPrefix: "processes.view_processrun",
    },
    {
        path: "/processes/types",
        label: "Vrste obaveza",
        icon: <SchoolIcon />,
        group: "settings_admin",
        permissionPrefix: "processes.view_processtype",
    },
    {
        path: "/processes/templates",
        label: "Šabloni obaveza",
        icon: <MenuBookIcon />,
        group: "settings_admin",
        permissionPrefix: "processes.view_processtemplate",
    },
    {
        path: "/risk-levels",
        label: "Nivoi rizika",
        icon: <ReportProblemIcon />,
        group: "settings_admin",
        permissionPrefix: "partners.view_risklevel",
    },
    {
        path: "/documents",
        label: "Dokumenti",
        icon: <FolderIcon />,
        group: "documents",
        permissionPrefix: "documents.view_document",
    },
    {
        path: "/documents/categories",
        label: "Kategorije dokumenata",
        icon: <CategoryIcon />,
        group: "documents",
        permissionPrefix: "documents.view_document",
    },
    {
        path: "/documents/templates",
        label: "Šabloni dokumenata",
        icon: <MenuBookIcon />,
        group: "documents",
        permissionPrefix: "documents.view_documenttemplate",
    },
    {
        path: "/users",
        label: "Korisnici",
        icon: <PeopleIcon />,
        group: "users",
        permissionPrefix: "auth.view_user",
    },
    {
        path: "/roles",
        label: "Role",
        icon: <BadgeIcon />,
        group: "users",
        permissionPrefix: "auth.view_group",
    },
];

const NAV_GROUP_ORDER: NavGroup[] = [
    "overview",
    "companies",
    "operations",
    "documents",
    "settings_admin",
    "users",
];

const NAV_GROUP_LABEL: Record<NavGroup, string> = {
    overview: "Pregled",
    companies: "Firme",
    operations: "Operativa",
    documents: "Dokumenti",
    settings_admin: "Podešavanja",
    users: "Korisnici / Role",
};

const NAV_GROUP_ICON: Record<NavGroup, ReactNode> = {
    overview: <DashboardIcon />,
    companies: <BusinessIcon />,
    operations: <EventIcon />,
    documents: <FolderIcon />,
    settings_admin: <SchoolIcon />,
    users: <PeopleIcon />,
};

function visibleNavItems(permissions: string[]): NavItem[] {
    return STATIC_NAV_ITEMS.filter((item) => {
        if (!item.permissionPrefix) return true;
        return hasPermissionWithPrefix(permissions, item.permissionPrefix);
    });
}

interface StateProps {
    user?: AuthUser;
    breadcrumbs: { label: string; path?: string }[];
}

interface DispatchProps {
    onLogout: () => void;
    onLoadMe: () => void;
    ensureClientCompanies: () => void;
    ensureProcessTypes: () => void;
}

interface OwnProps {
    pathname: string;
    search: string;
    navigate: (path: string) => void;
}

type Props = StateProps & DispatchProps & OwnProps;

interface State {
    isMobile: boolean;
    anchorEl: HTMLElement | null;
    mobileOpenGroup: NavGroup | null;
}

class AppLayoutInner extends Component<Props, State> {
    private removeResizeListener: (() => void) | null = null;

    state: State = {
        isMobile: false,
        anchorEl: null,
        mobileOpenGroup: null,
    };

    componentDidMount(): void {
        this.props.onLoadMe();

        const checkMobile = (): void => {
            if (typeof matchMedia !== "undefined") {
                const m = matchMedia(`(max-width: ${MOBILE_BREAKPOINT}px)`);
                this.setState((s) =>
                    s.isMobile === m.matches
                        ? s
                        : { ...s, isMobile: m.matches },
                );
            }
        };
        checkMobile();
        if (typeof matchMedia !== "undefined") {
            const m = matchMedia(`(max-width: ${MOBILE_BREAKPOINT}px)`);
            const handle = (): void =>
                this.setState((s) => ({ ...s, isMobile: m.matches }));
            m.addEventListener("change", handle);
            this.removeResizeListener = () =>
                m.removeEventListener("change", handle);
        }

        void Promise.all([
            this.props.ensureClientCompanies(),
            this.props.ensureProcessTypes(),
        ]).catch(() => {
            enqueueSnackbar("Greška pri učitavanju referentnih podataka.", {
                variant: "error",
            });
        });
    }

    componentWillUnmount(): void {
        this.removeResizeListener?.();
    }

    handleAvatarClick = (event: MouseEvent<HTMLElement>): void => {
        event.stopPropagation();
        const el = event.currentTarget;
        if (this.state.anchorEl) {
            this.setState((prev) => ({ ...prev, anchorEl: null }));
            return;
        }
        queueMicrotask(() => {
            this.setState((prev) => ({ ...prev, anchorEl: el }));
        });
    };

    handleMenuClose = (): void => {
        this.setState((prev) => ({ ...prev, anchorEl: null }));
    };

    handleLogout = (): void => {
        this.props.onLogout();
        this.handleMenuClose();
    };

    getInitials(username: string): string {
        if (!username) return "?";
        const parts = username.trim().split(/\s+/);
        if (parts.length >= 2)
            return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
        return username.substring(0, 2).toUpperCase();
    }

    render() {
        const { user, pathname, search, breadcrumbs } = this.props;
        const { isMobile, anchorEl, mobileOpenGroup } = this.state;
        const permissions = user?.permissions ?? [];
        const items = visibleNavItems(permissions);
        const pageTitle = getPageTitle(pathname);
        const menuOpen = Boolean(anchorEl);
        const currentFull = pathname + search;
        const activeItem = items.find((i) => i.path === currentFull) ?? null;
        const visibleGroups: NavGroup[] = NAV_GROUP_ORDER.filter((groupKey) =>
            items.some((i) => i.group === groupKey),
        );
        const bottomNavItems = visibleGroups.map((groupKey) => ({
            group: groupKey,
            label: NAV_GROUP_LABEL[groupKey],
            icon: NAV_GROUP_ICON[groupKey],
        }));
        const activeGroup: NavGroup | null =
            activeItem?.group ??
            (bottomNavItems.length > 0 ? bottomNavItems[0].group : null);
        const bottomNavValue =
            activeGroup != null
                ? Math.max(
                      0,
                      bottomNavItems.findIndex((g) => g.group === activeGroup),
                  )
                : 0;

        return (
            <Box
                sx={{
                    minHeight: "100vh",
                    display: "flex",
                    bgcolor: "background.default",
                    color: "text.primary",
                }}
            >
                {!isMobile && (
                    <Box
                        component="nav"
                        sx={(theme) => ({
                            width: SIDEBAR_WIDTH,
                            minWidth: SIDEBAR_WIDTH,
                            flexShrink: 0,
                            borderRight: 1,
                            borderColor: "divider",
                            p: 3,
                            display: "flex",
                            flexDirection: "column",
                            gap: 2,
                            overflow: "hidden",
                            height: "100vh",
                            ...(theme.palette.mode === "light" && {
                                bgcolor: "background.paper",
                            }),
                        })}
                    >
                        <Box sx={{ fontWeight: 600, flexShrink: 0 }}>
                            {APP_TITLE}
                        </Box>
                        <Box
                            sx={(theme) => {
                                const thumb =
                                    theme.palette.mode === "dark"
                                        ? alpha(theme.palette.grey[500], 0.45)
                                        : alpha(theme.palette.grey[700], 0.35);
                                const thumbHover =
                                    theme.palette.mode === "dark"
                                        ? alpha(theme.palette.grey[400], 0.55)
                                        : alpha(theme.palette.grey[800], 0.45);
                                return {
                                    display: "flex",
                                    flexDirection: "column",
                                    gap: 1.5,
                                    mt: 2,
                                    overflowY: "auto",
                                    flex: 1,
                                    minHeight: 0,
                                    scrollbarGutter: "stable",
                                    scrollbarWidth: "thin",
                                    scrollbarColor: `${thumb} transparent`,
                                    "&::-webkit-scrollbar": {
                                        width: 8,
                                    },
                                    "&::-webkit-scrollbar-track": {
                                        background: "transparent",
                                    },
                                    "&::-webkit-scrollbar-thumb": {
                                        backgroundColor: thumb,
                                        borderRadius: 999,
                                    },
                                    "&::-webkit-scrollbar-thumb:hover": {
                                        backgroundColor: thumbHover,
                                    },
                                };
                            }}
                        >
                            {NAV_GROUP_ORDER.map((groupKey) => {
                                const groupItems = items.filter(
                                    (i) => i.group === groupKey,
                                );
                                if (groupItems.length === 0) return null;

                                return (
                                    <Box
                                        key={groupKey}
                                        sx={{
                                            display: "flex",
                                            flexDirection: "column",
                                            gap: 0.5,
                                        }}
                                    >
                                        <Typography
                                            variant="caption"
                                            sx={{
                                                px: 2,
                                                mb: 0.5,
                                                textTransform: "uppercase",
                                                color: "text.secondary",
                                            }}
                                        >
                                            {NAV_GROUP_LABEL[groupKey]}
                                        </Typography>
                                        {groupItems.map((item) => {
                                            const fullPath = item.path;
                                            const isActive =
                                                currentFull === fullPath;
                                            return (
                                                <Box
                                                    key={fullPath}
                                                    onClick={() => {
                                                        this.props.navigate(
                                                            fullPath,
                                                        );
                                                    }}
                                                    sx={(theme) => ({
                                                        display: "flex",
                                                        alignItems: "center",
                                                        gap: 1.5,
                                                        px: 2,
                                                        py: 1.25,
                                                        borderRadius: 1,
                                                        cursor: "pointer",
                                                        bgcolor: isActive
                                                            ? theme.palette
                                                                  .mode ===
                                                              "light"
                                                                ? alpha(
                                                                      theme
                                                                          .palette
                                                                          .primary
                                                                          .main,
                                                                      0.12,
                                                                  )
                                                                : "secondary.main"
                                                            : "transparent",
                                                        color: isActive
                                                            ? theme.palette
                                                                  .mode ===
                                                              "light"
                                                                ? "primary.dark"
                                                                : "secondary.contrastText"
                                                            : "text.primary",
                                                        "&:hover": {
                                                            bgcolor: isActive
                                                                ? theme.palette
                                                                      .mode ===
                                                                  "light"
                                                                    ? alpha(
                                                                          theme
                                                                              .palette
                                                                              .primary
                                                                              .main,
                                                                          0.18,
                                                                      )
                                                                    : "secondary.light"
                                                                : "action.hover",
                                                        },
                                                    })}
                                                >
                                                    {item.icon}
                                                    <Typography
                                                        variant="body2"
                                                        fontWeight={
                                                            isActive ? 600 : 400
                                                        }
                                                    >
                                                        {item.label}
                                                    </Typography>
                                                </Box>
                                            );
                                        })}
                                        {!["users"].includes(groupKey) && (
                                            <Divider
                                                sx={{ mt: 1.25, opacity: 0.6 }}
                                            />
                                        )}
                                    </Box>
                                );
                            })}
                        </Box>
                    </Box>
                )}

                <Box
                    component="main"
                    sx={{
                        flex: 1,
                        minWidth: 0,
                        display: "flex",
                        flexDirection: "column",
                    }}
                >
                    <Box
                        sx={{
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "center",
                            px: isMobile ? 2 : 4,
                            py: 1.5,
                            borderBottom: 1,
                            borderColor: "divider",
                            bgcolor: "background.paper",
                        }}
                    >
                        <Typography
                            variant="body1"
                            fontWeight={600}
                            sx={{
                                display: "flex",
                                alignItems: "center",
                                gap: 1,
                                borderLeft: 3,
                                borderColor: "primary.main",
                                pl: 1.5,
                                flex: 1,
                                minWidth: 0,
                                overflow: "hidden",
                                textOverflow: "ellipsis",
                                whiteSpace: "nowrap",
                            }}
                        >
                            {pageTitle}
                        </Typography>
                        <Box
                            sx={{
                                display: "flex",
                                alignItems: "center",
                                gap: 1,
                                flexShrink: 0,
                            }}
                        >
                            <IconButton
                                onClick={this.handleAvatarClick}
                                sx={{ p: 0 }}
                                aria-controls={
                                    menuOpen ? "user-menu" : undefined
                                }
                                aria-haspopup="true"
                                aria-expanded={menuOpen ? "true" : undefined}
                                aria-label="Meni naloga"
                            >
                                <Avatar
                                    sx={{
                                        width: isMobile ? 32 : 40,
                                        height: isMobile ? 32 : 40,
                                        bgcolor: "primary.main",
                                        color: "primary.contrastText",
                                        fontSize: isMobile
                                            ? "0.875rem"
                                            : "1rem",
                                        cursor: "pointer",
                                    }}
                                >
                                    {user
                                        ? this.getInitials(user.username)
                                        : "?"}
                                </Avatar>
                            </IconButton>
                        </Box>
                    </Box>
                    <Menu
                        id="user-menu"
                        anchorEl={anchorEl}
                        open={menuOpen}
                        onClose={this.handleMenuClose}
                        disableScrollLock
                        disableAutoFocus
                        slotProps={{
                            paper: {
                                sx: (theme) => ({
                                    zIndex: theme.zIndex.modal + 100,
                                }),
                            },
                            backdrop: {
                                invisible: true,
                            },
                        }}
                        anchorOrigin={{
                            vertical: "bottom",
                            horizontal: "right",
                        }}
                        transformOrigin={{
                            vertical: "top",
                            horizontal: "right",
                        }}
                    >
                        <MenuItem
                            disabled
                            sx={{ opacity: 1, cursor: "default" }}
                        >
                            <Typography variant="body2" fontWeight={600}>
                                {user?.username ?? ""}
                            </Typography>
                        </MenuItem>
                        <MenuItem
                            onClick={() => {
                                this.handleMenuClose();
                                this.props.navigate("/profile");
                            }}
                        >
                            <PersonIcon sx={{ mr: 1, fontSize: 20 }} />
                            Profil
                        </MenuItem>
                        <MenuItem onClick={this.handleLogout}>
                            <LogoutIcon sx={{ mr: 1, fontSize: 20 }} />
                            Odjava
                        </MenuItem>
                    </Menu>

                    <Box
                        sx={{
                            flex: 1,
                            overflow: "auto",
                            p: isMobile ? 2 : 3,
                            pb:
                                isMobile && bottomNavItems.length > 0
                                    ? 8
                                    : undefined,
                        }}
                    >
                        {breadcrumbs.length > 0 && (
                            <AppBreadcrumbs items={breadcrumbs} />
                        )}
                        <Outlet />
                    </Box>

                    {isMobile && bottomNavItems.length > 0 && (
                        <>
                            {mobileOpenGroup && (
                                <Box
                                    sx={{
                                        position: "fixed",
                                        left: 0,
                                        right: 0,
                                        bottom: 56,
                                        width: "100vw",
                                        bgcolor: "background.paper",
                                        borderTop: 1,
                                        borderColor: "divider",
                                        boxShadow: 3,
                                        zIndex: 1201,
                                    }}
                                >
                                    {items
                                        .filter(
                                            (item) =>
                                                item.group === mobileOpenGroup,
                                        )
                                        .map((item) => (
                                            <Box
                                                key={item.path}
                                                onClick={() => {
                                                    this.setState((prev) => ({
                                                        ...prev,
                                                        mobileOpenGroup: null,
                                                    }));
                                                    this.props.navigate(
                                                        item.path,
                                                    );
                                                }}
                                                sx={{
                                                    px: 2,
                                                    py: 1.25,
                                                    borderBottom: 1,
                                                    borderColor: "divider",
                                                    display: "flex",
                                                    alignItems: "center",
                                                    gap: 1.5,
                                                    cursor: "pointer",
                                                }}
                                            >
                                                {item.icon}
                                                <Typography variant="body2">
                                                    {item.label}
                                                </Typography>
                                            </Box>
                                        ))}
                                </Box>
                            )}
                            <Box
                                sx={{
                                    position: "fixed",
                                    left: 0,
                                    right: 0,
                                    bottom: 0,
                                    width: "100vw",
                                    borderTop: 1,
                                    borderColor: "divider",
                                    bgcolor: "background.paper",
                                    overflowX: "auto",
                                    overflowY: "hidden",
                                }}
                            >
                                <BottomNavigation
                                    showLabels
                                    value={bottomNavValue}
                                    onChange={(_, newValue) => {
                                        const groupItem =
                                            bottomNavItems[newValue];
                                        if (!groupItem) return;
                                        this.setState((s) => ({
                                            ...s,
                                            mobileOpenGroup:
                                                s.mobileOpenGroup ===
                                                groupItem.group
                                                    ? null
                                                    : groupItem.group,
                                        }));
                                    }}
                                    sx={{
                                        minWidth: "max-content",
                                        width: "100%",
                                    }}
                                >
                                    {bottomNavItems.map((item) => (
                                        <BottomNavigationAction
                                            key={item.group}
                                            label={item.label}
                                            icon={item.icon as ReactElement}
                                        />
                                    ))}
                                </BottomNavigation>
                            </Box>
                        </>
                    )}
                </Box>
            </Box>
        );
    }
}

const mapStateToProps = (state: RootState): StateProps => ({
    user: state.auth.user,
    breadcrumbs: state.location.breadcrumbs,
});

const mapDispatchToProps = (dispatch: AppDispatch): DispatchProps => ({
    onLogout: () => dispatch(logout()),
    onLoadMe: () => dispatch(loadMe()),
    ensureClientCompanies: () => {
        void dispatch(ensureClientCompanies());
    },
    ensureProcessTypes: () => {
        void dispatch(ensureProcessTypes());
    },
});

function AppLayoutWithRouter() {
    const location = useLocation();
    const navigate = useNavigate();

    return (
        <AppLayoutConnected
            pathname={location.pathname}
            search={location.search}
            navigate={navigate}
        />
    );
}

const AppLayoutConnected = connect<
    StateProps,
    DispatchProps,
    OwnProps,
    RootState
>(
    mapStateToProps,
    mapDispatchToProps,
)(AppLayoutInner);

export const AppLayout = AppLayoutWithRouter;
