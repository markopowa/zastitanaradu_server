import { Component } from "react";
import { connect } from "react-redux";

import {
    Alert,
    Box,
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
    Tooltip,
    Typography,
} from "@mui/material";
import DashboardIcon from "@mui/icons-material/Dashboard";
import RefreshIcon from "@mui/icons-material/Refresh";

import { fetchActivityLog, invalidateActivityLog } from "../store/processesSlice";
import { setLastPath } from "../store/locationSlice";
import type { AppDispatch, RootState } from "../store";
import type { ActivityLog, ActivityLogEventType } from "../types/processes";

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

const pad = (n: number) => String(n).padStart(2, "0");

function formatTimestamp(value: string): string {
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return value;
    return (
        `${pad(d.getDate())}.${pad(d.getMonth() + 1)}.${d.getFullYear()} ` +
        `${pad(d.getHours())}:${pad(d.getMinutes())}`
    );
}

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

interface StateProps {
    items: ActivityLog[];
    loading: boolean;
    error: string | null;
}

interface DispatchProps {
    setLastPath: (path: string) => void;
    loadLog: (eventType?: ActivityLogEventType) => void;
    invalidate: () => void;
}

type Props = StateProps & DispatchProps;

interface State {
    eventType: ActivityLogEventType | "";
}

class DashboardPage extends Component<Props, State> {
    state: State = { eventType: "" };

    componentDidMount(): void {
        this.props.setLastPath("/dashboard");
        this.props.loadLog();
    }

    handleEventTypeChange = (value: string): void => {
        const eventType = value as ActivityLogEventType | "";
        this.setState({ eventType }, () => {
            this.props.invalidate();
            this.props.loadLog(eventType || undefined);
        });
    };

    handleRefresh = (): void => {
        this.props.invalidate();
        this.props.loadLog(this.state.eventType || undefined);
    };

    render() {
        const { items, loading, error } = this.props;
        const { eventType } = this.state;

        return (
            <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
                <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                    <Typography
                        variant="h6"
                        sx={{ display: "flex", alignItems: "center", gap: 1, flex: 1 }}
                    >
                        <DashboardIcon /> Log aktivnosti
                    </Typography>
                    <Tooltip title="Osveži">
                        <IconButton onClick={this.handleRefresh} size="small">
                            <RefreshIcon />
                        </IconButton>
                    </Tooltip>
                </Box>

                <Box sx={{ display: "flex", gap: 2, alignItems: "center" }}>
                    <FormControl size="small" sx={{ minWidth: 220 }}>
                        <InputLabel>Vrsta događaja</InputLabel>
                        <Select
                            value={eventType}
                            label="Vrsta događaja"
                            onChange={(e) => this.handleEventTypeChange(e.target.value)}
                        >
                            {EVENT_TYPE_OPTIONS.map((opt) => (
                                <MenuItem key={opt.value} value={opt.value}>
                                    {opt.label}
                                </MenuItem>
                            ))}
                        </Select>
                    </FormControl>
                </Box>

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
                                    <TableCell>Opis</TableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {items.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={4} align="center">
                                            Nema zapisa.
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    items.map((log) => (
                                        <TableRow key={log.id}>
                                            <TableCell sx={{ whiteSpace: "nowrap" }}>
                                                {formatTimestamp(log.timestamp)}
                                            </TableCell>
                                            <TableCell>
                                                <Chip
                                                    label={log.event_type_display}
                                                    size="small"
                                                    color={EVENT_COLORS[log.event_type] ?? "default"}
                                                />
                                            </TableCell>
                                            <TableCell>{log.username || "—"}</TableCell>
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
});

const mapDispatchToProps = (dispatch: AppDispatch): DispatchProps => ({
    setLastPath: (path) => dispatch(setLastPath(path)),
    loadLog: (eventType) => {
        void dispatch(fetchActivityLog(eventType ? { event_type: eventType } : {}));
    },
    invalidate: () => dispatch(invalidateActivityLog()),
});

export default connect(mapStateToProps, mapDispatchToProps)(DashboardPage);
