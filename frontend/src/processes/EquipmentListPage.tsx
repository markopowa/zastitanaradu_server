import { Component } from "react";
import { useNavigate } from "react-router-dom";
import {
  Box,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Typography,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  CircularProgress,
  Alert,
  IconButton,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
} from "@mui/material";
import BuildIcon from "@mui/icons-material/Build";
import ChevronRightIcon from "@mui/icons-material/ChevronRight";
import AddIcon from "@mui/icons-material/Add";

import {
  getEquipment,
  getClientCompanies,
  createEquipmentItem,
} from "../api/processes";
import type { EquipmentItem, ClientCompany } from "../types/processes";
import { setLastPath } from "../store/locationSlice";
import { useDispatch } from "react-redux";
import type { AppDispatch } from "../store";
import { PermissionGate } from "../components/PermissionGate";

interface Props {
  setLastPath: (path: string) => void;
  navigate: (path: string) => void;
}

interface State {
  items: EquipmentItem[];
  clients: ClientCompany[];
  client_company_id: string;
  loading: boolean;
  error: string | null;
  dialogOpen: boolean;
  name: string;
  category: string;
  inventory_number: string;
  location: string;
  notes: string;
  new_client_company_id: string;
}

class EquipmentListPageInner extends Component<Props, State> {
  state: State = {
    items: [],
    clients: [],
    client_company_id: "",
    loading: true,
    error: null,
    dialogOpen: false,
    name: "",
    category: "",
    inventory_number: "",
    location: "",
    notes: "",
    new_client_company_id: "",
  };

  load = (): void => {
    this.setState({ loading: true, error: null });
    const { client_company_id } = this.state;
    Promise.all([
      getEquipment(
        client_company_id
          ? { client_company_id: Number(client_company_id) }
          : undefined,
      ),
      getClientCompanies(),
    ])
      .then(([items, clients]) => {
        this.setState({
          items: Array.isArray(items) ? items : [],
          clients: Array.isArray(clients) ? clients : [],
          loading: false,
          error: null,
        });
      })
      .catch(() =>
        this.setState({ loading: false, error: "Greška pri učitavanju." }),
      );
  };

  componentDidMount(): void {
    this.props.setLastPath("/equipment");
    getClientCompanies().then((clients) =>
      this.setState({ clients: Array.isArray(clients) ? clients : [] }, () =>
        this.load(),
      ),
    );
  }

  openCreate = (): void => {
    const { client_company_id } = this.state;
    this.setState({
      dialogOpen: true,
      name: "",
      category: "",
      inventory_number: "",
      location: "",
      notes: "",
      new_client_company_id: client_company_id,
    });
  };

  closeDialog = (): void => {
    this.setState({ dialogOpen: false });
  };

  handleSave = (): void => {
    const {
      name,
      category,
      inventory_number,
      location,
      notes,
      new_client_company_id,
    } = this.state;
    if (!name.trim() || !new_client_company_id) return;
    const payload: Partial<EquipmentItem> = {
      name: name.trim(),
      category: category.trim() || undefined,
      inventory_number: inventory_number.trim() || undefined,
      location: location.trim() || undefined,
      notes: notes.trim() || undefined,
      client_company: Number(new_client_company_id),
      is_active: true,
    } as Partial<EquipmentItem>;
    createEquipmentItem(payload)
      .then(() => {
        this.setState({ dialogOpen: false });
        this.load();
      })
      .catch(() => this.setState({ error: "Greška pri čuvanju opreme." }));
  };

  render(): React.ReactNode {
    const {
      items,
      clients,
      client_company_id,
      loading,
      error,
      dialogOpen,
      name,
      category,
      inventory_number,
      location,
      notes,
      new_client_company_id,
    } = this.state;
    const { navigate } = this.props;

    return (
      <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
        <Typography
          variant="h6"
          sx={{ display: "flex", alignItems: "center", gap: 1 }}
        >
          <BuildIcon /> Oprema
        </Typography>
        <Box
          sx={{
            display: "flex",
            flexWrap: "wrap",
            gap: 2,
            alignItems: "center",
          }}
        >
          <FormControl size="small" sx={{ minWidth: 220 }}>
            <InputLabel>Klijent</InputLabel>
            <Select
              value={client_company_id}
              label="Klijent"
              onChange={(e) =>
                this.setState(
                  { client_company_id: e.target.value as string },
                  () => this.load(),
                )
              }
            >
              <MenuItem value="">Svi</MenuItem>
              {clients.map((c) => (
                <MenuItem key={c.id} value={String(c.id)}>
                  {c.name}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          <Box sx={{ flex: 1 }} />
          <PermissionGate permission="partners.add_equipmentitem">
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={this.openCreate}
            >
              Dodaj opremu
            </Button>
          </PermissionGate>
        </Box>
        {error && <Alert severity="error">{error}</Alert>}
        {loading ? (
          <Box sx={{ display: "flex", justifyContent: "center", py: 4 }}>
            <CircularProgress />
          </Box>
        ) : (
          <Paper sx={{ overflow: "auto" }}>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Naziv</TableCell>
                  <TableCell>Kategorija</TableCell>
                  <TableCell>Inventarski broj</TableCell>
                  <TableCell>Lokacija</TableCell>
                  <TableCell align="right" />
                </TableRow>
              </TableHead>
              <TableBody>
                {items.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} align="center">
                      Nema opreme.
                    </TableCell>
                  </TableRow>
                ) : (
                  items.map((row) => (
                    <TableRow
                      key={row.id}
                      hover
                      sx={{ cursor: "pointer" }}
                      onClick={() => navigate(`/equipment/${row.id}`)}
                    >
                      <TableCell>{row.name}</TableCell>
                      <TableCell>{row.category ?? "—"}</TableCell>
                      <TableCell>{row.inventory_number ?? "—"}</TableCell>
                      <TableCell>{row.location ?? "—"}</TableCell>
                      <TableCell align="right">
                        <IconButton size="small">
                          <ChevronRightIcon />
                        </IconButton>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </Paper>
        )}
        <Dialog
          open={dialogOpen}
          onClose={this.closeDialog}
          maxWidth="sm"
          fullWidth
        >
          <DialogTitle>Nova oprema</DialogTitle>
          <DialogContent>
            <FormControl fullWidth margin="dense">
              <InputLabel>Klijent</InputLabel>
              <Select
                value={new_client_company_id}
                label="Klijent"
                onChange={(e) =>
                  this.setState({
                    new_client_company_id: e.target.value as string,
                  })
                }
                required
              >
                {clients.map((c) => (
                  <MenuItem key={c.id} value={String(c.id)}>
                    {c.name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <TextField
              margin="dense"
              label="Naziv"
              fullWidth
              required
              value={name}
              onChange={(e) => this.setState({ name: e.target.value })}
            />
            <TextField
              margin="dense"
              label="Kategorija"
              fullWidth
              value={category}
              onChange={(e) => this.setState({ category: e.target.value })}
            />
            <TextField
              margin="dense"
              label="Inventarski broj"
              fullWidth
              value={inventory_number}
              onChange={(e) =>
                this.setState({ inventory_number: e.target.value })
              }
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
              label="Beleške"
              fullWidth
              multiline
              minRows={2}
              value={notes}
              onChange={(e) => this.setState({ notes: e.target.value })}
            />
          </DialogContent>
          <DialogActions>
            <Button onClick={this.closeDialog}>Odustani</Button>
            <Button
              onClick={this.handleSave}
              variant="contained"
              disabled={!name.trim() || !new_client_company_id}
            >
              Sačuvaj
            </Button>
          </DialogActions>
        </Dialog>
      </Box>
    );
  }
}
export default function EquipmentListPage(): React.ReactElement {
  const navigate = useNavigate();
  const dispatch = useDispatch<AppDispatch>();

  const setLastPathProp = (path: string) => dispatch(setLastPath(path));

  return (
    <EquipmentListPageInner navigate={navigate} setLastPath={setLastPathProp} />
  );
}
