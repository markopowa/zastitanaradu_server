import { useState } from "react";
import { useSelector } from "react-redux";
import {
    IconButton,
    Menu,
    MenuItem,
    ListItemIcon,
    ListItemText,
    Tooltip,
} from "@mui/material";
import MoreVertIcon from "@mui/icons-material/MoreVert";
import type { ReactElement } from "react";
import type { RootState } from "../store";
import { hasPermission } from "../utils/permissions";

export interface RowAction {
    label: string;
    icon?: ReactElement;
    onClick: () => void;
    color?: "error" | "warning" | "success" | "inherit";
    permission?: string;
    hidden?: boolean;
    disabled?: boolean;
    disabledTitle?: string;
}

interface RowActionsMenuProps {
    actions: RowAction[];
}

export default function RowActionsMenu({ actions }: RowActionsMenuProps) {
    const [anchor, setAnchor] = useState<null | HTMLElement>(null);
    const permissions = useSelector(
        (s: RootState) => s.auth.user?.permissions ?? [],
    );
    const visible = actions.filter(
        (a) =>
            !a.hidden &&
            (a.permission == null || hasPermission(permissions, a.permission)),
    );

    if (visible.length === 0) return null;

    return (
        <>
            <IconButton
                size="small"
                onClick={(e) => {
                    e.stopPropagation();
                    setAnchor(e.currentTarget);
                }}
                aria-label="akcije"
            >
                <MoreVertIcon fontSize="small" />
            </IconButton>
            <Menu
                anchorEl={anchor}
                open={Boolean(anchor)}
                onClose={() => setAnchor(null)}
                onClick={() => setAnchor(null)}
            >
                {visible.map((action, i) => {
                    const item = (
                        <MenuItem
                            disabled={action.disabled}
                            onClick={action.onClick}
                            sx={
                                action.color === "error"
                                    ? { color: "error.main" }
                                    : action.color
                                      ? { color: `${action.color}.main` }
                                      : undefined
                            }
                        >
                            {action.icon && (
                                <ListItemIcon sx={{ color: "inherit" }}>
                                    {action.icon}
                                </ListItemIcon>
                            )}
                            <ListItemText>{action.label}</ListItemText>
                        </MenuItem>
                    );
                    if (action.disabled && action.disabledTitle) {
                        return (
                            <Tooltip key={i} title={action.disabledTitle}>
                                <span>{item}</span>
                            </Tooltip>
                        );
                    }
                    return (
                        <span key={i}>{item}</span>
                    );
                })}
            </Menu>
        </>
    );
}
