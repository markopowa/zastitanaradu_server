import { Chip, Typography } from "@mui/material";

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
        <Chip
            label={riskText(riskLevel)}
            color={riskColor(riskLevel)}
            size={size}
            variant="outlined"
        />
    );
}
