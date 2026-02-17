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
    Typography,
} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";
import { PermissionGate } from "../components/PermissionGate";

import type { RootState } from "../store";
import {
    fetchEmployees,
    createEmployee,
    updateEmployee,
    deleteEmployee,
} from "../store/trainingsSlice";
import type { Employee } from "../types/trainings";

interface StateProps {
    employees: Employee[];
    error?: string;
}

interface DispatchProps {
    fetchEmployees: () => void;
    createEmployee: (p: Partial<Employee>) => void;
    updateEmployee: (p: Partial<Employee> & { id: number }) => void;
    deleteEmployee: (id: number) => void;
}

type Props = StateProps & DispatchProps;

interface State {
    dialogOpen: boolean;
    editingId: number | null;
    first_name: string;
    last_name: string;
    email: string;
    org_unit: string;
    position: string;
    deleteConfirmId: number | null;
}

class EmployeesListPage extends Component<Props, State> {
    state: State = {
        dialogOpen: false,
        editingId: null,
        first_name: "",
        last_name: "",
        email: "",
        org_unit: "",
        position: "",
        deleteConfirmId: null,
    };

    componentDidMount(): void {
        this.props.fetchEmployees();
    }

    openCreate = (): void => {
        this.setState({
            dialogOpen: true,
            editingId: null,
            first_name: "",
            last_name: "",
            email: "",
            org_unit: "",
            position: "",
        });
    };

    openEdit = (emp: Employee): void => {
        this.setState({
            dialogOpen: true,
            editingId: emp.id,
            first_name: emp.first_name ?? "",
            last_name: emp.last_name ?? "",
            email: emp.email ?? "",
            org_unit: emp.org_unit ?? "",
            position: emp.position ?? "",
        });
    };

    closeDialog = (): void => {
        this.setState({
            dialogOpen: false,
            editingId: null,
            first_name: "",
            last_name: "",
            email: "",
            org_unit: "",
            position: "",
        });
    };

    handleSave = (): void => {
        const {
            editingId,
            first_name,
            last_name,
            email,
            org_unit,
            position,
        } = this.state;
        if (!first_name.trim() || !last_name.trim()) return;
        const payload = {
            first_name: first_name.trim(),
            last_name: last_name.trim(),
            email: email.trim() || undefined,
            org_unit: org_unit.trim() || undefined,
            position: position.trim() || undefined,
        };
        if (editingId != null) {
            this.props.updateEmployee({ id: editingId, ...payload });
        } else {
            this.props.createEmployee(payload);
        }
        this.closeDialog();
    };

    confirmDelete = (id: number): void => {
        this.setState({ deleteConfirmId: id });
    };

    doDelete = (): void => {
        const { deleteConfirmId } = this.state;
        if (deleteConfirmId != null) {
            this.props.deleteEmployee(deleteConfirmId);
            this.setState({ deleteConfirmId: null });
        }
    };

    render() {
        const { employees, error } = this.props;
        const list = Array.isArray(employees) ? employees : [];
        const {
            dialogOpen,
            editingId,
            first_name,
            last_name,
            email,
            org_unit,
            position,
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
                    <PermissionGate permission="trainings.add_employee">
                        <Button
                            variant="contained"
                            startIcon={<AddIcon />}
                            onClick={this.openCreate}
                        >
                            Dodaj zaposlenog
                        </Button>
                    </PermissionGate>
                </Box>
                <Paper sx={{ overflowX: "auto" }}>
                    <Table sx={{ minWidth: 400 }}>
                        <TableHead>
                            <TableRow>
                                <TableCell>Ime</TableCell>
                                <TableCell>Prezime</TableCell>
                                <TableCell>Email</TableCell>
                                <TableCell>Organizaciona jedinica</TableCell>
                                <TableCell>Pozicija</TableCell>
                                <TableCell align="right">Akcije</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {list.map((emp) => (
                                <TableRow key={emp.id}>
                                    <TableCell>{emp.first_name}</TableCell>
                                    <TableCell>{emp.last_name}</TableCell>
                                    <TableCell>{emp.email ?? "—"}</TableCell>
                                    <TableCell>{emp.org_unit ?? "—"}</TableCell>
                                    <TableCell>{emp.position ?? "—"}</TableCell>
                                    <TableCell align="right">
                                        <PermissionGate permission="trainings.change_employee">
                                            <IconButton
                                                size="small"
                                                onClick={() => this.openEdit(emp)}
                                            >
                                                <EditIcon />
                                            </IconButton>
                                        </PermissionGate>
                                        <PermissionGate permission="trainings.delete_employee">
                                            <IconButton
                                                size="small"
                                                onClick={() => this.confirmDelete(emp.id)}
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
                        {editingId != null ? "Izmena zaposlenog" : "Novi zaposleni"}
                    </DialogTitle>
                    <DialogContent>
                        <TextField
                            autoFocus
                            margin="dense"
                            label="Ime"
                            fullWidth
                            value={first_name}
                            onChange={(e) => this.setState({ first_name: e.target.value })}
                        />
                        <TextField
                            margin="dense"
                            label="Prezime"
                            fullWidth
                            value={last_name}
                            onChange={(e) => this.setState({ last_name: e.target.value })}
                        />
                        <TextField
                            margin="dense"
                            label="Email"
                            fullWidth
                            type="email"
                            value={email}
                            onChange={(e) => this.setState({ email: e.target.value })}
                        />
                        <TextField
                            margin="dense"
                            label="Organizaciona jedinica"
                            fullWidth
                            value={org_unit}
                            onChange={(e) => this.setState({ org_unit: e.target.value })}
                        />
                        <TextField
                            margin="dense"
                            label="Pozicija"
                            fullWidth
                            value={position}
                            onChange={(e) => this.setState({ position: e.target.value })}
                        />
                    </DialogContent>
                    <DialogActions>
                        <Button onClick={this.closeDialog}>Odustani</Button>
                        <Button
                            onClick={this.handleSave}
                            variant="contained"
                            disabled={!first_name.trim() || !last_name.trim()}
                        >
                            {editingId != null ? "Sačuvaj" : "Dodaj"}
                        </Button>
                    </DialogActions>
                </Dialog>

                <Dialog open={deleteConfirmId != null} onClose={() => this.setState({ deleteConfirmId: null })}>
                    <DialogTitle>Obriši zaposlenog?</DialogTitle>
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
    employees: state.trainings.employees,
    error: state.trainings.error,
});

const mapDispatchToProps: DispatchProps = {
    fetchEmployees,
    createEmployee,
    updateEmployee,
    deleteEmployee,
};

export default connect(mapStateToProps, mapDispatchToProps)(EmployeesListPage);
