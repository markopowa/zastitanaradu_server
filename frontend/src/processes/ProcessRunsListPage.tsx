import { Component } from "react";
import { connect } from "react-redux";

import {
    Box,
    Button,
    FormControl,
    InputLabel,
    MenuItem,
    Paper,
    Select,
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
import { formatDateDisplay } from "../utils/date";
import { withNavigation } from "../hocs/withNavigation";
import { ErrorState, StatusBadge, TableStateRow } from "../design";

import type { AppDispatch, RootState } from "../store";
import type {
    ProcessRunsListPageDispatchProps,
    ProcessRunsListPageProps,
    ProcessRunsListPageState,
    ProcessRunsListPageStateProps,
} from "../types/processPages";

function parseRunsListSearch(
    search: string,
): Pick<
    ProcessRunsListPageState,
    "client_company_id" | "process_type_id" | "status"
> {
    const q = new URLSearchParams(
        search.startsWith("?") ? search.slice(1) : search,
    );
    return {
        client_company_id: q.get("client_company_id") ?? "",
        process_type_id: q.get("process_type_id") ?? "",
        status: q.get("status") ?? "",
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

    render() {
        const {
            runsItems: items,
            clientCompanies: clients,
            processTypes: types,
            runsLoading: loading,
            runsError: error,
        } = this.props;
        const { client_company_id, process_type_id, status } = this.state;

        return (
            <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
                <Typography variant="h6">Aktivnosti</Typography>
                <Box sx={{ display: "flex", flexWrap: "wrap", gap: 2 }}>
                    <FormControl size="small" sx={{ minWidth: 200 }}>
                        <InputLabel>Klijent</InputLabel>
                        <Select
                            value={client_company_id}
                            label="Klijent"
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
                            <MenuItem value="PENDING">Na čekanju</MenuItem>
                            <MenuItem value="SENT">Poslat</MenuItem>
                            <MenuItem value="COMPLETED">Završeno</MenuItem>
                            <MenuItem value="CANCELLED">Otkazano</MenuItem>
                            <MenuItem value="FAILED">Neuspešno</MenuItem>
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
                                                    {row.subject_snapshot?.name ??
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
                                                        hasEmailError={
                                                            hasEmailError
                                                        }
                                                    />
                                                    {hasEmailError ? (
                                                        <Typography
                                                            variant="body2"
                                                            color="error"
                                                        >
                                                            Mejl nije poslat
                                                        </Typography>
                                                    ) : null}
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
