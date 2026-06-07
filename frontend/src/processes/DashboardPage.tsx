import { Component } from "react";
import { connect } from "react-redux";

import {
    Alert,
    Box,
    Button,
    Chip,
    CircularProgress,
    FormControl,
    IconButton,
    InputLabel,
    MenuItem,
    Paper,
    Select,
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableRow,
    TextField,
    Tooltip,
    Typography,
} from "@mui/material";
import DashboardIcon from "@mui/icons-material/Dashboard";
import RefreshIcon from "@mui/icons-material/Refresh";
import FilterListIcon from "@mui/icons-material/FilterList";

import {
    fetchActivityLog,
    invalidateActivityLog,
    ensureClientCompanies,
    ensureProcessTypes,
} from "../store/processesSlice";
import { loadUsers } from "../store/authSlice";
import { setLastPath } from "../store/locationSlice";
import DateTextFieldWithPicker from "../components/DateTextFieldWithPicker";
import { formatDateTimeDisplay, displayDateToIso } from "../utils/date";
import type { AppDispatch, RootState } from "../store";
import type { ActivityLog, ActivityLogEventType } from "../types/processes";
import type { ActivityLogParams } from "../api/processes";
import type { ClientCompany, ProcessType } from "../types/processes";

const EVENT_COLORS: Record<
    ActivityLogEventType,
    "default" | "success" | "error" | "info" | "warning" | "primary"
> = {
    run_created: "info",
    run_sent: "primary",
    email_error: "error",
    run_completed: "success",
    doc_attached: "default",
    template_exec: "default",
    lead_notified: "info",
    overdue_reminder: "error",
    scheduled: "info",
};

const EVENT_TYPE_OPTIONS: { value: ActivityLogEventType | ""; label: string }[] = [
    { value: "", label: "Svi događaji" },
    { value: "run_created", label: "Aktivnost kreirana" },
    { value: "run_sent", label: "Poslat poziv/email" },
    { value: "email_error", label: "Greška pri slanju" },
    { value: "run_completed", label: "Aktivnost završena" },
    { value: "doc_attached", label: "Dokument priložen" },
    { value: "template_exec", label: "Šablon izvršen" },
    { value: "lead_notified", label: "Obaveštenje pre termina" },
    { value: "overdue_reminder", label: "Nije završeno na vreme" },
    { value: "scheduled", label: "Zakazana aktivnost" },
];

const EMPTY_FILTERS: DashboardFilters = {
    eventType: "",
    dateFrom: "",
    dateTo: "",
    processTypeId: "",
    clientCompanyId: "",
    userId: "",
    processRunId: "",
    searchQ: "",
};

interface DashboardFilters {
    eventType: ActivityLogEventType | "";
    dateFrom: string;
    dateTo: string;
    processTypeId: number | "";
    clientCompanyId: number | "";
    userId: number | "system" | "";
    processRunId: string;
    searchQ: string;
}

interface StateProps {
    items: ActivityLog[];
    loading: boolean;
    error: string | null;
    clientCompanies: ClientCompany[];
    processTypes: ProcessType[];
    users: { id: number; username: string }[];
}

interface DispatchProps {
    setLastPath: (path: string) => void;
    loadLog: (params: ActivityLogParams) => void;
    invalidate: () => void;
    ensureLookups: () => void;
}

type Props = StateProps & DispatchProps;

interface State {
    filters: DashboardFilters;
    applied: DashboardFilters;
}

function filtersToParams(f: DashboardFilters): ActivityLogParams {
    const params: ActivityLogParams = {};
    if (f.eventType) params.event_type = f.eventType;
    const from = displayDateToIso(f.dateFrom);
    if (from) params.date_from = from;
    const to = displayDateToIso(f.dateTo);
    if (to) params.date_to = to;
    if (f.processTypeId !== "") params.process_type_id = f.processTypeId;
    if (f.clientCompanyId !== "") params.client_company_id = f.clientCompanyId;
    if (f.userId !== "") params.user_id = f.userId;
    if (f.processRunId.trim()) {
        const id = Number(f.processRunId.trim());
        if (!Number.isNaN(id) && id > 0) params.process_run_id = id;
    }
    if (f.searchQ.trim()) params.q = f.searchQ.trim();
    return params;
}

class DashboardPage extends Component<Props, State> {
    state: State = {
        filters: { ...EMPTY_FILTERS },
        applied: { ...EMPTY_FILTERS },
    };

    componentDidMount(): void {
        this.props.setLastPath("/dashboard");
        this.props.ensureLookups();
        this.applyFilters(this.state.filters);
    }

    applyFilters = (filters: DashboardFilters): void => {
        this.setState({ applied: { ...filters } }, () => {
            this.props.invalidate();
            this.props.loadLog(filtersToParams(filters));
        });
    };

    handleFilterChange = <K extends keyof DashboardFilters>(
        key: K,
        value: DashboardFilters[K],
    ): void => {
        this.setState((prev) => ({
            filters: { ...prev.filters, [key]: value },
        }));
    };

    handleApply = (): void => {
        this.applyFilters(this.state.filters);
    };

    handleReset = (): void => {
        this.setState({ filters: { ...EMPTY_FILTERS } }, () => {
            this.applyFilters(EMPTY_FILTERS);
        });
    };

    handleRefresh = (): void => {
        this.props.invalidate();
        this.props.loadLog(filtersToParams(this.state.applied));
    };

    render() {
        const { items, loading, error, clientCompanies, processTypes, users } =
            this.props;
        const { filters, applied } = this.state;
        const hasActiveFilters =
            applied.eventType !== "" ||
            applied.dateFrom !== "" ||
            applied.dateTo !== "" ||
            applied.processTypeId !== "" ||
            applied.clientCompanyId !== "" ||
            applied.userId !== "" ||
            applied.processRunId.trim() !== "" ||
            applied.searchQ.trim() !== "";

        return (
            <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
                <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                    <Typography
                        variant="h6"
                        sx={{ display: "flex", alignItems: "center", gap: 1, flex: 1 }}
                    >
                        <DashboardIcon /> Kontrolna tabla
                    </Typography>
                    <Tooltip title="Osveži">
                        <IconButton onClick={this.handleRefresh} size="small">
                            <RefreshIcon />
                        </IconButton>
                    </Tooltip>
                </Box>

                <Typography variant="subtitle2" color="text.secondary">
                    Log aktivnosti
                    {hasActiveFilters ? ` (${items.length} zapisa)` : ""}
                </Typography>

                <Paper sx={{ p: 2 }}>
                    <Box
                        sx={{
                            display: "flex",
                            alignItems: "center",
                            gap: 1,
                            mb: 2,
                        }}
                    >
                        <FilterListIcon fontSize="small" color="action" />
                        <Typography variant="subtitle2">Filteri</Typography>
                    </Box>
                    <Box
                        sx={{
                            display: "grid",
                            gridTemplateColumns: {
                                xs: "1fr",
                                sm: "1fr 1fr",
                                md: "repeat(3, 1fr)",
                            },
                            gap: 2,
                        }}
                    >
                        <FormControl size="small" fullWidth>
                            <InputLabel>Vrsta događaja</InputLabel>
                            <Select
                                value={filters.eventType}
                                label="Vrsta događaja"
                                onChange={(e) =>
                                    this.handleFilterChange(
                                        "eventType",
                                        e.target.value as ActivityLogEventType | "",
                                    )
                                }
                            >
                                {EVENT_TYPE_OPTIONS.map((opt) => (
                                    <MenuItem key={opt.value || "all"} value={opt.value}>
                                        {opt.label}
                                    </MenuItem>
                                ))}
                            </Select>
                        </FormControl>

                        <FormControl size="small" fullWidth>
                            <InputLabel>Vrsta obaveze</InputLabel>
                            <Select
                                value={filters.processTypeId}
                                label="Vrsta obaveze"
                                onChange={(e) =>
                                    this.handleFilterChange(
                                        "processTypeId",
                                        e.target.value === ""
                                            ? ""
                                            : Number(e.target.value),
                                    )
                                }
                            >
                                <MenuItem value="">Sve vrste</MenuItem>
                                {processTypes.map((pt) => (
                                    <MenuItem key={pt.id} value={pt.id}>
                                        {pt.name}
                                    </MenuItem>
                                ))}
                            </Select>
                        </FormControl>

                        <FormControl size="small" fullWidth>
                            <InputLabel>Firma</InputLabel>
                            <Select
                                value={filters.clientCompanyId}
                                label="Firma"
                                onChange={(e) =>
                                    this.handleFilterChange(
                                        "clientCompanyId",
                                        e.target.value === ""
                                            ? ""
                                            : Number(e.target.value),
                                    )
                                }
                            >
                                <MenuItem value="">Sve firme</MenuItem>
                                {clientCompanies.map((c) => (
                                    <MenuItem key={c.id} value={c.id}>
                                        {c.name}
                                    </MenuItem>
                                ))}
                            </Select>
                        </FormControl>

                        <FormControl size="small" fullWidth>
                            <InputLabel>Korisnik</InputLabel>
                            <Select
                                value={filters.userId}
                                label="Korisnik"
                                onChange={(e) => {
                                    const v = e.target.value;
                                    if (v === "" || v === "system") {
                                        this.handleFilterChange("userId", v);
                                    } else {
                                        this.handleFilterChange("userId", Number(v));
                                    }
                                }}
                            >
                                <MenuItem value="">Svi korisnici</MenuItem>
                                <MenuItem value="system">Sistem</MenuItem>
                                {users.map((u) => (
                                    <MenuItem key={u.id} value={u.id}>
                                        {u.username}
                                    </MenuItem>
                                ))}
                            </Select>
                        </FormControl>

                        <DateTextFieldWithPicker
                            label="Od (dd.mm.yyyy)"
                            value={filters.dateFrom}
                            allowPast
                            onChange={(v) => this.handleFilterChange("dateFrom", v)}
                        />
                        <DateTextFieldWithPicker
                            label="Do (dd.mm.yyyy)"
                            value={filters.dateTo}
                            allowPast
                            onChange={(v) => this.handleFilterChange("dateTo", v)}
                        />

                        <TextField
                            size="small"
                            label="ID aktivnosti"
                            type="number"
                            value={filters.processRunId}
                            onChange={(e) =>
                                this.handleFilterChange("processRunId", e.target.value)
                            }
                        />

                        <TextField
                            size="small"
                            label="Pretraga u opisu"
                            value={filters.searchQ}
                            onChange={(e) =>
                                this.handleFilterChange("searchQ", e.target.value)
                            }
                            sx={{ gridColumn: { md: "span 2" } }}
                        />
                    </Box>
                    <Box sx={{ display: "flex", gap: 1, mt: 2, flexWrap: "wrap" }}>
                        <Button variant="contained" size="small" onClick={this.handleApply}>
                            Primeni filtere
                        </Button>
                        <Button variant="outlined" size="small" onClick={this.handleReset}>
                            Poništi
                        </Button>
                    </Box>
                </Paper>

                {error && <Alert severity="error">{error}</Alert>}

                {loading ? (
                    <Box sx={{ display: "flex", justifyContent: "center", py: 4 }}>
                        <CircularProgress />
                    </Box>
                ) : (
                    <Paper sx={{ overflow: "auto" }}>
                        <Table size="small">
                            <TableHead>
                                <TableRow>
                                    <TableCell sx={{ whiteSpace: "nowrap" }}>Vreme</TableCell>
                                    <TableCell>Događaj</TableCell>
                                    <TableCell>Korisnik</TableCell>
                                    <TableCell>ID aktivnosti</TableCell>
                                    <TableCell>Opis</TableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {items.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={5} align="center">
                                            Nema zapisa za izabrane filtere.
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    items.map((log) => (
                                        <TableRow key={log.id}>
                                            <TableCell sx={{ whiteSpace: "nowrap" }}>
                                                {formatDateTimeDisplay(log.timestamp)}
                                            </TableCell>
                                            <TableCell>
                                                <Chip
                                                    label={log.event_type_display}
                                                    size="small"
                                                    color={
                                                        EVENT_COLORS[log.event_type] ??
                                                        "default"
                                                    }
                                                />
                                            </TableCell>
                                            <TableCell>{log.username}</TableCell>
                                            <TableCell>
                                                {log.process_run_id ?? "—"}
                                            </TableCell>
                                            <TableCell>{log.description}</TableCell>
                                        </TableRow>
                                    ))
                                )}
                            </TableBody>
                        </Table>
                    </Paper>
                )}
            </Box>
        );
    }
}

const mapStateToProps = (state: RootState): StateProps => ({
    items: state.processes.activityLogItems,
    loading: state.processes.activityLogStatus === "loading",
    error:
        state.processes.activityLogStatus === "failed"
            ? (state.processes.activityLogError ?? "Greška")
            : null,
    clientCompanies: state.processes.clientCompanies,
    processTypes: state.processes.processTypes,
    users: (state.auth.users ?? []).map((u) => ({
        id: u.id,
        username: u.username,
    })),
});

const mapDispatchToProps = (dispatch: AppDispatch): DispatchProps => ({
    setLastPath: (path) => dispatch(setLastPath(path)),
    loadLog: (params) => {
        void dispatch(fetchActivityLog(params));
    },
    invalidate: () => dispatch(invalidateActivityLog()),
    ensureLookups: () => {
        void dispatch(ensureClientCompanies());
        void dispatch(ensureProcessTypes());
        void dispatch(loadUsers());
    },
});

export default connect(mapStateToProps, mapDispatchToProps)(DashboardPage);
