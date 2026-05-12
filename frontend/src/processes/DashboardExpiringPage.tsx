import { Component } from "react";
import { connect } from "react-redux";

import {
    Box,
    Paper,
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableRow,
    Typography,
    FormControl,
    InputLabel,
    Select,
    MenuItem,
    CircularProgress,
    Alert,
    FormControlLabel,
    Switch,
    Tooltip,
} from "@mui/material";
import DashboardIcon from "@mui/icons-material/Dashboard";

import type { DashboardExpiringParams } from "../api/processes";
import {
    ensureClientCompanies,
    ensureProcessTypes,
    fetchDashboardExpiring,
} from "../store/processesSlice";
import { setLastPath } from "../store/locationSlice";

import type { AppDispatch, RootState } from "../store";
import type {
    DashboardExpiringPageDispatchProps,
    DashboardExpiringPageProps,
    DashboardExpiringPageState,
    DashboardExpiringPageStateProps,
} from "../types/processPages";

const pad = (n: number) => String(n).padStart(2, "0");
const STATUS_LABELS: Record<string, string> = {
    PENDING: "Na čekanju",
    COMPLETED: "Završeno",
    CANCELLED: "Otkazano",
    FAILED: "Neuspešno",
};

const formatDate = (value?: string | null): string => {
    if (!value) return "—";
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return value;
    return `${pad(d.getDate())}.${pad(d.getMonth() + 1)}.${d.getFullYear()}.`;
};

class DashboardExpiringPage extends Component<
    DashboardExpiringPageProps,
    DashboardExpiringPageState
> {
    state: DashboardExpiringPageState = {
        days: 30,
        use_lead_time: false,
        client_company_id: "",
        subject_kind: "",
        process_type_id: "",
    };

    load = (): void => {
        const {
            days,
            use_lead_time,
            client_company_id,
            subject_kind,
            process_type_id,
        } = this.state;
        const params: DashboardExpiringParams = { days, use_lead_time };
        if (client_company_id)
            params.client_company_id = Number(client_company_id);
        if (subject_kind) params.subject_kind = subject_kind;
        if (process_type_id) params.process_type_id = Number(process_type_id);
        this.props.loadDashboard(params);
    };

    componentDidMount(): void {
        this.props.setLastPath("/dashboard");
        this.props.ensureClientCompanies();
        this.props.ensureProcessTypes();
        this.load();
    }

    handleFilterChange = (
        key: keyof DashboardExpiringPageState,
        value: string | number,
    ): void => {
        this.setState(
            (prev) => ({ ...prev, [key]: value }),
            () => this.load(),
        );
    };

    render() {
        const {
            dashboardItems: items,
            clientCompanies: clients,
            processTypes,
            dashboardLoading: loading,
            dashboardError: error,
        } = this.props;
        const {
            days,
            use_lead_time,
            client_company_id,
            subject_kind,
            process_type_id,
        } = this.state;

        return (
            <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
                <Typography
                    variant="h6"
                    sx={{ display: "flex", alignItems: "center", gap: 1 }}
                >
                    <DashboardIcon /> Ističe uskoro
                </Typography>

                <Box
                    sx={{
                        display: "flex",
                        flexWrap: "wrap",
                        gap: 2,
                        alignItems: "center",
                    }}
                >
                    <Tooltip title="Kada uključeno, prikazuju se samo obaveze čiji rok (važi do) ulazi u period „rok unapred“ definisan za vrstu obaveze.">
                        <FormControlLabel
                            control={
                                <Switch
                                    checked={use_lead_time}
                                    onChange={(e) =>
                                        this.setState(
                                            (prev) => ({
                                                ...prev,
                                                use_lead_time: e.target.checked,
                                            }),
                                            () => this.load(),
                                        )
                                    }
                                />
                            }
                            label="Rok unapred po vrsti"
                        />
                    </Tooltip>
                    <FormControl size="small" sx={{ minWidth: 100 }}>
                        <InputLabel>Dana</InputLabel>
                        <Select
                            value={String(days)}
                            label="Dana"
                            onChange={(e) =>
                                this.handleFilterChange(
                                    "days",
                                    Number(e.target.value),
                                )
                            }
                        >
                            <MenuItem value="7">7</MenuItem>
                            <MenuItem value="30">30</MenuItem>
                            <MenuItem value="60">60</MenuItem>
                            <MenuItem value="90">90</MenuItem>
                        </Select>
                    </FormControl>
                    <FormControl size="small" sx={{ minWidth: 200 }}>
                        <InputLabel>Klijent</InputLabel>
                        <Select
                            value={client_company_id}
                            label="Klijent"
                            onChange={(e) =>
                                this.handleFilterChange(
                                    "client_company_id",
                                    e.target.value,
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
                    <FormControl size="small" sx={{ minWidth: 160 }}>
                        <InputLabel>Subjekt</InputLabel>
                        <Select
                            value={subject_kind}
                            label="Subjekt"
                            onChange={(e) =>
                                this.handleFilterChange(
                                    "subject_kind",
                                    e.target.value,
                                )
                            }
                        >
                            <MenuItem value="">Svi</MenuItem>
                            <MenuItem value="EMPLOYEE">Zaposleni</MenuItem>
                            <MenuItem value="EQUIPMENT">Oprema</MenuItem>
                            <MenuItem value="CLIENT_COMPANY">Firma</MenuItem>
                        </Select>
                    </FormControl>
                    <FormControl size="small" sx={{ minWidth: 200 }}>
                        <InputLabel>Vrsta obaveze</InputLabel>
                        <Select
                            value={process_type_id}
                            label="Vrsta obaveze"
                            onChange={(e) =>
                                this.handleFilterChange(
                                    "process_type_id",
                                    e.target.value,
                                )
                            }
                        >
                            <MenuItem value="">Svi</MenuItem>
                            {processTypes.map((t) => (
                                <MenuItem key={t.id} value={String(t.id)}>
                                    {t.name}
                                </MenuItem>
                            ))}
                        </Select>
                    </FormControl>
                </Box>

                {error && <Alert severity="error">{error}</Alert>}

                {loading ? (
                    <Box
                        sx={{
                            display: "flex",
                            justifyContent: "center",
                            py: 4,
                        }}
                    >
                        <CircularProgress />
                    </Box>
                ) : (
                    <Paper sx={{ overflow: "auto" }}>
                        <Table size="small">
                            <TableHead>
                                <TableRow>
                                    <TableCell>Subjekt</TableCell>
                                    <TableCell>Vrsta obaveze</TableCell>
                                    <TableCell>Važi do</TableCell>
                                    <TableCell>Status</TableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {items.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={4} align="center">
                                            Nema zapisa koji ističu u izabranom
                                            periodu.
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    items.map((run) => (
                                        <TableRow key={run.id}>
                                            <TableCell>
                                                {run.subject_snapshot?.name ??
                                                    run.subject_snapshot
                                                        ?.kind ??
                                                    "—"}
                                            </TableCell>
                                            <TableCell>
                                                {run.process_type_name}
                                            </TableCell>
                                            <TableCell>
                                                {formatDate(run.valid_until)}
                                            </TableCell>
                                            <TableCell>{STATUS_LABELS[run.status] ?? run.status}</TableCell>
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

const mapStateToProps = (
    state: RootState,
): DashboardExpiringPageStateProps => ({
    dashboardItems: state.processes.dashboardExpiringItems,
    clientCompanies: state.processes.clientCompanies,
    processTypes: state.processes.processTypes,
    dashboardLoading: state.processes.dashboardExpiringStatus === "loading",
    dashboardError:
        state.processes.dashboardExpiringStatus === "failed"
            ? (state.processes.dashboardExpiringError ?? "Greška")
            : null,
});

const mapDispatchToProps = (
    dispatch: AppDispatch,
): DashboardExpiringPageDispatchProps => ({
    setLastPath: (path: string) => dispatch(setLastPath(path)),
    ensureClientCompanies: () => {
        void dispatch(ensureClientCompanies());
    },
    ensureProcessTypes: () => {
        void dispatch(ensureProcessTypes());
    },
    loadDashboard: (params: DashboardExpiringParams) => {
        void dispatch(fetchDashboardExpiring(params));
    },
});

const Connected = connect(
    mapStateToProps,
    mapDispatchToProps,
)(DashboardExpiringPage);
export default Connected;
