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
    IconButton,
    Menu,
    MenuItem,
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableRow,
    TextField,
    Typography,
    useMediaQuery,
    useTheme,
} from "@mui/material";
import MoreVertIcon from "@mui/icons-material/MoreVert";
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
    menuAnchor: HTMLElement | null;
    menuRow: ObligationPlanRow | null;
}

function domainSummaryChips(domainRows: ObligationPlanRow[]) {
    let missing = 0;
    let overdue = 0;
    let ok = 0;
    for (const row of domainRows) {
        if (row.excluded || !row.applicable) continue;
        if (row.status === "MISSING") missing++;
        else if (row.status === "OVERDUE") overdue++;
        else if (row.status === "OK" || row.status === "DUE_SOON") ok++;
    }
    return { missing, overdue, ok };
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
        menuAnchor: null,
        menuRow: null,
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

    openMenu = (
        event: React.MouseEvent<HTMLButtonElement>,
        row: ObligationPlanRow,
    ): void => {
        event.stopPropagation();
        this.setState({ menuAnchor: event.currentTarget, menuRow: row });
    };

    closeMenu = (): void => {
        this.setState({ menuAnchor: null, menuRow: null });
    };

    openExclude = (row: ObligationPlanRow): void => {
        this.closeMenu();
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
        this.closeMenu();
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

    render() {
        const {
            loading,
            error,
            rows,
            excludeTarget,
            excludeReason,
            excluding,
            excludeError,
            menuAnchor,
            menuRow,
            reincluding,
        } = this.state;
        const { isSmall, companyId } = this.props;

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
                        const { missing, overdue, ok } =
                            domainSummaryChips(domainRows);

                        return (
                            <SectionCard
                                key={domain}
                                title={domainLabel}
                                action={
                                    <Box
                                        sx={{
                                            display: "flex",
                                            alignItems: "center",
                                            flexWrap: "wrap",
                                            gap: 0.5,
                                        }}
                                    >
                                        {missing > 0 && (
                                            <Chip
                                                size="small"
                                                color="default"
                                                label={`${missing} nedostaje`}
                                            />
                                        )}
                                        {overdue > 0 && (
                                            <Chip
                                                size="small"
                                                color="error"
                                                label={`${overdue} kasni`}
                                            />
                                        )}
                                        {ok > 0 && (
                                            <Chip
                                                size="small"
                                                color="success"
                                                label={`${ok} u redu`}
                                            />
                                        )}
                                    </Box>
                                }
                            >
                                <Table size="small">
                                    <TableHead>
                                        <TableRow>
                                            <TableCell>Obaveza</TableCell>
                                            <TableCell
                                                align="right"
                                                sx={{ width: 130 }}
                                            >
                                                Status
                                            </TableCell>
                                            <TableCell
                                                sx={{ width: 48 }}
                                            />
                                        </TableRow>
                                    </TableHead>
                                    <TableBody>
                                        {domainRows.map((row) => {
                                            const effectiveStatus = row.excluded
                                                ? "EXCLUDED"
                                                : row.applicable
                                                  ? row.status
                                                  : "NOT_APPLICABLE";
                                            const meta =
                                                planStatusMeta(effectiveStatus);
                                            const muted =
                                                row.excluded || !row.applicable;
                                            const hasMenu =
                                                row.excluded ||
                                                (row.applicable &&
                                                    effectiveStatus !==
                                                        "NOT_APPLICABLE");

                                            return (
                                                <TableRow
                                                    key={row.process_type.id}
                                                    sx={{
                                                        opacity: muted
                                                            ? 0.5
                                                            : 1,
                                                        verticalAlign: isSmall
                                                            ? "top"
                                                            : "middle",
                                                    }}
                                                >
                                                    <TableCell
                                                        sx={{ py: 1.25 }}
                                                    >
                                                        {isSmall ? (
                                                            <Box>
                                                                <Typography
                                                                    variant="body2"
                                                                    fontWeight={
                                                                        500
                                                                    }
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
                                                                    sx={{
                                                                        mt: 0.5,
                                                                    }}
                                                                />
                                                                {row.excluded &&
                                                                    row.exclusion_reason && (
                                                                        <Typography
                                                                            variant="caption"
                                                                            color="text.secondary"
                                                                            display="block"
                                                                            sx={{
                                                                                mt: 0.25,
                                                                            }}
                                                                        >
                                                                            Isključeno:{" "}
                                                                            {
                                                                                row.exclusion_reason
                                                                            }
                                                                        </Typography>
                                                                    )}
                                                                {!row.excluded &&
                                                                    row
                                                                        .process_type
                                                                        .legal_basis && (
                                                                        <Typography
                                                                            variant="caption"
                                                                            color="text.secondary"
                                                                            display="block"
                                                                            sx={{
                                                                                mt: 0.25,
                                                                            }}
                                                                        >
                                                                            {
                                                                                row
                                                                                    .process_type
                                                                                    .legal_basis
                                                                            }
                                                                        </Typography>
                                                                    )}
                                                            </Box>
                                                        ) : (
                                                            <Box>
                                                                <Typography
                                                                    variant="body2"
                                                                    fontWeight={
                                                                        500
                                                                    }
                                                                >
                                                                    {
                                                                        row
                                                                            .process_type
                                                                            .name
                                                                    }
                                                                </Typography>
                                                                {row.excluded &&
                                                                    row.exclusion_reason && (
                                                                        <Typography
                                                                            variant="caption"
                                                                            color="text.secondary"
                                                                            display="block"
                                                                        >
                                                                            Isključeno:{" "}
                                                                            {
                                                                                row.exclusion_reason
                                                                            }
                                                                        </Typography>
                                                                    )}
                                                                {!row.excluded &&
                                                                    row
                                                                        .process_type
                                                                        .legal_basis && (
                                                                        <Typography
                                                                            variant="caption"
                                                                            color="text.secondary"
                                                                            display="block"
                                                                        >
                                                                            {
                                                                                row
                                                                                    .process_type
                                                                                    .legal_basis
                                                                            }
                                                                        </Typography>
                                                                    )}
                                                            </Box>
                                                        )}
                                                    </TableCell>
                                                    {!isSmall && (
                                                        <TableCell
                                                            align="right"
                                                            sx={{ py: 1.25 }}
                                                        >
                                                            <Chip
                                                                size="small"
                                                                color={
                                                                    meta.color
                                                                }
                                                                label={
                                                                    meta.label
                                                                }
                                                            />
                                                        </TableCell>
                                                    )}
                                                    <TableCell
                                                        align="right"
                                                        sx={{
                                                            py: 0.5,
                                                            width: 48,
                                                        }}
                                                    >
                                                        {hasMenu && (
                                                            <IconButton
                                                                size="small"
                                                                disabled={
                                                                    reincluding ===
                                                                    row
                                                                        .process_type
                                                                        .id
                                                                }
                                                                onClick={(e) =>
                                                                    this.openMenu(
                                                                        e,
                                                                        row,
                                                                    )
                                                                }
                                                            >
                                                                <MoreVertIcon fontSize="small" />
                                                            </IconButton>
                                                        )}
                                                    </TableCell>
                                                </TableRow>
                                            );
                                        })}
                                    </TableBody>
                                </Table>
                            </SectionCard>
                        );
                    })}
                </Box>

                <Menu
                    anchorEl={menuAnchor}
                    open={Boolean(menuAnchor)}
                    onClose={this.closeMenu}
                >
                    {menuRow && !menuRow.excluded && (
                        (menuRow.status === "MISSING" ||
                            menuRow.status === "OVERDUE") && (
                            <MenuItem
                                component={Link}
                                to={companyTabUrl(
                                    companyId,
                                    SHAPE_TAB[
                                        menuRow.process_type.shape ?? ""
                                    ] ?? "obligations",
                                )}
                                onClick={this.closeMenu}
                            >
                                Ispravi
                            </MenuItem>
                        )
                    )}
                    {menuRow && !menuRow.excluded && menuRow.applicable && (
                        <MenuItem onClick={() => this.openExclude(menuRow)}>
                            Nije primenljivo
                        </MenuItem>
                    )}
                    {menuRow && menuRow.excluded && (
                        <MenuItem
                            onClick={() => this.reinclude(menuRow)}
                            disabled={
                                reincluding === menuRow.process_type.id
                            }
                        >
                            {reincluding === menuRow.process_type.id
                                ? "Vraćam..."
                                : "Vrati"}
                        </MenuItem>
                    )}
                </Menu>

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
