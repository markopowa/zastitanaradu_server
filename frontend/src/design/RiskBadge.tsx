import { Box, Chip, Typography } from "@mui/material";

import { riskColor, riskText } from "./riskVisuals";
import type { RiskBadgeProps } from "../types/design";

export function RiskBadge({ riskLevel, size = "small" }: RiskBadgeProps) {
    if (riskLevel == null) {
        return (
            <Typography variant="body2" color="text.secondary">
                —
            </Typography>
        );
    }

    return (
        <Box sx={{ display: "inline-flex", alignItems: "center", gap: 0.5 }}>
            <Chip
                label={riskText(riskLevel)}
                color={riskColor(riskLevel)}
                size={size}
                variant="outlined"
            />
            {riskLevel.is_high_risk === true && (
                <Chip
                    label="Povećan rizik"
                    color="warning"
                    size={size}
                    variant="outlined"
                />
            )}
        </Box>
    );
}
