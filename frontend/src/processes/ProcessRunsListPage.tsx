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
    IconButton,
    List,
    ListItem,
    ListItemText,
    Tooltip,
} from "@mui/material";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import DescriptionIcon from "@mui/icons-material/Description";
import DeleteIcon from "@mui/icons-material/Delete";
import { enqueueSnackbar } from "notistack";

import { api } from "../api/client";
import type { ProcessRunsParams } from "../api/processes";
import {
    getProcessRunDocuments,
    attachDocumentToRun,
    removeDocumentFromRun,
} from "../api/processes";
import DateTextFieldWithPicker from "../components/DateTextFieldWithPicker";
import {
    completeRun,
    ensureClientCompanies,
    ensureProcessTypes,
    fetchRuns,
} from "../store/processesSlice";
import { setLastPath } from "../store/locationSlice";
import { formatDateDisplay, StringToDate } from "../utils/date";

import type { AppDispatch, RootState } from "../store";
import type { DocumentFile } from "../types/documents";
import type { ProcessRun } from "../types/processes";
import type {
    ProcessRunsListPageDispatchProps,
    ProcessRunsListPageProps,
    ProcessRunsListPageState,
    ProcessRunsListPageStateProps,
} from "../types/processPages";
import { withNavigation } from "../hocs/withNavigation";

function parseRunsListSearch(search: string): Pick<
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
        completeDialogRunId: null,
        complete_valid_until: "",
        complete_performed_at: "",
        complete_notes: "",
        complete_broj_izvestaja: "",
        complete_ocena_sposobnosti: "",
        complete_preduzete_mere: "",
        documentsDialogRunId: null,
        runDocuments: [],
        allDocuments: [],
        addDocSelectedId: "",
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

    openComplete = (run: ProcessRun): void => {
        const validUntil =
            run.valid_until != null ? formatDateDisplay(run.valid_until) : "";
        this.setState((prev) => ({
            ...prev,
            completeDialogRunId: run.id,
            complete_valid_until: validUntil,
            complete_performed_at: "",
            complete_notes: "",
            complete_broj_izvestaja: "",
            complete_ocena_sposobnosti: "",
            complete_preduzete_mere: "",
        }));
    };

    closeComplete = (): void => {
        this.setState((prev) => ({ ...prev, completeDialogRunId: null }));
    };

    handleComplete = (): void => {
        const {
            completeDialogRunId,
            complete_valid_until,
            complete_performed_at,
            complete_notes,
            complete_broj_izvestaja,
            complete_ocena_sposobnosti,
            complete_preduzete_mere,
        } = this.state;
        if (completeDialogRunId == null || !complete_valid_until) return;
        const validUntilDate = StringToDate(complete_valid_until);
        const performedAtDate = complete_performed_at.trim()
            ? StringToDate(complete_performed_at)
            : undefined;
        const validUntilISO =
            validUntilDate != null
                ? `${validUntilDate.getFullYear()}-${String(validUntilDate.getMonth() + 1).padStart(2, "0")}-${String(validUntilDate.getDate()).padStart(2, "0")}`
                : "";
        const performedAtISO =
            performedAtDate != null
                ? `${performedAtDate.getFullYear()}-${String(performedAtDate.getMonth() + 1).padStart(2, "0")}-${String(performedAtDate.getDate()).padStart(2, "0")}`
                : undefined;
        const result_data =
            complete_broj_izvestaja.trim() ||
            complete_ocena_sposobnosti.trim() ||
            complete_preduzete_mere.trim()
                ? {
                      broj_izvestaja:
                          complete_broj_izvestaja.trim() || undefined,
                      ocena_sposobnosti:
                          complete_ocena_sposobnosti.trim() || undefined,
                      preduzete_mere:
                          complete_preduzete_mere.trim() || undefined,
                  }
                : undefined;
        void this.props
            .completeRun({
                id: completeDialogRunId,
                payload: {
                    valid_until: validUntilISO,
                    performed_at: performedAtISO,
                    notes: complete_notes || undefined,
                    result_data,
                },
            })
            .unwrap()
            .then(() => {
                this.closeComplete();
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
                        "Greška pri završetku aktivnosti.";
                    enqueueSnackbar(msg, { variant: "error" });
                },
            );
    };

    openDocuments = (run: ProcessRun): void => {
        this.setState((prev) => ({
            ...prev,
            documentsDialogRunId: run.id,
            runDocuments: [],
        }));
        getProcessRunDocuments(run.id).then((runDocuments) =>
            this.setState((prev) => ({ ...prev, runDocuments })),
        );
        api.get<DocumentFile[] | { results: DocumentFile[] }>(
            "/api/documents/",
        ).then((res) => {
            const data = res.data;
            const list = Array.isArray(data) ? data : (data?.results ?? []);
            this.setState((prev) => ({ ...prev, allDocuments: list }));
        });
    };

    closeDocuments = (): void => {
        this.setState((prev) => ({
            ...prev,
            documentsDialogRunId: null,
            addDocSelectedId: "",
        }));
    };

    handleAddDocument = (): void => {
        const { documentsDialogRunId, addDocSelectedId } = this.state;
        if (documentsDialogRunId == null || !addDocSelectedId) return;
        attachDocumentToRun(
            documentsDialogRunId,
            Number(addDocSelectedId),
        ).then(() => {
            getProcessRunDocuments(documentsDialogRunId).then((runDocuments) =>
                this.setState((prev) => ({
                    ...prev,
                    runDocuments,
                    addDocSelectedId: "",
                })),
            );
        });
    };

    handleRemoveDocument = (runId: number, docId: number): void => {
        removeDocumentFromRun(runId, docId).then(() => {
            getProcessRunDocuments(runId).then((runDocuments) =>
                this.setState((prev) => ({ ...prev, runDocuments })),
            );
        });
    };

    render() {
        const {
            runsItems: items,
            clientCompanies: clients,
            processTypes: types,
            runsLoading: loading,
            runsError: error,
        } = this.props;
        const {
            client_company_id,
            process_type_id,
            status,
            completeDialogRunId,
            complete_valid_until,
            complete_performed_at,
            complete_notes,
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
                                            {formatDateDisplay(
                                                row.scheduled_for,
                                            )}
                                        </TableCell>
                                        <TableCell>
                                            {formatDateDisplay(row.valid_until)}
                                        </TableCell>
                                        <TableCell>{row.status}</TableCell>
                                        <TableCell align="right">
                                            <Button
                                                size="small"
                                                startIcon={<DescriptionIcon />}
                                                onClick={() =>
                                                    this.openDocuments(row)
                                                }
                                                sx={{ mr: 0.5 }}
                                            >
                                                Dokumenti
                                            </Button>
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
                        <Tooltip title="Datum do kada važi pregled / potvrda.">
                            <Box>
                                <DateTextFieldWithPicker
                                    label="Važi do (dd.mm.yyyy)"
                                    value={complete_valid_until}
                                    onChange={(v) =>
                                        this.setState((prev) => ({
                                            ...prev,
                                            complete_valid_until: v,
                                        }))
                                    }
                                />
                            </Box>
                        </Tooltip>
                        <Tooltip title="Datum kada je pregled izvršen.">
                            <Box>
                                <DateTextFieldWithPicker
                                    label="Izvršeno (dd.mm.yyyy)"
                                    value={complete_performed_at}
                                    onChange={(v) =>
                                        this.setState((prev) => ({
                                            ...prev,
                                            complete_performed_at: v,
                                        }))
                                    }
                                />
                            </Box>
                        </Tooltip>
                        <TextField
                            margin="dense"
                            label="Broj izveštaja"
                            fullWidth
                            value={this.state.complete_broj_izvestaja}
                            onChange={(e) =>
                                this.setState((prev) => ({
                                    ...prev,
                                    complete_broj_izvestaja: e.target.value,
                                }))
                            }
                        />
                        <TextField
                            margin="dense"
                            label="Ocena sposobnosti"
                            fullWidth
                            value={this.state.complete_ocena_sposobnosti}
                            onChange={(e) =>
                                this.setState((prev) => ({
                                    ...prev,
                                    complete_ocena_sposobnosti: e.target.value,
                                }))
                            }
                        />
                        <TextField
                            margin="dense"
                            label="Preduzete mere"
                            fullWidth
                            multiline
                            value={this.state.complete_preduzete_mere}
                            onChange={(e) =>
                                this.setState((prev) => ({
                                    ...prev,
                                    complete_preduzete_mere: e.target.value,
                                }))
                            }
                        />
                        <TextField
                            margin="dense"
                            label="Beleške"
                            fullWidth
                            multiline
                            value={complete_notes}
                            onChange={(e) =>
                                this.setState((prev) => ({
                                    ...prev,
                                    complete_notes: e.target.value,
                                }))
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

                <Dialog
                    open={this.state.documentsDialogRunId != null}
                    onClose={this.closeDocuments}
                    maxWidth="sm"
                    fullWidth
                >
                    <DialogTitle>Dokumenti aktivnosti</DialogTitle>
                    <DialogContent>
                        <List dense>
                            {this.state.runDocuments.map((rd) => (
                                <ListItem
                                    key={rd.id}
                                    secondaryAction={
                                        <IconButton
                                            edge="end"
                                            size="small"
                                            onClick={() =>
                                                this.state
                                                    .documentsDialogRunId !=
                                                    null &&
                                                this.handleRemoveDocument(
                                                    this.state
                                                        .documentsDialogRunId,
                                                    rd.id,
                                                )
                                            }
                                        >
                                            <DeleteIcon />
                                        </IconButton>
                                    }
                                >
                                    <ListItemText
                                        primary={
                                            rd.document_file_title ??
                                            rd.document_file
                                        }
                                        secondary={rd.usage_kind}
                                    />
                                </ListItem>
                            ))}
                        </List>
                        <Box sx={{ display: "flex", gap: 1, mt: 2 }}>
                            <FormControl size="small" sx={{ minWidth: 200 }}>
                                <InputLabel>Dokument</InputLabel>
                                <Select
                                    value={this.state.addDocSelectedId}
                                    label="Dokument"
                                    onChange={(e) =>
                                        this.setState((prev) => ({
                                            ...prev,
                                            addDocSelectedId: e.target.value as
                                                | number
                                                | "",
                                        }))
                                    }
                                >
                                    <MenuItem value="">
                                        <em>Izaberi...</em>
                                    </MenuItem>
                                    {this.state.allDocuments.map((d) => (
                                        <MenuItem key={d.id} value={d.id}>
                                            {d.title}
                                        </MenuItem>
                                    ))}
                                </Select>
                            </FormControl>
                            <Button
                                variant="outlined"
                                onClick={this.handleAddDocument}
                                disabled={!this.state.addDocSelectedId}
                            >
                                Dodaj izveštaj
                            </Button>
                        </Box>
                    </DialogContent>
                    <DialogActions>
                        <Button onClick={this.closeDocuments}>Zatvori</Button>
                    </DialogActions>
                </Dialog>
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
    completeRun: (args) => dispatch(completeRun(args)),
});

const Connected = connect(
    mapStateToProps,
    mapDispatchToProps,
)(ProcessRunsListPageInner);

export default withNavigation(Connected);
