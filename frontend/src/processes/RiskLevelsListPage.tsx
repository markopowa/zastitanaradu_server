import { Component } from "react";
import { connect } from "react-redux";

import {
    Box,
    Button,
    CircularProgress,
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
    FormControlLabel,
    Paper,
    Switch,
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableRow,
    TextField,
    Typography,
} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import DeleteIcon from "@mui/icons-material/Delete";
import EditIcon from "@mui/icons-material/Edit";
import ReportProblemIcon from "@mui/icons-material/ReportProblem";
import { enqueueSnackbar } from "notistack";

import {
    createRiskLevel,
    deleteRiskLevel,
    getRiskLevels,
    updateRiskLevel,
} from "../api/processes";
import { PermissionGate } from "../components/PermissionGate";
import RowActionsMenu from "../components/RowActionsMenu";
import { withNavigation } from "../hocs/withNavigation";
import { ConfirmDialog, ErrorState, TableStateRow } from "../design";
import { setLastPath } from "../store/locationSlice";

import type { AppDispatch } from "../store";
import type { RiskLevelsListPageState } from "../types/processPages";
import type { RiskLevel } from "../types/processes";
import { setupTestFill } from "../testFlow/registerTestFill";
import { TEST_FLOW } from "../testFlow/fixture";

interface RiskLevelsListPageDispatchProps {
    setLastPath: (path: string) => void;
}

type RiskLevelsListPageProps = RiskLevelsListPageDispatchProps;

function riskLevelSaveError(
    err:
        | { message?: string }
        | { response?: { data?: { detail?: string; code?: string[] } } },
): string {
    const data = (err as { response?: { data?: Record<string, unknown> } })
        .response?.data;
    if (data != null) {
        const codeErr = data.code;
        if (Array.isArray(codeErr) && codeErr.length > 0) {
            return "Šifra već postoji.";
        }
        const detail = data.detail;
        if (typeof detail === "string") {
            const lower = detail.toLowerCase();
            if (lower.includes("unique") || lower.includes("code")) {
                return "Šifra već postoji.";
            }
            return detail;
        }
    }
    return (
        (err as { message?: string }).message ??
        "Greška pri čuvanju nivoa rizika."
    );
}

class RiskLevelsListPage extends Component<
    RiskLevelsListPageProps,
    RiskLevelsListPageState
> {
    private testFillCleanup: (() => void) | null = null;

    state: RiskLevelsListPageState = {
        items: [],
        loading: true,
        error: null,
        dialogOpen: false,
        editingId: null,
        f_code: "",
        f_label: "",
        f_score: "",
        f_is_acceptable: true,
        f_is_high_risk: false,
        f_order: "0",
        saving: false,
        formError: null,
        deleteTarget: null,
        deleting: false,
    };

    componentDidMount(): void {
        this.props.setLastPath("/risk-levels");
        this.load();
        const rl = TEST_FLOW.riskLevelTest;
        this.testFillCleanup = setupTestFill("M", () => {
            this.setState({
                dialogOpen: true,
                editingId: null,
                f_code: rl.code,
                f_label: rl.label,
                f_score: rl.score,
                f_is_acceptable: true,
                f_is_high_risk: false,
                f_order: "0",
                formError: null,
            });
            return true;
        });
    }

    componentWillUnmount(): void {
        this.testFillCleanup?.();
    }

    load = (): void => {
        this.setState({ loading: true, error: null });
        getRiskLevels()
            .then((items) =>
                this.setState({ items, loading: false, error: null }),
            )
            .catch(() =>
                this.setState({
                    loading: false,
                    error: "Greška pri učitavanju.",
                }),
            );
    };

    openCreate = (): void => {
        this.setState({
            dialogOpen: true,
            editingId: null,
            f_code: "",
            f_label: "",
            f_score: "",
            f_is_acceptable: true,
            f_is_high_risk: false,
            f_order: "0",
            formError: null,
        });
    };

    openEdit = (item: RiskLevel): void => {
        this.setState({
            dialogOpen: true,
            editingId: item.id,
            f_code: item.code,
            f_label: item.label,
            f_score: String(item.score),
            f_is_acceptable: item.is_acceptable,
            f_is_high_risk: item.is_high_risk,
            f_order: String(item.order),
            formError: null,
        });
    };

    closeDialog = (): void => {
        this.setState({ dialogOpen: false, saving: false });
    };

    save = (): void => {
        const {
            editingId,
            f_code,
            f_label,
            f_score,
            f_is_acceptable,
            f_is_high_risk,
            f_order,
        } = this.state;
        if (!f_code.trim() || !f_label.trim() || !f_score.trim()) return;
        const scoreNum = Number(f_score);
        if (!Number.isFinite(scoreNum) || scoreNum < 0) return;
        const payload: Partial<RiskLevel> = {
            code: f_code.trim(),
            label: f_label.trim(),
            score: scoreNum,
            is_acceptable: f_is_acceptable,
            is_high_risk: f_is_high_risk,
            order: Number(f_order) || 0,
        };
        this.setState({ saving: true, formError: null });
        const request =
            editingId != null
                ? updateRiskLevel(editingId, payload)
                : createRiskLevel(payload);
        request
            .then((saved) => {
                this.setState((prev) => ({
                    items:
                        editingId != null
                            ? prev.items.map((x) =>
                                  x.id === saved.id ? saved : x,
                              )
                            : [...prev.items, saved].sort(
                                  (a, b) =>
                                      a.order - b.order || a.score - b.score,
                              ),
                    saving: false,
                    dialogOpen: false,
                }));
                enqueueSnackbar(
                    editingId != null
                        ? "Nivo rizika sačuvan."
                        : "Nivo rizika dodat.",
                    { variant: "success" },
                );
            })
            .catch((err) => {
                const msg = riskLevelSaveError(err);
                enqueueSnackbar(msg, { variant: "error" });
                this.setState({ saving: false, formError: msg });
            });
    };

    openDelete = (item: RiskLevel): void => {
        this.setState({ deleteTarget: item });
    };

    closeDelete = (): void => {
        this.setState({ deleteTarget: null, deleting: false });
    };

    confirmDelete = (): void => {
        const { deleteTarget } = this.state;
        if (deleteTarget == null) return;
        this.setState({ deleting: true });
        deleteRiskLevel(deleteTarget.id)
            .then(() => {
                this.setState((prev) => ({
                    items: prev.items.filter((x) => x.id !== deleteTarget.id),
                    deleteTarget: null,
                    deleting: false,
                }));
                enqueueSnackbar("Nivo rizika obrisan.", {
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
                        "Greška pri brisanju nivoa rizika.";
                    enqueueSnackbar(msg, { variant: "error" });
                    this.setState({ deleting: false });
                },
            );
    };

    render() {
        const {
            items,
            loading,
            error,
            dialogOpen,
            editingId,
            f_code,
            f_label,
            f_score,
            f_is_acceptable,
            f_is_high_risk,
            f_order,
            saving,
            formError,
            deleteTarget,
            deleting,
        } = this.state;

        return (
            <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
                <Typography
                    variant="h6"
                    sx={{ display: "flex", alignItems: "center", gap: 1 }}
                >
                    <ReportProblemIcon /> Nivoi rizika
                </Typography>

                <Box sx={{ display: "flex", justifyContent: "flex-end" }}>
                    <PermissionGate permission="partners.add_risklevel">
                        <Button
                            variant="contained"
                            startIcon={<AddIcon />}
                            onClick={this.openCreate}
                        >
                            Dodaj nivo
                        </Button>
                    </PermissionGate>
                </Box>

                {error && <ErrorState message={error} onRetry={this.load} />}

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
                                    <TableCell>Šifra</TableCell>
                                    <TableCell>Naziv</TableCell>
                                    <TableCell>Skor</TableCell>
                                    <TableCell>Prihvatljiv</TableCell>
                                    <TableCell>Povećan rizik</TableCell>
                                    <TableCell>Redosled</TableCell>
                                    <TableCell align="right">Akcije</TableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {items.length === 0 ? (
                                    <TableStateRow
                                        colSpan={7}
                                        state="empty"
                                        emptyMessage="Nema nivoa rizika."
                                    />
                                ) : (
                                    items.map((rl) => (
                                        <TableRow key={rl.id}>
                                            <TableCell>{rl.code}</TableCell>
                                            <TableCell>{rl.label}</TableCell>
                                            <TableCell>{rl.score}</TableCell>
                                            <TableCell>
                                                {rl.is_acceptable ? "Da" : "Ne"}
                                            </TableCell>
                                            <TableCell>
                                                {rl.is_high_risk ? "Da" : "Ne"}
                                            </TableCell>
                                            <TableCell>{rl.order}</TableCell>
                                            <TableCell align="right">
                                                <RowActionsMenu
                                                    actions={[
                                                        {
                                                            label: "Izmeni",
                                                            icon: (
                                                                <EditIcon fontSize="small" />
                                                            ),
                                                            permission:
                                                                "partners.change_risklevel",
                                                            onClick: () =>
                                                                this.openEdit(
                                                                    rl,
                                                                ),
                                                        },
                                                        {
                                                            label: "Obriši",
                                                            icon: (
                                                                <DeleteIcon fontSize="small" />
                                                            ),
                                                            permission:
                                                                "partners.delete_risklevel",
                                                            color: "error",
                                                            onClick: () =>
                                                                this.openDelete(
                                                                    rl,
                                                                ),
                                                        },
                                                    ]}
                                                />
                                            </TableCell>
                                        </TableRow>
                                    ))
                                )}
                            </TableBody>
                        </Table>
                    </Paper>
                )}

                <Dialog
                    open={dialogOpen}
                    onClose={this.closeDialog}
                    maxWidth="sm"
                    fullWidth
                >
                    <DialogTitle>
                        {editingId != null
                            ? "Izmena nivoa rizika"
                            : "Novi nivo rizika"}
                    </DialogTitle>
                    <DialogContent>
                        {formError && (
                            <Typography color="error" sx={{ mb: 1 }}>
                                {formError}
                            </Typography>
                        )}
                        <TextField
                            margin="dense"
                            label="Šifra"
                            fullWidth
                            required
                            value={f_code}
                            onChange={(e) =>
                                this.setState({ f_code: e.target.value })
                            }
                        />
                        <TextField
                            margin="dense"
                            label="Naziv"
                            fullWidth
                            required
                            value={f_label}
                            onChange={(e) =>
                                this.setState({ f_label: e.target.value })
                            }
                        />
                        <TextField
                            margin="dense"
                            label="Skor"
                            fullWidth
                            required
                            type="number"
                            inputProps={{ min: 0 }}
                            value={f_score}
                            onChange={(e) =>
                                this.setState({ f_score: e.target.value })
                            }
                        />
                        <FormControlLabel
                            control={
                                <Switch
                                    checked={f_is_acceptable}
                                    onChange={(e) =>
                                        this.setState({
                                            f_is_acceptable: e.target.checked,
                                        })
                                    }
                                />
                            }
                            label="Prihvatljiv"
                        />
                        <FormControlLabel
                            control={
                                <Switch
                                    checked={f_is_high_risk}
                                    onChange={(e) =>
                                        this.setState({
                                            f_is_high_risk: e.target.checked,
                                        })
                                    }
                                />
                            }
                            label="Povećan rizik"
                        />
                        <TextField
                            margin="dense"
                            label="Redosled"
                            fullWidth
                            type="number"
                            value={f_order}
                            onChange={(e) =>
                                this.setState({ f_order: e.target.value })
                            }
                        />
                    </DialogContent>
                    <DialogActions>
                        <Button onClick={this.closeDialog} disabled={saving}>
                            Odustani
                        </Button>
                        <Button
                            variant="contained"
                            disabled={
                                saving ||
                                !f_code.trim() ||
                                !f_label.trim() ||
                                !f_score.trim()
                            }
                            onClick={this.save}
                        >
                            {saving ? "Čuvam..." : "Sačuvaj"}
                        </Button>
                    </DialogActions>
                </Dialog>

                <ConfirmDialog
                    open={deleteTarget != null}
                    title="Obriši nivo rizika"
                    message={
                        deleteTarget != null ? (
                            <>
                                Da li si siguran da želiš da obrišeš nivo rizika
                                „{deleteTarget.label}"?
                            </>
                        ) : (
                            ""
                        )
                    }
                    loading={deleting}
                    onConfirm={this.confirmDelete}
                    onClose={this.closeDelete}
                />
            </Box>
        );
    }
}

const mapDispatchToProps = (
    dispatch: AppDispatch,
): RiskLevelsListPageDispatchProps => ({
    setLastPath: (path: string) => dispatch(setLastPath(path)),
});

const Connected = connect(null, mapDispatchToProps)(RiskLevelsListPage);
export default withNavigation(Connected);
