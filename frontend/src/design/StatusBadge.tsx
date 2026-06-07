import { Chip } from "@mui/material";

import { runStatusColor, runStatusLabel } from "./labels";
import type { StatusBadgeProps } from "../types/design";

export function StatusBadge({
    status,
    isOverdue = false,
    isExpiringSoon = false,
    hasEmailError = false,
    size = "small",
}: StatusBadgeProps) {
    const color =
        hasEmailError || isOverdue
            ? "error"
            : isExpiringSoon
              ? "warning"
              : runStatusColor(status);

    return (
        <Chip
            label={runStatusLabel(status)}
            color={color}
            variant="outlined"
            size={size}
        />
    );
}
