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
    Button,
    Dialog,
    DialogTitle,
    DialogContent,
    TextField,
    FormControl,
    InputLabel,
    Select,
    OutlinedInput,
    MenuItem,
    Checkbox,
    ListItemText,
} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";

import { PermissionGate } from "../components/PermissionGate";
import RowActionsMenu from "../components/RowActionsMenu";
import {
    ConfirmDialog,
    ErrorState,
    FormActions,
    TableStateRow,
} from "../design";
import {
    loadRoles,
    loadPermissions,
    createRole,
    updateRole,
    deleteRole,
} from "../store/authSlice";
import { setLastPath } from "../store/locationSlice";

import type { RootState, AppDispatch } from "../store";
import type { Role, Permission } from "../types/auth";
import type {
    RolesListPageDispatchProps,
    RolesListPageProps,
    RolesListPageState,
    RolesListPageStateProps,
} from "../types/authPages";

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
    add_documenttemplate: "Dodavanje šablona dokumenta",
    change_documenttemplate: "Izmena šablona dokumenta",
    delete_documenttemplate: "Brisanje šablona dokumenta",
    view_documenttemplate: "Pregled šablona dokumenata",
    add_documentaiformat: "Dodavanje AI formata dokumenta",
    change_documentaiformat: "Izmena AI formata dokumenta",
    delete_documentaiformat: "Brisanje AI formata dokumenta",
    view_documentaiformat: "Pregled AI formata dokumenata",
    add_documentfileaiformat: "Dodavanje AI formata konkretnom dokumentu",
    change_documentfileaiformat: "Izmena AI formata konkretnog dokumenta",
    delete_documentfileaiformat: "Brisanje AI formata konkretnog dokumenta",
    view_documentfileaiformat: "Pregled AI formata konkretnih dokumenata",
    add_clientcompany: "Dodavanje firme",
    change_clientcompany: "Izmena firme",
    delete_clientcompany: "Brisanje firme",
    view_clientcompany: "Pregled firmi",
    add_employee: "Dodavanje zaposlenog",
    change_employee: "Izmena zaposlenog",
    delete_employee: "Brisanje zaposlenog",
    view_employee: "Pregled zaposlenih",
    add_equipmentitem: "Dodavanje opreme",
    change_equipmentitem: "Izmena opreme",
    delete_equipmentitem: "Brisanje opreme",
    view_equipmentitem: "Pregled opreme",
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
    add_processtype: "Dodavanje vrste obaveze",
    change_processtype: "Izmena vrste obaveze",
    delete_processtype: "Brisanje vrste obaveze",
    view_processtype: "Pregled vrsta obaveza",
    add_processtemplate: "Dodavanje šablona obaveze",
    change_processtemplate: "Izmena šablona obaveze",
    delete_processtemplate: "Brisanje šablona obaveze",
    view_processtemplate: "Pregled šablona obaveza",
    add_processbinding: "Dodavanje obaveze",
    change_processbinding: "Izmena obaveze",
    delete_processbinding: "Brisanje obaveze",
    view_processbinding: "Pregled obaveza",
    add_processrun: "Dodavanje aktivnosti",
    change_processrun: "Izmena aktivnosti",
    delete_processrun: "Brisanje aktivnosti",
    view_processrun: "Pregled aktivnosti",
    add_processrundocument: "Dodavanje dokumenta aktivnosti",
    change_processrundocument: "Izmena dokumenta aktivnosti",
    delete_processrundocument: "Brisanje dokumenta aktivnosti",
    view_processrundocument: "Pregled dokumenata aktivnosti",
    add_taskassignment: "Dodavanje zadatka",
    change_taskassignment: "Izmena zadatka",
    delete_taskassignment: "Brisanje zadatka",
    view_taskassignment: "Pregled zadataka",
};

class RolesListPage extends Component<RolesListPageProps, RolesListPageState> {
    state: RolesListPageState = {
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
        this.setState((prev) => ({
            ...prev,
            dialogOpen: true,
            editingId: null,
            name: "",
            selectedPermissionIds: [],
        }));
    };

    openEdit = (role: Role): void => {
        const permIds = Array.isArray(role.permissions)
            ? (role.permissions as { id: number }[]).map((p) => p.id)
            : ((role.permissions as number[]) ?? []);
        this.setState((prev) => ({
            ...prev,
            dialogOpen: true,
            editingId: role.id,
            name: role.name,
            selectedPermissionIds: permIds,
        }));
    };

    closeDialog = (): void => {
        this.setState((prev) => ({
            ...prev,
            dialogOpen: false,
            editingId: null,
            name: "",
            selectedPermissionIds: [],
        }));
    };

    handleSave = (): void => {
        const { name, selectedPermissionIds, editingId } = this.state;
        if (!name.trim()) return;
        if (editingId != null) {
            this.props.updateRole({
                id: editingId,
                name: name.trim(),
                permissions: selectedPermissionIds,
            });
        } else {
            this.props.createRole({
                name: name.trim(),
                permissions: selectedPermissionIds,
            });
        }
        this.closeDialog();
    };

    confirmDelete = (id: number): void => {
        this.setState((prev) => ({ ...prev, deleteConfirmId: id }));
    };

    cancelDelete = (): void => {
        this.setState((prev) => ({ ...prev, deleteConfirmId: null }));
    };

    doDelete = (): void => {
        const { deleteConfirmId } = this.state;
        if (deleteConfirmId != null) {
            this.props.deleteRole(deleteConfirmId);
            this.setState((prev) => ({ ...prev, deleteConfirmId: null }));
        }
    };

    permissionLabel = (p: Permission): string =>
        PERMISSION_LABELS[p.codename] ?? p.name ?? p.codename;

    render() {
        const { roles, permissions, adminLoading, adminError } = this.props;
        const list = Array.isArray(roles) ? roles : [];

        const relevantPermissionIds = new Set(permissions.map((p) => p.id));
        const visibleRoles = list.filter((role) => {
            if (!Array.isArray(role.permissions)) return false;
            const perms = role.permissions as Permission[];
            return perms.some((p) => relevantPermissionIds.has(p.id));
        });
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
                    <ErrorState
                        message={adminError}
                        onRetry={() => {
                            this.props.loadRoles();
                            this.props.loadPermissions();
                        }}
                    />
                )}
                <Box
                    sx={{ display: "flex", justifyContent: "flex-end", mb: 2 }}
                >
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
                            {adminLoading ? (
                                <TableStateRow colSpan={3} state="loading" />
                            ) : adminError ? (
                                <TableStateRow
                                    colSpan={3}
                                    state="error"
                                    errorMessage={adminError}
                                    onRetry={() => {
                                        this.props.loadRoles();
                                        this.props.loadPermissions();
                                    }}
                                />
                            ) : visibleRoles.length === 0 ? (
                                <TableStateRow
                                    colSpan={3}
                                    state="empty"
                                    emptyMessage="Nema rola."
                                />
                            ) : (
                                visibleRoles.map((role) => (
                                    <TableRow key={role.id}>
                                        <TableCell>{role.name}</TableCell>
                                        <TableCell>
                                            {Array.isArray(role.permissions)
                                                ? (
                                                      role.permissions as Permission[]
                                                  )
                                                      .map((p) =>
                                                          this.permissionLabel(
                                                              p,
                                                          ),
                                                      )
                                                      .join(", ") || "—"
                                                : "—"}
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
                                                            "auth.change_group",
                                                        onClick: () =>
                                                            this.openEdit(role),
                                                    },
                                                    {
                                                        label: "Obriši",
                                                        icon: (
                                                            <DeleteIcon fontSize="small" />
                                                        ),
                                                        permission:
                                                            "auth.delete_group",
                                                        color: "error",
                                                        onClick: () =>
                                                            this.confirmDelete(
                                                                role.id,
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

                <Dialog
                    open={dialogOpen}
                    onClose={this.closeDialog}
                    maxWidth="sm"
                    fullWidth
                >
                    <DialogTitle>
                        {editingId != null ? "Izmena role" : "Nova rola"}
                    </DialogTitle>
                    <DialogContent>
                        <TextField
                            autoFocus
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
                        <FormControl fullWidth margin="dense" sx={{ mt: 2 }}>
                            <InputLabel>Permisije</InputLabel>
                            <Select
                                multiple
                                value={selectedPermissionIds}
                                onChange={(e) =>
                                    this.setState((prev) => ({
                                        ...prev,
                                        selectedPermissionIds: e.target
                                            .value as number[],
                                    }))
                                }
                                input={<OutlinedInput label="Permisije" />}
                                renderValue={(ids) =>
                                    ids
                                        .map((id) => {
                                            const perm = permissions.find(
                                                (p) => p.id === id,
                                            );
                                            if (!perm) return id;
                                            return this.permissionLabel(perm);
                                        })
                                        .join(", ")
                                }
                            >
                                {permissions.map((p) => (
                                    <MenuItem key={p.id} value={p.id}>
                                        <Checkbox
                                            checked={selectedPermissionIds.includes(
                                                p.id,
                                            )}
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
                    <FormActions
                        onCancel={this.closeDialog}
                        onSave={this.handleSave}
                        disabled={!name.trim()}
                    />
                </Dialog>

                <ConfirmDialog
                    open={deleteConfirmId != null}
                    title="Obriši rolu?"
                    message="Da li sigurno želiš da obrišeš ovu rolu?"
                    confirmLabel="Obriši"
                    onConfirm={this.doDelete}
                    onClose={this.cancelDelete}
                />
            </Box>
        );
    }
}

const mapStateToProps = (state: RootState): RolesListPageStateProps => ({
    roles: state.auth.roles,
    permissions: state.auth.permissions,
    adminLoading: state.auth.adminLoading,
    adminError: state.auth.adminError,
});

const mapDispatchToProps = (
    dispatch: AppDispatch,
): RolesListPageDispatchProps => ({
    loadRoles: () => dispatch(loadRoles()),
    loadPermissions: () => dispatch(loadPermissions()),
    createRole: (p) => dispatch(createRole(p)),
    updateRole: (p) => dispatch(updateRole(p)),
    deleteRole: (id) => dispatch(deleteRole(id)),
    setLastPath: (path) => dispatch(setLastPath(path)),
});

export default connect(mapStateToProps, mapDispatchToProps)(RolesListPage);
