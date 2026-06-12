import { Component, Fragment } from "react";

import {
    Alert,
    Box,
    Button,
    Chip,
    CircularProgress,
    Collapse,
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
    Divider,
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
    useMediaQuery,
    useTheme,
} from "@mui/material";
import PictureAsPdfIcon from "@mui/icons-material/PictureAsPdf";
import { enqueueSnackbar } from "notistack";

import {
    createRiskAssessmentAct,
    createRiskAssessmentActAmendment,
    deleteRiskAssessmentActAmendment,
    downloadRiskAssessmentActMergedPdf,
    getRiskAssessmentAct,
    updateRiskAssessmentActDate,
    uploadRiskAssessmentSectionRevision,
} from "../api/processes";
import DateTextFieldWithPicker from "./DateTextFieldWithPicker";
import { FilePreviewContent } from "./FilePreviewContent";
import { PermissionGate } from "./PermissionGate";
import {
    displayDateToIso,
    formatDateDisplay,
    StringToDate,
} from "../utils/date";

import type {
    RiskAssessmentAct,
    RiskAssessmentActAmendment,
    RiskAssessmentSection,
} from "../types/processes";
import { setupTestFill } from "../testFlow/registerTestFill";
import { TEST_FLOW } from "../testFlow/fixture";

interface Props {
    clientCompanyId: number;
}

interface InnerProps extends Props {
    isSmall: boolean;
}

interface State {
    act: RiskAssessmentAct | null;
    loading: boolean;
    error: string | null;
    savingDate: boolean;
    actDateValue: string;
    creating: boolean;
    merging: boolean;
    editDialogOpen: boolean;
    editSection: RiskAssessmentSection | null;
    editFile: File | null;
    editReason: string;
    uploading: boolean;
    historyOpenFor: number | null;
    previewUrl: string | null;
    previewLabel: string;
    previewOpen: boolean;
    amendmentDialogOpen: boolean;
    amendmentTitle: string;
    amendmentNote: string;
    amendmentFile: File | null;
    uploadingAmendment: boolean;
    deletingAmendmentId: number | null;
    previewAmendment: RiskAssessmentActAmendment | null;
}

function fileNameFromUrl(url: string | null): string {
    if (!url) return "";
    const base = url.split("?")[0];
    const parts = base.split("/");
    return decodeURIComponent(parts[parts.length - 1] ?? "");
}

function dateToDisplay(iso: string | null | undefined): string {
    if (!iso) return "";
    return formatDateDisplay(iso);
}

function formatDateTime(iso: string): string {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return iso;
    const dd = String(d.getDate()).padStart(2, "0");
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const yyyy = d.getFullYear();
    const hh = String(d.getHours()).padStart(2, "0");
    const min = String(d.getMinutes()).padStart(2, "0");
    return `${dd}.${mm}.${yyyy} ${hh}:${min}`;
}

class RiskAssessmentActPanelInner extends Component<InnerProps, State> {
    private testFillCleanups: Array<() => void> = [];

    state: State = {
        act: null,
        loading: true,
        error: null,
        savingDate: false,
        actDateValue: "",
        creating: false,
        merging: false,
        editDialogOpen: false,
        editSection: null,
        editFile: null,
        editReason: "",
        uploading: false,
        historyOpenFor: null,
        previewUrl: null,
        previewLabel: "",
        previewOpen: false,
        amendmentDialogOpen: false,
        amendmentTitle: "",
        amendmentNote: "",
        amendmentFile: null,
        uploadingAmendment: false,
        deletingAmendmentId: null,
        previewAmendment: null,
    };

    componentDidMount(): void {
        this.loadAct();
        this.bindTestFillHandlers();
    }

    componentDidUpdate(prevProps: InnerProps): void {
        if (prevProps.clientCompanyId !== this.props.clientCompanyId) {
            this.loadAct();
        }
        this.bindTestFillHandlers();
    }

    componentWillUnmount(): void {
        for (const cleanup of this.testFillCleanups) {
            cleanup();
        }
        this.testFillCleanups = [];
    }

    bindTestFillHandlers = (): void => {
        for (const cleanup of this.testFillCleanups) {
            cleanup();
        }
        this.testFillCleanups = [];
        const reasons = TEST_FLOW.riskActRevisionReason;
        this.testFillCleanups.push(
            setupTestFill("D_DATE", () => {
                this.setState({ actDateValue: TEST_FLOW.riskActDate });
                return true;
            }),
            setupTestFill("D_REASON", () => {
                const { editDialogOpen, editSection } = this.state;
                if (!editDialogOpen || editSection == null) {
                    return false;
                }
                let reason: string = reasons.intro;
                if (editSection.section_type === "ASSESSMENTS") {
                    reason = editSection.current_file
                        ? reasons.assessmentsRevision
                        : reasons.assessments;
                } else if (editSection.section_type === "CONCLUSION") {
                    reason = reasons.conclusion;
                }
                this.setState({ editReason: reason });
                return true;
            }),
        );
    };

    loadAct = (): void => {
        const { clientCompanyId } = this.props;
        this.setState({ loading: true, error: null });
        getRiskAssessmentAct(clientCompanyId)
            .then((act) => {
                this.setState({
                    act,
                    loading: false,
                    actDateValue: dateToDisplay(act?.act_date),
                });
            })
            .catch(() => {
                this.setState({
                    loading: false,
                    error: "Greška pri učitavanju Akta o proceni rizika.",
                });
            });
    };

    handleCreateAct = (): void => {
        const { clientCompanyId } = this.props;
        this.setState({ creating: true });
        createRiskAssessmentAct(clientCompanyId)
            .then((act) => {
                this.setState({
                    act,
                    creating: false,
                    actDateValue: dateToDisplay(act.act_date),
                });
                enqueueSnackbar("Akt o proceni rizika je dodat.", {
                    variant: "success",
                });
            })
            .catch(() => {
                this.setState({ creating: false });
                enqueueSnackbar("Greška pri dodavanju Akta.", {
                    variant: "error",
                });
            });
    };

    saveActDate = (): void => {
        const { act, actDateValue } = this.state;
        if (act == null) return;
        let dateSent: string | null = null;
        if (actDateValue.trim()) {
            const d = StringToDate(actDateValue);
            if (!d) {
                enqueueSnackbar("Neispravan datum.", { variant: "error" });
                return;
            }
            dateSent = displayDateToIso(actDateValue) ?? null;
        }
        this.setState({ savingDate: true });
        updateRiskAssessmentActDate(act.id, dateSent)
            .then((updated) => {
                this.setState({
                    act: updated,
                    savingDate: false,
                    actDateValue: dateToDisplay(updated.act_date),
                });
                enqueueSnackbar("Datum je sačuvan.", { variant: "success" });
            })
            .catch(() => {
                this.setState({ savingDate: false });
                enqueueSnackbar("Greška pri čuvanju datuma.", {
                    variant: "error",
                });
            });
    };

    openEditDialog = (section: RiskAssessmentSection): void => {
        this.setState({
            editDialogOpen: true,
            editSection: section,
            editFile: null,
            editReason: "",
        });
    };

    closeEditDialog = (): void => {
        this.setState({
            editDialogOpen: false,
            editSection: null,
            editFile: null,
            editReason: "",
        });
    };

    saveSectionRevision = (): void => {
        const { act, editSection, editFile, editReason } = this.state;
        if (act == null || editSection == null || editFile == null) return;
        const isFirstAttach = !editSection.current_file;
        if (!isFirstAttach && editReason.trim().length < 5) return;
        this.setState({ uploading: true });
        uploadRiskAssessmentSectionRevision(
            act.id,
            editSection.section_type,
            editFile,
            isFirstAttach ? "" : editReason.trim(),
        )
            .then((updated) => {
                this.setState({
                    act: updated,
                    uploading: false,
                });
                this.closeEditDialog();
                enqueueSnackbar("Sekcija je sačuvana.", { variant: "success" });
            })
            .catch(
                (
                    err:
                        | { message?: string }
                        | { response?: { data?: { detail?: string } } },
                ) => {
                    this.setState({ uploading: false });
                    const msg =
                        (err as { response?: { data?: { detail?: string } } })
                            .response?.data?.detail ??
                        (err as { message?: string }).message ??
                        "Greška pri čuvanju sekcije.";
                    enqueueSnackbar(msg, { variant: "error" });
                },
            );
    };

    toggleHistory = (sectionId: number): void => {
        this.setState((prev) => ({
            historyOpenFor:
                prev.historyOpenFor === sectionId ? null : sectionId,
        }));
    };

    openPreview = (url: string, label: string): void => {
        this.setState({
            previewOpen: true,
            previewUrl: url,
            previewLabel: label,
        });
    };

    closePreview = (): void => {
        this.setState({
            previewOpen: false,
            previewUrl: null,
            previewLabel: "",
        });
    };

    handleMergePdf = (): void => {
        const { act } = this.state;
        if (act == null) return;
        this.setState({ merging: true });
        downloadRiskAssessmentActMergedPdf(act.id)
            .then((blob) => {
                const url = URL.createObjectURL(blob);
                const link = document.createElement("a");
                link.href = url;
                link.download = `akt_${act.id}.pdf`;
                link.click();
                URL.revokeObjectURL(url);
                this.setState({ merging: false });
                enqueueSnackbar("PDF je preuzet.", { variant: "success" });
            })
            .catch(
                (
                    err:
                        | { message?: string }
                        | { response?: { data?: { detail?: string } } },
                ) => {
                    this.setState({ merging: false });
                    const msg =
                        (err as { response?: { data?: { detail?: string } } })
                            .response?.data?.detail ??
                        (err as { message?: string }).message ??
                        "Greška pri objedinjavanju PDF-a.";
                    enqueueSnackbar(msg, { variant: "error" });
                },
            );
    };

    openAmendmentDialog = (): void => {
        this.setState({
            amendmentDialogOpen: true,
            amendmentTitle: "",
            amendmentNote: "",
            amendmentFile: null,
        });
    };

    closeAmendmentDialog = (): void => {
        this.setState({
            amendmentDialogOpen: false,
            amendmentTitle: "",
            amendmentNote: "",
            amendmentFile: null,
        });
    };

    submitAmendment = (): void => {
        const { act, amendmentTitle, amendmentNote, amendmentFile } =
            this.state;
        if (act == null || amendmentFile == null || !amendmentTitle.trim())
            return;
        this.setState({ uploadingAmendment: true });
        createRiskAssessmentActAmendment(
            act.id,
            amendmentTitle.trim(),
            amendmentFile,
            amendmentNote.trim() || undefined,
        )
            .then((amendment) => {
                this.setState((prev) => ({
                    act: prev.act
                        ? {
                              ...prev.act,
                              amendments: [...prev.act.amendments, amendment],
                          }
                        : prev.act,
                    uploadingAmendment: false,
                }));
                this.closeAmendmentDialog();
                enqueueSnackbar("Izmena i dopuna je priložena.", {
                    variant: "success",
                });
            })
            .catch(
                (
                    err:
                        | { message?: string }
                        | { response?: { data?: { detail?: string } } },
                ) => {
                    this.setState({ uploadingAmendment: false });
                    const msg =
                        (err as { response?: { data?: { detail?: string } } })
                            .response?.data?.detail ??
                        (err as { message?: string }).message ??
                        "Greška pri otpremanju.";
                    enqueueSnackbar(msg, { variant: "error" });
                },
            );
    };

    deleteAmendment = (amendment: RiskAssessmentActAmendment): void => {
        const { act } = this.state;
        if (act == null) return;
        this.setState({ deletingAmendmentId: amendment.id });
        deleteRiskAssessmentActAmendment(act.id, amendment.id)
            .then(() => {
                this.setState((prev) => ({
                    act: prev.act
                        ? {
                              ...prev.act,
                              amendments: prev.act.amendments.filter(
                                  (a) => a.id !== amendment.id,
                              ),
                          }
                        : prev.act,
                    deletingAmendmentId: null,
                }));
                enqueueSnackbar("Izmena i dopuna je obrisana.", {
                    variant: "success",
                });
            })
            .catch(
                (
                    err:
                        | { message?: string }
                        | { response?: { data?: { detail?: string } } },
                ) => {
                    this.setState({ deletingAmendmentId: null });
                    const msg =
                        (err as { response?: { data?: { detail?: string } } })
                            .response?.data?.detail ??
                        (err as { message?: string }).message ??
                        "Greška pri brisanju.";
                    enqueueSnackbar(msg, { variant: "error" });
                },
            );
    };

    openAmendmentPreview = (amendment: RiskAssessmentActAmendment): void => {
        this.setState({ previewAmendment: amendment });
    };

    closeAmendmentPreview = (): void => {
        this.setState({ previewAmendment: null });
    };

    attachedCount(act: RiskAssessmentAct): number {
        return act.sections.filter((s) => s.current_file).length;
    }

    render() {
        const {
            act,
            loading,
            error,
            savingDate,
            actDateValue,
            creating,
            merging,
            editDialogOpen,
            editSection,
            editFile,
            editReason,
            uploading,
            historyOpenFor,
            previewOpen,
            previewUrl,
            previewLabel,
            amendmentDialogOpen,
            amendmentTitle,
            amendmentNote,
            amendmentFile,
            uploadingAmendment,
            deletingAmendmentId,
            previewAmendment,
        } = this.state;

        const { isSmall } = this.props;

        if (loading) {
            return (
                <Paper sx={{ p: 3 }}>
                    <Box
                        sx={{
                            display: "flex",
                            justifyContent: "center",
                            py: 3,
                        }}
                    >
                        <CircularProgress />
                    </Box>
                </Paper>
            );
        }

        if (error) {
            return (
                <Paper sx={{ p: 3 }}>
                    <Alert severity="error" sx={{ mb: 2 }}>
                        {error}
                    </Alert>
                    <Button variant="outlined" onClick={this.loadAct}>
                        Pokušaj ponovo
                    </Button>
                </Paper>
            );
        }

        if (act == null) {
            return (
                <Paper sx={{ p: 3 }}>
                    <Typography
                        variant="body2"
                        color="text.secondary"
                        sx={{ mb: 2 }}
                    >
                        Akt o proceni rizika još nije priložen.
                    </Typography>
                    <PermissionGate permission="partners.add_riskassessmentact">
                        <Button
                            variant="contained"
                            disabled={creating}
                            onClick={this.handleCreateAct}
                        >
                            {creating ? "Dodajem..." : "Dodaj Akt"}
                        </Button>
                    </PermissionGate>
                </Paper>
            );
        }

        const attached = this.attachedCount(act);
        const statusLabel =
            attached === 3
                ? "Kompletan (3/3 sekcije priložene)"
                : `Nepotpun (${attached}/3)`;
        const statusColor = attached === 3 ? "success" : "warning";
        const sortedSections = [...act.sections].sort(
            (a, b) => a.order - b.order,
        );
        const isFirstAttach = editSection != null && !editSection.current_file;
        const canSaveEdit =
            editFile != null &&
            !uploading &&
            (isFirstAttach || editReason.trim().length >= 5);

        const canSubmitAmendment =
            amendmentFile != null &&
            amendmentTitle.trim().length > 0 &&
            !uploadingAmendment;

        return (
            <Paper sx={{ p: 3 }}>
                <Box
                    sx={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        gap: 2,
                        flexWrap: "wrap",
                        mb: 2,
                    }}
                >
                    <Typography variant="subtitle1" fontWeight={600}>
                        Akt o proceni rizika
                    </Typography>
                    <PermissionGate permission="partners.view_riskassessmentact">
                        <Button
                            variant="outlined"
                            size="small"
                            startIcon={<PictureAsPdfIcon />}
                            disabled={merging || attached === 0}
                            onClick={this.handleMergePdf}
                        >
                            {merging ? "Spajam..." : "Objedini u PDF"}
                        </Button>
                    </PermissionGate>
                </Box>

                <Chip
                    label={statusLabel}
                    color={statusColor}
                    size="small"
                    sx={{ mb: 2 }}
                />

                <PermissionGate permission="partners.change_riskassessmentact">
                    <Box
                        sx={{
                            display: "flex",
                            alignItems: "center",
                            gap: 1,
                            mb: 2,
                            flexWrap: "wrap",
                        }}
                    >
                        <Box sx={{ flex: 1, minWidth: 200 }}>
                            <DateTextFieldWithPicker
                                label="Datum donošenja (dd.mm.yyyy)"
                                value={actDateValue}
                                allowPast
                                onChange={(v) =>
                                    this.setState({ actDateValue: v })
                                }
                            />
                        </Box>
                        <Button
                            variant="contained"
                            size="small"
                            disabled={savingDate}
                            onClick={this.saveActDate}
                            sx={{ mt: 1 }}
                        >
                            {savingDate ? "Čuvam..." : "Sačuvaj datum"}
                        </Button>
                    </Box>
                </PermissionGate>

                <Box sx={{ overflow: "auto" }}>
                    <Table size="small">
                        <TableHead>
                            <TableRow>
                                <TableCell>Sekcija</TableCell>
                                <TableCell>Fajl</TableCell>
                                <TableCell>Verzija</TableCell>
                                <TableCell align="right">Akcije</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {sortedSections.map((section) => (
                                <Fragment key={section.id}>
                                    <TableRow>
                                        <TableCell>
                                            {section.section_type_display}
                                        </TableCell>
                                        <TableCell>
                                            {section.current_file ? (
                                                fileNameFromUrl(
                                                    section.current_file,
                                                )
                                            ) : (
                                                <Typography
                                                    variant="body2"
                                                    color="text.secondary"
                                                >
                                                    (nije priložen)
                                                </Typography>
                                            )}
                                        </TableCell>
                                        <TableCell>
                                            {section.current_version > 0
                                                ? `v${section.current_version}`
                                                : "—"}
                                        </TableCell>
                                        <TableCell align="right">
                                            {section.current_file && (
                                                <Button
                                                    size="small"
                                                    onClick={() =>
                                                        this.openPreview(
                                                            section.current_file!,
                                                            section.section_type_display,
                                                        )
                                                    }
                                                >
                                                    Pregled
                                                </Button>
                                            )}
                                            <PermissionGate permission="partners.change_riskassessmentact">
                                                <Button
                                                    size="small"
                                                    onClick={() =>
                                                        this.openEditDialog(
                                                            section,
                                                        )
                                                    }
                                                >
                                                    {section.current_file
                                                        ? "Izmeni"
                                                        : "Priloži"}
                                                </Button>
                                            </PermissionGate>
                                            {section.revisions.length > 0 && (
                                                <Button
                                                    size="small"
                                                    onClick={() =>
                                                        this.toggleHistory(
                                                            section.id,
                                                        )
                                                    }
                                                >
                                                    Istorija
                                                </Button>
                                            )}
                                        </TableCell>
                                    </TableRow>
                                    <TableRow key={`hist-${section.id}`}>
                                        <TableCell
                                            colSpan={4}
                                            sx={{ py: 0, border: 0 }}
                                        >
                                            <Collapse
                                                in={
                                                    historyOpenFor ===
                                                    section.id
                                                }
                                            >
                                                <Box sx={{ py: 2, pl: 1 }}>
                                                    <Typography
                                                        variant="body2"
                                                        fontWeight={600}
                                                        gutterBottom
                                                    >
                                                        Istorija revizija —{" "}
                                                        {
                                                            section.section_type_display
                                                        }
                                                    </Typography>
                                                    <Table size="small">
                                                        <TableHead>
                                                            <TableRow>
                                                                <TableCell>
                                                                    Verzija
                                                                </TableCell>
                                                                <TableCell>
                                                                    Datum/vreme
                                                                </TableCell>
                                                                <TableCell>
                                                                    Korisnik
                                                                </TableCell>
                                                                <TableCell>
                                                                    Razlog
                                                                </TableCell>
                                                                <TableCell align="right">
                                                                    Fajl
                                                                </TableCell>
                                                            </TableRow>
                                                        </TableHead>
                                                        <TableBody>
                                                            {section.revisions.map(
                                                                (rev) => (
                                                                    <TableRow
                                                                        key={
                                                                            rev.id
                                                                        }
                                                                    >
                                                                        <TableCell>
                                                                            v
                                                                            {
                                                                                rev.version
                                                                            }
                                                                        </TableCell>
                                                                        <TableCell>
                                                                            {formatDateTime(
                                                                                rev.created_at,
                                                                            )}
                                                                        </TableCell>
                                                                        <TableCell>
                                                                            {rev.created_by_username ??
                                                                                "—"}
                                                                        </TableCell>
                                                                        <TableCell>
                                                                            {
                                                                                rev.reason
                                                                            }
                                                                        </TableCell>
                                                                        <TableCell align="right">
                                                                            {rev.file && (
                                                                                <Button
                                                                                    size="small"
                                                                                    component="a"
                                                                                    href={
                                                                                        rev.file
                                                                                    }
                                                                                    target="_blank"
                                                                                    rel="noopener noreferrer"
                                                                                >
                                                                                    Preuzmi
                                                                                </Button>
                                                                            )}
                                                                        </TableCell>
                                                                    </TableRow>
                                                                ),
                                                            )}
                                                        </TableBody>
                                                    </Table>
                                                </Box>
                                            </Collapse>
                                        </TableCell>
                                    </TableRow>
                                </Fragment>
                            ))}
                        </TableBody>
                    </Table>
                </Box>

                <Divider sx={{ my: 3 }} />

                <Box
                    sx={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        gap: 2,
                        flexWrap: "wrap",
                        mb: 2,
                    }}
                >
                    <Typography variant="subtitle2" fontWeight={600}>
                        Izmene i dopune Akta
                    </Typography>
                    <PermissionGate permission="partners.change_riskassessmentact">
                        <Button
                            size="small"
                            variant="outlined"
                            onClick={this.openAmendmentDialog}
                        >
                            Dodaj izmenu
                        </Button>
                    </PermissionGate>
                </Box>

                {act.amendments.length === 0 ? (
                    <Typography variant="body2" color="text.secondary">
                        Nema priloženih izmena i dopuna.
                    </Typography>
                ) : (
                    <List disablePadding>
                        {act.amendments.map((amendment, idx) => (
                            <ListItem
                                key={amendment.id}
                                divider={idx < act.amendments.length - 1}
                                alignItems="flex-start"
                                sx={{
                                    flexWrap: isSmall ? "wrap" : "nowrap",
                                    gap: 1,
                                    px: 0,
                                }}
                            >
                                <ListItemText
                                    primary={amendment.title}
                                    secondary={
                                        <>
                                            {formatDateTime(
                                                amendment.uploaded_at,
                                            )}
                                            {amendment.uploaded_by_username &&
                                                ` · ${amendment.uploaded_by_username}`}
                                            {amendment.note &&
                                                ` · ${amendment.note}`}
                                        </>
                                    }
                                    secondaryTypographyProps={{
                                        variant: "caption",
                                        color: "text.secondary",
                                    }}
                                />
                                <Box
                                    sx={{
                                        display: "flex",
                                        gap: 0.5,
                                        flexShrink: 0,
                                        alignItems: "center",
                                        flexWrap: "wrap",
                                        justifyContent: "flex-end",
                                        width: isSmall ? "100%" : "auto",
                                    }}
                                >
                                    {amendment.file && (
                                        <Button
                                            size="small"
                                            onClick={() =>
                                                this.openAmendmentPreview(
                                                    amendment,
                                                )
                                            }
                                        >
                                            Pregled
                                        </Button>
                                    )}
                                    {amendment.file && (
                                        <Button
                                            size="small"
                                            component="a"
                                            href={amendment.file}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                        >
                                            Preuzmi
                                        </Button>
                                    )}
                                    <PermissionGate permission="partners.delete_riskassessmentactamendment">
                                        <Button
                                            size="small"
                                            color="error"
                                            disabled={
                                                deletingAmendmentId ===
                                                amendment.id
                                            }
                                            onClick={() =>
                                                this.deleteAmendment(amendment)
                                            }
                                        >
                                            {deletingAmendmentId ===
                                            amendment.id
                                                ? "Brišem..."
                                                : "Obriši"}
                                        </Button>
                                    </PermissionGate>
                                </Box>
                            </ListItem>
                        ))}
                    </List>
                )}

                <Dialog
                    open={editDialogOpen}
                    onClose={this.closeEditDialog}
                    maxWidth="sm"
                    fullWidth
                    fullScreen={isSmall}
                >
                    <DialogTitle>
                        {editSection?.current_file
                            ? `Izmena: ${editSection.section_type_display}`
                            : `Prilog: ${editSection?.section_type_display ?? ""}`}
                    </DialogTitle>
                    <DialogContent>
                        {editSection?.current_file && (
                            <Typography variant="body2" sx={{ mb: 2 }}>
                                Trenutni fajl:{" "}
                                {fileNameFromUrl(editSection.current_file)}
                                {editSection.current_version > 0 &&
                                    ` (v${editSection.current_version})`}
                            </Typography>
                        )}
                        <Button component="label" variant="outlined" fullWidth>
                            {editFile ? editFile.name : "Izaberi fajl..."}
                            <input
                                type="file"
                                hidden
                                accept=".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                                onChange={(e) =>
                                    this.setState({
                                        editFile: e.target.files?.[0] ?? null,
                                    })
                                }
                            />
                        </Button>
                        <Typography
                            variant="caption"
                            color="text.secondary"
                            sx={{ mt: 0.5, display: "block" }}
                        >
                            Word fajlovi se automatski prebacuju u PDF.
                        </Typography>
                        {!isFirstAttach && (
                            <TextField
                                margin="dense"
                                label="Razlog izmene"
                                required
                                fullWidth
                                multiline
                                minRows={3}
                                value={editReason}
                                onChange={(e) =>
                                    this.setState({
                                        editReason: e.target.value,
                                    })
                                }
                                helperText="Razlog je obavezan i trajno se beleži."
                                sx={{ mt: 2 }}
                            />
                        )}
                    </DialogContent>
                    <DialogActions>
                        <Button
                            onClick={this.closeEditDialog}
                            disabled={uploading}
                        >
                            Odustani
                        </Button>
                        <Button
                            variant="contained"
                            disabled={!canSaveEdit}
                            onClick={this.saveSectionRevision}
                        >
                            {uploading ? "Čuvam..." : "Sačuvaj"}
                        </Button>
                    </DialogActions>
                </Dialog>

                <Dialog
                    open={amendmentDialogOpen}
                    onClose={this.closeAmendmentDialog}
                    maxWidth="sm"
                    fullWidth
                    fullScreen={isSmall}
                >
                    <DialogTitle>Dodaj izmenu i dopunu Akta</DialogTitle>
                    <DialogContent>
                        <TextField
                            margin="dense"
                            label="Naziv"
                            required
                            fullWidth
                            value={amendmentTitle}
                            disabled={uploadingAmendment}
                            onChange={(e) =>
                                this.setState({
                                    amendmentTitle: e.target.value,
                                })
                            }
                            sx={{ mb: 1 }}
                        />
                        <TextField
                            margin="dense"
                            label="Napomena (opciono)"
                            fullWidth
                            multiline
                            minRows={2}
                            value={amendmentNote}
                            disabled={uploadingAmendment}
                            onChange={(e) =>
                                this.setState({ amendmentNote: e.target.value })
                            }
                            sx={{ mb: 2 }}
                        />
                        <Button
                            component="label"
                            variant="outlined"
                            fullWidth
                            disabled={uploadingAmendment}
                        >
                            {amendmentFile
                                ? amendmentFile.name
                                : "Izaberi fajl..."}
                            <input
                                type="file"
                                hidden
                                accept=".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                                onChange={(e) =>
                                    this.setState({
                                        amendmentFile:
                                            e.target.files?.[0] ?? null,
                                    })
                                }
                            />
                        </Button>
                        <Typography
                            variant="caption"
                            color="text.secondary"
                            sx={{ mt: 0.5, display: "block" }}
                        >
                            Word fajlovi se automatski prebacuju u PDF.
                        </Typography>
                    </DialogContent>
                    <DialogActions>
                        <Button
                            onClick={this.closeAmendmentDialog}
                            disabled={uploadingAmendment}
                        >
                            Odustani
                        </Button>
                        <Button
                            variant="contained"
                            disabled={!canSubmitAmendment}
                            onClick={this.submitAmendment}
                        >
                            {uploadingAmendment ? "Otpremam..." : "Priloži"}
                        </Button>
                    </DialogActions>
                </Dialog>

                {previewUrl && (
                    <Dialog
                        open={previewOpen}
                        onClose={this.closePreview}
                        maxWidth="lg"
                        fullWidth
                        fullScreen={isSmall}
                    >
                        <DialogTitle>{previewLabel}</DialogTitle>
                        <DialogContent>
                            <FilePreviewContent
                                url={previewUrl}
                                label={previewLabel}
                            />
                        </DialogContent>
                        <DialogActions>
                            <Button onClick={this.closePreview}>Zatvori</Button>
                        </DialogActions>
                    </Dialog>
                )}

                {previewAmendment?.file && (
                    <Dialog
                        open
                        onClose={this.closeAmendmentPreview}
                        maxWidth="lg"
                        fullWidth
                        fullScreen={isSmall}
                    >
                        <DialogTitle>{previewAmendment.title}</DialogTitle>
                        <DialogContent>
                            <FilePreviewContent
                                url={previewAmendment.file}
                                label={previewAmendment.title}
                            />
                        </DialogContent>
                        <DialogActions>
                            <Button
                                href={previewAmendment.file}
                                target="_blank"
                                rel="noreferrer"
                            >
                                Otvori u novom prozoru
                            </Button>
                            <Button onClick={this.closeAmendmentPreview}>
                                Zatvori
                            </Button>
                        </DialogActions>
                    </Dialog>
                )}
            </Paper>
        );
    }
}

export function RiskAssessmentActPanel(props: Props) {
    const theme = useTheme();
    const isSmall = useMediaQuery(theme.breakpoints.down("sm"));
    return <RiskAssessmentActPanelInner {...props} isSmall={isSmall} />;
}
