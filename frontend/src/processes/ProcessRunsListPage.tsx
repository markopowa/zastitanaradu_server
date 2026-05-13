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
import NoteIcon from "@mui/icons-material/Note";
import { enqueueSnackbar } from "notistack";

import { api } from "../api/client";
import type { ProcessRunsParams } from "../api/processes";
import {
    getProcessRunDocuments,
    getProcessRunNotes,
    postProcessRunNote,
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
import type { ProcessRun, ProcessRunNote } from "../types/processes";
import type {
    ProcessRunsListPageDispatchProps,
    ProcessRunsListPageProps,
    ProcessRunsListPageState,
    ProcessRunsListPageStateProps,
} from "../types/processPages";
import { withNavigation } from "../hocs/withNavigation";

const STATUS_LABELS: Record<string, string> = {
    PENDING: "Na čekanju",
    SENT: "Poslat",
    COMPLETED: "Završeno",
    CANCELLED: "Otkazano",
    FAILED: "Neuspešno",
};

const DIALOG_CONTAINED_BTN_SX = {
    borderRadius: 2,
    textTransform: "none" as const,
};

const USAGE_KIND_LABELS: Record<string, string> = {
    REPORT: "Izveštaj",
    INSTRUCTION: "Uput",
    OTHER: "Ostalo",
};

function statusLabel(s: string): string {
    return STATUS_LABELS[s] ?? s;
}

function usageKindLabel(s: string): string {
    return USAGE_KIND_LABELS[s] ?? s;
}

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
        completeDialogRunId: null,
        complete_valid_until: "",
        complete_performed_at: "",
        complete_notes: "",
        complete_report_number: "",
        complete_fitness_assessment: "",
        complete_measures_taken: "",
        documentsDialogRunId: null,
        runDocuments: [],
        allDocuments: [],
        addDocSelectedId: "",
        notesDialogRunId: null,
        notesItems: [] as ProcessRunNote[],
        notesNewBody: "",
        emailIssueDialogRun: null,
        emailIssueDocs: [],
        emailIssueLoading: false,
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
            complete_report_number: "",
            complete_fitness_assessment: "",
            complete_measures_taken: "",
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
            complete_report_number,
            complete_fitness_assessment,
            complete_measures_taken,
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
            complete_report_number.trim() ||
            complete_fitness_assessment.trim() ||
            complete_measures_taken.trim()
                ? {
                      report_number: complete_report_number.trim() || undefined,
                      fitness_assessment:
                          complete_fitness_assessment.trim() || undefined,
                      measures_taken:
                          complete_measures_taken.trim() || undefined,
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

    openNotes = (run: ProcessRun): void => {
        this.setState((prev) => ({
            ...prev,
            notesDialogRunId: run.id,
            notesItems: [],
            notesNewBody: "",
        }));
        getProcessRunNotes(run.id).then((notesItems) =>
            this.setState((prev) => ({ ...prev, notesItems })),
        );
    };

    closeNotes = (): void => {
        this.setState((prev) => ({
            ...prev,
            notesDialogRunId: null,
            notesItems: [],
            notesNewBody: "",
        }));
    };

    openEmailIssue = (run: ProcessRun): void => {
        this.setState((prev) => ({
            ...prev,
            emailIssueDialogRun: run,
            emailIssueDocs: [],
            emailIssueLoading: true,
        }));
        getProcessRunDocuments(run.id)
            .then((emailIssueDocs) =>
                this.setState((prev) => ({
                    ...prev,
                    emailIssueDocs,
                    emailIssueLoading: false,
                })),
            )
            .catch(() =>
                this.setState((prev) => ({
                    ...prev,
                    emailIssueDocs: [],
                    emailIssueLoading: false,
                })),
            );
    };

    closeEmailIssue = (): void => {
        this.setState((prev) => ({
            ...prev,
            emailIssueDialogRun: null,
            emailIssueDocs: [],
            emailIssueLoading: false,
        }));
    };

    handlePostNote = (): void => {
        const { notesDialogRunId, notesNewBody } = this.state;
        if (notesDialogRunId == null || !notesNewBody.trim()) return;
        void postProcessRunNote(notesDialogRunId, {
            body: notesNewBody.trim(),
        }).then(() => {
            getProcessRunNotes(notesDialogRunId).then((notesItems) =>
                this.setState((prev) => ({
                    ...prev,
                    notesItems,
                    notesNewBody: "",
                })),
            );
        });
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
                            <MenuItem value="SENT">Poslat</MenuItem>
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
                                        <TableCell sx={{ maxWidth: 260 }}>
                                            <Box
                                                sx={{
                                                    display: "flex",
                                                    flexDirection: "column",
                                                    alignItems: "flex-start",
                                                    gap: 0.75,
                                                }}
                                            >
                                                <Typography variant="body2">
                                                    {statusLabel(row.status)}
                                                </Typography>
                                                {row.trigger_runs?.some(
                                                    (tr) => tr.email_error?.trim(),
                                                ) ? (
                                                    <>
                                                        <Typography
                                                            variant="body2"
                                                            color="error"
                                                        >
                                                            Mejl nije poslat
                                                        </Typography>
                                                        <Button
                                                            size="small"
                                                            variant="contained"
                                                            disableElevation
                                                            onClick={() =>
                                                                this.openEmailIssue(
                                                                    row,
                                                                )
                                                            }
                                                            sx={
                                                                DIALOG_CONTAINED_BTN_SX
                                                            }
                                                        >
                                                            Detalji
                                                        </Button>
                                                    </>
                                                ) : null}
                                            </Box>
                                        </TableCell>
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
                                            <Button
                                                size="small"
                                                startIcon={<NoteIcon />}
                                                onClick={() =>
                                                    this.openNotes(row)
                                                }
                                                sx={{ mr: 0.5 }}
                                            >
                                                Beleške
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
                            value={this.state.complete_report_number}
                            onChange={(e) =>
                                this.setState((prev) => ({
                                    ...prev,
                                    complete_report_number: e.target.value,
                                }))
                            }
                        />
                        <TextField
                            margin="dense"
                            label="Ocena sposobnosti"
                            fullWidth
                            value={this.state.complete_fitness_assessment}
                            onChange={(e) =>
                                this.setState((prev) => ({
                                    ...prev,
                                    complete_fitness_assessment: e.target.value,
                                }))
                            }
                        />
                        <TextField
                            margin="dense"
                            label="Preduzete mere"
                            fullWidth
                            multiline
                            value={this.state.complete_measures_taken}
                            onChange={(e) =>
                                this.setState((prev) => ({
                                    ...prev,
                                    complete_measures_taken: e.target.value,
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
                            disableElevation
                            disabled={!complete_valid_until.trim()}
                            sx={DIALOG_CONTAINED_BTN_SX}
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
                                    sx={{ flexWrap: "wrap", gap: 1 }}
                                >
                                    <ListItemText
                                        primary={
                                            rd.document_file_title ??
                                            rd.document_file
                                        }
                                        secondary={usageKindLabel(rd.usage_kind)}
                                    />
                                    {rd.document_file_url ? (
                                        <Button
                                            size="small"
                                            variant="contained"
                                            disableElevation
                                            component="a"
                                            href={rd.document_file_url}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            sx={DIALOG_CONTAINED_BTN_SX}
                                        >
                                            Preuzmi
                                        </Button>
                                    ) : null}
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
                                variant="contained"
                                disableElevation
                                onClick={this.handleAddDocument}
                                disabled={!this.state.addDocSelectedId}
                                sx={DIALOG_CONTAINED_BTN_SX}
                            >
                                Dodaj izveštaj
                            </Button>
                        </Box>
                    </DialogContent>
                    <DialogActions>
                        <Button onClick={this.closeDocuments}>Zatvori</Button>
                    </DialogActions>
                </Dialog>

                <Dialog
                    open={this.state.notesDialogRunId != null}
                    onClose={this.closeNotes}
                    maxWidth="sm"
                    fullWidth
                >
                    <DialogTitle>Beleške aktivnosti</DialogTitle>
                    <DialogContent>
                        <List dense>
                            {this.state.notesItems.map((n) => (
                                <ListItem key={n.id} alignItems="flex-start">
                                    <ListItemText
                                        primary={n.body}
                                        secondary={`${
                                            n.author_username ?? "—"
                                        } · ${n.created_at}`}
                                    />
                                </ListItem>
                            ))}
                        </List>
                        <TextField
                            margin="dense"
                            label="Nova beleška"
                            fullWidth
                            multiline
                            minRows={2}
                            value={this.state.notesNewBody}
                            onChange={(e) =>
                                this.setState((prev) => ({
                                    ...prev,
                                    notesNewBody: e.target.value,
                                }))
                            }
                        />
                    </DialogContent>
                    <DialogActions>
                        <Button onClick={this.closeNotes}>Zatvori</Button>
                        <Button
                            variant="contained"
                            disableElevation
                            onClick={this.handlePostNote}
                            disabled={!this.state.notesNewBody.trim()}
                            sx={DIALOG_CONTAINED_BTN_SX}
                        >
                            Dodaj
                        </Button>
                    </DialogActions>
                </Dialog>

                <Dialog
                    open={this.state.emailIssueDialogRun != null}
                    onClose={this.closeEmailIssue}
                    maxWidth="sm"
                    fullWidth
                >
                    <DialogTitle>Mejl nije poslat</DialogTitle>
                    <DialogContent>
                        {this.state.emailIssueLoading ? (
                            <Box
                                sx={{
                                    display: "flex",
                                    justifyContent: "center",
                                    py: 3,
                                }}
                            >
                                <CircularProgress size={32} />
                            </Box>
                        ) : (
                            <>
                                <Typography variant="body2" color="text.secondary">
                                    {this.state.emailIssueDialogRun
                                        ?.subject_snapshot?.name ??
                                        this.state.emailIssueDialogRun
                                            ?.subject_snapshot?.kind ??
                                        "—"}
                                    {" · "}
                                    {
                                        this.state.emailIssueDialogRun
                                            ?.process_type_name
                                    }
                                </Typography>
                                {this.state.emailIssueDialogRun?.trigger_runs
                                    ?.filter((tr) => tr.email_error?.trim())
                                    .map((tr) => (
                                        <Alert key={tr.id} severity="error" sx={{ mt: 2 }}>
                                            {tr.email_error}
                                        </Alert>
                                    ))}
                                <Typography
                                    variant="subtitle2"
                                    sx={{ mt: 2, mb: 1 }}
                                >
                                    Prilozi za ručno slanje
                                </Typography>
                                {this.state.emailIssueDocs.some(
                                    (d) => d.document_file_url,
                                ) ? (
                                    this.state.emailIssueDocs.map((d) =>
                                        d.document_file_url ? (
                                            <Button
                                                key={d.id}
                                                fullWidth
                                                variant="contained"
                                                disableElevation
                                                component="a"
                                                href={d.document_file_url}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                sx={{
                                                    ...DIALOG_CONTAINED_BTN_SX,
                                                    mb: 1,
                                                    justifyContent: "center",
                                                }}
                                            >
                                                Preuzmi:{" "}
                                                {d.document_file_title ??
                                                    `Dokument #${d.document_file}`}
                                            </Button>
                                        ) : null,
                                    )
                                ) : this.state.emailIssueDocs.length > 0 ? (
                                    <Typography variant="body2" color="text.secondary">
                                        Nema dostupnog fajla za preuzimanje.
                                    </Typography>
                                ) : (
                                    <Typography variant="body2" color="text.secondary">
                                        Nema priloženih dokumenata na ovoj
                                        aktivnosti.
                                    </Typography>
                                )}
                            </>
                        )}
                    </DialogContent>
                    <DialogActions>
                        <Button onClick={this.closeEmailIssue}>Zatvori</Button>
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
