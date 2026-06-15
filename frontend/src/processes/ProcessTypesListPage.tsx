import { Component } from "react";
import { connect } from "react-redux";

import {
    Box,
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
    TextField,
    FormControl,
    FormControlLabel,
    InputLabel,
    Select,
    MenuItem,
    Switch,
    CircularProgress,
    Alert,
    Tooltip,
} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";
import { enqueueSnackbar } from "notistack";

import RowActionsMenu from "../components/RowActionsMenu";
import { ConfirmDialog, subjectKindLabel } from "../design";
import {
    ScrollableTablePaper,
    tableCellEllipsis,
} from "../components/ScrollableTablePaper";
import {
    addProcessType,
    ensureProcessTypes,
    removeProcessType,
    saveProcessType,
} from "../store/processesSlice";
import { setLastPath } from "../store/locationSlice";

import type { AppDispatch, RootState } from "../store";
import type { ProcessType } from "../types/processes";
import type {
    ProcessTypesListPageDispatchProps,
    ProcessTypesListPageProps,
    ProcessTypesListPageState,
    ProcessTypesListPageStateProps,
} from "../types/processPages";
import { setupTestFill } from "../testFlow/registerTestFill";
import { TEST_FLOW } from "../testFlow/fixture";

const SUBJECT_OPTIONS = ["EMPLOYEE", "EQUIPMENT", "CLIENT_COMPANY"] as const;

class ProcessTypesListPageInner extends Component<
    ProcessTypesListPageProps,
    ProcessTypesListPageState
> {
    private testFillCleanup: (() => void) | null = null;

    state: ProcessTypesListPageState = {
        dialogOpen: false,
        editingId: null,
        deleteConfirmId: null,
        name: "",
        description: "",
        subject_kind: "EMPLOYEE",
        default_period_months: "",
        lead_time_days: "0",
        is_active: true,
        include_in_medical_exam_record: true,
    };

    componentDidMount(): void {
        this.props.setLastPath?.("/processes/types");
        this.props.ensureProcessTypes?.();
        this.testFillCleanup = setupTestFill(
            "H",
            () => {
                const pt = TEST_FLOW.processType;
                this.setState({
                    dialogOpen: true,
                    editingId: null,
                    name: pt.name,
                    description: "",
                    subject_kind: pt.subject_kind,
                    default_period_months: pt.default_period_months,
                    lead_time_days: pt.lead_time_days,
                    is_active: pt.is_active,
                    include_in_medical_exam_record:
                        pt.include_in_medical_exam_record,
                });
                return true;
            },
            () => true,
        );
    }

    componentWillUnmount(): void {
        this.testFillCleanup?.();
    }

    openCreate = (): void => {
        this.setState((prev) => ({
            ...prev,
            dialogOpen: true,
            editingId: null,
            name: "",
            description: "",
            subject_kind: "EMPLOYEE",
            default_period_months: "",
            lead_time_days: "0",
            is_active: true,
            include_in_medical_exam_record: true,
        }));
    };

    openEdit = (row: ProcessType): void => {
        this.setState((prev) => ({
            ...prev,
            dialogOpen: true,
            editingId: row.id,
            name: row.name,
            description: row.description ?? "",
            subject_kind: row.subject_kind,
            default_period_months:
                row.default_period_months != null
                    ? String(row.default_period_months)
                    : "",
            lead_time_days: String(row.lead_time_days ?? 0),
            is_active: row.is_active ?? true,
            include_in_medical_exam_record:
                row.include_in_medical_exam_record ?? true,
        }));
    };

    closeDialog = (): void => {
        this.setState((prev) => ({
            ...prev,
            dialogOpen: false,
            editingId: null,
        }));
    };

    confirmDelete = (id: number): void => {
        this.setState((prev) => ({ ...prev, deleteConfirmId: id }));
    };

    cancelDelete = (): void => {
        this.setState((prev) => ({ ...prev, deleteConfirmId: null }));
    };

    doDelete = (): void => {
        const { deleteConfirmId } = this.state;
        if (deleteConfirmId == null) return;
        void this.props
            .removeProcessType(deleteConfirmId)
            .unwrap()
            .then(() => {
                this.setState((prev) => ({ ...prev, deleteConfirmId: null }));
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
                        "Greška pri brisanju vrste obaveze.";
                    enqueueSnackbar(msg, { variant: "error" });
                    this.setState((prev) => ({
                        ...prev,
                        deleteConfirmId: null,
                    }));
                },
            );
    };

    handleSave = (): void => {
        const {
            editingId,
            name,
            description,
            subject_kind,
            default_period_months,
            lead_time_days,
            is_active,
            include_in_medical_exam_record,
        } = this.state;
        if (!name.trim()) return;
        const payload = {
            name: name.trim(),
            description: description.trim() || undefined,
            subject_kind,
            default_period_months: default_period_months
                ? Number(default_period_months)
                : null,
            lead_time_days: Number(lead_time_days) || 0,
            is_active,
            include_in_medical_exam_record,
        };
        const op =
            editingId != null
                ? this.props.saveProcessType({ id: editingId, payload })
                : this.props.addProcessType(payload);
        void op
            .unwrap()
            .then(() => this.closeDialog())
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
                        "Greška pri čuvanju vrste obaveze.";
                    enqueueSnackbar(msg, { variant: "error" });
                },
            );
    };

    render() {
        const {
            processTypes: items,
            typesLoading: loading,
            typesError: error,
        } = this.props;
        const {
            dialogOpen,
            editingId,
            deleteConfirmId,
            name,
            description,
            subject_kind,
            default_period_months,
            lead_time_days,
            is_active,
            include_in_medical_exam_record,
        } = this.state;

        return (
            <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
                <Typography variant="h6">Vrste obaveza</Typography>
                <Box sx={{ display: "flex", justifyContent: "flex-end" }}>
                    <Button
                        variant="contained"
                        startIcon={<AddIcon />}
                        onClick={this.openCreate}
                    >
                        Dodaj vrstu obaveze
                    </Button>
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
                    <ScrollableTablePaper>
                        <Table
                            size="small"
                            sx={{ width: "100%", tableLayout: "fixed" }}
                        >
                            <TableHead>
                                <TableRow>
                                    <TableCell
                                        sx={{ ...tableCellEllipsis, width: "18%" }}
                                    >
                                        Šifra
                                    </TableCell>
                                    <TableCell
                                        sx={{ ...tableCellEllipsis, width: "26%" }}
                                    >
                                        Naziv
                                    </TableCell>
                                    <TableCell
                                        sx={{ ...tableCellEllipsis, width: "11%" }}
                                    >
                                        Subjekt
                                    </TableCell>
                                    <TableCell
                                        sx={{ ...tableCellEllipsis, width: "11%" }}
                                    >
                                        Period (meseci)
                                    </TableCell>
                                    <TableCell
                                        sx={{ ...tableCellEllipsis, width: "13%" }}
                                    >
                                        Rok unapred (dana)
                                    </TableCell>
                                    <TableCell
                                        sx={{ ...tableCellEllipsis, width: "8%" }}
                                    >
                                        Aktivan
                                    </TableCell>
                                    <TableCell
                                        sx={{ ...tableCellEllipsis, width: "9%" }}
                                    >
                                        Obrazac 1
                                    </TableCell>
                                    <TableCell align="right" sx={{ width: 56 }} />
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {items.map((row) => (
                                    <TableRow key={row.id}>
                                        <TableCell sx={tableCellEllipsis}>
                                            {row.code}
                                        </TableCell>
                                        <TableCell sx={tableCellEllipsis}>
                                            {row.name}
                                        </TableCell>
                                        <TableCell sx={tableCellEllipsis}>
                                            {subjectKindLabel(row.subject_kind)}
                                        </TableCell>
                                        <TableCell>
                                            {row.default_period_months ?? "—"}
                                        </TableCell>
                                        <TableCell>
                                            {row.lead_time_days}
                                        </TableCell>
                                        <TableCell>
                                            {row.is_active ? "Da" : "Ne"}
                                        </TableCell>
                                        <TableCell>
                                            {row.include_in_medical_exam_record !==
                                            false
                                                ? "Da"
                                                : "Ne"}
                                        </TableCell>
                                        <TableCell align="right">
                                            <RowActionsMenu
                                                actions={[
                                                    {
                                                        label: "Izmeni",
                                                        icon: (
                                                            <EditIcon fontSize="small" />
                                                        ),
                                                        permission:
                                                            "processes.change_processtype",
                                                        onClick: () =>
                                                            this.openEdit(row),
                                                    },
                                                    {
                                                        label: "Obriši",
                                                        icon: (
                                                            <DeleteIcon fontSize="small" />
                                                        ),
                                                        permission:
                                                            "processes.delete_processtype",
                                                        color: "error",
                                                        onClick: () =>
                                                            this.confirmDelete(
                                                                row.id,
                                                            ),
                                                    },
                                                ]}
                                            />
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </ScrollableTablePaper>
                )}

                <Dialog
                    open={dialogOpen}
                    onClose={this.closeDialog}
                    maxWidth="sm"
                    fullWidth
                >
                    <DialogTitle>
                        {editingId != null
                            ? "Izmena vrste obaveze"
                            : "Nova vrsta obaveze"}
                    </DialogTitle>
                    <DialogContent>
                        <TextField
                            margin="dense"
                            label="Naziv"
                            fullWidth
                            value={name}
                            onChange={(e) =>
                                this.setState((prev) => ({
                                    ...prev,
                                    name: e.target.value,
                                }))
                            }
                        />
                        <TextField
                            margin="dense"
                            label="Opis"
                            fullWidth
                            multiline
                            value={description}
                            onChange={(e) =>
                                this.setState((prev) => ({
                                    ...prev,
                                    description: e.target.value,
                                }))
                            }
                        />
                        <FormControl fullWidth margin="dense">
                            <InputLabel>Subjekt</InputLabel>
                            <Select
                                value={subject_kind}
                                label="Subjekt"
                                onChange={(e) =>
                                    this.setState((prev) => ({
                                        ...prev,
                                        subject_kind: e.target
                                            .value as ProcessType["subject_kind"],
                                    }))
                                }
                            >
                                {SUBJECT_OPTIONS.map((o) => (
                                    <MenuItem key={o} value={o}>
                                        {subjectKindLabel(o)}
                                    </MenuItem>
                                ))}
                            </Select>
                        </FormControl>
                        <Tooltip title="Period između obaveza (meseci).">
                            <TextField
                                margin="dense"
                                label="Period (meseci)"
                                type="number"
                                fullWidth
                                value={default_period_months}
                                onChange={(e) =>
                                    this.setState((prev) => ({
                                        ...prev,
                                        default_period_months: e.target.value,
                                    }))
                                }
                            />
                        </Tooltip>
                        <Tooltip title="Dana pre termina za podsetnik.">
                            <TextField
                                margin="dense"
                                label="Rok unapred (dana)"
                                type="number"
                                fullWidth
                                value={lead_time_days}
                                onChange={(e) =>
                                    this.setState((prev) => ({
                                        ...prev,
                                        lead_time_days: e.target.value,
                                    }))
                                }
                            />
                        </Tooltip>
                        <FormControl fullWidth margin="dense">
                            <InputLabel>Aktivan</InputLabel>
                            <Select
                                value={is_active ? "1" : "0"}
                                label="Aktivan"
                                onChange={(e) =>
                                    this.setState((prev) => ({
                                        ...prev,
                                        is_active: e.target.value === "1",
                                    }))
                                }
                            >
                                <MenuItem value="1">Da</MenuItem>
                                <MenuItem value="0">Ne</MenuItem>
                            </Select>
                        </FormControl>
                        <Tooltip title="Ulazi u Obrazac 1.">
                            <FormControlLabel
                                control={
                                    <Switch
                                        checked={include_in_medical_exam_record}
                                        onChange={(e) =>
                                            this.setState((prev) => ({
                                                ...prev,
                                                include_in_medical_exam_record:
                                                    e.target.checked,
                                            }))
                                        }
                                    />
                                }
                                label="Uključi u Obrazac 1"
                            />
                        </Tooltip>
                    </DialogContent>
                    <DialogActions>
                        <Button onClick={this.closeDialog}>Odustani</Button>
                        <Button
                            onClick={this.handleSave}
                            variant="contained"
                            disabled={!name.trim()}
                        >
                            Sačuvaj
                        </Button>
                    </DialogActions>
                </Dialog>

                <ConfirmDialog
                    open={deleteConfirmId != null}
                    title="Obriši vrstu obaveze?"
                    message="Da li sigurno želiš da obrišeš ovu vrstu obaveze?"
                    confirmLabel="Obriši"
                    onConfirm={this.doDelete}
                    onClose={this.cancelDelete}
                />
            </Box>
        );
    }
}

const mapStateToProps = (state: RootState): ProcessTypesListPageStateProps => ({
    processTypes: state.processes.processTypes,
    typesLoading: state.processes.processTypesStatus === "loading",
    typesError:
        state.processes.processTypesStatus === "failed"
            ? (state.processes.processTypesError ?? "Greška")
            : null,
});

const mapDispatchToProps = (
    dispatch: AppDispatch,
): ProcessTypesListPageDispatchProps => ({
    setLastPath: (path: string) => dispatch(setLastPath(path)),
    ensureProcessTypes: () => {
        void dispatch(ensureProcessTypes());
    },
    addProcessType: (payload: Partial<ProcessType>) =>
        dispatch(addProcessType(payload)),
    saveProcessType: (args: { id: number; payload: Partial<ProcessType> }) =>
        dispatch(saveProcessType(args)),
    removeProcessType: (id: number) => dispatch(removeProcessType(id)),
});

export default connect(
    mapStateToProps,
    mapDispatchToProps,
)(ProcessTypesListPageInner);
