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
    FormControlLabel,
    Checkbox,
    Typography,
} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";
import { PermissionGate } from "../components/PermissionGate";

import type { RootState, AppDispatch } from "../store";
import {
    fetchTrainingAttendance,
    fetchEmployees,
    fetchTrainingSessions,
    createTrainingAttendance,
    updateTrainingAttendance,
    deleteTrainingAttendance,
} from "../store/trainingsSlice";
import type {
    TrainingAttendance,
    Employee,
    TrainingSession,
} from "../types/trainings";
import { setLastPath } from "../store/locationSlice";

interface StateProps {
    items: TrainingAttendance[];
    employees: Employee[];
    sessions: TrainingSession[];
    error?: string;
}

interface DispatchProps {
    fetchTrainingAttendance: () => void;
    fetchEmployees: () => void;
    fetchTrainingSessions: () => void;
    createTrainingAttendance: (p: Partial<TrainingAttendance>) => void;
    updateTrainingAttendance: (p: Partial<TrainingAttendance> & { id: number }) => void;
    deleteTrainingAttendance: (id: number) => void;
    setLastPath: (path: string) => void;
}

const pad = (n: number) => String(n).padStart(2, "0");

const formatDateISO = (value?: string | null): string => {
    if (!value) return "—";
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return value;
    const y = d.getFullYear(), m = d.getMonth() + 1, day = d.getDate();
    return `${y}-${pad(m)}-${pad(day)}`;
};

type Props = StateProps & DispatchProps;

interface State {
    dialogOpen: boolean;
    editingId: number | null;
    employee: number | "";
    training_session: number | "";
    valid_until: string;
    certificate_number: string;
    passed: boolean;
    notes: string;
    deleteConfirmId: number | null;
}

class TrainingAttendanceListPage extends Component<Props, State> {
    state: State = {
        dialogOpen: false,
        editingId: null,
        employee: "",
        training_session: "",
        valid_until: "",
        certificate_number: "",
        passed: true,
        notes: "",
        deleteConfirmId: null,
    };

    componentDidMount(): void {
        this.props.fetchTrainingAttendance();
        this.props.fetchEmployees();
        this.props.fetchTrainingSessions();
        this.props.setLastPath("/trainings/attendance");
    }

    openCreate = (): void => {
        this.setState({
            dialogOpen: true,
            editingId: null,
            employee: this.props.employees[0]?.id ?? "",
            training_session: this.props.sessions[0]?.id ?? "",
            valid_until: "",
            certificate_number: "",
            passed: true,
            notes: "",
        });
    };

    openEdit = (item: TrainingAttendance): void => {
        this.setState({
            dialogOpen: true,
            editingId: item.id,
            employee: item.employee ?? "",
            training_session: item.training_session ?? "",
            valid_until: item.valid_until?.slice(0, 10) ?? "",
            certificate_number: item.certificate_number ?? "",
            passed: item.passed ?? true,
            notes: item.notes ?? "",
        });
    };

    closeDialog = (): void => {
        this.setState({
            dialogOpen: false,
            editingId: null,
            employee: "",
            training_session: "",
            valid_until: "",
            certificate_number: "",
            passed: true,
            notes: "",
        });
    };

    handleSave = (): void => {
        const {
            editingId,
            employee,
            training_session,
            valid_until,
            certificate_number,
            passed,
            notes,
        } = this.state;
        if (
            employee === "" ||
            training_session === "" ||
            !valid_until.trim()
        )
            return;
        const payload = {
            employee: Number(employee),
            training_session: Number(training_session),
            valid_until: valid_until.trim(),
            certificate_number: certificate_number.trim() || undefined,
            passed,
            notes: notes.trim() || undefined,
        };
        if (editingId != null) {
            this.props.updateTrainingAttendance({ id: editingId, ...payload });
        } else {
            this.props.createTrainingAttendance(payload);
        }
        this.closeDialog();
    };

    confirmDelete = (id: number): void => {
        this.setState({ deleteConfirmId: id });
    };

    doDelete = (): void => {
        const { deleteConfirmId } = this.state;
        if (deleteConfirmId != null) {
            this.props.deleteTrainingAttendance(deleteConfirmId);
            this.setState({ deleteConfirmId: null });
        }
    };

    render() {
        const { items, employees, sessions, error } = this.props;
        const list = Array.isArray(items) ? items : [];
        const employeeList = Array.isArray(employees) ? employees : [];
        const sessionList = Array.isArray(sessions) ? sessions : [];
        const {
            dialogOpen,
            editingId,
            employee,
            training_session,
            valid_until,
            certificate_number,
            passed,
            notes,
            deleteConfirmId,
        } = this.state;

        const employeeName = (id: number) => {
            const e = employeeList.find((x) => x.id === id);
            return e ? `${e.first_name} ${e.last_name}`.trim() : String(id);
        };
        const sessionLabel = (id: number) => {
            const s = sessionList.find((x) => x.id === id);
            return s ? `${s.session_date} ${s.location}` : String(id);
        };

        return (
            <Box>
                {error && (
                    <Typography color="error" sx={{ mb: 2 }}>
                        {error}
                    </Typography>
                )}
                <Box sx={{ display: "flex", justifyContent: "flex-end", mb: 2 }}>
                    <PermissionGate permission="trainings.add_trainingattendance">
                        <Button
                            variant="contained"
                            startIcon={<AddIcon />}
                            onClick={this.openCreate}
                        >
                            Dodaj prisustvo
                        </Button>
                    </PermissionGate>
                </Box>
                <Paper sx={{ overflowX: "auto" }}>
                    <Table sx={{ minWidth: 400 }}>
                        <TableHead>
                            <TableRow>
                                <TableCell>Zaposleni</TableCell>
                                <TableCell>Termin</TableCell>
                                <TableCell>Važi do</TableCell>
                                <TableCell>Položio</TableCell>
                                <TableCell align="right">Akcije</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {list.map((item) => (
                                <TableRow key={item.id}>
                                    <TableCell>{employeeName(item.employee)}</TableCell>
                                    <TableCell>{sessionLabel(item.training_session)}</TableCell>
                                    <TableCell>{formatDateISO(item.valid_until)}</TableCell>
                                    <TableCell>{item.passed ? "Da" : "Ne"}</TableCell>
                                    <TableCell align="right">
                                        <PermissionGate permission="trainings.change_trainingattendance">
                                            <IconButton
                                                size="small"
                                                onClick={() => this.openEdit(item)}
                                            >
                                                <EditIcon />
                                            </IconButton>
                                        </PermissionGate>
                                        <PermissionGate permission="trainings.delete_trainingattendance">
                                            <IconButton
                                                size="small"
                                                onClick={() => this.confirmDelete(item.id)}
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
                        {editingId != null ? "Izmena prisustva" : "Novo prisustvo"}
                    </DialogTitle>
                    <DialogContent>
                        <FormControl fullWidth margin="dense">
                            <InputLabel>Zaposleni</InputLabel>
                            <Select
                                value={employee}
                                onChange={(e) =>
                                    this.setState({ employee: e.target.value as number | "" })
                                }
                                label="Zaposleni"
                            >
                                {employeeList.map((e) => (
                                    <MenuItem key={e.id} value={e.id}>
                                        {e.first_name} {e.last_name}
                                    </MenuItem>
                                ))}
                            </Select>
                        </FormControl>
                        <FormControl fullWidth margin="dense">
                            <InputLabel>Sesija obuke</InputLabel>
                            <Select
                                value={training_session}
                                onChange={(e) =>
                                    this.setState({
                                        training_session: e.target.value as number | "",
                                    })
                                }
                                label="Sesija obuke"
                            >
                                {sessionList.map((s) => (
                                    <MenuItem key={s.id} value={s.id}>
                                        {s.session_date} — {s.location}
                                    </MenuItem>
                                ))}
                            </Select>
                        </FormControl>
                        <TextField
                            margin="dense"
                            label="Važi do"
                            fullWidth
                            type="date"
                            InputLabelProps={{ shrink: true }}
                            value={valid_until}
                            onChange={(e) => this.setState({ valid_until: e.target.value })}
                        />
                        <TextField
                            margin="dense"
                            label="Broj sertifikata"
                            fullWidth
                            value={certificate_number}
                            onChange={(e) =>
                                this.setState({ certificate_number: e.target.value })
                            }
                        />
                        <FormControlLabel
                            control={
                                <Checkbox
                                    checked={passed}
                                    onChange={(e) =>
                                        this.setState({ passed: e.target.checked })
                                    }
                                />
                            }
                            label="Položio"
                            sx={{ mt: 1 }}
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
                                employee === "" ||
                                training_session === "" ||
                                !valid_until.trim()
                            }
                        >
                            {editingId != null ? "Sačuvaj" : "Dodaj"}
                        </Button>
                    </DialogActions>
                </Dialog>

                <Dialog open={deleteConfirmId != null} onClose={() => this.setState({ deleteConfirmId: null })}>
                    <DialogTitle>Obriši prisustvo?</DialogTitle>
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
    items: state.trainings.attendance,
    employees: state.trainings.employees,
    sessions: state.trainings.sessions,
    error: state.trainings.error,
});

const mapDispatchToProps = (dispatch: AppDispatch): DispatchProps => ({
    fetchTrainingAttendance: () => dispatch(fetchTrainingAttendance()),
    fetchEmployees: () => dispatch(fetchEmployees()),
    fetchTrainingSessions: () => dispatch(fetchTrainingSessions()),
    createTrainingAttendance: (p) => dispatch(createTrainingAttendance(p)),
    updateTrainingAttendance: (p) => dispatch(updateTrainingAttendance(p)),
    deleteTrainingAttendance: (id) => dispatch(deleteTrainingAttendance(id)),
    setLastPath: (path) => dispatch(setLastPath(path)),
});

export default connect(mapStateToProps, mapDispatchToProps)(TrainingAttendanceListPage);
