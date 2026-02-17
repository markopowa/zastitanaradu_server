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
    FormControl,
    InputLabel,
    Select,
    MenuItem,
    Typography,
} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";
import { PermissionGate } from "../components/PermissionGate";

import type { RootState, AppDispatch } from "../store";
import { fetchTrainingPrograms, fetchTrainingTypes, createTrainingProgram, updateTrainingProgram, deleteTrainingProgram } from "../store/trainingsSlice";
import type { TrainingProgram, TrainingType } from "../types/trainings";
import { setLastPath } from "../store/locationSlice";

interface StateProps {
    programs: TrainingProgram[];
    types: TrainingType[];
    error?: string;
}

interface DispatchProps {
    fetchTrainingPrograms: () => void;
    fetchTrainingTypes: () => void;
    createTrainingProgram: (p: Partial<TrainingProgram>) => void;
    updateTrainingProgram: (p: Partial<TrainingProgram> & { id: number }) => void;
    deleteTrainingProgram: (id: number) => void;
    setLastPath: (path: string) => void;
}

type Props = StateProps & DispatchProps;

interface State {
    dialogOpen: boolean;
    editingId: number | null;
    training_type: number | "";
    title: string;
    deleteConfirmId: number | null;
}

class TrainingProgramsListPage extends Component<Props, State> {
    state: State = {
        dialogOpen: false,
        editingId: null,
        training_type: "",
        title: "",
        deleteConfirmId: null,
    };

    componentDidMount(): void {
        this.props.fetchTrainingPrograms();
        this.props.fetchTrainingTypes();
        this.props.setLastPath("/trainings/programs");
    }

    openCreate = (): void => {
        const firstType = this.props.types[0]?.id;
        this.setState({
            dialogOpen: true,
            editingId: null,
            training_type: firstType ?? "",
            title: "",
        });
    };

    openEdit = (program: TrainingProgram): void => {
        this.setState({
            dialogOpen: true,
            editingId: program.id,
            training_type: program.training_type ?? "",
            title: program.title,
        });
    };

    closeDialog = (): void => {
        this.setState({ dialogOpen: false, editingId: null, training_type: "", title: "" });
    };

    handleSave = (): void => {
        const { editingId, training_type, title } = this.state;
        if (!title.trim() || training_type === "") return;
        const typeId = Number(training_type);
        if (editingId != null) {
            this.props.updateTrainingProgram({
                id: editingId,
                training_type: typeId,
                title: title.trim(),
            });
        } else {
            this.props.createTrainingProgram({ training_type: typeId, title: title.trim() });
        }
        this.closeDialog();
    };

    confirmDelete = (id: number): void => {
        this.setState({ deleteConfirmId: id });
    };

    doDelete = (): void => {
        const { deleteConfirmId } = this.state;
        if (deleteConfirmId != null) {
            this.props.deleteTrainingProgram(deleteConfirmId);
            this.setState({ deleteConfirmId: null });
        }
    };

    render() {
        const { programs, types, error } = this.props;
        const list = Array.isArray(programs) ? programs : [];
        const typeList = Array.isArray(types) ? types : [];
        const { dialogOpen, editingId, training_type, title, deleteConfirmId } = this.state;

        const typeName = (typeId: number) =>
            typeList.find((t) => t.id === typeId)?.name ?? String(typeId);

        return (
            <Box>
                {error && (
                    <Typography color="error" sx={{ mb: 2 }}>
                        {error}
                    </Typography>
                )}
                <Box sx={{ display: "flex", justifyContent: "flex-end", mb: 2 }}>
                    <PermissionGate permission="trainings.add_trainingprogram">
                        <Button
                            variant="contained"
                            startIcon={<AddIcon />}
                            onClick={this.openCreate}
                        >
                            Dodaj program
                        </Button>
                    </PermissionGate>
                </Box>
                <Paper sx={{ overflowX: "auto" }}>
                    <Table sx={{ minWidth: 400 }}>
                        <TableHead>
                            <TableRow>
                                <TableCell>Naziv</TableCell>
                                <TableCell>Tip obuke</TableCell>
                                <TableCell align="right">Akcije</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {list.map((program) => (
                                <TableRow key={program.id}>
                                    <TableCell>{program.title}</TableCell>
                                    <TableCell>
                                        {typeName(program.training_type)}
                                    </TableCell>
                                    <TableCell align="right">
                                        <PermissionGate permission="trainings.change_trainingprogram">
                                            <IconButton
                                                size="small"
                                                onClick={() => this.openEdit(program)}
                                            >
                                                <EditIcon />
                                            </IconButton>
                                        </PermissionGate>
                                        <PermissionGate permission="trainings.delete_trainingprogram">
                                            <IconButton
                                                size="small"
                                                onClick={() => this.confirmDelete(program.id)}
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
                        {editingId != null ? "Izmena programa" : "Novi program"}
                    </DialogTitle>
                    <DialogContent>
                        <FormControl fullWidth margin="dense">
                            <InputLabel>Tip obuke</InputLabel>
                            <Select
                                value={training_type}
                                onChange={(e) =>
                                    this.setState({ training_type: e.target.value as number | "" })
                                }
                                label="Tip obuke"
                            >
                                {typeList.map((t) => (
                                    <MenuItem key={t.id} value={t.id}>
                                        {t.name}
                                    </MenuItem>
                                ))}
                            </Select>
                        </FormControl>
                        <TextField
                            margin="dense"
                            label="Naziv"
                            fullWidth
                            value={title}
                            onChange={(e) => this.setState({ title: e.target.value })}
                        />
                    </DialogContent>
                    <DialogActions>
                        <Button onClick={this.closeDialog}>Odustani</Button>
                        <Button
                            onClick={this.handleSave}
                            variant="contained"
                            disabled={!title.trim() || training_type === ""}
                        >
                            {editingId != null ? "Sačuvaj" : "Dodaj"}
                        </Button>
                    </DialogActions>
                </Dialog>

                <Dialog open={deleteConfirmId != null} onClose={() => this.setState({ deleteConfirmId: null })}>
                    <DialogTitle>Obriši program?</DialogTitle>
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
    programs: state.trainings.programs,
    types: state.trainings.types,
    error: state.trainings.error,
});

const mapDispatchToProps = (dispatch: AppDispatch): DispatchProps => ({
    fetchTrainingPrograms: () => dispatch(fetchTrainingPrograms()),
    fetchTrainingTypes: () => dispatch(fetchTrainingTypes()),
    createTrainingProgram: (p) => dispatch(createTrainingProgram(p)),
    updateTrainingProgram: (p) => dispatch(updateTrainingProgram(p)),
    deleteTrainingProgram: (id) => dispatch(deleteTrainingProgram(id)),
    setLastPath: (path) => dispatch(setLastPath(path)),
});

export default connect(mapStateToProps, mapDispatchToProps)(TrainingProgramsListPage);
