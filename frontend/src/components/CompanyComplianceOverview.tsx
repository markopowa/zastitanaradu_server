import { Component } from "react";
import { Box, Button, Chip, Typography } from "@mui/material";

import {
    getCompanyComplianceFindings,
    getCompanyDocuments,
    getProcessRuns,
    getRiskAssessmentAct,
} from "../api/processes";
import { LoadingState } from "../design/LoadingState";
import { ErrorState } from "../design/ErrorState";
import { SectionCard } from "../design/SectionCard";
import type { CompanyTabKey } from "../utils/companyTabs";
import type {
    CompanyComplianceFindingRow,
    CompanyDocument,
    ProcessRun,
    RiskAssessmentAct,
} from "../types/processes";

const TOTAL_DOCUMENT_KINDS = 7;
const EXPIRING_DAYS = 30;

type Severity = "ok" | "warn" | "problem" | "neutral";

const SEVERITY_COLOR: Record<
    Severity,
    "success" | "warning" | "error" | "default"
> = {
    ok: "success",
    warn: "warning",
    problem: "error",
    neutral: "default",
};

const SEVERITY_RANK: Record<Severity, number> = {
    neutral: 0,
    ok: 1,
    warn: 2,
    problem: 3,
};

const OVERALL_LABEL: Record<Severity, string> = {
    neutral: "Nema podataka",
    ok: "U redu",
    warn: "Pažnja",
    problem: "Problem",
};

interface CategoryCard {
    title: string;
    tab: CompanyTabKey;
    severity: Severity;
    label: string;
}

interface Props {
    companyId: number;
    onOpenTab: (key: CompanyTabKey) => void;
}

interface State {
    loading: boolean;
    error: string | null;
    act: RiskAssessmentAct | null;
    documents: CompanyDocument[];
    findings: CompanyComplianceFindingRow[];
    runs: ProcessRun[];
}

function daysUntil(iso: string | null | undefined): number | null {
    if (!iso) return null;
    const target = new Date(`${iso}T00:00:00`);
    if (Number.isNaN(target.getTime())) return null;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return Math.round((target.getTime() - today.getTime()) / 86400000);
}

export class CompanyComplianceOverview extends Component<Props, State> {
    state: State = {
        loading: true,
        error: null,
        act: null,
        documents: [],
        findings: [],
        runs: [],
    };

    componentDidMount(): void {
        this.load();
    }

    private load = (): void => {
        const { companyId } = this.props;
        this.setState((prev) => ({ ...prev, loading: true, error: null }));
        Promise.all([
            getRiskAssessmentAct(companyId),
            getCompanyDocuments({ client_company_id: companyId }),
            getCompanyComplianceFindings(companyId),
            getProcessRuns({ client_company_id: companyId }),
        ])
            .then(([act, documents, findings, runs]) => {
                this.setState((prev) => ({
                    ...prev,
                    loading: false,
                    act,
                    documents,
                    findings,
                    runs,
                }));
            })
            .catch(() => {
                this.setState((prev) => ({
                    ...prev,
                    loading: false,
                    error: "Greška pri učitavanju usklađenosti.",
                }));
            });
    };

    private actCard(): CategoryCard {
        const { act } = this.state;
        let severity: Severity = "problem";
        let label = "Nedostaje";
        if (act && act.is_complete) {
            severity = "ok";
            label = "Kompletan";
        } else if (act) {
            severity = "warn";
            label = "Nepotpun";
        }
        return {
            title: "Akt o proceni rizika",
            tab: "documents",
            severity,
            label,
        };
    }

    private documentsCard(): CategoryCard {
        const attached = this.state.documents.filter((d) => d.file).length;
        const complete = attached >= TOTAL_DOCUMENT_KINDS;
        return {
            title: "Obavezna dokumentacija",
            tab: "documents",
            severity: complete ? "ok" : "warn",
            label: `${attached}/${TOTAL_DOCUMENT_KINDS} priloženo`,
        };
    }

    private findingsCard(): CategoryCard {
        const { findings } = this.state;
        if (findings.length === 0) {
            return {
                title: "Stručni nalazi",
                tab: "expert_findings",
                severity: "neutral",
                label: "Nema podataka",
            };
        }
        const expired = findings.filter((f) => f.status === "EXPIRED").length;
        const missing = findings.filter((f) => f.status === "MISSING").length;
        const expiring = findings.filter((f) => f.status === "EXPIRING").length;
        const parts: string[] = [];
        if (expired) parts.push(`${expired} istekao`);
        if (missing) parts.push(`${missing} nedostaje`);
        if (expiring) parts.push(`${expiring} ističe`);
        let severity: Severity = "ok";
        if (expired || missing) severity = "problem";
        else if (expiring) severity = "warn";
        return {
            title: "Stručni nalazi",
            tab: "expert_findings",
            severity,
            label: parts.length ? parts.join(" • ") : "Svi važe",
        };
    }

    private examsCard(): CategoryCard {
        const { runs } = this.state;
        const overdue = runs.filter((r) => {
            if (r.status === "COMPLETED" || r.status === "CANCELLED") {
                return false;
            }
            const d = daysUntil(r.scheduled_for);
            return d != null && d < 0;
        }).length;
        const expiring = runs.filter((r) => {
            const d = daysUntil(r.valid_until);
            return d != null && d >= 0 && d <= EXPIRING_DAYS;
        }).length;
        const parts: string[] = [];
        if (overdue) parts.push(`${overdue} kasni`);
        if (expiring) parts.push(`${expiring} ističe uskoro`);
        let severity: Severity = runs.length ? "ok" : "neutral";
        if (overdue) severity = "problem";
        else if (expiring) severity = "warn";
        return {
            title: "Lekarski pregledi",
            tab: "obligations",
            severity,
            label: parts.length
                ? parts.join(" • ")
                : runs.length
                  ? "U redu"
                  : "Nema podataka",
        };
    }

    render() {
        const { loading, error } = this.state;
        const { onOpenTab } = this.props;
        if (loading) return <LoadingState />;
        if (error) {
            return <ErrorState message={error} onRetry={this.load} />;
        }
        const cards = [
            this.actCard(),
            this.documentsCard(),
            this.findingsCard(),
            this.examsCard(),
        ];
        const overall = cards.reduce<Severity>(
            (worst, c) =>
                SEVERITY_RANK[c.severity] > SEVERITY_RANK[worst]
                    ? c.severity
                    : worst,
            "neutral",
        );
        return (
            <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
                <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                    <Typography variant="body2" color="text.secondary">
                        Ukupna usklađenost:
                    </Typography>
                    <Chip
                        size="small"
                        color={SEVERITY_COLOR[overall]}
                        label={OVERALL_LABEL[overall]}
                    />
                </Box>
                <Box
                    sx={{
                        display: "grid",
                        gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr" },
                        gap: 2,
                    }}
                >
                    {cards.map((c) => (
                        <SectionCard key={c.title} title={c.title}>
                            <Box
                                sx={{
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "space-between",
                                    gap: 1,
                                }}
                            >
                                <Chip
                                    size="small"
                                    color={SEVERITY_COLOR[c.severity]}
                                    label={c.label}
                                />
                                <Button
                                    size="small"
                                    onClick={() => onOpenTab(c.tab)}
                                >
                                    Otvori
                                </Button>
                            </Box>
                        </SectionCard>
                    ))}
                </Box>
            </Box>
        );
    }
}
