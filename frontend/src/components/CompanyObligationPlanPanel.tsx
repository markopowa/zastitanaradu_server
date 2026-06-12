import { Component } from "react";
import { Link } from "react-router-dom";

import {
    Alert,
    Box,
    Button,
    Chip,
    CircularProgress,
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
    List,
    ListItem,
    ListItemSecondaryAction,
    ListItemText,
    TextField,
    Typography,
    useMediaQuery,
    useTheme,
} from "@mui/material";
import { enqueueSnackbar } from "notistack";

import {
    createObligationExclusion,
    deleteObligationExclusion,
    getObligationPlan,
} from "../api/processes";
import { planStatusMeta } from "../utils/status";
import { SectionCard } from "../design/SectionCard";
import { companyTabUrl } from "../utils/companyTabs";
import type { ObligationPlanRow } from "../types/processes";

const DOMAIN_LABELS: Record<string, string> = {
    OSH: "Bezbednost i zdravlje na radu",
    FP: "Zaštita od požara",
};

const SHAPE_TAB: Record<string, "documents" | "obligations"> = {
    LIVING_DOCUMENT: "documents",
    APPOINTMENT: "documents",
    PERIODIC: "obligations",
};

interface Props {
    companyId: number;
    onRefresh?: () => void;
}

interface State {
    rows: ObligationPlanRow[];
    loading: boolean;
    error: string | null;
    excludeTarget: ObligationPlanRow | null;
    excludeReason: string;
    excluding: boolean;
    excludeError: string | null;
    reincluding: number | null;
}

class CompanyObligationPlanPanelInner extends Component<
    Props & { isSmall: boolean },
    State
> {
    state: State = {
        rows: [],
        loading: true,
        error: null,
        excludeTarget: null,
        excludeReason: "",
        excluding: false,
        excludeError: null,
        reincluding: null,
    };

    componentDidMount(): void {
        this.load();
    }

    componentDidUpdate(prevProps: Props & { isSmall: boolean }): void {
        if (prevProps.companyId !== this.props.companyId) {
            this.load();
        }
    }

    load = (): void => {
        const { companyId } = this.props;
        this.setState({ loading: true, error: null });
        getObligationPlan(companyId)
            .then((rows) => this.setState({ rows, loading: false }))
            .catch(() =>
                this.setState({
                    loading: false,
                    error: "Greška pri učitavanju plana obaveza.",
                }),
            );
    };

    openExclude = (row: ObligationPlanRow): void => {
        this.setState({
            excludeTarget: row,
            excludeReason: "",
            excludeError: null,
        });
    };

    closeExclude = (): void => {
        this.setState({
            excludeTarget: null,
            excludeReason: "",
            excludeError: null,
        });
    };

    confirmExclude = (): void => {
        const { excludeTarget, excludeReason } = this.state;
        if (excludeTarget == null) return;
        if (!excludeReason.trim()) {
            this.setState({ excludeError: "Razlog je obavezan." });
            return;
        }
        this.setState({ excluding: true, excludeError: null });
        createObligationExclusion(
            this.props.companyId,
            excludeTarget.process_type.id,
            excludeReason.trim(),
        )
            .then(() => {
                this.setState({ excluding: false, excludeTarget: null });
                enqueueSnackbar("Obaveza je isključena.", {
                    variant: "success",
                });
                this.load();
            })
            .catch(
                (
                    err:
                        | { message?: string }
                        | { response?: { data?: { detail?: string } } },
                ) => {
                    const msg =
                        (err as { response?: { data?: { detail?: string } } })
                            .response?.data?.detail ??
                        (err as { message?: string }).message ??
                        "Greška pri isključivanju.";
                    this.setState({ excluding: false, excludeError: msg });
                },
            );
    };

    reinclude = (row: ObligationPlanRow): void => {
        this.setState({ reincluding: row.process_type.id });
        deleteObligationExclusion(this.props.companyId, row.process_type.id)
            .then(() => {
                this.setState({ reincluding: null });
                enqueueSnackbar("Obaveza je vraćena.", { variant: "success" });
                this.load();
            })
            .catch(
                (
                    err:
                        | { message?: string }
                        | { response?: { data?: { detail?: string } } },
                ) => {
                    const msg =
                        (err as { response?: { data?: { detail?: string } } })
                            .response?.data?.detail ??
                        (err as { message?: string }).message ??
                        "Greška pri vraćanju obaveze.";
                    enqueueSnackbar(msg, { variant: "error" });
                    this.setState({ reincluding: null });
                },
            );
    };

    private renderAction(row: ObligationPlanRow): React.ReactNode {
        const { companyId, isSmall } = this.props;
        const { reincluding } = this.state;

        if (row.excluded) {
            return (
                <Button
                    size="small"
                    disabled={reincluding === row.process_type.id}
                    onClick={() => this.reinclude(row)}
                    sx={{ whiteSpace: "nowrap" }}
                >
                    {reincluding === row.process_type.id ? "..." : "Vrati"}
                </Button>
            );
        }

        if (!row.applicable) {
            return null;
        }

        const status = row.status;

        if (status === "MISSING" || status === "OVERDUE") {
            const shape = row.process_type.shape ?? "";
            const tab = SHAPE_TAB[shape] ?? "obligations";
            const href = companyTabUrl(companyId, tab);
            return (
                <Box
                    sx={{
                        display: "flex",
                        gap: 0.5,
                        flexWrap: isSmall ? "wrap" : "nowrap",
                        justifyContent: "flex-end",
                    }}
                >
                    <Button
                        size="small"
                        component={Link}
                        to={href}
                        sx={{ whiteSpace: "nowrap" }}
                    >
                        Ispravi
                    </Button>
                    <Button
                        size="small"
                        color="inherit"
                        onClick={() => this.openExclude(row)}
                        sx={{ whiteSpace: "nowrap", color: "text.secondary" }}
                    >
                        Nije primenljivo
                    </Button>
                </Box>
            );
        }

        return (
            <Button
                size="small"
                color="inherit"
                onClick={() => this.openExclude(row)}
                sx={{ whiteSpace: "nowrap", color: "text.secondary" }}
            >
                Nije primenljivo
            </Button>
        );
    }

    render() {
        const {
            loading,
            error,
            rows,
            excludeTarget,
            excludeReason,
            excluding,
            excludeError,
        } = this.state;
        const { isSmall } = this.props;

        if (loading) {
            return (
                <Box sx={{ display: "flex", justifyContent: "center", py: 4 }}>
                    <CircularProgress />
                </Box>
            );
        }

        if (error) {
            return (
                <Alert
                    severity="error"
                    action={
                        <Button size="small" onClick={this.load}>
                            Ponovi
                        </Button>
                    }
                >
                    {error}
                </Alert>
            );
        }

        const byDomain = new Map<string, ObligationPlanRow[]>();
        for (const row of rows) {
            const domain = row.process_type.domain ?? "OSTALO";
            if (!byDomain.has(domain)) byDomain.set(domain, []);
            byDomain.get(domain)!.push(row);
        }

        const domainOrder = ["OSH", "FP"];
        const allDomains = [
            ...domainOrder.filter((d) => byDomain.has(d)),
            ...[...byDomain.keys()].filter((d) => !domainOrder.includes(d)),
        ];

        return (
            <>
                <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
                    {allDomains.map((domain) => {
                        const domainRows = byDomain.get(domain) ?? [];
                        const domainLabel = DOMAIN_LABELS[domain] ?? domain;

                        return (
                            <SectionCard key={domain} title={domainLabel}>
                                <List disablePadding>
                                    {domainRows.map((row, idx) => {
                                        const meta = planStatusMeta(
                                            row.excluded
                                                ? "EXCLUDED"
                                                : row.applicable
                                                  ? row.status
                                                  : "NOT_APPLICABLE",
                                        );
                                        const muted =
                                            row.excluded ||
                                            !row.applicable ||
                                            row.status === "NOT_APPLICABLE";
                                        return (
                                            <ListItem
                                                key={row.process_type.id}
                                                divider={
                                                    idx < domainRows.length - 1
                                                }
                                                sx={{
                                                    opacity: muted ? 0.55 : 1,
                                                    flexWrap: isSmall
                                                        ? "wrap"
                                                        : "nowrap",
                                                    pr: isSmall ? 1 : 14,
                                                    gap: 1,
                                                }}
                                                alignItems="flex-start"
                                            >
                                                <ListItemText
                                                    primary={
                                                        <Box
                                                            sx={{
                                                                display: "flex",
                                                                alignItems:
                                                                    "center",
                                                                gap: 1,
                                                                flexWrap:
                                                                    "wrap",
                                                            }}
                                                        >
                                                            <Typography
                                                                variant="body2"
                                                                component="span"
                                                            >
                                                                {
                                                                    row
                                                                        .process_type
                                                                        .name
                                                                }
                                                            </Typography>
                                                            <Chip
                                                                size="small"
                                                                color={
                                                                    meta.color
                                                                }
                                                                label={
                                                                    meta.label
                                                                }
                                                            />
                                                        </Box>
                                                    }
                                                    secondary={
                                                        row.excluded
                                                            ? `Isključeno: ${row.exclusion_reason}`
                                                            : (row.process_type
                                                                  .legal_basis ??
                                                              undefined)
                                                    }
                                                    secondaryTypographyProps={{
                                                        variant: "caption",
                                                        color: "text.secondary",
                                                    }}
                                                />
                                                {!isSmall ? (
                                                    <ListItemSecondaryAction>
                                                        {this.renderAction(row)}
                                                    </ListItemSecondaryAction>
                                                ) : (
                                                    <Box
                                                        sx={{
                                                            width: "100%",
                                                            display: "flex",
                                                            justifyContent:
                                                                "flex-end",
                                                        }}
                                                    >
                                                        {this.renderAction(row)}
                                                    </Box>
                                                )}
                                            </ListItem>
                                        );
                                    })}
                                </List>
                            </SectionCard>
                        );
                    })}
                </Box>

                <Dialog
                    open={excludeTarget != null}
                    onClose={this.closeExclude}
                    maxWidth="sm"
                    fullWidth
                    fullScreen={isSmall}
                >
                    <DialogTitle>Nije primenljivo</DialogTitle>
                    <DialogContent>
                        {excludeError && (
                            <Alert severity="error" sx={{ mb: 1 }}>
                                {excludeError}
                            </Alert>
                        )}
                        <Typography variant="body2" sx={{ mb: 2 }}>
                            Unesite razlog zašto obaveza „
                            {excludeTarget?.process_type.name}" nije primenljiva
                            za ovu firmu.
                        </Typography>
                        <TextField
                            label="Razlog"
                            fullWidth
                            required
                            multiline
                            minRows={2}
                            value={excludeReason}
                            disabled={excluding}
                            onChange={(e) =>
                                this.setState({ excludeReason: e.target.value })
                            }
                        />
                    </DialogContent>
                    <DialogActions>
                        <Button
                            onClick={this.closeExclude}
                            disabled={excluding}
                        >
                            Odustani
                        </Button>
                        <Button
                            variant="contained"
                            disabled={excluding || !excludeReason.trim()}
                            onClick={this.confirmExclude}
                        >
                            {excluding ? "Čuvam..." : "Potvrdi"}
                        </Button>
                    </DialogActions>
                </Dialog>
            </>
        );
    }
}

export function CompanyObligationPlanPanel(props: Props) {
    const theme = useTheme();
    const isSmall = useMediaQuery(theme.breakpoints.down("sm"));
    return <CompanyObligationPlanPanelInner {...props} isSmall={isSmall} />;
}
