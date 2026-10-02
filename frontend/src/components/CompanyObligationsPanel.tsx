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
import { enqueueSnackbar } from "notistack";

import {
    getCompanyObligations,
    uploadCompanyObligationProof,
} from "../api/processes";
import DateTextFieldWithPicker from "./DateTextFieldWithPicker";
import { FilePreviewContent } from "./FilePreviewContent";
import { PermissionGate } from "./PermissionGate";
import { apiErrorMessage } from "../utils/apiError";
import { displayDateToIso, formatDateDisplay } from "../utils/date";
import { planStatusMeta } from "../utils/status";

import type { CompanyObligationRow } from "../types/processes";
import { setupTestFill } from "../testFlow/registerTestFill";
import { TEST_FLOW } from "../testFlow/fixture";

const TEST_DATE_BY_NAME: Record<string, string> = {
    "oprema za rad": TEST_FLOW.complianceFindingDates.equipment,
    "električne instalacije": TEST_FLOW.complianceFindingDates.electrical,
    "letnji period": TEST_FLOW.complianceFindingDates.environmentSummer,
    "zimski period": TEST_FLOW.complianceFindingDates.environmentWinter,
};

interface Props {
    clientCompanyId: number;
}

interface State {
    rows: CompanyObligationRow[];
    loading: boolean;
    error: string | null;
    dialogRow: CompanyObligationRow | null;
    dialogFile: File | null;
    dialogPerformedAt: string;
    dialogValidUntil: string;
    saving: boolean;
    previewUrl: string | null;
    previewLabel: string;
}

export class CompanyObligationsPanel extends Component<Props, State> {
    private testFillCleanup: (() => void) | null = null;

    state: State = {
        rows: [],
        loading: true,
        error: null,
        dialogRow: null,
        dialogFile: null,
        dialogPerformedAt: "",
        dialogValidUntil: "",
        saving: false,
        previewUrl: null,
        previewLabel: "",
    };

    componentDidMount(): void {
        this.loadRows();
        this.testFillCleanup = setupTestFill(
            "L_DATE",
            () => {
                const { dialogRow } = this.state;
                if (!dialogRow) return false;
                const name = dialogRow.process_type_name.toLowerCase();
                const key = Object.keys(TEST_DATE_BY_NAME).find((k) =>
                    name.includes(k),
                );
                if (!key) return false;
                this.setState({ dialogPerformedAt: TEST_DATE_BY_NAME[key] });
                return true;
            },
            () => this.state.dialogRow != null,
        );
    }

    componentWillUnmount(): void {
        this.testFillCleanup?.();
    }

    componentDidUpdate(prevProps: Props): void {
        if (prevProps.clientCompanyId !== this.props.clientCompanyId) {
            this.loadRows();
        }
    }

    loadRows = (): void => {
        this.setState({ loading: true, error: null });
        getCompanyObligations(this.props.clientCompanyId)
            .then((rows) => this.setState({ rows, loading: false }))
            .catch((err: unknown) =>
                this.setState({
                    loading: false,
                    error: apiErrorMessage(
                        err,
                        "Greška pri učitavanju pregleda i nalaza.",
                    ),
                }),
            );
    };

    openDialog = (row: CompanyObligationRow): void => {
        this.setState({
            dialogRow: row,
            dialogFile: null,
            dialogPerformedAt: "",
            dialogValidUntil: "",
        });
    };

    closeDialog = (): void => {
        this.setState({ dialogRow: null, dialogFile: null });
    };

    save = (): void => {
        const { dialogRow, dialogFile, dialogPerformedAt, dialogValidUntil } =
            this.state;
        if (!dialogRow || !dialogFile) return;
        const performedIso = displayDateToIso(dialogPerformedAt);
        if (!performedIso) {
            enqueueSnackbar("Neispravan datum izdavanja.", {
                variant: "error",
            });
            return;
        }
        const validIso = dialogValidUntil.trim()
            ? displayDateToIso(dialogValidUntil)
            : null;
        if (dialogValidUntil.trim() && !validIso) {
            enqueueSnackbar("Neispravan datum važenja.", { variant: "error" });
            return;
        }
        this.setState({ saving: true });
        uploadCompanyObligationProof(
            this.props.clientCompanyId,
            dialogRow.process_type,
            dialogFile,
            performedIso,
            validIso ?? null,
        )
            .then(() => {
                this.setState({ saving: false });
                this.closeDialog();
                this.loadRows();
                enqueueSnackbar("Dokaz je sačuvan.", { variant: "success" });
            })
            .catch((err: unknown) => {
                this.setState({ saving: false });
                enqueueSnackbar(
                    apiErrorMessage(err, "Greška pri čuvanju dokaza."),
                    { variant: "error" },
                );
            });
    };

    render() {
        const {
            rows,
            loading,
            error,
            dialogRow,
            dialogFile,
            dialogPerformedAt,
            dialogValidUntil,
            saving,
            previewUrl,
            previewLabel,
        } = this.state;

        if (loading) {
            return (
                <Paper sx={{ p: 3 }}>
                    <Box
                        sx={{ display: "flex", justifyContent: "center", py: 3 }}
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
            dialogFile != null && dialogPerformedAt.trim().length > 0 && !saving;

        return (
            <Paper sx={{ p: 3 }}>
                <Typography variant="subtitle1" fontWeight={600} gutterBottom>
                    Pregledi i stručni nalazi
                </Typography>
                <Box sx={{ overflow: "auto" }}>
                    <Table size="small">
                        <TableHead>
                            <TableRow>
                                <TableCell>Obaveza</TableCell>
                                <TableCell>Poslednji dokaz</TableCell>
                                <TableCell>Važi do</TableCell>
                                <TableCell>Status</TableCell>
                                <TableCell align="right">Akcije</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {rows.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={5} align="center">
                                        Firma nema obaveza ove vrste.
                                    </TableCell>
                                </TableRow>
                            ) : (
                                rows.map((row) => {
                                    const badge = planStatusMeta(row.status);
                                    return (
                                        <TableRow key={row.process_type}>
                                            <TableCell>
                                                {row.process_type_name}
                                            </TableCell>
                                            <TableCell>
                                                {row.performed_at
                                                    ? formatDateDisplay(
                                                          row.performed_at,
                                                      )
                                                    : "Nema"}
                                            </TableCell>
                                            <TableCell>
                                                {row.valid_until
                                                    ? formatDateDisplay(
                                                          row.valid_until,
                                                      )
                                                    : "Nema"}
                                            </TableCell>
                                            <TableCell>
                                                <Chip
                                                    size="small"
                                                    label={badge.label}
                                                    color={badge.color}
                                                />
                                            </TableCell>
                                            <TableCell align="right">
                                                {row.document_url ? (
                                                    <Button
                                                        size="small"
                                                        onClick={() =>
                                                            this.setState({
                                                                previewUrl:
                                                                    row.document_url,
                                                                previewLabel:
                                                                    row.process_type_name,
                                                            })
                                                        }
                                                    >
                                                        Pregled
                                                    </Button>
                                                ) : null}
                                                <PermissionGate permission="partners.change_clientcompany">
                                                    <Button
                                                        size="small"
                                                        variant={
                                                            row.document_url
                                                                ? "text"
                                                                : "contained"
                                                        }
                                                        onClick={() =>
                                                            this.openDialog(row)
                                                        }
                                                    >
                                                        {row.document_url
                                                            ? "Novi nalaz"
                                                            : "Priloži nalaz"}
                                                    </Button>
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
                    open={dialogRow != null}
                    onClose={this.closeDialog}
                    maxWidth="sm"
                    fullWidth
                >
                    <DialogTitle>{dialogRow?.process_type_name}</DialogTitle>
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
                                accept=".pdf,application/pdf,image/*"
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
                                value={dialogPerformedAt}
                                allowPast
                                onChange={(v) =>
                                    this.setState({ dialogPerformedAt: v })
                                }
                            />
                        </Box>
                        <Box sx={{ mt: 2 }}>
                            <DateTextFieldWithPicker
                                label="Važi do (dd.mm.yyyy)"
                                value={dialogValidUntil}
                                allowPast
                                onChange={(v) =>
                                    this.setState({ dialogValidUntil: v })
                                }
                            />
                        </Box>
                        {dialogRow?.period_months ? (
                            <Typography
                                variant="caption"
                                color="text.secondary"
                                sx={{ mt: 1, display: "block" }}
                            >
                                Ako ostane prazno, važi{" "}
                                {dialogRow.period_months} meseci od datuma
                                izdavanja.
                            </Typography>
                        ) : null}
                    </DialogContent>
                    <DialogActions>
                        <Button onClick={this.closeDialog} disabled={saving}>
                            Odustani
                        </Button>
                        <Button
                            variant="contained"
                            disabled={!canSave}
                            onClick={this.save}
                        >
                            {saving ? "Čuvam..." : "Sačuvaj"}
                        </Button>
                    </DialogActions>
                </Dialog>

                {previewUrl ? (
                    <Dialog
                        open
                        onClose={() => this.setState({ previewUrl: null })}
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
                            <Button
                                onClick={() =>
                                    this.setState({ previewUrl: null })
                                }
                            >
                                Zatvori
                            </Button>
                        </DialogActions>
                    </Dialog>
                ) : null}
            </Paper>
        );
    }
}
