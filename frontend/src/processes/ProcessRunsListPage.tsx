import { Component } from "react";
import { connect } from "react-redux";

import {
    Box,
    Button,
    Chip,
    FormControl,
    InputLabel,
    MenuItem,
    Paper,
    Select,
    Stack,
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableRow,
    Typography,
} from "@mui/material";
import OpenInNewIcon from "@mui/icons-material/OpenInNew";

import type { ProcessRunsParams } from "../api/processes";
import {
    ensureClientCompanies,
    ensureProcessTypes,
    fetchRuns,
} from "../store/processesSlice";
import { setLastPath } from "../store/locationSlice";
import {
    formatDateDisplay,
    isScheduledOverdue,
    isoDateToLocalDate,
    todayLocalDate,
} from "../utils/date";
import { withNavigation } from "../hocs/withNavigation";
import { ErrorState, StatusBadge, TableStateRow } from "../design";
import { RUN_STATUS_KINDS, runStatusLabel } from "../design/labels";

import type { AppDispatch, RootState } from "../store";
import type { ProcessRun } from "../types/processes";
import type {
    ProcessRunsListPageDispatchProps,
    ProcessRunsListPageProps,
    ProcessRunsListPageState,
    ProcessRunsListPageStateProps,
    RunsQuickFilter,
} from "../types/processPages";

const SOON_DAYS = 14;

const QUICK_FILTER_OPTIONS: {
    value: RunsQuickFilter;
    label: string;
    color: "default" | "error" | "warning" | "primary";
}[] = [
    { value: "overdue", label: "Kasni", color: "error" },
    { value: "soon", label: "Stiže uskoro", color: "warning" },
    { value: "open", label: "Otvorene", color: "primary" },
    { value: "all", label: "Sve", color: "default" },
];

function isoDateNowPlus(days: number): Date {
    const d = todayLocalDate();
    d.setDate(d.getDate() + days);
    return d;
}

function applyQuickFilter(
    items: ProcessRun[],
    filter: RunsQuickFilter,
): ProcessRun[] {
    if (filter === "all") return items;
    const isOpen = (r: ProcessRun) =>
        r.status === "PENDING" || r.status === "SENT";
    if (filter === "open") return items.filter(isOpen);
    if (filter === "overdue") {
        return items.filter(
            (r) => isOpen(r) && isScheduledOverdue(r.scheduled_for),
        );
    }
    if (filter === "soon") {
        const soonLimit = isoDateNowPlus(SOON_DAYS);
        return items.filter((r) => {
            if (!isOpen(r)) return false;
            if (isScheduledOverdue(r.scheduled_for)) return false;
            const d = isoDateToLocalDate(r.valid_until);
            if (!d) return false;
            return d <= soonLimit;
        });
    }
    return items;
}

function parseRunsListSearch(
    search: string,
): Pick<
    ProcessRunsListPageState,
    "client_company_id" | "process_type_id" | "status" | "quickFilter"
> {
    const q = new URLSearchParams(
        search.startsWith("?") ? search.slice(1) : search,
    );
    const qf = q.get("quick_filter") as RunsQuickFilter | null;
    const validFilters: RunsQuickFilter[] = ["overdue", "soon", "open", "all"];
    return {
        client_company_id: q.get("client_company_id") ?? "",
        process_type_id: q.get("process_type_id") ?? "",
        status: q.get("status") ?? "",
        quickFilter: validFilters.includes(qf as RunsQuickFilter)
            ? (qf as RunsQuickFilter)
            : "open",
    };
}

class ProcessRunsListPageInner extends Component<
    ProcessRunsListPageProps,
    ProcessRunsListPageState
> {
    state: ProcessRunsListPageState = {
        client_company_id: "",
        process_type_id: "",
        status: "",
        quickFilter: "open",
    };

    load = (): void => {
        const { client_company_id, process_type_id, status } = this.state;
        const params: ProcessRunsParams = {};
        if (client_company_id)
            params.client_company_id = Number(client_company_id);
        if (process_type_id) params.process_type_id = Number(process_type_id);
        if (status) params.status = status;
        this.props.loadRuns?.(params);
    };

    componentDidMount(): void {
        this.props.setLastPath?.("/processes/runs");
        const fromUrl = parseRunsListSearch(this.props.location.search);
        this.setState(
            (prev) => ({ ...prev, ...fromUrl }),
            () => {
                this.props.ensureClientCompanies?.();
                this.props.ensureProcessTypes?.();
                this.load();
            },
        );
    }

    componentDidUpdate(prevProps: ProcessRunsListPageProps): void {
        if (prevProps.location.search !== this.props.location.search) {
            const fromUrl = parseRunsListSearch(this.props.location.search);
            this.setState(
                (prev) => ({ ...prev, ...fromUrl }),
                () => this.load(),
            );
        }
    }

    openDetail = (runId: number): void => {
        this.props.navigate(`/processes/runs/${runId}`);
    };

    setQuickFilter = (filter: RunsQuickFilter): void => {
        this.setState({ quickFilter: filter });
    };

    render() {
        const {
            runsItems: allItems,
            clientCompanies: clients,
            processTypes: types,
            runsLoading: loading,
            runsError: error,
        } = this.props;
        const { client_company_id, process_type_id, status, quickFilter } =
            this.state;

        const items = applyQuickFilter(allItems, quickFilter);

        return (
            <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
                <Typography variant="h6">Aktivnosti</Typography>

                <Stack
                    direction="row"
                    spacing={1}
                    flexWrap="wrap"
                    sx={{ rowGap: 1 }}
                >
                    {QUICK_FILTER_OPTIONS.map((opt) => (
                        <Chip
                            key={opt.value}
                            label={opt.label}
                            color={
                                quickFilter === opt.value
                                    ? opt.color
                                    : "default"
                            }
                            variant={
                                quickFilter === opt.value
                                    ? "filled"
                                    : "outlined"
                            }
                            onClick={() => this.setQuickFilter(opt.value)}
                            clickable
                        />
                    ))}
                </Stack>

                <Box sx={{ display: "flex", flexWrap: "wrap", gap: 2 }}>
                    <FormControl size="small" sx={{ minWidth: 200 }}>
                        <InputLabel>Firma</InputLabel>
                        <Select
                            value={client_company_id}
                            label="Firma"
                            onChange={(e) =>
                                this.setState(
                                    (prev) => ({
                                        ...prev,
                                        client_company_id: e.target
                                            .value as string,
                                    }),
                                    () => this.load(),
                                )
                            }
                        >
                            <MenuItem value="">Svi</MenuItem>
                            {clients.map((c) => (
                                <MenuItem key={c.id} value={String(c.id)}>
                                    {c.name}
                                </MenuItem>
                            ))}
                        </Select>
                    </FormControl>
                    <FormControl size="small" sx={{ minWidth: 200 }}>
                        <InputLabel>Vrsta obaveze</InputLabel>
                        <Select
                            value={process_type_id}
                            label="Vrsta obaveze"
                            onChange={(e) =>
                                this.setState(
                                    (prev) => ({
                                        ...prev,
                                        process_type_id: e.target
                                            .value as string,
                                    }),
                                    () => this.load(),
                                )
                            }
                        >
                            <MenuItem value="">Svi</MenuItem>
                            {types.map((t) => (
                                <MenuItem key={t.id} value={String(t.id)}>
                                    {t.name}
                                </MenuItem>
                            ))}
                        </Select>
                    </FormControl>
                    <FormControl size="small" sx={{ minWidth: 140 }}>
                        <InputLabel>Status</InputLabel>
                        <Select
                            value={status}
                            label="Status"
                            onChange={(e) =>
                                this.setState(
                                    (prev) => ({
                                        ...prev,
                                        status: e.target.value as string,
                                    }),
                                    () => this.load(),
                                )
                            }
                        >
                            <MenuItem value="">Svi</MenuItem>
                            {RUN_STATUS_KINDS.map((s) => (
                                <MenuItem key={s} value={s}>
                                    {runStatusLabel(s)}
                                </MenuItem>
                            ))}
                        </Select>
                    </FormControl>
                </Box>
                {error && <ErrorState message={error} onRetry={this.load} />}
                {loading ? (
                    <Paper sx={{ overflow: "auto" }}>
                        <Table size="small">
                            <TableBody>
                                <TableStateRow colSpan={6} state="loading" />
                            </TableBody>
                        </Table>
                    </Paper>
                ) : (
                    <Paper sx={{ overflow: "auto" }}>
                        <Table size="small">
                            <TableHead>
                                <TableRow>
                                    <TableCell>Subjekt</TableCell>
                                    <TableCell>Tip</TableCell>
                                    <TableCell>Zakazano</TableCell>
                                    <TableCell>Važi do</TableCell>
                                    <TableCell>Status</TableCell>
                                    <TableCell align="right" />
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {items.length === 0 ? (
                                    <TableStateRow
                                        colSpan={6}
                                        state="empty"
                                        emptyMessage="Nema aktivnosti."
                                    />
                                ) : (
                                    items.map((row) => {
                                        const hasEmailError =
                                            row.trigger_runs?.some((tr) =>
                                                tr.email_error?.trim(),
                                            );
                                        const isOverdue =
                                            (row.status === "PENDING" ||
                                                row.status === "SENT") &&
                                            isScheduledOverdue(
                                                row.scheduled_for,
                                            );
                                        return (
                                            <TableRow
                                                key={row.id}
                                                hover
                                                sx={{ cursor: "pointer" }}
                                                onClick={() =>
                                                    this.openDetail(row.id)
                                                }
                                            >
                                                <TableCell>
                                                    {row.subject_snapshot
                                                        ?.name ??
                                                        row.subject_snapshot
                                                            ?.kind ??
                                                        "—"}
                                                </TableCell>
                                                <TableCell>
                                                    {row.process_type_name}
                                                </TableCell>
                                                <TableCell>
                                                    {formatDateDisplay(
                                                        row.scheduled_for,
                                                    )}
                                                </TableCell>
                                                <TableCell>
                                                    {formatDateDisplay(
                                                        row.valid_until,
                                                    )}
                                                </TableCell>
                                                <TableCell>
                                                    <StatusBadge
                                                        status={row.status}
                                                        isOverdue={isOverdue}
                                                        hasEmailError={
                                                            hasEmailError
                                                        }
                                                    />
                                                </TableCell>
                                                <TableCell
                                                    align="right"
                                                    onClick={(e) =>
                                                        e.stopPropagation()
                                                    }
                                                >
                                                    <Button
                                                        size="small"
                                                        startIcon={
                                                            <OpenInNewIcon />
                                                        }
                                                        onClick={() =>
                                                            this.openDetail(
                                                                row.id,
                                                            )
                                                        }
                                                    >
                                                        Detalji
                                                    </Button>
                                                </TableCell>
                                            </TableRow>
                                        );
                                    })
                                )}
                            </TableBody>
                        </Table>
                    </Paper>
                )}
            </Box>
        );
    }
}

const mapStateToProps = (state: RootState): ProcessRunsListPageStateProps => ({
    clientCompanies: state.processes.clientCompanies,
    processTypes: state.processes.processTypes,
    runsItems: state.processes.runsItems,
    runsLoading: state.processes.runsStatus === "loading",
    runsError:
        state.processes.runsStatus === "failed"
            ? (state.processes.runsError ?? "Greška")
            : null,
});

const mapDispatchToProps = (
    dispatch: AppDispatch,
): ProcessRunsListPageDispatchProps => ({
    setLastPath: (path: string) => dispatch(setLastPath(path)),
    ensureClientCompanies: () => {
        void dispatch(ensureClientCompanies());
    },
    ensureProcessTypes: () => {
        void dispatch(ensureProcessTypes());
    },
    loadRuns: (params) => {
        void dispatch(fetchRuns(params));
    },
});

const Connected = connect(
    mapStateToProps,
    mapDispatchToProps,
)(ProcessRunsListPageInner);

export default withNavigation(Connected);
