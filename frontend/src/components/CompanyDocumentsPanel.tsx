import { Component, type ReactNode } from "react";

import {
    Box,
    Button,
    Chip,
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableRow,
    Typography,
} from "@mui/material";
import { enqueueSnackbar } from "notistack";

import {
    deleteCompanyDocument,
    getCompanyDocuments,
    uploadCompanyDocument,
} from "../api/processes";
import { PermissionGate } from "./PermissionGate";
import { FilePreviewContent } from "./FilePreviewContent";
import { ConfirmDialog, LoadingState, SectionCard } from "../design";

import type { CompanyDocument, CompanyDocumentKind } from "../types/processes";

const PDF_ONLY_ACCEPT = ".pdf,application/pdf";
const WORD_OR_PDF_ACCEPT =
    ".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document";

export const COMPANY_DOCUMENT_KINDS: {
    kind: CompanyDocumentKind;
    label: string;
    accept: string;
}[] = [
    { kind: "CONTRACT", label: "Ugovor", accept: PDF_ONLY_ACCEPT },
    {
        kind: "DECISION",
        label: "Odluka o imenovanju lica za BZNR",
        accept: PDF_ONLY_ACCEPT,
    },
    {
        kind: "RULEBOOK_OSH",
        label: "Pravilnik o BZNR",
        accept: WORD_OR_PDF_ACCEPT,
    },
    {
        kind: "RULEBOOK_PPE",
        label: "Pravilnik o LZO",
        accept: WORD_OR_PDF_ACCEPT,
    },
    {
        kind: "TRAINING_EMPLOYEES",
        label: "Program obuke za zaposlene",
        accept: WORD_OR_PDF_ACCEPT,
    },
    {
        kind: "TRAINING_MANAGERS",
        label: "Program obuke za rukovodioce",
        accept: WORD_OR_PDF_ACCEPT,
    },
    {
        kind: "TRAINING_PPE",
        label: "Program obuke za LZO",
        accept: WORD_OR_PDF_ACCEPT,
    },
    {
        kind: "PLAN_ZOP",
        label: "Plan zaštite od požara",
        accept: WORD_OR_PDF_ACCEPT,
    },
    {
        kind: "PRAVILA_ZOP",
        label: "Pravila zaštite od požara",
        accept: WORD_OR_PDF_ACCEPT,
    },
    {
        kind: "PLAN_EVAKUACIJE",
        label: "Plan evakuacije",
        accept: WORD_OR_PDF_ACCEPT,
    },
    {
        kind: "DECISION_ZOP",
        label: "Odluka o imenovanju lica za ZOP",
        accept: PDF_ONLY_ACCEPT,
    },
];

export const COMPANY_DOCUMENT_KIND_COUNT = COMPANY_DOCUMENT_KINDS.length;

interface CompanyDocumentsPanelProps {
    clientCompanyId: number;
    embedded?: boolean;
}

interface CompanyDocumentsPanelState {
    items: CompanyDocument[];
    loading: boolean;
    error: boolean;
    uploadingKind: CompanyDocumentKind | null;
    deleteId: number | null;
    deleting: boolean;
    previewDoc: CompanyDocument | null;
}

export class CompanyDocumentsPanel extends Component<
    CompanyDocumentsPanelProps,
    CompanyDocumentsPanelState
> {
    state: CompanyDocumentsPanelState = {
        items: [],
        loading: true,
        error: false,
        uploadingKind: null,
        deleteId: null,
        deleting: false,
        previewDoc: null,
    };

    componentDidMount(): void {
        this.load();
    }

    componentDidUpdate(prevProps: CompanyDocumentsPanelProps): void {
        if (prevProps.clientCompanyId !== this.props.clientCompanyId) {
            this.load();
        }
    }

    load = (): void => {
        const { clientCompanyId } = this.props;
        this.setState({ loading: true, error: false });
        getCompanyDocuments({ client_company_id: clientCompanyId })
            .then((items) =>
                this.setState({ items, loading: false, error: false }),
            )
            .catch(() => {
                this.setState({ loading: false, error: true });
                enqueueSnackbar("Greška pri učitavanju dokumentacije.", {
                    variant: "error",
                });
            });
    };

    docByKind = (kind: CompanyDocumentKind): CompanyDocument | undefined =>
        this.state.items.find((d) => d.kind === kind);

    handleUpload = (kind: CompanyDocumentKind, file: File | null): void => {
        if (!file) return;
        const { clientCompanyId } = this.props;
        this.setState({ uploadingKind: kind });
        uploadCompanyDocument(clientCompanyId, kind, file)
            .then((saved) => {
                this.setState((prev) => ({
                    items: [
                        ...prev.items.filter((d) => d.kind !== kind),
                        saved,
                    ],
                    uploadingKind: null,
                }));
                enqueueSnackbar("Dokument je priložen.", {
                    variant: "success",
                });
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
                        "Greška pri otpremanju dokumenta.";
                    enqueueSnackbar(msg, { variant: "error" });
                    this.setState({ uploadingKind: null });
                },
            );
    };

    confirmDelete = (id: number): void => {
        this.setState({ deleteId: id });
    };

    cancelDelete = (): void => {
        this.setState({ deleteId: null, deleting: false });
    };

    executeDelete = (): void => {
        const { deleteId } = this.state;
        if (deleteId == null) return;
        this.setState({ deleting: true });
        deleteCompanyDocument(deleteId)
            .then(() => {
                this.setState((prev) => ({
                    items: prev.items.filter((x) => x.id !== deleteId),
                    deleteId: null,
                    deleting: false,
                }));
                enqueueSnackbar("Dokument je obrisan.", {
                    variant: "success",
                });
            })
            .catch(() => {
                enqueueSnackbar("Greška pri brisanju dokumenta.", {
                    variant: "error",
                });
                this.setState({ deleting: false });
            });
    };

    openPreview = (doc: CompanyDocument): void => {
        this.setState({ previewDoc: doc });
    };

    closePreview = (): void => {
        this.setState({ previewDoc: null });
    };

    renderTableBody = (): ReactNode => {
        const { loading, error, uploadingKind, deleting } = this.state;
        if (loading) {
            return <LoadingState />;
        }
        if (error) {
            return (
                <Box sx={{ textAlign: "center", py: 2 }}>
                    <Typography variant="body2" color="error" sx={{ mb: 1 }}>
                        Greška pri učitavanju.
                    </Typography>
                    <Button size="small" onClick={this.load}>
                        Pokušaj ponovo
                    </Button>
                </Box>
            );
        }
        return (
            <Box sx={{ overflow: "auto" }}>
                <Table size="small">
                    <TableHead>
                        <TableRow>
                            <TableCell>Tip</TableCell>
                            <TableCell>Status</TableCell>
                            <TableCell>Fajl</TableCell>
                            <TableCell align="right">Akcije</TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {COMPANY_DOCUMENT_KINDS.map((slot) => {
                            const doc = this.docByKind(slot.kind);
                            const hasFile = Boolean(doc?.file);
                            return (
                                <TableRow key={slot.kind}>
                                    <TableCell>{slot.label}</TableCell>
                                    <TableCell>
                                        <Chip
                                            size="small"
                                            label={hasFile ? "ima" : "nema"}
                                            color={
                                                hasFile ? "success" : "default"
                                            }
                                            variant={
                                                hasFile ? "filled" : "outlined"
                                            }
                                        />
                                    </TableCell>
                                    <TableCell>
                                        {hasFile
                                            ? doc?.file_name || "Dokument"
                                            : "—"}
                                    </TableCell>
                                    <TableCell align="right">
                                        {hasFile ? (
                                            <Box
                                                sx={{
                                                    display: "flex",
                                                    gap: 0.5,
                                                    justifyContent: "flex-end",
                                                }}
                                            >
                                                <Button
                                                    size="small"
                                                    variant="outlined"
                                                    onClick={() =>
                                                        doc &&
                                                        this.openPreview(doc)
                                                    }
                                                >
                                                    Pregled
                                                </Button>
                                                <PermissionGate permission="partners.delete_companydocument">
                                                    <Button
                                                        size="small"
                                                        variant="outlined"
                                                        color="error"
                                                        disabled={deleting}
                                                        onClick={() =>
                                                            doc &&
                                                            this.confirmDelete(
                                                                doc.id,
                                                            )
                                                        }
                                                    >
                                                        Obriši
                                                    </Button>
                                                </PermissionGate>
                                            </Box>
                                        ) : (
                                            <PermissionGate permission="partners.add_companydocument">
                                                <Box
                                                    sx={{
                                                        display: "flex",
                                                        flexDirection: "column",
                                                        alignItems: "flex-end",
                                                        gap: 0.5,
                                                    }}
                                                >
                                                    <Button
                                                        size="small"
                                                        variant="contained"
                                                        component="label"
                                                        disabled={
                                                            uploadingKind ===
                                                            slot.kind
                                                        }
                                                    >
                                                        {uploadingKind ===
                                                        slot.kind
                                                            ? "Otpremam..."
                                                            : "Priloži"}
                                                        <input
                                                            type="file"
                                                            hidden
                                                            accept={slot.accept}
                                                            onChange={(e) =>
                                                                this.handleUpload(
                                                                    slot.kind,
                                                                    e.target
                                                                        .files?.[0] ??
                                                                        null,
                                                                )
                                                            }
                                                        />
                                                    </Button>
                                                    {slot.accept ===
                                                        WORD_OR_PDF_ACCEPT && (
                                                        <Typography
                                                            variant="caption"
                                                            color="text.secondary"
                                                            sx={{
                                                                textAlign:
                                                                    "right",
                                                            }}
                                                        >
                                                            Word fajlovi se
                                                            automatski prebacuju
                                                            u PDF.
                                                        </Typography>
                                                    )}
                                                </Box>
                                            </PermissionGate>
                                        )}
                                    </TableCell>
                                </TableRow>
                            );
                        })}
                    </TableBody>
                </Table>
            </Box>
        );
    };

    render() {
        const { embedded } = this.props;
        const { items, deleteId, deleting, previewDoc } = this.state;
        const attachedCount = COMPANY_DOCUMENT_KINDS.filter((s) =>
            items.some((d) => d.kind === s.kind),
        ).length;
        const countLabel = (
            <Typography variant="body2" color="text.secondary">
                {attachedCount} / {COMPANY_DOCUMENT_KINDS.length} priloženo
            </Typography>
        );

        const body = this.renderTableBody();

        return (
            <>
                {embedded ? (
                    <Box
                        sx={{
                            display: "flex",
                            flexDirection: "column",
                            gap: 1,
                        }}
                    >
                        {countLabel}
                        {body}
                    </Box>
                ) : (
                    <SectionCard
                        title="Obavezna dokumentacija"
                        action={countLabel}
                    >
                        {body}
                    </SectionCard>
                )}

                <ConfirmDialog
                    open={deleteId != null}
                    title="Obriši dokument"
                    message="Da li si siguran da želiš da obrišeš ovaj dokument? Posle brisanja možeš priložiti novi fajl."
                    loading={deleting}
                    onConfirm={this.executeDelete}
                    onClose={this.cancelDelete}
                />

                {previewDoc?.file && (
                    <Dialog
                        open
                        onClose={this.closePreview}
                        maxWidth="lg"
                        fullWidth
                    >
                        <DialogTitle>
                            {previewDoc.kind_display ??
                                COMPANY_DOCUMENT_KINDS.find(
                                    (s) => s.kind === previewDoc.kind,
                                )?.label}
                        </DialogTitle>
                        <DialogContent>
                            <FilePreviewContent
                                url={previewDoc.file}
                                label={previewDoc.file_name ?? "Dokument"}
                            />
                        </DialogContent>
                        <DialogActions>
                            <Button
                                href={previewDoc.file}
                                target="_blank"
                                rel="noreferrer"
                            >
                                Otvori u novom prozoru
                            </Button>
                            <Button onClick={this.closePreview}>Zatvori</Button>
                        </DialogActions>
                    </Dialog>
                )}
            </>
        );
    }
}
