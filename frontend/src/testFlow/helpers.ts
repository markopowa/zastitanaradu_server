import type { RiskLevel } from "../types/processes";

export function riskLevelIdByLabel(levels: RiskLevel[], label: string): string {
    const found = levels.find((l) => l.label === label);
    return found ? String(found.id) : "";
}

export function idByName<T extends { id: number; name: string }>(
    items: T[],
    name: string,
): string {
    const found = items.find((i) => i.name === name);
    return found ? String(found.id) : "";
}
