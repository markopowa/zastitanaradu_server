import { Component } from "react";
import { connect } from "react-redux";
import {
    Box,
    Paper,
    Table,
    TableHead,
    TableRow,
    TableCell,
    TableBody,
    IconButton,
    Button,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    TextField,
    FormControlLabel,
    Checkbox,
    Typography,
} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";
import { PermissionGate } from "../components/PermissionGate";

import type { RootState } from "../store";
import {
    fetchTrainingTypes,
    createTrainingType,
    updateTrainingType,
    deleteTrainingType,
} from "../store/trainingsSlice";
import type { TrainingType } from "../types/trainings";

interface StateProps {
    types: TrainingType[];
    error?: string;
}

interface DispatchProps {
    fetchTrainingTypes: () => void;
    createTrainingType: (p: Partial<TrainingType>) => void;
    updateTrainingType: (p: Partial<TrainingType> & { id: number }) => void;
    deleteTrainingType: (id: number) => void;
}

type Props = StateProps & DispatchProps;

interface State {
    dialogOpen: boolean;
    editingId: number | null;
    code: string;
    name: string;
    description: string;
    default_validity_months: string;
    is_for_high_risk_positions: boolean;
    deleteConfirmId: number | null;
}

class TrainingTypesListPage extends Component<Props, State> {
    state: State = {
        dialogOpen: false,
        editingId: null,
        code: "",
        name: "",
        description: "",
        default_validity_months: "",
        is_for_high_risk_positions: false,
        deleteConfirmId: null,
    };

    componentDidMount(): void {
        this.props.fetchTrainingTypes();
    }

    openCreate = (): void => {
        this.setState({
            dialogOpen: true,
            editingId: null,
            code: "",
            name: "",
            description: "",
            default_validity_months: "",
            is_for_high_risk_positions: false,
        });
    };

    openEdit = (type: TrainingType): void => {
        this.setState({
            dialogOpen: true,
            editingId: type.id,
            code: type.code,
            name: type.name,
            description: type.description ?? "",
            default_validity_months: type.default_validity_months != null ? String(type.default_validity_months) : "",
            is_for_high_risk_positions: type.is_for_high_risk_positions ?? false,
        });
    };

    closeDialog = (): void => {
        this.setState({
            dialogOpen: false,
            editingId: null,
            code: "",
            name: "",
            description: "",
            default_validity_months: "",
            is_for_high_risk_positions: false,
        });
    };

    handleSave = (): void => {
        const {
            editingId,
            code,
            name,
            description,
            default_validity_months,
            is_for_high_risk_positions,
        } = this.state;
        if (!code.trim() || !name.trim()) return;
        const payload = {
            code: code.trim(),
            name: name.trim(),
            description: description.trim() || undefined,
            default_validity_months:
                default_validity_months === ""
                    ? undefined
                    : parseInt(default_validity_months, 10),
            is_for_high_risk_positions,
        };
        if (editingId != null) {
            this.props.updateTrainingType({ id: editingId, ...payload });
        } else {
            this.props.createTrainingType(payload);
        }
        this.closeDialog();
    };

    confirmDelete = (id: number): void => {
        this.setState({ deleteConfirmId: id });
    };

    doDelete = (): void => {
        const { deleteConfirmId } = this.state;
        if (deleteConfirmId != null) {
            this.props.deleteTrainingType(deleteConfirmId);
            this.setState({ deleteConfirmId: null });
        }
    };

    render() {
        const { types, error } = this.props;
        const list = Array.isArray(types) ? types : [];
        const {
            dialogOpen,
            editingId,
            code,
            name,
            description,
            default_validity_months,
            is_for_high_risk_positions,
            deleteConfirmId,
        } = this.state;

        return (
            <Box>
                {error && (
                    <Typography color="error" sx={{ mb: 2 }}>
                        {error}
                    </Typography>
                )}
                <Box sx={{ display: "flex", justifyContent: "flex-end", mb: 2 }}>
                    <PermissionGate permission="trainings.add_trainingtype">
                        <Button
                            variant="contained"
                            startIcon={<AddIcon />}
                            onClick={this.openCreate}
                        >
                            Dodaj tip obuke
                        </Button>
                    </PermissionGate>
                </Box>
                <Paper sx={{ overflowX: "auto" }}>
                    <Table sx={{ minWidth: 400 }}>
                        <TableHead>
                            <TableRow>
                                <TableCell>Šifra</TableCell>
                                <TableCell>Naziv</TableCell>
                                <TableCell>Opis</TableCell>
                                <TableCell>Važenje (meseci)</TableCell>
                                <TableCell>Visok rizik</TableCell>
                                <TableCell align="right">Akcije</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {list.map((t) => (
                                <TableRow key={t.id}>
                                    <TableCell>{t.code}</TableCell>
                                    <TableCell>{t.name}</TableCell>
                                    <TableCell>{t.description ?? "—"}</TableCell>
                                    <TableCell>{t.default_validity_months ?? "—"}</TableCell>
                                    <TableCell>{t.is_for_high_risk_positions ? "Da" : "Ne"}</TableCell>
                                    <TableCell align="right">
                                        <PermissionGate permission="trainings.change_trainingtype">
                                            <IconButton
                                                size="small"
                                                onClick={() => this.openEdit(t)}
                                            >
                                                <EditIcon />
                                            </IconButton>
                                        </PermissionGate>
                                        <PermissionGate permission="trainings.delete_trainingtype">
                                            <IconButton
                                                size="small"
                                                onClick={() => this.confirmDelete(t.id)}
                                            >
                                                <DeleteIcon />
                                            </IconButton>
                                        </PermissionGate>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </Paper>

                <Dialog open={dialogOpen} onClose={this.closeDialog} maxWidth="sm" fullWidth>
                    <DialogTitle>
                        {editingId != null ? "Izmena tipa obuke" : "Novi tip obuke"}
                    </DialogTitle>
                    <DialogContent>
                        <TextField
                            autoFocus
                            margin="dense"
                            label="Šifra"
                            fullWidth
                            value={code}
                            onChange={(e) => this.setState({ code: e.target.value })}
                            disabled={editingId != null}
                        />
                        <TextField
                            margin="dense"
                            label="Naziv"
                            fullWidth
                            value={name}
                            onChange={(e) => this.setState({ name: e.target.value })}
                        />
                        <TextField
                            margin="dense"
                            label="Opis"
                            fullWidth
                            multiline
                            rows={2}
                            value={description}
                            onChange={(e) => this.setState({ description: e.target.value })}
                        />
                        <TextField
                            margin="dense"
                            label="Podrazumevano važenje (meseci)"
                            fullWidth
                            type="number"
                            value={default_validity_months}
                            onChange={(e) =>
                                this.setState({ default_validity_months: e.target.value })
                            }
                        />
                        <FormControlLabel
                            control={
                                <Checkbox
                                    checked={is_for_high_risk_positions}
                                    onChange={(e) =>
                                        this.setState({
                                            is_for_high_risk_positions: e.target.checked,
                                        })
                                    }
                                />
                            }
                            label="Za radna mesta visokog rizika"
                            sx={{ mt: 1 }}
                        />
                    </DialogContent>
                    <DialogActions>
                        <Button onClick={this.closeDialog}>Odustani</Button>
                        <Button
                            onClick={this.handleSave}
                            variant="contained"
                            disabled={!code.trim() || !name.trim()}
                        >
                            {editingId != null ? "Sačuvaj" : "Dodaj"}
                        </Button>
                    </DialogActions>
                </Dialog>

                <Dialog open={deleteConfirmId != null} onClose={() => this.setState({ deleteConfirmId: null })}>
                    <DialogTitle>Obriši tip obuke?</DialogTitle>
                    <DialogActions>
                        <Button onClick={() => this.setState({ deleteConfirmId: null })}>Ne</Button>
                        <Button onClick={this.doDelete} color="error" variant="contained">
                            Da, obriši
                        </Button>
                    </DialogActions>
                </Dialog>
            </Box>
        );
    }
}

const mapStateToProps = (state: RootState): StateProps => ({
    types: state.trainings.types,
    error: state.trainings.error,
});

const mapDispatchToProps: DispatchProps = {
    fetchTrainingTypes,
    createTrainingType,
    updateTrainingType,
    deleteTrainingType,
};

export default connect(mapStateToProps, mapDispatchToProps)(TrainingTypesListPage);
