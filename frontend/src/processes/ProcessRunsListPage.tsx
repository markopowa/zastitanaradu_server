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
    Button,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    FormControl,
    InputLabel,
    Select,
    MenuItem,
    TextField,
    CircularProgress,
    Alert,
} from "@mui/material";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";

import {
    getProcessRuns,
    getClientCompanies,
    getProcessTypes,
    completeProcessRun,
} from "../api/processes";
import type { ProcessRun, ClientCompany } from "../types/processes";
import { setLastPath } from "../store/locationSlice";
import { connect } from "react-redux";
import type { AppDispatch, RootState } from "../store";

const pad = (n: number) => String(n).padStart(2, "0");
const formatDate = (value?: string | null): string => {
    if (!value) return "—";
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return value;
    return `${pad(d.getDate())}.${pad(d.getMonth() + 1)}.${d.getFullYear()}.`;
};

interface DispatchProps {
    setLastPath?: (path: string) => void;
}
type Props = DispatchProps;

interface State {
    items: ProcessRun[];
    clients: ClientCompany[];
    types: { id: number; name: string }[];
    client_company_id: string;
    process_type_id: string;
    status: string;
    completeDialogRunId: number | null;
    complete_valid_until: string;
    complete_performed_at: string;
    complete_notes: string;
    loading: boolean;
    error: string | null;
}

class ProcessRunsListPageInner extends Component<Props, State> {
    state: State = {
        items: [],
        clients: [],
        types: [],
        client_company_id: "",
        process_type_id: "",
        status: "",
        completeDialogRunId: null,
        complete_valid_until: "",
        complete_performed_at: "",
        complete_notes: "",
        loading: true,
        error: null,
    };

    load = (): void => {
        this.setState({ loading: true, error: null });
        const { client_company_id, process_type_id, status } = this.state;
        const params: Parameters<typeof getProcessRuns>[0] = {};
        if (client_company_id)
            params.client_company_id = Number(client_company_id);
        if (process_type_id) params.process_type_id = Number(process_type_id);
        if (status) params.status = status;
        getProcessRuns(params)
            .then((items) =>
                this.setState({
                    items: Array.isArray(items) ? items : [],
                    loading: false,
                    error: null,
                }),
            )
            .catch(() =>
                this.setState({
                    loading: false,
                    error: "Greška pri učitavanju.",
                }),
            );
    };

    componentDidMount(): void {
        this.props.setLastPath?.("/processes/runs");
        Promise.all([getClientCompanies(), getProcessTypes()]).then(
            ([clients, types]) => {
                this.setState(
                    {
                        clients: Array.isArray(clients) ? clients : [],
                        types: (Array.isArray(types) ? types : []).map((t) => ({
                            id: t.id,
                            name: t.name,
                        })),
                    },
                    () => this.load(),
                );
            },
        );
    }

    openComplete = (run: ProcessRun): void => {
        this.setState({
            completeDialogRunId: run.id,
            complete_valid_until: run.valid_until ?? "",
            complete_performed_at: "",
            complete_notes: "",
        });
    };

    closeComplete = (): void => {
        this.setState({ completeDialogRunId: null });
    };

    handleComplete = (): void => {
        const {
            completeDialogRunId,
            complete_valid_until,
            complete_performed_at,
            complete_notes,
        } = this.state;
        if (completeDialogRunId == null || !complete_valid_until) return;
        completeProcessRun(completeDialogRunId, {
            valid_until: complete_valid_until,
            performed_at: complete_performed_at || undefined,
            notes: complete_notes || undefined,
        }).then(() => {
            this.closeComplete();
            this.load();
        });
    };

    render(): React.ReactNode {
        const {
            items,
            clients,
            types,
            client_company_id,
            process_type_id,
            status,
            completeDialogRunId,
            complete_valid_until,
            complete_performed_at,
            complete_notes,
            loading,
            error,
        } = this.state;

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
                                    {
                                        client_company_id: e.target
                                            .value as string,
                                    },
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
                                    {
                                        process_type_id: e.target
                                            .value as string,
                                    },
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
                                    { status: e.target.value as string },
                                    () => this.load(),
                                )
                            }
                        >
                            <MenuItem value="">Svi</MenuItem>
                            <MenuItem value="PENDING">Na čekanju</MenuItem>
                            <MenuItem value="COMPLETED">Završeno</MenuItem>
                            <MenuItem value="CANCELLED">Otkazano</MenuItem>
                            <MenuItem value="FAILED">Neuspešno</MenuItem>
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
                                    <TableCell>Tip</TableCell>
                                    <TableCell>Zakazano</TableCell>
                                    <TableCell>Važi do</TableCell>
                                    <TableCell>Status</TableCell>
                                    <TableCell align="right" />
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {items.map((row) => (
                                    <TableRow key={row.id}>
                                        <TableCell>
                                            {row.subject_snapshot?.name ??
                                                row.subject_snapshot?.kind ??
                                                "—"}
                                        </TableCell>
                                        <TableCell>
                                            {row.process_type_name}
                                        </TableCell>
                                        <TableCell>
                                            {formatDate(row.scheduled_for)}
                                        </TableCell>
                                        <TableCell>
                                            {formatDate(row.valid_until)}
                                        </TableCell>
                                        <TableCell>{row.status}</TableCell>
                                        <TableCell align="right">
                                            {row.status === "PENDING" && (
                                                <Button
                                                    size="small"
                                                    startIcon={
                                                        <CheckCircleIcon />
                                                    }
                                                    onClick={() =>
                                                        this.openComplete(row)
                                                    }
                                                >
                                                    Završi
                                                </Button>
                                            )}
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </Paper>
                )}

                <Dialog
                    open={completeDialogRunId != null}
                    onClose={this.closeComplete}
                    maxWidth="sm"
                    fullWidth
                >
                    <DialogTitle>Završi proces</DialogTitle>
                    <DialogContent>
                        <TextField
                            margin="dense"
                            label="Važi do (YYYY-MM-DD)"
                            fullWidth
                            value={complete_valid_until}
                            onChange={(e) =>
                                this.setState({
                                    complete_valid_until: e.target.value,
                                })
                            }
                            required
                            placeholder="YYYY-MM-DD"
                            inputProps={{
                                inputMode: "numeric",
                                pattern: "\\d{4}-\\d{2}-\\d{2}",
                            }}
                        />
                        <TextField
                            margin="dense"
                            label="Izvršeno (YYYY-MM-DD)"
                            fullWidth
                            value={complete_performed_at}
                            onChange={(e) =>
                                this.setState({
                                    complete_performed_at: e.target.value,
                                })
                            }
                            placeholder="YYYY-MM-DD"
                            inputProps={{
                                inputMode: "numeric",
                                pattern: "\\d{4}-\\d{2}-\\d{2}",
                            }}
                        />
                        <TextField
                            margin="dense"
                            label="Beleške"
                            fullWidth
                            multiline
                            value={complete_notes}
                            onChange={(e) =>
                                this.setState({
                                    complete_notes: e.target.value,
                                })
                            }
                        />
                    </DialogContent>
                    <DialogActions>
                        <Button onClick={this.closeComplete}>Odustani</Button>
                        <Button
                            onClick={this.handleComplete}
                            variant="contained"
                            disabled={!complete_valid_until.trim()}
                        >
                            Završi
                        </Button>
                    </DialogActions>
                </Dialog>
            </Box>
        );
    }
}

const Connected = connect<
    null,
    DispatchProps,
    Record<string, never>,
    RootState
>(null, (dispatch: AppDispatch) => ({
    setLastPath: (path: string) => dispatch(setLastPath(path)),
}))(ProcessRunsListPageInner);

export default function ProcessRunsListPage(): React.ReactElement {
    return <Connected />;
}
