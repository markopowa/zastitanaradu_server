import { Component } from "react";
import { connect } from "react-redux";
import {
  Box,
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
  FormControl,
  InputLabel,
  Select,
  OutlinedInput,
  MenuItem,
  ListItemText,
  Typography,
} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import EditIcon from "@mui/icons-material/Edit";
import { PermissionGate } from "../components/PermissionGate";
import {
  ScrollableTablePaper,
  tableCellEllipsis,
} from "../components/ScrollableTablePaper";

import type { RootState, AppDispatch } from "../store";
import {
  loadUsers,
  loadRoles,
  createUser,
  updateUser,
  clearAdminError,
} from "../store/authSlice";
import type { AuthUser, Role } from "../types/auth";
import { setLastPath } from "../store/locationSlice";

interface StateProps {
  users: AuthUser[];
  roles: Role[];
  adminError?: string;
}

interface DispatchProps {
  loadUsers: () => void;
  loadRoles: () => void;
  createUser: (p: {
    username: string;
    first_name: string;
    last_name: string;
    email: string;
    password: string;
    is_active?: boolean;
    roles?: number[];
  }) => void;
  updateUser: (p: {
    id: number;
    username: string;
    first_name: string;
    last_name: string;
    email: string;
    is_active: boolean;
    roles: number[];
    password?: string;
  }) => void;
  clearAdminError: () => void;
  setLastPath: (path: string) => void;
}

type Props = StateProps & DispatchProps;

interface State {
  dialogOpen: boolean;
  editingUser: AuthUser | null;
  username: string;
  first_name: string;
  last_name: string;
  email: string;
  password: string;
  is_active: boolean;
  selectedRoleIds: number[];
}

class UsersListPage extends Component<Props, State> {
  state: State = {
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
    this.setState({
      dialogOpen: true,
      editingUser: null,
      username: "",
      first_name: "",
      last_name: "",
      email: "",
      password: "",
      is_active: true,
      selectedRoleIds: [],
    });
  };

  openEdit = (user: AuthUser): void => {
    this.props.clearAdminError();
    this.setState({
      dialogOpen: true,
      editingUser: user,
      username: user.username,
      first_name: user.first_name ?? "",
      last_name: user.last_name ?? "",
      email: user.email ?? "",
      password: "",
      is_active: user.is_active ?? true,
      selectedRoleIds: user.roles ?? [],
    });
  };

  closeDialog = (): void => {
    this.setState({
      dialogOpen: false,
      editingUser: null,
      username: "",
      first_name: "",
      last_name: "",
      email: "",
      password: "",
      is_active: true,
      selectedRoleIds: [],
    });
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
                    <Typography color="error">
                        {adminError}
                    </Typography>
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
          <Table size="small" sx={{ width: "100%", tableLayout: "fixed" }}>
            <TableHead>
              <TableRow>
                <TableCell sx={tableCellEllipsis}>Username</TableCell>
                <TableCell sx={tableCellEllipsis}>Ime</TableCell>
                <TableCell sx={tableCellEllipsis}>Prezime</TableCell>
                <TableCell sx={tableCellEllipsis}>Email</TableCell>
                <TableCell sx={tableCellEllipsis}>Aktivan</TableCell>
                <TableCell align="right" sx={tableCellEllipsis}>Akcije</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {list.map((user) => (
                <TableRow key={user.id}>
                  <TableCell sx={tableCellEllipsis}>{user.username}</TableCell>
                  <TableCell sx={tableCellEllipsis}>{user.first_name ?? ""}</TableCell>
                  <TableCell sx={tableCellEllipsis}>{user.last_name ?? ""}</TableCell>
                  <TableCell sx={tableCellEllipsis}>{user.email ?? ""}</TableCell>
                  <TableCell>{user.is_active ? "Da" : "Ne"}</TableCell>
                  <TableCell align="right">
                    <PermissionGate permission="auth.change_user">
                      <IconButton
                        size="small"
                        aria-label="izmeni"
                        onClick={() => this.openEdit(user)}
                      >
                        <EditIcon />
                      </IconButton>
                    </PermissionGate>
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
            {editingUser != null ? "Izmena korisnika" : "Novi korisnik"}
          </DialogTitle>
          <DialogContent>
            <TextField
              autoFocus
              margin="dense"
              label="Username"
              fullWidth
              required
              value={username}
              onChange={(e) => this.setState({ username: e.target.value })}
              disabled={editingUser != null}
            />
            <TextField
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
              label={
                editingUser != null
                  ? "Nova lozinka (ostavite prazno da ne menjate)"
                  : "Lozinka"
              }
              fullWidth
              type="password"
              required={editingUser == null}
              value={password}
              onChange={(e) => this.setState({ password: e.target.value })}
            />
            <FormControlLabel
              control={
                <Checkbox
                  checked={is_active}
                  onChange={(e) =>
                    this.setState({ is_active: e.target.checked })
                  }
                />
              }
              label="Aktivan"
              sx={{ mt: 1 }}
            />
            <FormControl fullWidth margin="dense" sx={{ mt: 2 }}>
              <InputLabel>Role (grupe)</InputLabel>
              <Select
                multiple
                value={selectedRoleIds}
                onChange={(e) =>
                  this.setState({
                    selectedRoleIds: e.target.value as number[],
                  })
                }
                input={<OutlinedInput label="Role (grupe)" />}
                renderValue={(ids) =>
                  ids
                    .map((id) => roleList.find((r) => r.id === id)?.name ?? id)
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
          </DialogContent>
          <DialogActions>
            <Button onClick={this.closeDialog}>Odustani</Button>
            <Button
              onClick={this.handleSave}
              variant="contained"
              disabled={
                !username.trim() || (editingUser == null && !password.trim())
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

const mapStateToProps = (state: RootState): StateProps => ({
  users: state.auth.users,
  roles: state.auth.roles,
  adminError: state.auth.adminError,
});

const mapDispatchToProps = (dispatch: AppDispatch): DispatchProps => ({
  loadUsers: () => dispatch(loadUsers()),
  loadRoles: () => dispatch(loadRoles()),
  createUser: (p) => dispatch(createUser(p)),
  updateUser: (p) => dispatch(updateUser(p)),
  clearAdminError: () => dispatch(clearAdminError()),
  setLastPath: (path) => dispatch(setLastPath(path)),
});

export default connect(mapStateToProps, mapDispatchToProps)(UsersListPage);
