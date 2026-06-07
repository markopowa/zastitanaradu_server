import type { ChipProps } from "@mui/material";
import type { RiskLevelLike } from "../types/design";

export function riskColor(
    riskLevel?: RiskLevelLike | null,
): ChipProps["color"] {
    if (riskLevel == null) return "default";
    if (riskLevel.is_high_risk === true) return "error";
    if (riskLevel.score != null && riskLevel.score >= 5) return "error";
    if (riskLevel.score === 4) return "warning";
    if (riskLevel.is_acceptable === false) return "warning";
    if (riskLevel.score === 3) return "info";
    if (riskLevel.score != null && riskLevel.score <= 2) return "success";
    return "success";
}

export function riskText(riskLevel?: RiskLevelLike | null): string {
    return riskLevel?.label ?? "—";
}
