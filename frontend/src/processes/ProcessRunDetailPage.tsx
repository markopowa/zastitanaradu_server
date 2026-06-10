import { Component, createRef, type ChangeEvent, type ReactNode } from "react";
import { useParams } from "react-router-dom";
import { connect } from "react-redux";
import {
    Alert,
    Box,
    Button,
    Chip,
    CircularProgress,
    Divider,
    IconButton,
    List,
    ListItem,
    ListItemText,
    Paper,
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableRow,
    TextField,
    Typography,
} from "@mui/material";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import DeleteIcon from "@mui/icons-material/Delete";
import UploadFileIcon from "@mui/icons-material/UploadFile";
import { enqueueSnackbar } from "notistack";

import DateTextFieldWithPicker from "../components/DateTextFieldWithPicker";
import { withNavigation } from "../hocs/withNavigation";
import { StatusBadge, triggerLabel } from "../design";
import {
    completeProcessRun,
    getProcessRun,
    getProcessRunDocuments,
    getProcessRunNotes,
    postProcessRunNote,
    removeDocumentFromRun,
    uploadDocumentToRun,
} from "../api/processes";
import { setBreadcrumbs, setLastPath } from "../store/locationSlice";
import {
    addMonths,
    DateToString,
    displayDateToIso,
    formatDateDisplay,
    formatDateTimeDisplay,
    todayLocalDate,
    validUntilDateError,
} from "../utils/date";

import type { AppDispatch } from "../store";
import type {
    ProcessRunDocument,
    ProcessTriggerRun,
    SubjectSnapshot,
} from "../types/processes";
import type {
    ProcessRunDetailPageDispatchProps,
    ProcessRunDetailPageProps,
    ProcessRunDetailPageState,
} from "../types/processPages";
import { setupTestFill } from "../testFlow/registerTestFill";
import {
    TEST_FLOW,
    activityPerformedAtDisplay,
    activityValidUntilDisplay,
} from "../testFlow/fixture";

const USAGE_KIND_LABELS: Record<string, string> = {
    INVITATION: "Uput / poziv",
    REPORT: "Prilog",
    CERTIFICATE: "Potvrda",
};

const BTN_SX = { borderRadius: 2, textTransform: "none" as const };

function subjectLabel(snapshot?: SubjectSnapshot): string {
    return snapshot?.name ?? snapshot?.kind ?? "—";
}

function usageKindLabel(kind: string): string {
    return USAGE_KIND_LABELS[kind] ?? kind;
}

function triggerRunsChronological(
    runs: ProcessTriggerRun[] | undefined,
): ProcessTriggerRun[] {
    return [...(runs ?? [])].sort(
        (a, b) =>
            new Date(a.executed_at).getTime() -
            new Date(b.executed_at).getTime(),
    );
}

function triggerExecutorLabel(tr: ProcessTriggerRun): string {
    const label = tr.executed_by_display?.trim();
    return label || "Sistem";
}

function renderTriggerEmailStatus(tr: ProcessTriggerRun): ReactNode {
    if (tr.email_error?.trim()) {
        return (
            <Box sx={{ maxWidth: 320 }}>
                <Chip
                    label="Greška pri slanju"
                    color="error"
                    size="small"
                    sx={{ mb: 0.5 }}
                />
                <Typography
                    variant="caption"
                    color="error.main"
                    sx={{ display: "block", lineHeight: 1.45 }}
                >
                    {tr.email_error.trim()}
                </Typography>
            </Box>
        );
    }
    if (tr.email_sent) {
        return <StatusBadge status="SENT" />;
    }
    if (tr.template_send_email === false) {
        return (
            <Typography variant="body2" color="text.secondary">
                Bez mejla
            </Typography>
        );
    }
    return (
        <Typography variant="body2" color="text.secondary">
            —
        </Typography>
    );
}

class ProcessRunDetailPageInner extends Component<
    ProcessRunDetailPageProps,
    ProcessRunDetailPageState
> {
    private fileInputRef = createRef<HTMLInputElement>();
    private testFillCleanup: (() => void) | null = null;

    state: ProcessRunDetailPageState = {
        loading: true,
        error: null,
        run: null,
        documents: [],
        notes: [],
        notesNewBody: "",
        uploadTitle: "",
        uploadFile: null,
        uploading: false,
        showCompleteForm: false,
        complete_valid_until: "",
        complete_performed_at: "",
        complete_notes: "",
        complete_report_number: "",
        complete_fitness_assessment: "",
        complete_measures_taken: "",
        completing: false,
    };

    loadAll = (): void => {
        const id = Number(this.props.id);
        if (!Number.isFinite(id)) {
            this.setState({ loading: false, error: "Neispravan ID." });
            return;
        }
        this.setState({ loading: true, error: null });
        Promise.all([
            getProcessRun(id),
            getProcessRunDocuments(id),
            getProcessRunNotes(id),
        ])
            .then(([run, documents, notes]) => {
                this.setState({
                    run,
                    documents,
                    notes,
                    loading: false,
                    complete_valid_until: run.valid_until
                        ? formatDateDisplay(run.valid_until)
                        : "",
                });
                this.props.setBreadcrumbs?.([
                    { label: "Aktivnosti", path: "/processes/runs" },
                    { label: `Aktivnost #${run.id}` },
                ]);
            })
            .catch(() => {
                this.setState({
                    loading: false,
                    error: "Greška pri učitavanju aktivnosti.",
                });
            });
    };

    componentDidMount(): void {
        this.props.setLastPath?.(`/processes/runs/${this.props.id}`);
        this.loadAll();
        const ac = TEST_FLOW.activityComplete;
        this.testFillCleanup = setupTestFill("K", () => {
            this.setState({
                showCompleteForm: true,
                complete_valid_until: activityValidUntilDisplay(),
                complete_performed_at: activityPerformedAtDisplay(),
                complete_report_number: ac.report_number,
                complete_fitness_assessment: ac.fitness_assessment,
                complete_measures_taken: ac.measures_taken,
                complete_notes: "",
            });
            return true;
        });
    }

    componentWillUnmount(): void {
        this.props.setBreadcrumbs?.([]);
        this.testFillCleanup?.();
    }

    componentDidUpdate(prevProps: ProcessRunDetailPageProps): void {
        if (prevProps.id !== this.props.id) {
            this.loadAll();
        }
    }

    handleBack = (): void => {
        this.props.navigate("/processes/runs");
    };

    handlePostNote = (): void => {
        const { run, notesNewBody } = this.state;
        if (!run || !notesNewBody.trim()) return;
        void postProcessRunNote(run.id, { body: notesNewBody.trim() }).then(
            () => {
                getProcessRunNotes(run.id).then((notes) =>
                    this.setState({ notes, notesNewBody: "" }),
                );
            },
        );
    };

    handlePickFile = (): void => {
        this.fileInputRef.current?.click();
    };

    handleFileChange = (e: ChangeEvent<HTMLInputElement>): void => {
        const file = e.target.files?.[0] ?? null;
        this.setState((prev) => ({
            uploadFile: file,
            uploadTitle:
                file && !prev.uploadTitle.trim() ? file.name : prev.uploadTitle,
        }));
        e.target.value = "";
    };

    handleUpload = (): void => {
        const { run, uploadFile, uploadTitle } = this.state;
        if (!run || !uploadFile) return;
        this.setState({ uploading: true });
        void uploadDocumentToRun(run.id, uploadFile, uploadTitle)
            .then(() => getProcessRunDocuments(run.id))
            .then((documents) => {
                this.setState({
                    documents,
                    uploadFile: null,
                    uploadTitle: "",
                    uploading: false,
                });
                enqueueSnackbar("Prilog je dodat.", { variant: "success" });
            })
            .catch(() => {
                this.setState({ uploading: false });
                enqueueSnackbar("Greška pri otpremanju.", { variant: "error" });
            });
    };

    handleRemoveDocument = (docId: number): void => {
        const { run } = this.state;
        if (!run) return;
        void removeDocumentFromRun(run.id, docId).then(() =>
            getProcessRunDocuments(run.id).then((documents) =>
                this.setState({ documents }),
            ),
        );
    };

    handleComplete = (): void => {
        const {
            run,
            complete_valid_until,
            complete_performed_at,
            complete_notes,
            complete_report_number,
            complete_fitness_assessment,
            complete_measures_taken,
        } = this.state;
        if (!run || !complete_valid_until.trim()) return;
        const validUntilIso = displayDateToIso(complete_valid_until);
        if (!validUntilIso) return;
        const performedIso = complete_performed_at.trim()
            ? displayDateToIso(complete_performed_at)
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
        this.setState({ completing: true });
        void completeProcessRun(run.id, {
            valid_until: validUntilIso,
            performed_at: performedIso,
            notes: complete_notes || undefined,
            result_data,
        })
            .then((updated) => {
                this.setState({
                    run: updated,
                    showCompleteForm: false,
                    completing: false,
                });
                enqueueSnackbar("Aktivnost je završena.", {
                    variant: "success",
                });
            })
            .catch((err: { response?: { data?: { detail?: string } } }) => {
                this.setState({ completing: false });
                enqueueSnackbar(
                    err.response?.data?.detail ?? "Greška pri završetku.",
                    { variant: "error" },
                );
            });
    };

    renderDocumentsSection(documents: ProcessRunDocument[]): React.ReactNode {
        const systemDocs = documents.filter(
            (d) => d.usage_kind === "INVITATION",
        );
        const otherDocs = documents.filter(
            (d) => d.usage_kind !== "INVITATION",
        );

        const renderList = (items: ProcessRunDocument[], deletable: boolean) =>
            items.length === 0 ? (
                <Typography variant="body2" color="text.secondary">
                    Nema dokumenata.
                </Typography>
            ) : (
                <List dense disablePadding>
                    {items.map((d) => (
                        <ListItem
                            key={d.id}
                            disablePadding
                            sx={{
                                py: 0.5,
                                display: "flex",
                                alignItems: "flex-start",
                                gap: 1,
                            }}
                        >
                            <ListItemText
                                primary={d.document_file_title ?? "Dokument"}
                                secondary={usageKindLabel(d.usage_kind)}
                                sx={{ flex: 1, minWidth: 0, my: 0 }}
                            />
                            <Box
                                sx={{
                                    display: "flex",
                                    alignItems: "center",
                                    gap: 0.5,
                                    flexShrink: 0,
                                }}
                            >
                                {d.document_file_url ? (
                                    <Button
                                        size="small"
                                        variant="contained"
                                        disableElevation
                                        component="a"
                                        href={d.document_file_url}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        sx={BTN_SX}
                                    >
                                        Preuzmi
                                    </Button>
                                ) : null}
                                {deletable ? (
                                    <IconButton
                                        size="small"
                                        aria-label="obriši prilog"
                                        onClick={() =>
                                            this.handleRemoveDocument(d.id)
                                        }
                                    >
                                        <DeleteIcon fontSize="small" />
                                    </IconButton>
                                ) : null}
                            </Box>
                        </ListItem>
                    ))}
                </List>
            );

        return (
            <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
                <Box>
                    <Typography variant="subtitle2" gutterBottom>
                        Sistemski dokumenti
                    </Typography>
                    {renderList(systemDocs, false)}
                </Box>
                <Box>
                    <Typography variant="subtitle2" gutterBottom>
                        Prilozi korisnika
                    </Typography>
                    {renderList(otherDocs, true)}
                </Box>
            </Box>
        );
    }

    render() {
        const {
            loading,
            error,
            run,
            documents,
            notes,
            notesNewBody,
            uploadTitle,
            uploadFile,
            uploading,
            showCompleteForm,
            complete_valid_until,
            complete_performed_at,
            complete_notes,
            complete_report_number,
            complete_fitness_assessment,
            complete_measures_taken,
            completing,
        } = this.state;

        if (loading) {
            return (
                <Box sx={{ display: "flex", justifyContent: "center", py: 6 }}>
                    <CircularProgress />
                </Box>
            );
        }

        if (error || !run) {
            return (
                <Alert severity="error">
                    {error ?? "Aktivnost nije pronađena."}
                </Alert>
            );
        }

        const result = run.result_data as Record<string, string> | undefined;
        const canComplete = run.status === "PENDING" || run.status === "SENT";

        return (
            <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
                <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                    <IconButton onClick={this.handleBack} aria-label="nazad">
                        <ArrowBackIcon />
                    </IconButton>
                    <Box sx={{ flex: 1 }}>
                        <Typography variant="h6">
                            {run.process_type_name}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                            {subjectLabel(run.subject_snapshot)}
                        </Typography>
                    </Box>
                    <StatusBadge status={run.status} />
                </Box>

                <Paper sx={{ p: 2 }}>
                    <Typography variant="subtitle1" gutterBottom>
                        Osnovno
                    </Typography>
                    <Box
                        sx={{
                            display: "grid",
                            gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr" },
                            gap: 1.5,
                        }}
                    >
                        <Box>
                            <Typography
                                variant="caption"
                                color="text.secondary"
                            >
                                Zakazano
                            </Typography>
                            <Typography>
                                {formatDateDisplay(run.scheduled_for)}
                            </Typography>
                        </Box>
                        <Box>
                            <Typography
                                variant="caption"
                                color="text.secondary"
                            >
                                Važi do
                            </Typography>
                            <Typography>
                                {formatDateDisplay(run.valid_until)}
                            </Typography>
                        </Box>
                        <Box>
                            <Typography
                                variant="caption"
                                color="text.secondary"
                            >
                                Izvršeno
                            </Typography>
                            <Typography>
                                {formatDateDisplay(run.performed_at)}
                            </Typography>
                        </Box>
                        {run.notes ? (
                            <Box sx={{ gridColumn: { sm: "1 / -1" } }}>
                                <Typography
                                    variant="caption"
                                    color="text.secondary"
                                >
                                    Beleške pri završetku
                                </Typography>
                                <Typography sx={{ whiteSpace: "pre-wrap" }}>
                                    {run.notes}
                                </Typography>
                            </Box>
                        ) : null}
                        {result ? (
                            <Box sx={{ gridColumn: { sm: "1 / -1" } }}>
                                <Typography
                                    variant="caption"
                                    color="text.secondary"
                                >
                                    Rezultat pregleda
                                </Typography>
                                {result.report_number ? (
                                    <Typography>
                                        Broj izveštaja: {result.report_number}
                                    </Typography>
                                ) : null}
                                {result.fitness_assessment ? (
                                    <Typography>
                                        Ocena sposobnosti:{" "}
                                        {result.fitness_assessment}
                                    </Typography>
                                ) : null}
                                {result.measures_taken ? (
                                    <Typography sx={{ whiteSpace: "pre-wrap" }}>
                                        Preduzete mere: {result.measures_taken}
                                    </Typography>
                                ) : null}
                            </Box>
                        ) : null}
                    </Box>
                </Paper>

                <Paper sx={{ p: 2 }}>
                    <Typography variant="subtitle1" gutterBottom>
                        Obaveštenja i okidači
                    </Typography>
                    {run.trigger_runs?.length ? (
                        <Box sx={{ overflow: "auto" }}>
                            <Table size="small">
                                <TableHead>
                                    <TableRow>
                                        <TableCell>Okidač</TableCell>
                                        <TableCell
                                            sx={{ whiteSpace: "nowrap" }}
                                        >
                                            Datum i vreme
                                        </TableCell>
                                        <TableCell>Izvršio</TableCell>
                                        <TableCell>Mejl</TableCell>
                                        <TableCell align="right">
                                            Dokument
                                        </TableCell>
                                    </TableRow>
                                </TableHead>
                                <TableBody>
                                    {triggerRunsChronological(
                                        run.trigger_runs,
                                    ).map((tr) => (
                                        <TableRow key={tr.id}>
                                            <TableCell sx={{ minWidth: 180 }}>
                                                <Typography
                                                    variant="body2"
                                                    fontWeight={600}
                                                >
                                                    {triggerLabel(tr.trigger)}
                                                </Typography>
                                            </TableCell>
                                            <TableCell
                                                sx={{ whiteSpace: "nowrap" }}
                                            >
                                                {formatDateTimeDisplay(
                                                    tr.executed_at,
                                                )}
                                            </TableCell>
                                            <TableCell
                                                sx={{ whiteSpace: "nowrap" }}
                                            >
                                                {triggerExecutorLabel(tr)}
                                            </TableCell>
                                            <TableCell>
                                                {renderTriggerEmailStatus(tr)}
                                            </TableCell>
                                            <TableCell align="right">
                                                {tr.document_file_url ? (
                                                    <Button
                                                        size="small"
                                                        variant="outlined"
                                                        disableElevation
                                                        component="a"
                                                        href={
                                                            tr.document_file_url
                                                        }
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        sx={BTN_SX}
                                                    >
                                                        Preuzmi
                                                    </Button>
                                                ) : (
                                                    <Typography
                                                        variant="body2"
                                                        color="text.secondary"
                                                    >
                                                        —
                                                    </Typography>
                                                )}
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </Box>
                    ) : (
                        <Typography variant="body2" color="text.secondary">
                            Još nema izvršenih obaveštenja.
                        </Typography>
                    )}
                </Paper>

                <Paper sx={{ p: 2 }}>
                    <Typography variant="subtitle1" gutterBottom>
                        Dokumenti
                    </Typography>
                    {this.renderDocumentsSection(documents)}
                    <Divider sx={{ my: 2 }} />
                    <Typography
                        variant="body2"
                        color="text.secondary"
                        sx={{ mb: 1.5 }}
                    >
                        Dodajte zvanične beleške, skenirane nalaze ili druge
                        priloge vezane za ovu aktivnost.
                    </Typography>
                    <input
                        ref={this.fileInputRef}
                        type="file"
                        hidden
                        onChange={this.handleFileChange}
                    />
                    <Box
                        sx={{
                            display: "flex",
                            flexWrap: "wrap",
                            gap: 1,
                            alignItems: "center",
                        }}
                    >
                        <Button
                            variant="outlined"
                            startIcon={<UploadFileIcon />}
                            onClick={this.handlePickFile}
                            sx={BTN_SX}
                        >
                            {uploadFile ? uploadFile.name : "Izaberi fajl"}
                        </Button>
                        <TextField
                            size="small"
                            label="Naziv priloga"
                            value={uploadTitle}
                            onChange={(e) =>
                                this.setState({ uploadTitle: e.target.value })
                            }
                            sx={{ minWidth: 220, flex: 1 }}
                        />
                        <Button
                            variant="contained"
                            disableElevation
                            disabled={!uploadFile || uploading}
                            onClick={this.handleUpload}
                            sx={BTN_SX}
                        >
                            {uploading ? "Otpremam..." : "Dodaj prilog"}
                        </Button>
                    </Box>
                </Paper>

                <Paper sx={{ p: 2 }}>
                    <Typography variant="subtitle1" gutterBottom>
                        Beleške
                    </Typography>
                    {notes.length === 0 ? (
                        <Typography
                            variant="body2"
                            color="text.secondary"
                            sx={{ mb: 2 }}
                        >
                            Nema beleški.
                        </Typography>
                    ) : (
                        <List dense disablePadding sx={{ mb: 2 }}>
                            {notes.map((n) => (
                                <ListItem
                                    key={n.id}
                                    alignItems="flex-start"
                                    sx={{ px: 0 }}
                                >
                                    <ListItemText
                                        primary={n.body}
                                        secondary={`${n.author_username ?? "Sistem"} · ${formatDateTimeDisplay(n.created_at)}`}
                                    />
                                </ListItem>
                            ))}
                        </List>
                    )}
                    <TextField
                        label="Nova beleška"
                        fullWidth
                        multiline
                        minRows={2}
                        value={notesNewBody}
                        onChange={(e) =>
                            this.setState({ notesNewBody: e.target.value })
                        }
                        sx={{ mb: 1 }}
                    />
                    <Button
                        variant="contained"
                        disableElevation
                        disabled={!notesNewBody.trim()}
                        onClick={this.handlePostNote}
                        sx={BTN_SX}
                    >
                        Dodaj belešku
                    </Button>
                </Paper>

                {canComplete ? (
                    <Paper sx={{ p: 2 }}>
                        <Box
                            sx={{
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "space-between",
                                gap: 1,
                                mb: showCompleteForm ? 2 : 0,
                            }}
                        >
                            <Typography variant="subtitle1">
                                Završetak
                            </Typography>
                            {!showCompleteForm ? (
                                <Button
                                    variant="contained"
                                    disableElevation
                                    startIcon={<CheckCircleIcon />}
                                    onClick={() => {
                                        const today = todayLocalDate();
                                        this.setState({
                                            showCompleteForm: true,
                                            complete_performed_at:
                                                DateToString(today),
                                            complete_valid_until: DateToString(
                                                addMonths(today, 12),
                                            ),
                                        });
                                    }}
                                    sx={BTN_SX}
                                >
                                    Završi aktivnost
                                </Button>
                            ) : null}
                        </Box>
                        {showCompleteForm ? (
                            <Box
                                sx={{
                                    display: "flex",
                                    flexDirection: "column",
                                    gap: 1.5,
                                }}
                            >
                                <DateTextFieldWithPicker
                                    label="Važi do (dd.mm.yyyy)"
                                    value={complete_valid_until}
                                    allowToday={false}
                                    error={
                                        validUntilDateError(
                                            complete_valid_until,
                                        ) != null
                                    }
                                    helperText={validUntilDateError(
                                        complete_valid_until,
                                    )}
                                    onChange={(v) =>
                                        this.setState({
                                            complete_valid_until: v,
                                        })
                                    }
                                />
                                <DateTextFieldWithPicker
                                    label="Izvršeno (dd.mm.yyyy)"
                                    value={complete_performed_at}
                                    allowPast
                                    onChange={(v) =>
                                        this.setState({
                                            complete_performed_at: v,
                                        })
                                    }
                                />
                                <TextField
                                    label="Broj izveštaja"
                                    fullWidth
                                    value={complete_report_number}
                                    onChange={(e) =>
                                        this.setState({
                                            complete_report_number:
                                                e.target.value,
                                        })
                                    }
                                />
                                <TextField
                                    label="Ocena sposobnosti"
                                    fullWidth
                                    value={complete_fitness_assessment}
                                    onChange={(e) =>
                                        this.setState({
                                            complete_fitness_assessment:
                                                e.target.value,
                                        })
                                    }
                                />
                                <TextField
                                    label="Preduzete mere"
                                    fullWidth
                                    multiline
                                    value={complete_measures_taken}
                                    onChange={(e) =>
                                        this.setState({
                                            complete_measures_taken:
                                                e.target.value,
                                        })
                                    }
                                />
                                <TextField
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
                                <Box
                                    sx={{
                                        display: "flex",
                                        gap: 1,
                                        justifyContent: "flex-end",
                                    }}
                                >
                                    <Button
                                        onClick={() =>
                                            this.setState({
                                                showCompleteForm: false,
                                            })
                                        }
                                    >
                                        Odustani
                                    </Button>
                                    <Button
                                        variant="contained"
                                        disableElevation
                                        disabled={
                                            !!validUntilDateError(
                                                complete_valid_until,
                                            ) || completing
                                        }
                                        onClick={this.handleComplete}
                                        sx={BTN_SX}
                                    >
                                        {completing ? "Čuvam..." : "Završi"}
                                    </Button>
                                </Box>
                            </Box>
                        ) : null}
                    </Paper>
                ) : null}
            </Box>
        );
    }
}

const mapDispatchToProps = (
    dispatch: AppDispatch,
): ProcessRunDetailPageDispatchProps => ({
    setLastPath: (path) => dispatch(setLastPath(path)),
    setBreadcrumbs: (items) => dispatch(setBreadcrumbs(items)),
});

const Connected = connect(null, mapDispatchToProps)(ProcessRunDetailPageInner);
const ProcessRunDetailWithNavigation = withNavigation(Connected);

export default function ProcessRunDetailPage(): React.ReactElement {
    const { id } = useParams<{ id: string }>();
    return <ProcessRunDetailWithNavigation id={id ?? ""} />;
}
