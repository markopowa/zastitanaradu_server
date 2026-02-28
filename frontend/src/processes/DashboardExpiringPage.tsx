import { Component } from "react";
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
} from "@mui/material";
import DashboardIcon from "@mui/icons-material/Dashboard";

import {
    getDashboardExpiring,
    getClientCompanies,
    getProcessTypes,
} from "../api/processes";
import type { ProcessRun, ClientCompany } from "../types/processes";
import { setLastPath } from "../store/locationSlice";
import { connect } from "react-redux";
import type { AppDispatch } from "../store";

const pad = (n: number) => String(n).padStart(2, "0");
const formatDate = (value?: string | null): string => {
    if (!value) return "—";
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return value;
    return `${pad(d.getDate())}.${pad(d.getMonth() + 1)}.${d.getFullYear()}.`;
};

interface StateProps {
    setLastPath: (path: string) => void;
}
interface DispatchProps {
    setLastPath: (path: string) => void;
}
type Props = StateProps & DispatchProps;

interface State {
    items: ProcessRun[];
    clients: ClientCompany[];
    processTypes: { id: number; code: string; name: string }[];
    days: number;
    client_company_id: string;
    subject_kind: string;
    process_type_id: string;
    loading: boolean;
    error: string | null;
}

class DashboardExpiringPage extends Component<Props, State> {
    state: State = {
        items: [],
        clients: [],
        processTypes: [],
        days: 30,
        client_company_id: "",
        subject_kind: "",
        process_type_id: "",
        loading: true,
        error: null,
    };

    load = (): void => {
        this.setState({ loading: true, error: null });
        const { days, client_company_id, subject_kind, process_type_id } =
            this.state;
        const params: Parameters<typeof getDashboardExpiring>[0] = { days };
        if (client_company_id)
            params.client_company_id = Number(client_company_id);
        if (subject_kind)
            params.subject_kind = subject_kind as
                | "EMPLOYEE"
                | "EQUIPMENT"
                | "CLIENT_COMPANY";
        if (process_type_id) params.process_type_id = Number(process_type_id);

        Promise.all([
            getDashboardExpiring(params),
            getClientCompanies(),
            getProcessTypes(),
        ])
            .then(([items, clients, processTypes]) => {
                this.setState({
                    items: Array.isArray(items) ? items : [],
                    clients: Array.isArray(clients) ? clients : [],
                    processTypes: Array.isArray(processTypes)
                        ? processTypes
                        : [],
                    loading: false,
                    error: null,
                });
            })
            .catch(() => {
                this.setState({
                    loading: false,
                    error: "Greška pri učitavanju.",
                });
            });
    };

    componentDidMount(): void {
        this.props.setLastPath("/dashboard");
        this.load();
    }

    handleFilterChange = (key: keyof State, value: string | number): void => {
        this.setState({ [key]: value } as Partial<State>, () => this.load());
    };

    render(): React.ReactNode {
        const {
            items,
            clients,
            processTypes,
            days,
            client_company_id,
            subject_kind,
            process_type_id,
            loading,
            error,
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
                                            <TableCell>{run.status}</TableCell>
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

const mapDispatchToProps = (dispatch: AppDispatch): DispatchProps => ({
    setLastPath: (path: string) => dispatch(setLastPath(path)),
});

export default connect(null, mapDispatchToProps)(DashboardExpiringPage);
