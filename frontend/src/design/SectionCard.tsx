import { Box, Paper, Typography } from "@mui/material";

import type { SectionCardProps } from "../types/design";

export function SectionCard({
    title,
    action,
    children,
    dense = false,
}: SectionCardProps) {
    return (
        <Paper sx={{ p: dense ? 1.5 : 2 }}>
            <Box
                sx={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    gap: 2,
                    mb: 1.5,
                }}
            >
                <Typography variant="subtitle1" fontWeight={600}>
                    {title}
                </Typography>
                {action}
            </Box>
            {children}
        </Paper>
    );
}
