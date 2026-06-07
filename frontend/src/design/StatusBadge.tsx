import { Box, Chip } from "@mui/material";

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
        <Box
            sx={{
                display: "flex",
                flexWrap: "wrap",
                gap: 0.5,
                alignItems: "center",
            }}
        >
            <Chip
                label={runStatusLabel(status)}
                color={color}
                variant="outlined"
                size={size}
            />
            {isOverdue ? (
                <Chip
                    label="Kasni"
                    color="error"
                    variant="outlined"
                    size={size}
                />
            ) : null}
            {isExpiringSoon && !isOverdue ? (
                <Chip
                    label="Ističe uskoro"
                    color="warning"
                    variant="outlined"
                    size={size}
                />
            ) : null}
            {hasEmailError ? (
                <Chip
                    label="Mejl nije poslat"
                    color="error"
                    variant="outlined"
                    size={size}
                />
            ) : null}
        </Box>
    );
}
