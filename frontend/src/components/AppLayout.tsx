import { Component } from "react";
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
import PersonIcon from "@mui/icons-material/Person";
import PeopleIcon from "@mui/icons-material/People";
import BadgeIcon from "@mui/icons-material/Badge";
import FolderIcon from "@mui/icons-material/Folder";
import CategoryIcon from "@mui/icons-material/Category";
import SchoolIcon from "@mui/icons-material/School";
import EventIcon from "@mui/icons-material/Event";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import MenuBookIcon from "@mui/icons-material/MenuBook";
import LogoutIcon from "@mui/icons-material/Logout";

import type { RootState, AppDispatch } from "../store";
import { logout } from "../store/authSlice";
import { hasPermissionWithPrefix } from "../utils/permissions";
import { getPageTitle } from "../locations";


const SIDEBAR_WIDTH = 260;
const MOBILE_BREAKPOINT = 600;
const APP_TITLE = "Zaštita na radu";

type NavGroup = "documents" | "trainings" | "attendance" | "users";

interface NavItem {
    path: string;
    label: string;
    icon: React.ReactNode;
    group: NavGroup;
    permissionPrefix?: string;
}

const NAV_ITEMS: NavItem[] = [
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
        path: "/trainings",
        label: "Obuke",
        icon: <SchoolIcon />,
        group: "trainings",
        permissionPrefix: "trainings.view_training",
    },
    {
        path: "/trainings/types",
        label: "Tipovi obuka",
        icon: <SchoolIcon />,
        group: "trainings",
        permissionPrefix: "trainings.view_trainingtype",
    },
    {
        path: "/trainings/programs",
        label: "Programi obuka",
        icon: <MenuBookIcon />,
        group: "trainings",
        permissionPrefix: "trainings.view_trainingprogram",
    },
    {
        path: "/trainings/sessions",
        label: "Sesije obuka",
        icon: <EventIcon />,
        group: "trainings",
        permissionPrefix: "trainings.view_trainingsession",
    },
    {
        path: "/trainings/employees",
        label: "Zaposleni",
        icon: <PeopleIcon />,
        group: "trainings",
        permissionPrefix: "trainings.view_employee",
    },
    {
        path: "/trainings/attendance",
        label: "Prisustvo",
        icon: <CheckCircleIcon />,
        group: "attendance",
        permissionPrefix: "trainings.view_trainingattendance",
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

const NAV_GROUP_ORDER: NavGroup[] = ["documents", "trainings", "attendance", "users"];

const NAV_GROUP_LABEL: Record<NavGroup, string> = {
    documents: "Dokumenti",
    trainings: "Obuke",
    attendance: "Prisustvo",
    users: "Korisnici i role",
};

function visibleNavItems(permissions: string[]): NavItem[] {
    return NAV_ITEMS.filter((item) => {
        if (!item.permissionPrefix) return true;
        return hasPermissionWithPrefix(permissions, item.permissionPrefix);
    });
}

interface StateProps {
    user?: AuthUser;
}

interface DispatchProps {
    onLogout: () => void;
}

interface OwnProps {
    pathname: string;
    navigate: (path: string) => void;
}

type Props = StateProps & DispatchProps & OwnProps;

interface State {
    isMobile: boolean;
    anchorEl: HTMLElement | null;
}

class AppLayoutInner extends Component<Props, State> {
    private removeResizeListener: (() => void) | null = null;

    state: State = { isMobile: false, anchorEl: null };

    componentDidMount(): void {
        const checkMobile = (): void => {
            if (typeof matchMedia !== "undefined") {
                const m = matchMedia(`(max-width: ${MOBILE_BREAKPOINT}px)`);
                this.setState((s) => (s.isMobile === m.matches ? s : { ...s, isMobile: m.matches }));
            }
        };
        checkMobile();
        if (typeof matchMedia !== "undefined") {
            const m = matchMedia(`(max-width: ${MOBILE_BREAKPOINT}px)`);
            const handle = (): void => this.setState((s) => ({ ...s, isMobile: m.matches }));
            m.addEventListener("change", handle);
            this.removeResizeListener = () => m.removeEventListener("change", handle);
        }
    }

    componentWillUnmount(): void {
        this.removeResizeListener?.();
    }

    handleAvatarClick = (event: React.MouseEvent<HTMLElement>): void => {
        this.setState({ anchorEl: event.currentTarget });
    };

    handleMenuClose = (): void => {
        this.setState({ anchorEl: null });
    };

    handleLogout = (): void => {
        this.props.onLogout();
        this.handleMenuClose();
    };

    getInitials(username: string): string {
        if (!username) return "?";
        const parts = username.trim().split(/\s+/);
        if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
        return username.substring(0, 2).toUpperCase();
    }

    render() {
        const { user, pathname } = this.props;
        const { isMobile, anchorEl } = this.state;
        const permissions = user?.permissions ?? [];
        const items = visibleNavItems(permissions);
        const pageTitle = getPageTitle(pathname);
        const menuOpen = Boolean(anchorEl);
        const bottomNavValue = Math.max(
            0,
            items.findIndex((i) => i.path === pathname)
        );

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
                        sx={{
                            width: SIDEBAR_WIDTH,
                            borderRight: 1,
                            borderColor: "divider",
                            p: 3,
                            display: "flex",
                            flexDirection: "column",
                            gap: 2,
                            overflow: "hidden",
                            height: "100vh",
                        }}
                    >
                        <Box sx={{ fontWeight: 600, flexShrink: 0 }}>{APP_TITLE}</Box>
                        <Box
                            sx={{
                                display: "flex",
                                flexDirection: "column",
                                gap: 1.5,
                                mt: 2,
                                overflowY: "auto",
                                flex: 1,
                                minHeight: 0,
                            }}
                        >
                            {NAV_GROUP_ORDER.map((groupKey) => {
                                const groupItems = items.filter((i) => i.group === groupKey);
                                if (groupItems.length === 0) return null;

                                return (
                                    <Box key={groupKey} sx={{ display: "flex", flexDirection: "column", gap: 0.5 }}>
                                        <Typography
                                            variant="caption"
                                            sx={{ px: 2, mb: 0.5, textTransform: "uppercase", color: "text.secondary" }}
                                        >
                                            {NAV_GROUP_LABEL[groupKey]}
                                        </Typography>
                                        {groupItems.map((item) => {
                                            const isActive = pathname === item.path;
                                            return (
                                                <Box
                                                    key={item.path}
                                                    onClick={() => {
                                                        if (this.props.pathname !== item.path) {
                                                            this.props.navigate(item.path);
                                                        }
                                                    }}
                                                    sx={{
                                                        display: "flex",
                                                        alignItems: "center",
                                                        gap: 1.5,
                                                        px: 2,
                                                        py: 1.25,
                                                        borderRadius: 1,
                                                        cursor: "pointer",
                                                        bgcolor: isActive ? "primary.main" : "transparent",
                                                        color: isActive ? "primary.contrastText" : "text.primary",
                                                        "&:hover": {
                                                            bgcolor: isActive ? "primary.dark" : "action.hover",
                                                        },
                                                    }}
                                                >
                                                    {item.icon}
                                                    <Typography
                                                        variant="body2"
                                                        fontWeight={isActive ? 600 : 400}
                                                    >
                                                        {item.label}
                                                    </Typography>
                                                </Box>
                                            );
                                        })}
                                        {!["users"].includes(groupKey) && (
                                            <Divider sx={{ mt: 1.25, opacity: 0.6 }} />
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
                            sx={{ display: "flex", alignItems: "center", gap: 1 }}
                        >
                            {pageTitle}
                        </Typography>
                        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                            <IconButton
                                onClick={this.handleAvatarClick}
                                sx={{ p: 0 }}
                                aria-controls={menuOpen ? "user-menu" : undefined}
                                aria-haspopup="true"
                                aria-expanded={menuOpen ? "true" : undefined}
                            >
                                <Avatar
                                    sx={{
                                        width: isMobile ? 32 : 40,
                                        height: isMobile ? 32 : 40,
                                        bgcolor: "primary.main",
                                        fontSize: isMobile ? "0.875rem" : "1rem",
                                        cursor: "pointer",
                                    }}
                                >
                                    {user ? this.getInitials(user.username) : "?"}
                                </Avatar>
                            </IconButton>
                        </Box>
                        <Menu
                            id="user-menu"
                            anchorEl={anchorEl}
                            open={menuOpen}
                            onClose={this.handleMenuClose}
                            anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
                            transformOrigin={{ vertical: "top", horizontal: "right" }}
                        >
                            <MenuItem disabled sx={{ opacity: 1, cursor: "default" }}>
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
                    </Box>

                    <Box
                        sx={{
                            flex: 1,
                            overflow: "auto",
                            p: isMobile ? 2 : 3,
                            pb: isMobile && items.length > 0 ? 8 : undefined,
                        }}
                    >
                        <Outlet />
                    </Box>

                    {isMobile && items.length > 0 && (
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
                                    const item = items[newValue];
                                    if (item && this.props.pathname !== item.path) {
                                        this.props.navigate(item.path);
                                    }
                                }}
                                sx={{
                                    minWidth: "max-content",
                                    width: "100%",
                                }}
                            >
                                {items.map((item) => (
                                    <BottomNavigationAction
                                        key={item.path}
                                        label={item.label}
                                        icon={item.icon as React.ReactElement}
                                    />
                                ))}
                            </BottomNavigation>
                        </Box>
                    )}
                </Box>
            </Box>
        );
    }
}

const mapStateToProps = (state: RootState): StateProps => ({
    user: state.auth.user,
});

const mapDispatchToProps = (dispatch: AppDispatch): DispatchProps => ({
    onLogout: () => dispatch(logout()),
});

function AppLayoutWithRouter() {
    const location = useLocation();
    const navigate = useNavigate();

    return (
        <AppLayoutConnected pathname={location.pathname} navigate={navigate} />
    );
}

const AppLayoutConnected = connect<StateProps, DispatchProps, OwnProps, RootState>(
    mapStateToProps,
    mapDispatchToProps,
)(AppLayoutInner);

export const AppLayout = AppLayoutWithRouter;
