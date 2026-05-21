import { Component } from "react";
import { connect } from "react-redux";
import {
    Box,
    Table,
    TableHead,
    TableRow,
    TableCell,
    TableBody,
    Button,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    TextField,
    FormControlLabel,
    Checkbox,
    FormControl,
    InputLabel,
    Select,
    OutlinedInput,
    MenuItem,
    ListItemText,
    Stack,
    Typography,
} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import EditIcon from "@mui/icons-material/Edit";

import { PermissionGate } from "../components/PermissionGate";
import RowActionsMenu from "../components/RowActionsMenu";
import {
    ScrollableTablePaper,
    tableCellEllipsis,
} from "../components/ScrollableTablePaper";
import {
    loadUsers,
    loadRoles,
    createUser,
    updateUser,
    clearAdminError,
} from "../store/authSlice";
import { setLastPath } from "../store/locationSlice";

import type { RootState, AppDispatch } from "../store";
import type { AuthUser } from "../types/auth";
import type {
    UsersListPageDispatchProps,
    UsersListPageProps,
    UsersListPageState,
    UsersListPageStateProps,
} from "../types/authPages";

class UsersListPage extends Component<UsersListPageProps, UsersListPageState> {
    state: UsersListPageState = {
        dialogOpen: false,
        editingUser: null,
        username: "",
        first_name: "",
        last_name: "",
        email: "",
        password: "",
        is_active: true,
        selectedRoleIds: [],
    };

    componentDidMount(): void {
        this.props.loadUsers();
        this.props.loadRoles();
        this.props.setLastPath("/users");
    }

    openCreate = (): void => {
        this.props.clearAdminError();
        this.setState((prev) => ({
            ...prev,
            dialogOpen: true,
            editingUser: null,
            username: "",
            first_name: "",
            last_name: "",
            email: "",
            password: "",
            is_active: true,
            selectedRoleIds: [],
        }));
    };

    openEdit = (user: AuthUser): void => {
        this.props.clearAdminError();
        this.setState((prev) => ({
            ...prev,
            dialogOpen: true,
            editingUser: user,
            username: user.username,
            first_name: user.first_name ?? "",
            last_name: user.last_name ?? "",
            email: user.email ?? "",
            password: "",
            is_active: user.is_active ?? true,
            selectedRoleIds: user.roles ?? [],
        }));
    };

    closeDialog = (): void => {
        this.setState((prev) => ({
            ...prev,
            dialogOpen: false,
            editingUser: null,
            username: "",
            first_name: "",
            last_name: "",
            email: "",
            password: "",
            is_active: true,
            selectedRoleIds: [],
        }));
    };

    handleSave = (): void => {
        const {
            editingUser,
            username,
            first_name,
            last_name,
            email,
            password,
            is_active,
            selectedRoleIds,
        } = this.state;
        if (!username.trim()) return;
        if (editingUser != null) {
            this.props.updateUser({
                id: editingUser.id,
                username: username.trim(),
                first_name: first_name.trim(),
                last_name: last_name.trim(),
                email: email.trim(),
                is_active,
                roles: selectedRoleIds,
                password: password || undefined,
            });
        } else {
            if (!password.trim()) return;
            this.props.createUser({
                username: username.trim(),
                first_name: first_name.trim(),
                last_name: last_name.trim(),
                email: email.trim(),
                password,
                is_active,
                roles: selectedRoleIds,
            });
        }
        this.closeDialog();
    };

    render() {
        const { users, roles, adminError } = this.props;
        const list = Array.isArray(users) ? users : [];
        const {
            dialogOpen,
            editingUser,
            username,
            first_name,
            last_name,
            email,
            password,
            is_active,
            selectedRoleIds,
        } = this.state;
        const roleList = Array.isArray(roles) ? roles : [];

        return (
            <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
                {adminError && (
                    <Typography color="error">{adminError}</Typography>
                )}
                <Box sx={{ display: "flex", justifyContent: "flex-end" }}>
                    <PermissionGate permission="auth.add_user">
                        <Button
                            variant="contained"
                            startIcon={<AddIcon />}
                            onClick={this.openCreate}
                        >
                            Dodaj korisnika
                        </Button>
                    </PermissionGate>
                </Box>
                <ScrollableTablePaper>
                    <Table
                        size="small"
                        sx={{ width: "100%", tableLayout: "fixed" }}
                    >
                        <TableHead>
                            <TableRow>
                                <TableCell sx={tableCellEllipsis}>
                                    Username
                                </TableCell>
                                <TableCell sx={tableCellEllipsis}>
                                    Ime
                                </TableCell>
                                <TableCell sx={tableCellEllipsis}>
                                    Prezime
                                </TableCell>
                                <TableCell sx={tableCellEllipsis}>
                                    Email
                                </TableCell>
                                <TableCell sx={tableCellEllipsis}>
                                    Aktivan
                                </TableCell>
                                <TableCell align="right" sx={tableCellEllipsis}>
                                    Akcije
                                </TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {list.map((user) => (
                                <TableRow key={user.id}>
                                    <TableCell sx={tableCellEllipsis}>
                                        {user.username}
                                    </TableCell>
                                    <TableCell sx={tableCellEllipsis}>
                                        {user.first_name ?? ""}
                                    </TableCell>
                                    <TableCell sx={tableCellEllipsis}>
                                        {user.last_name ?? ""}
                                    </TableCell>
                                    <TableCell sx={tableCellEllipsis}>
                                        {user.email ?? ""}
                                    </TableCell>
                                    <TableCell>
                                        {user.is_active ? "Da" : "Ne"}
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
                                                        "auth.change_user",
                                                    onClick: () =>
                                                        this.openEdit(user),
                                                },
                                            ]}
                                        />
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </ScrollableTablePaper>

                <Dialog
                    open={dialogOpen}
                    onClose={this.closeDialog}
                    maxWidth="sm"
                    fullWidth
                >
                    <DialogTitle>
                        {editingUser != null
                            ? "Izmena korisnika"
                            : "Novi korisnik"}
                    </DialogTitle>
                    <DialogContent>
                        <Stack spacing={2} sx={{ pt: 1 }}>
                            <TextField
                                autoFocus
                                label="Username"
                                fullWidth
                                required
                                value={username}
                                onChange={(e) =>
                                    this.setState((prev) => ({
                                        ...prev,
                                        username: e.target.value,
                                    }))
                                }
                                disabled={editingUser != null}
                            />
                            <TextField
                                label="Ime"
                                fullWidth
                                value={first_name}
                                onChange={(e) =>
                                    this.setState((prev) => ({
                                        ...prev,
                                        first_name: e.target.value,
                                    }))
                                }
                            />
                            <TextField
                                label="Prezime"
                                fullWidth
                                value={last_name}
                                onChange={(e) =>
                                    this.setState((prev) => ({
                                        ...prev,
                                        last_name: e.target.value,
                                    }))
                                }
                            />
                            <TextField
                                label="Email"
                                fullWidth
                                type="email"
                                value={email}
                                onChange={(e) =>
                                    this.setState((prev) => ({
                                        ...prev,
                                        email: e.target.value,
                                    }))
                                }
                            />
                            <TextField
                                label={
                                    editingUser != null
                                        ? "Nova lozinka (ostavite prazno da ne menjate)"
                                        : "Lozinka"
                                }
                                fullWidth
                                type="password"
                                required={editingUser == null}
                                value={password}
                                onChange={(e) =>
                                    this.setState((prev) => ({
                                        ...prev,
                                        password: e.target.value,
                                    }))
                                }
                            />
                            <FormControlLabel
                                control={
                                    <Checkbox
                                        checked={is_active}
                                        onChange={(e) =>
                                            this.setState((prev) => ({
                                                ...prev,
                                                is_active: e.target.checked,
                                            }))
                                        }
                                    />
                                }
                                label="Aktivan"
                                sx={{ alignSelf: "flex-start", ml: 0 }}
                            />
                            <FormControl fullWidth>
                                <InputLabel>Role (grupe)</InputLabel>
                                <Select
                                    multiple
                                    value={selectedRoleIds}
                                    onChange={(e) =>
                                        this.setState((prev) => ({
                                            ...prev,
                                            selectedRoleIds: e.target
                                                .value as number[],
                                        }))
                                    }
                                    input={
                                        <OutlinedInput label="Role (grupe)" />
                                    }
                                    renderValue={(ids) =>
                                        ids
                                            .map(
                                                (id) =>
                                                    roleList.find(
                                                        (r) => r.id === id,
                                                    )?.name ?? id,
                                            )
                                            .join(", ")
                                    }
                                >
                                    {roleList.map((r) => (
                                        <MenuItem key={r.id} value={r.id}>
                                            <ListItemText primary={r.name} />
                                        </MenuItem>
                                    ))}
                                </Select>
                            </FormControl>
                        </Stack>
                    </DialogContent>
                    <DialogActions>
                        <Button onClick={this.closeDialog}>Odustani</Button>
                        <Button
                            onClick={this.handleSave}
                            variant="contained"
                            disabled={
                                !username.trim() ||
                                (editingUser == null && !password.trim())
                            }
                        >
                            {editingUser != null ? "Sačuvaj" : "Dodaj"}
                        </Button>
                    </DialogActions>
                </Dialog>
            </Box>
        );
    }
}

const mapStateToProps = (state: RootState): UsersListPageStateProps => ({
    users: state.auth.users,
    roles: state.auth.roles,
    adminError: state.auth.adminError,
});

const mapDispatchToProps = (
    dispatch: AppDispatch,
): UsersListPageDispatchProps => ({
    loadUsers: () => dispatch(loadUsers()),
    loadRoles: () => dispatch(loadRoles()),
    createUser: (p) => dispatch(createUser(p)),
    updateUser: (p) => dispatch(updateUser(p)),
    clearAdminError: () => dispatch(clearAdminError()),
    setLastPath: (path) => dispatch(setLastPath(path)),
});

export default connect(mapStateToProps, mapDispatchToProps)(UsersListPage);
