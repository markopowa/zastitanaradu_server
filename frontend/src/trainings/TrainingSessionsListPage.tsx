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
import { fetchTrainingSessions, fetchTrainingTypes, fetchTrainingPrograms, createTrainingSession, updateTrainingSession, deleteTrainingSession } from "../store/trainingsSlice";
import type { TrainingSession, TrainingType, TrainingProgram } from "../types/trainings";
import { setLastPath } from "../store/locationSlice";

interface StateProps {
    sessions: TrainingSession[];
    types: TrainingType[];
    programs: TrainingProgram[];
    error?: string;
}

interface DispatchProps {
    fetchTrainingSessions: () => void;
    fetchTrainingTypes: () => void;
    fetchTrainingPrograms: () => void;
    createTrainingSession: (p: Partial<TrainingSession>) => void;
    updateTrainingSession: (p: Partial<TrainingSession> & { id: number }) => void;
    deleteTrainingSession: (id: number) => void;
    setLastPath: (path: string) => void;
}

type Props = StateProps & DispatchProps;

interface State {
    dialogOpen: boolean;
    editingId: number | null;
    training_type: number | "";
    program: number | "";
    session_date: string;
    location: string;
    instructor: string;
    notes: string;
    deleteConfirmId: number | null;
}

class TrainingSessionsListPage extends Component<Props, State> {
    state: State = {
        dialogOpen: false,
        editingId: null,
        training_type: "",
        program: "",
        session_date: "",
        location: "",
        instructor: "",
        notes: "",
        deleteConfirmId: null,
    };

    componentDidMount(): void {
        this.props.fetchTrainingSessions();
        this.props.fetchTrainingTypes();
        this.props.fetchTrainingPrograms();
        this.props.setLastPath("/trainings/sessions");
    }

    openCreate = (): void => {
        const firstType = this.props.types[0]?.id;
        this.setState({
            dialogOpen: true,
            editingId: null,
            training_type: firstType ?? "",
            program: "",
            session_date: "",
            location: "",
            instructor: "",
            notes: "",
        });
    };

    openEdit = (session: TrainingSession): void => {
        this.setState({
            dialogOpen: true,
            editingId: session.id,
            training_type: session.training_type ?? "",
            program: session.program ?? "",
            session_date: session.session_date?.slice(0, 10) ?? "",
            location: session.location ?? "",
            instructor: session.instructor ?? "",
            notes: session.notes ?? "",
        });
    };

    closeDialog = (): void => {
        this.setState({
            dialogOpen: false,
            editingId: null,
            training_type: "",
            program: "",
            session_date: "",
            location: "",
            instructor: "",
            notes: "",
        });
    };

    handleSave = (): void => {
        const {
            editingId,
            training_type,
            program,
            session_date,
            location,
            instructor,
            notes,
        } = this.state;
        if (!session_date.trim() || !location.trim() || !instructor.trim() || training_type === "")
            return;
        const typeId = Number(training_type);
        const programId = program === "" ? null : Number(program);
        if (editingId != null) {
            this.props.updateTrainingSession({
                id: editingId,
                training_type: typeId,
                program: programId ?? undefined,
                session_date: session_date.trim(),
                location: location.trim(),
                instructor: instructor.trim(),
                notes: notes.trim() || undefined,
            });
        } else {
            this.props.createTrainingSession({
                training_type: typeId,
                program: programId ?? undefined,
                session_date: session_date.trim(),
                location: location.trim(),
                instructor: instructor.trim(),
                notes: notes.trim() || undefined,
            });
        }
        this.closeDialog();
    };

    confirmDelete = (id: number): void => {
        this.setState({ deleteConfirmId: id });
    };

    doDelete = (): void => {
        const { deleteConfirmId } = this.state;
        if (deleteConfirmId != null) {
            this.props.deleteTrainingSession(deleteConfirmId);
            this.setState({ deleteConfirmId: null });
        }
    };

    render() {
        const { sessions, types, programs, error } = this.props;
        const list = Array.isArray(sessions) ? sessions : [];
        const typeList = Array.isArray(types) ? types : [];
        const programList = Array.isArray(programs) ? programs : [];
        const {
            dialogOpen,
            editingId,
            training_type,
            program,
            session_date,
            location,
            instructor,
            notes,
            deleteConfirmId,
        } = this.state;

        const typeName = (id: number) => typeList.find((t) => t.id === id)?.name ?? String(id);
        const programTitle = (id: number) =>
            programList.find((p) => p.id === id)?.title ?? String(id);

        return (
            <Box>
                {error && (
                    <Typography color="error" sx={{ mb: 2 }}>
                        {error}
                    </Typography>
                )}
                <Box sx={{ display: "flex", justifyContent: "flex-end", mb: 2 }}>
                    <PermissionGate permission="trainings.add_trainingsession">
                        <Button
                            variant="contained"
                            startIcon={<AddIcon />}
                            onClick={this.openCreate}
                        >
                            Dodaj sesiju
                        </Button>
                    </PermissionGate>
                </Box>
                <Paper sx={{ overflowX: "auto" }}>
                    <Table sx={{ minWidth: 400 }}>
                        <TableHead>
                            <TableRow>
                                <TableCell>Datum</TableCell>
                                <TableCell>Tip</TableCell>
                                <TableCell>Program</TableCell>
                                <TableCell>Lokacija</TableCell>
                                <TableCell>Instruktor</TableCell>
                                <TableCell align="right">Akcije</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {list.map((session) => (
                                <TableRow key={session.id}>
                                    <TableCell>{session.session_date}</TableCell>
                                    <TableCell>{typeName(session.training_type)}</TableCell>
                                    <TableCell>
                                        {session.program != null
                                            ? programTitle(session.program)
                                            : "—"}
                                    </TableCell>
                                    <TableCell>{session.location}</TableCell>
                                    <TableCell>{session.instructor}</TableCell>
                                    <TableCell align="right">
                                        <PermissionGate permission="trainings.change_trainingsession">
                                            <IconButton
                                                size="small"
                                                onClick={() => this.openEdit(session)}
                                            >
                                                <EditIcon />
                                            </IconButton>
                                        </PermissionGate>
                                        <PermissionGate permission="trainings.delete_trainingsession">
                                            <IconButton
                                                size="small"
                                                onClick={() => this.confirmDelete(session.id)}
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
                        {editingId != null ? "Izmena sesije" : "Nova sesija"}
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
                        <FormControl fullWidth margin="dense">
                            <InputLabel>Program</InputLabel>
                            <Select
                                value={program}
                                onChange={(e) =>
                                    this.setState({ program: e.target.value as number | "" })
                                }
                                label="Program"
                            >
                                <MenuItem value="">—</MenuItem>
                                {programList
                                    .filter((p) => p.training_type === training_type || !training_type)
                                    .map((p) => (
                                        <MenuItem key={p.id} value={p.id}>
                                            {p.title}
                                        </MenuItem>
                                    ))}
                            </Select>
                        </FormControl>
                        <TextField
                            margin="dense"
                            label="Datum"
                            fullWidth
                            type="date"
                            InputLabelProps={{ shrink: true }}
                            value={session_date}
                            onChange={(e) => this.setState({ session_date: e.target.value })}
                        />
                        <TextField
                            margin="dense"
                            label="Lokacija"
                            fullWidth
                            value={location}
                            onChange={(e) => this.setState({ location: e.target.value })}
                        />
                        <TextField
                            margin="dense"
                            label="Instruktor"
                            fullWidth
                            value={instructor}
                            onChange={(e) => this.setState({ instructor: e.target.value })}
                        />
                        <TextField
                            margin="dense"
                            label="Napomene"
                            fullWidth
                            multiline
                            rows={2}
                            value={notes}
                            onChange={(e) => this.setState({ notes: e.target.value })}
                        />
                    </DialogContent>
                    <DialogActions>
                        <Button onClick={this.closeDialog}>Odustani</Button>
                        <Button
                            onClick={this.handleSave}
                            variant="contained"
                            disabled={
                                !session_date ||
                                !location.trim() ||
                                !instructor.trim() ||
                                training_type === ""
                            }
                        >
                            {editingId != null ? "Sačuvaj" : "Dodaj"}
                        </Button>
                    </DialogActions>
                </Dialog>

                <Dialog open={deleteConfirmId != null} onClose={() => this.setState({ deleteConfirmId: null })}>
                    <DialogTitle>Obriši sesiju?</DialogTitle>
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
    sessions: state.trainings.sessions,
    types: state.trainings.types,
    programs: state.trainings.programs,
    error: state.trainings.error,
});

const mapDispatchToProps = (dispatch: AppDispatch): DispatchProps => ({
    fetchTrainingSessions: () => dispatch(fetchTrainingSessions()),
    fetchTrainingTypes: () => dispatch(fetchTrainingTypes()),
    fetchTrainingPrograms: () => dispatch(fetchTrainingPrograms()),
    createTrainingSession: (p) => dispatch(createTrainingSession(p)),
    updateTrainingSession: (p) => dispatch(updateTrainingSession(p)),
    deleteTrainingSession: (id) => dispatch(deleteTrainingSession(id)),
    setLastPath: (path) => dispatch(setLastPath(path)),
});

export default connect(mapStateToProps, mapDispatchToProps)(TrainingSessionsListPage);
