import { Box, CircularProgress, Typography } from "@mui/material";

import type { LoadingStateProps } from "../types/design";

export function LoadingState({ label = "Učitavanje…" }: LoadingStateProps) {
    return (
        <Box
            sx={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                gap: 1,
                py: 4,
            }}
        >
            <CircularProgress size={28} />
            <Typography variant="body2" color="text.secondary">
                {label}
            </Typography>
        </Box>
    );
}
