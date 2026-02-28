import { Component } from "react";
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
    InputLabel,
    Select,
    MenuItem,
    IconButton,
    CircularProgress,
    Alert,
} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";

import {
    getProcessTypes,
    createProcessType,
    updateProcessType,
    deleteProcessType,
} from "../api/processes";
import type { ProcessType } from "../types/processes";
import { setLastPath } from "../store/locationSlice";
import { connect } from "react-redux";
import type { AppDispatch, RootState } from "../store";
import { PermissionGate } from "../components/PermissionGate";
import {
    ScrollableTablePaper,
    tableCellEllipsis,
} from "../components/ScrollableTablePaper";

interface DispatchProps {
    setLastPath?: (path: string) => void;
}
type Props = DispatchProps;

interface State {
    items: ProcessType[];
    loading: boolean;
    error: string | null;
    dialogOpen: boolean;
    editingId: number | null;
    deleteConfirmId: number | null;
    name: string;
    description: string;
    subject_kind: ProcessType["subject_kind"];
    default_period_months: string;
    lead_time_days: string;
    is_active: boolean;
}

const SUBJECT_OPTIONS = [
    { value: "EMPLOYEE", label: "Zaposleni" },
    { value: "EQUIPMENT", label: "Oprema" },
    { value: "CLIENT_COMPANY", label: "Firma" },
];

class ProcessTypesListPageInner extends Component<Props, State> {
    state: State = {
        items: [],
        loading: true,
        error: null,
        dialogOpen: false,
        editingId: null,
        deleteConfirmId: null,
        name: "",
        description: "",
        subject_kind: "EMPLOYEE",
        default_period_months: "",
        lead_time_days: "0",
        is_active: true,
    };

    load = (): void => {
        this.setState({ loading: true, error: null });
        getProcessTypes()
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
        this.props.setLastPath?.("/processes/types");
        this.load();
    }

    openCreate = (): void => {
        this.setState({
            dialogOpen: true,
            editingId: null,
            name: "",
            description: "",
            subject_kind: "EMPLOYEE",
            default_period_months: "",
            lead_time_days: "0",
            is_active: true,
        });
    };

    openEdit = (row: ProcessType): void => {
        this.setState({
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
        });
    };

    closeDialog = (): void => {
        this.setState({ dialogOpen: false, editingId: null });
    };

    confirmDelete = (id: number): void => {
        this.setState({ deleteConfirmId: id, error: null });
    };

    cancelDelete = (): void => {
        this.setState({ deleteConfirmId: null });
    };

    doDelete = (): void => {
        const { deleteConfirmId } = this.state;
        if (deleteConfirmId == null) return;
        deleteProcessType(deleteConfirmId)
            .then(() => {
                this.setState({ deleteConfirmId: null });
                this.load();
            })
            .catch((err: { response?: { data?: { detail?: string } } }) => {
                const msg =
                    err.response?.data?.detail ??
                    "Greška pri brisanju vrste obaveze.";
                this.setState({ error: msg, deleteConfirmId: null });
            });
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
        };
        if (editingId != null) {
            updateProcessType(editingId, payload).then(() => {
                this.closeDialog();
                this.load();
            });
        } else {
            createProcessType(payload).then(() => {
                this.closeDialog();
                this.load();
            });
        }
    };

    render(): React.ReactNode {
        const {
            items,
            loading,
            error,
            dialogOpen,
            editingId,
            deleteConfirmId,
            name,
            description,
            subject_kind,
            default_period_months,
            lead_time_days,
            is_active,
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
                                    <TableCell sx={tableCellEllipsis}>
                                        Šifra
                                    </TableCell>
                                    <TableCell sx={tableCellEllipsis}>
                                        Naziv
                                    </TableCell>
                                    <TableCell sx={tableCellEllipsis}>
                                        Subjekt
                                    </TableCell>
                                    <TableCell sx={tableCellEllipsis}>
                                        Period (meseci)
                                    </TableCell>
                                    <TableCell sx={tableCellEllipsis}>
                                        Rok isporuke (dana)
                                    </TableCell>
                                    <TableCell sx={tableCellEllipsis}>
                                        Aktivan
                                    </TableCell>
                                    <TableCell align="right" />
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
                                            {SUBJECT_OPTIONS.find(
                                                (s) =>
                                                    s.value ===
                                                    row.subject_kind,
                                            )?.label ?? row.subject_kind}
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
                                        <TableCell align="right">
                                            <IconButton
                                                size="small"
                                                aria-label="izmeni"
                                                onClick={() =>
                                                    this.openEdit(row)
                                                }
                                            >
                                                <EditIcon />
                                            </IconButton>
                                            <PermissionGate permission="processes.delete_processtype">
                                                <IconButton
                                                    size="small"
                                                    aria-label="obriši"
                                                    onClick={() =>
                                                        this.confirmDelete(
                                                            row.id,
                                                        )
                                                    }
                                                >
                                                    <DeleteIcon />
                                                </IconButton>
                                            </PermissionGate>
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
                                this.setState({ name: e.target.value })
                            }
                        />
                        <TextField
                            margin="dense"
                            label="Opis"
                            fullWidth
                            multiline
                            value={description}
                            onChange={(e) =>
                                this.setState({ description: e.target.value })
                            }
                        />
                        <FormControl fullWidth margin="dense">
                            <InputLabel>Subjekt</InputLabel>
                            <Select
                                value={subject_kind}
                                label="Subjekt"
                                onChange={(e) =>
                                    this.setState({
                                        subject_kind: e.target
                                            .value as ProcessType["subject_kind"],
                                    })
                                }
                            >
                                {SUBJECT_OPTIONS.map((o) => (
                                    <MenuItem key={o.value} value={o.value}>
                                        {o.label}
                                    </MenuItem>
                                ))}
                            </Select>
                        </FormControl>
                        <TextField
                            margin="dense"
                            label="Period (meseci)"
                            type="number"
                            fullWidth
                            value={default_period_months}
                            onChange={(e) =>
                                this.setState({
                                    default_period_months: e.target.value,
                                })
                            }
                        />
                        <TextField
                            margin="dense"
                            label="Rok isporuke (dana)"
                            type="number"
                            fullWidth
                            value={lead_time_days}
                            onChange={(e) =>
                                this.setState({
                                    lead_time_days: e.target.value,
                                })
                            }
                        />
                        <FormControl fullWidth margin="dense">
                            <InputLabel>Aktivan</InputLabel>
                            <Select
                                value={is_active ? "1" : "0"}
                                label="Aktivan"
                                onChange={(e) =>
                                    this.setState({
                                        is_active: e.target.value === "1",
                                    })
                                }
                            >
                                <MenuItem value="1">Da</MenuItem>
                                <MenuItem value="0">Ne</MenuItem>
                            </Select>
                        </FormControl>
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

                <Dialog
                    open={deleteConfirmId != null}
                    onClose={this.cancelDelete}
                >
                    <DialogTitle>Obriši vrstu obaveze?</DialogTitle>
                    <DialogActions>
                        <Button onClick={this.cancelDelete}>Ne</Button>
                        <Button
                            onClick={this.doDelete}
                            color="error"
                            variant="contained"
                        >
                            Da, obriši
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
}))(ProcessTypesListPageInner);

export default function ProcessTypesListPage(): React.ReactElement {
    return <Connected />;
}
