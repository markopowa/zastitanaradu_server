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
    OutlinedInput,
    MenuItem,
    Checkbox,
    ListItemText,
    Typography,
} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";
import { PermissionGate } from "../components/PermissionGate";

import type { RootState, AppDispatch } from "../store";
import { loadRoles, loadPermissions, createRole, updateRole, deleteRole } from "../store/authSlice";
import type { Role, Permission } from "../types/auth";
import { setLastPath } from "../store/locationSlice";

const PERMISSION_LABELS: Record<string, string> = {
    add_user: "Dodavanje korisnika",
    change_user: "Izmena korisnika",
    delete_user: "Brisanje korisnika",
    view_user: "Pregled korisnika",
    add_group: "Dodavanje role",
    change_group: "Izmena role",
    delete_group: "Brisanje role",
    view_group: "Pregled rola",
    add_documentcategory: "Dodavanje kategorije dokumenata",
    change_documentcategory: "Izmena kategorije dokumenata",
    delete_documentcategory: "Brisanje kategorije dokumenata",
    view_documentcategory: "Pregled kategorija dokumenata",
    add_documentfile: "Dodavanje dokumenta",
    change_documentfile: "Izmena dokumenta",
    delete_documentfile: "Brisanje dokumenta",
    view_documentfile: "Pregled dokumenata",
    add_documentaiformat: "Dodavanje AI formata dokumenta",
    change_documentaiformat: "Izmena AI formata dokumenta",
    delete_documentaiformat: "Brisanje AI formata dokumenta",
    view_documentaiformat: "Pregled AI formata dokumenata",
    add_documentfileaiformat: "Dodavanje AI formata konkretnom dokumentu",
    change_documentfileaiformat: "Izmena AI formata konkretnog dokumenta",
    delete_documentfileaiformat: "Brisanje AI formata konkretnog dokumenta",
    view_documentfileaiformat: "Pregled AI formata konkretnih dokumenata",
    add_employee: "Dodavanje zaposlenog",
    change_employee: "Izmena zaposlenog",
    delete_employee: "Brisanje zaposlenog",
    view_employee: "Pregled zaposlenih",
    add_trainingtype: "Dodavanje tipa obuke",
    change_trainingtype: "Izmena tipa obuke",
    delete_trainingtype: "Brisanje tipa obuke",
    view_trainingtype: "Pregled tipova obuka",
    add_trainingprogram: "Dodavanje programa obuke",
    change_trainingprogram: "Izmena programa obuke",
    delete_trainingprogram: "Brisanje programa obuke",
    view_trainingprogram: "Pregled programa obuka",
    add_trainingsession: "Dodavanje sesije obuke",
    change_trainingsession: "Izmena sesije obuke",
    delete_trainingsession: "Brisanje sesije obuke",
    view_trainingsession: "Pregled sesija obuka",
    add_trainingattendance: "Dodavanje prisustva na obuci",
    change_trainingattendance: "Izmena prisustva na obuci",
    delete_trainingattendance: "Brisanje prisustva na obuci",
    view_trainingattendance: "Pregled prisustva na obukama",
};

interface StateProps {
    roles: Role[];
    permissions: Permission[];
    adminError?: string;
}

interface DispatchProps {
    loadRoles: () => void;
    loadPermissions: () => void;
    createRole: (p: { name: string; permissions: number[] }) => void;
    updateRole: (p: { id: number; name: string; permissions: number[] }) => void;
    deleteRole: (id: number) => void;
    setLastPath: (path: string) => void;
}

type Props = StateProps & DispatchProps;

interface State {
    dialogOpen: boolean;
    editingId: number | null;
    name: string;
    selectedPermissionIds: number[];
    deleteConfirmId: number | null;
}

class RolesListPage extends Component<Props, State> {
    state: State = {
        dialogOpen: false,
        editingId: null,
        name: "",
        selectedPermissionIds: [],
        deleteConfirmId: null,
    };

    componentDidMount(): void {
        this.props.loadRoles();
        this.props.loadPermissions();
        this.props.setLastPath("/roles");
    }

    openCreate = (): void => {
        this.setState({
            dialogOpen: true,
            editingId: null,
            name: "",
            selectedPermissionIds: [],
        });
    };

    openEdit = (role: Role): void => {
        const permIds = Array.isArray(role.permissions)
            ? (role.permissions as { id: number }[]).map((p) => p.id)
            : (role.permissions as number[]) ?? [];
        this.setState({
            dialogOpen: true,
            editingId: role.id,
            name: role.name,
            selectedPermissionIds: permIds,
        });
    };

    closeDialog = (): void => {
        this.setState({ dialogOpen: false, editingId: null, name: "", selectedPermissionIds: [] });
    };

    handleSave = (): void => {
        const { name, selectedPermissionIds, editingId } = this.state;
        if (!name.trim()) return;
        if (editingId != null) {
            this.props.updateRole({ id: editingId, name: name.trim(), permissions: selectedPermissionIds });
        } else {
            this.props.createRole({ name: name.trim(), permissions: selectedPermissionIds });
        }
        this.closeDialog();
    };

    confirmDelete = (id: number): void => {
        this.setState({ deleteConfirmId: id });
    };

    cancelDelete = (): void => {
        this.setState({ deleteConfirmId: null });
    };

    doDelete = (): void => {
        const { deleteConfirmId } = this.state;
        if (deleteConfirmId != null) {
            this.props.deleteRole(deleteConfirmId);
            this.setState({ deleteConfirmId: null });
        }
    };

    permissionLabel = (p: Permission): string =>
        PERMISSION_LABELS[p.codename] ?? p.name ?? p.codename;

    render() {
        const { roles, permissions, adminError } = this.props;
        const list = Array.isArray(roles) ? roles : [];
        const {
            dialogOpen,
            editingId,
            name,
            selectedPermissionIds,
            deleteConfirmId,
        } = this.state;

        return (
            <Box>
                {adminError && (
                    <Typography color="error" sx={{ mb: 2 }}>
                        {adminError}
                    </Typography>
                )}
                <Box sx={{ display: "flex", justifyContent: "flex-end", mb: 2 }}>
                    <PermissionGate permission="auth.add_group">
                        <Button
                            variant="contained"
                            startIcon={<AddIcon />}
                            onClick={this.openCreate}
                        >
                            Dodaj rolu
                        </Button>
                    </PermissionGate>
                </Box>
                <Paper sx={{ overflowX: "auto" }}>
                    <Table sx={{ minWidth: 400 }}>
                        <TableHead>
                            <TableRow>
                                <TableCell>Naziv</TableCell>
                                <TableCell>Permisije</TableCell>
                                <TableCell align="right">Akcije</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {list.map((role) => (
                                <TableRow key={role.id}>
                                    <TableCell>{role.name}</TableCell>
                                    <TableCell>
                                        {Array.isArray(role.permissions)
                                            ? (role.permissions as Permission[])
                                                .map((p) => this.permissionLabel(p))
                                                .join(", ") || "—"
                                            : "—"}
                                    </TableCell>
                                    <TableCell align="right">
                                        <PermissionGate permission="auth.change_group">
                                            <IconButton
                                                size="small"
                                                aria-label="izmeni"
                                                onClick={() => this.openEdit(role)}
                                            >
                                                <EditIcon />
                                            </IconButton>
                                        </PermissionGate>
                                        <PermissionGate permission="auth.delete_group">
                                            <IconButton
                                                size="small"
                                                aria-label="obriši"
                                                onClick={() => this.confirmDelete(role.id)}
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
                    <DialogTitle>{editingId != null ? "Izmena role" : "Nova rola"}</DialogTitle>
                    <DialogContent>
                        <TextField
                            autoFocus
                            margin="dense"
                            label="Naziv"
                            fullWidth
                            value={name}
                            onChange={(e) => this.setState({ name: e.target.value })}
                        />
                        <FormControl fullWidth margin="dense" sx={{ mt: 2 }}>
                            <InputLabel>Permisije</InputLabel>
                            <Select
                                multiple
                                value={selectedPermissionIds}
                                onChange={(e) =>
                                    this.setState({
                                        selectedPermissionIds: e.target.value as number[],
                                    })
                                }
                                input={<OutlinedInput label="Permisije" />}
                                renderValue={(ids) =>
                                    ids
                                        .map((id) => {
                                            const perm = permissions.find((p) => p.id === id);
                                            if (!perm) return id;
                                            return this.permissionLabel(perm);
                                        })
                                        .join(", ")
                                }
                            >
                                {permissions.map((p) => (
                                    <MenuItem key={p.id} value={p.id}>
                                        <Checkbox
                                            checked={selectedPermissionIds.includes(p.id)}
                                        />
                                        <ListItemText
                                            primary={this.permissionLabel(p)}
                                            secondary={p.codename}
                                        />
                                    </MenuItem>
                                ))}
                            </Select>
                        </FormControl>
                    </DialogContent>
                    <DialogActions>
                        <Button onClick={this.closeDialog}>Odustani</Button>
                        <Button onClick={this.handleSave} variant="contained">
                            {editingId != null ? "Sačuvaj" : "Dodaj"}
                        </Button>
                    </DialogActions>
                </Dialog>

                <Dialog open={deleteConfirmId != null} onClose={this.cancelDelete}>
                    <DialogTitle>Obriši rolu?</DialogTitle>
                    <DialogActions>
                        <Button onClick={this.cancelDelete}>Ne</Button>
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
    roles: state.auth.roles,
    permissions: state.auth.permissions,
    adminError: state.auth.adminError,
});

const mapDispatchToProps = (dispatch: AppDispatch): DispatchProps => ({
    loadRoles: () => dispatch(loadRoles()),
    loadPermissions: () => dispatch(loadPermissions()),
    createRole: (p) => dispatch(createRole(p)),
    updateRole: (p) => dispatch(updateRole(p)),
    deleteRole: (id) => dispatch(deleteRole(id)),
    setLastPath: (path) => dispatch(setLastPath(path)),
});

export default connect(mapStateToProps, mapDispatchToProps)(RolesListPage);
