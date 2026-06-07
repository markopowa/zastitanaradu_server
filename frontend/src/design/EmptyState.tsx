import { Box, Typography } from "@mui/material";

import type { EmptyStateProps } from "../types/design";

export function EmptyState({ message, icon, action }: EmptyStateProps) {
    return (
        <Box
            sx={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                gap: 1,
                py: 4,
                color: "text.secondary",
            }}
        >
            {icon}
            <Typography variant="body2" color="text.secondary">
                {message}
            </Typography>
            {action}
        </Box>
    );
}
