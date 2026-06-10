import { Component } from "react";

import {
    Alert,
    Box,
    Button,
    Chip,
    CircularProgress,
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
    Paper,
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableRow,
    Typography,
} from "@mui/material";
import type { ChipProps } from "@mui/material";
import { enqueueSnackbar } from "notistack";

import {
    deleteCompanyComplianceFinding,
    getCompanyComplianceFindings,
    uploadCompanyComplianceFinding,
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
    CompanyComplianceFindingRow,
    ComplianceFindingStatus,
} from "../types/processes";

const STATUS_BADGE: Record<
    ComplianceFindingStatus,
    { label: string; color: ChipProps["color"] }
> = {
    VALID: { label: "važi", color: "success" },
    EXPIRING: { label: "ističe uskoro", color: "warning" },
    EXPIRED: { label: "istekao", color: "error" },
    MISSING: { label: "nedostaje", color: "default" },
};

interface Props {
    clientCompanyId: number;
}

interface State {
    rows: CompanyComplianceFindingRow[];
    loading: boolean;
    error: string | null;
    dialogOpen: boolean;
    dialogTypeId: number | null;
    dialogTypeName: string;
    dialogFile: File | null;
    dialogIssuedDate: string;
    saving: boolean;
    previewOpen: boolean;
    previewUrl: string | null;
    previewLabel: string;
}

function uploadErrorMessage(
    err: { message?: string } | { response?: { data?: { detail?: string } } },
): string {
    return (
        (err as { response?: { data?: { detail?: string } } }).response?.data
            ?.detail ??
        (err as { message?: string }).message ??
        "Greška pri čuvanju stručnog nalaza."
    );
}

export class ComplianceFindingsPanel extends Component<Props, State> {
    state: State = {
        rows: [],
        loading: true,
        error: null,
        dialogOpen: false,
        dialogTypeId: null,
        dialogTypeName: "",
        dialogFile: null,
        dialogIssuedDate: "",
        saving: false,
        previewOpen: false,
        previewUrl: null,
        previewLabel: "",
    };

    componentDidMount(): void {
        this.loadRows();
    }

    componentDidUpdate(prevProps: Props): void {
        if (prevProps.clientCompanyId !== this.props.clientCompanyId) {
            this.loadRows();
        }
    }

    loadRows = (): void => {
        const { clientCompanyId } = this.props;
        this.setState({ loading: true, error: null });
        getCompanyComplianceFindings(clientCompanyId)
            .then((rows) => {
                this.setState({ rows, loading: false });
            })
            .catch(() => {
                this.setState({
                    loading: false,
                    error: "Greška pri učitavanju stručnih nalaza.",
                });
            });
    };

    openDialog = (row: CompanyComplianceFindingRow): void => {
        this.setState({
            dialogOpen: true,
            dialogTypeId: row.finding_type,
            dialogTypeName: row.finding_type_name,
            dialogFile: null,
            dialogIssuedDate: row.issued_date
                ? formatDateDisplay(row.issued_date)
                : "",
        });
    };

    closeDialog = (): void => {
        this.setState({
            dialogOpen: false,
            dialogTypeId: null,
            dialogTypeName: "",
            dialogFile: null,
            dialogIssuedDate: "",
        });
    };

    saveFinding = (): void => {
        const { dialogTypeId, dialogFile, dialogIssuedDate } = this.state;
        const { clientCompanyId } = this.props;
        if (dialogTypeId == null || dialogFile == null) return;
        if (!dialogIssuedDate.trim()) {
            enqueueSnackbar("Datum izdavanja je obavezan.", {
                variant: "error",
            });
            return;
        }
        const d = StringToDate(dialogIssuedDate);
        if (!d) {
            enqueueSnackbar("Neispravan datum izdavanja.", {
                variant: "error",
            });
            return;
        }
        const issuedIso = displayDateToIso(dialogIssuedDate);
        if (!issuedIso) return;
        this.setState({ saving: true });
        uploadCompanyComplianceFinding(
            clientCompanyId,
            dialogTypeId,
            dialogFile,
            issuedIso,
        )
            .then(() => {
                this.setState({ saving: false });
                this.closeDialog();
                this.loadRows();
                enqueueSnackbar("Stručni nalaz je sačuvan.", {
                    variant: "success",
                });
            })
            .catch((err) => {
                this.setState({ saving: false });
                enqueueSnackbar(uploadErrorMessage(err), {
                    variant: "error",
                });
            });
    };

    deleteFinding = (row: CompanyComplianceFindingRow): void => {
        if (
            !window.confirm(
                "Da li si siguran da želiš da obrišeš stručni nalaz?",
            )
        ) {
            return;
        }
        const { clientCompanyId } = this.props;
        deleteCompanyComplianceFinding(clientCompanyId, row.finding_type)
            .then(() => {
                this.loadRows();
                enqueueSnackbar("Stručni nalaz je obrisan.", {
                    variant: "success",
                });
            })
            .catch((err) => {
                enqueueSnackbar(uploadErrorMessage(err), {
                    variant: "error",
                });
            });
    };

    openPreview = (row: CompanyComplianceFindingRow): void => {
        if (!row.file) return;
        this.setState({
            previewOpen: true,
            previewUrl: row.file,
            previewLabel: row.finding_type_name,
        });
    };

    closePreview = (): void => {
        this.setState({
            previewOpen: false,
            previewUrl: null,
            previewLabel: "",
        });
    };

    render() {
        const {
            rows,
            loading,
            error,
            dialogOpen,
            dialogTypeName,
            dialogFile,
            dialogIssuedDate,
            saving,
            previewOpen,
            previewUrl,
            previewLabel,
        } = this.state;

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
                    <Button variant="outlined" onClick={this.loadRows}>
                        Pokušaj ponovo
                    </Button>
                </Paper>
            );
        }

        const canSave =
            dialogFile != null && dialogIssuedDate.trim().length > 0 && !saving;

        return (
            <Paper sx={{ p: 3 }}>
                <Typography variant="subtitle1" fontWeight={600} gutterBottom>
                    Stručni nalazi
                </Typography>
                <Box sx={{ overflow: "auto" }}>
                    <Table size="small">
                        <TableHead>
                            <TableRow>
                                <TableCell>Tip nalaza</TableCell>
                                <TableCell>Fajl</TableCell>
                                <TableCell>Važi do</TableCell>
                                <TableCell>Status</TableCell>
                                <TableCell align="right">Akcije</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {rows.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={5} align="center">
                                        Nema definisanih tipova stručnih nalaza.
                                    </TableCell>
                                </TableRow>
                            ) : (
                                rows.map((row) => {
                                    const badge = STATUS_BADGE[row.status];
                                    const hasFile = row.file != null;
                                    return (
                                        <TableRow key={row.finding_type}>
                                            <TableCell>
                                                {row.finding_type_name}
                                            </TableCell>
                                            <TableCell>
                                                {hasFile
                                                    ? row.file_name || "—"
                                                    : "—"}
                                            </TableCell>
                                            <TableCell>
                                                {row.valid_until
                                                    ? formatDateDisplay(
                                                          row.valid_until,
                                                      )
                                                    : "—"}
                                            </TableCell>
                                            <TableCell>
                                                <Chip
                                                    size="small"
                                                    label={badge.label}
                                                    color={badge.color}
                                                />
                                            </TableCell>
                                            <TableCell align="right">
                                                {hasFile && (
                                                    <Button
                                                        size="small"
                                                        onClick={() =>
                                                            this.openPreview(
                                                                row,
                                                            )
                                                        }
                                                    >
                                                        Pregled
                                                    </Button>
                                                )}
                                                <PermissionGate permission="partners.change_clientcompany">
                                                    {hasFile ? (
                                                        <>
                                                            <Button
                                                                size="small"
                                                                onClick={() =>
                                                                    this.openDialog(
                                                                        row,
                                                                    )
                                                                }
                                                            >
                                                                Promeni fajl
                                                            </Button>
                                                            <Button
                                                                size="small"
                                                                color="error"
                                                                onClick={() =>
                                                                    this.deleteFinding(
                                                                        row,
                                                                    )
                                                                }
                                                            >
                                                                Obriši
                                                            </Button>
                                                        </>
                                                    ) : (
                                                        <Button
                                                            size="small"
                                                            variant="contained"
                                                            onClick={() =>
                                                                this.openDialog(
                                                                    row,
                                                                )
                                                            }
                                                        >
                                                            Priloži fajl
                                                        </Button>
                                                    )}
                                                </PermissionGate>
                                            </TableCell>
                                        </TableRow>
                                    );
                                })
                            )}
                        </TableBody>
                    </Table>
                </Box>

                <Dialog
                    open={dialogOpen}
                    onClose={this.closeDialog}
                    maxWidth="sm"
                    fullWidth
                >
                    <DialogTitle>
                        Priloži stručni nalaz — {dialogTypeName}
                    </DialogTitle>
                    <DialogContent>
                        <Button
                            component="label"
                            variant="outlined"
                            fullWidth
                            sx={{ mt: 1 }}
                        >
                            {dialogFile ? dialogFile.name : "Izaberi fajl..."}
                            <input
                                type="file"
                                hidden
                                accept=".pdf,application/pdf"
                                onChange={(e) =>
                                    this.setState({
                                        dialogFile: e.target.files?.[0] ?? null,
                                    })
                                }
                            />
                        </Button>
                        <Box sx={{ mt: 2 }}>
                            <DateTextFieldWithPicker
                                label="Datum izdavanja (dd.mm.yyyy)"
                                value={dialogIssuedDate}
                                allowPast
                                onChange={(v) =>
                                    this.setState({ dialogIssuedDate: v })
                                }
                            />
                        </Box>
                        <Typography
                            variant="caption"
                            color="text.secondary"
                            sx={{ mt: 1, display: "block" }}
                        >
                            Iz datuma izdavanja se računa rok važenja (36
                            meseci) i alarm 30 dana pre isteka.
                        </Typography>
                    </DialogContent>
                    <DialogActions>
                        <Button onClick={this.closeDialog} disabled={saving}>
                            Odustani
                        </Button>
                        <Button
                            variant="contained"
                            disabled={!canSave}
                            onClick={this.saveFinding}
                        >
                            {saving ? "Čuvam..." : "Sačuvaj"}
                        </Button>
                    </DialogActions>
                </Dialog>

                {previewUrl && (
                    <Dialog
                        open={previewOpen}
                        onClose={this.closePreview}
                        maxWidth="lg"
                        fullWidth
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
            </Paper>
        );
    }
}
