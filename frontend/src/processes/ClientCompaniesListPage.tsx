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
import BusinessIcon from "@mui/icons-material/Business";
import ChevronRightIcon from "@mui/icons-material/ChevronRight";
import AddIcon from "@mui/icons-material/Add";

import { getClientCompanies, createClientCompany } from "../api/processes";
import type { ClientCompany } from "../types/processes";
import { setLastPath } from "../store/locationSlice";
import { connect } from "react-redux";
import type { AppDispatch, RootState } from "../store";
import { PermissionGate } from "../components/PermissionGate";

interface StateProps {
    setLastPath: (path: string) => void;
}
interface DispatchProps {
    setLastPath: (path: string) => void;
}
interface OwnProps {
    navigate: (path: string) => void;
}
type Props = StateProps & DispatchProps & OwnProps;

interface State {
    items: ClientCompany[];
    loading: boolean;
    error: string | null;
    dialogOpen: boolean;
    name: string;
    pib: string;
    registration_number: string;
    address: string;
    phone: string;
    email: string;
    website: string;
    notes: string;
}

class ClientCompaniesListPage extends Component<Props, State> {
    state: State = {
        items: [],
        loading: true,
        error: null,
        dialogOpen: false,
        name: "",
        pib: "",
        registration_number: "",
        address: "",
        phone: "",
        email: "",
        website: "",
        notes: "",
    };

    load = (): void => {
        this.setState({ loading: true, error: null });
        getClientCompanies()
            .then((data) => {
                this.setState({
                    items: Array.isArray(data) ? data : [],
                    loading: false,
                    error: null,
                });
            })
            .catch(() => {
                this.setState({
                    loading: false,
                    error: "Greška pri učitavanju klijenata.",
                });
            });
    };

    componentDidMount(): void {
        this.props.setLastPath("/client-companies");
        this.load();
    }

    openCreate = (): void => {
        this.setState({
            dialogOpen: true,
            name: "",
            pib: "",
            registration_number: "",
            address: "",
            phone: "",
            email: "",
            website: "",
            notes: "",
        });
    };

    closeDialog = (): void => {
        this.setState({ dialogOpen: false });
    };

    handleSave = (): void => {
        const {
            name,
            pib,
            registration_number,
            address,
            phone,
            email,
            website,
            notes,
        } = this.state;
        if (!name.trim() || !pib.trim()) return;
        const payload: Partial<ClientCompany> = {
            name: name.trim(),
            pib: pib.trim(),
            registration_number: registration_number.trim() || undefined,
            address: address.trim() || undefined,
            phone: phone.trim() || undefined,
            email: email.trim() || undefined,
            website: website.trim() || undefined,
            notes: notes.trim() || undefined,
        };
        createClientCompany(payload)
            .then(() => {
                this.setState({ dialogOpen: false });
                this.load();
            })
            .catch(() => {
                this.setState({ error: "Greška pri čuvanju klijenta." });
            });
    };

    render(): React.ReactNode {
        const {
            items,
            loading,
            error,
            dialogOpen,
            name,
            pib,
            registration_number,
            address,
            phone,
            email,
            website,
            notes,
        } = this.state;
        const { navigate } = this.props;

        return (
            <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
                <Typography
                    variant="h6"
                    sx={{ display: "flex", alignItems: "center", gap: 1 }}
                >
                    <BusinessIcon /> Klijenti
                </Typography>

                <Box sx={{ display: "flex", justifyContent: "flex-end" }}>
                    <PermissionGate permission="partners.add_clientcompany">
                        <Button
                            variant="contained"
                            startIcon={<AddIcon />}
                            onClick={this.openCreate}
                        >
                            Dodaj klijenta
                        </Button>
                    </PermissionGate>
                </Box>

                {error && <Alert severity="error">{error}</Alert>}

                {loading ? (
                    <Box
                        sx={{
                            display: "flex",
                            justifyContent: "center",
                            py: 4,
                        }}
                    >
                        <CircularProgress />
                    </Box>
                ) : (
                    <Paper sx={{ overflow: "auto" }}>
                        <Table size="small">
                            <TableHead>
                                <TableRow>
                                    <TableCell>Naziv</TableCell>
                                    <TableCell>PIB</TableCell>
                                    <TableCell>Email</TableCell>
                                    <TableCell>Telefon</TableCell>
                                    <TableCell align="right" />
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {items.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={5} align="center">
                                            Nema klijenata.
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    items.map((row) => (
                                        <TableRow
                                            key={row.id}
                                            hover
                                            sx={{ cursor: "pointer" }}
                                            onClick={() =>
                                                navigate(
                                                    `/client-companies/${row.id}`,
                                                )
                                            }
                                        >
                                            <TableCell>{row.name}</TableCell>
                                            <TableCell>{row.pib}</TableCell>
                                            <TableCell>
                                                {row.email ?? "—"}
                                            </TableCell>
                                            <TableCell>
                                                {row.phone ?? "—"}
                                            </TableCell>
                                            <TableCell align="right">
                                                <IconButton
                                                    size="small"
                                                    aria-label="Detalj"
                                                >
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
                    <DialogTitle>Novi klijent</DialogTitle>
                    <DialogContent>
                        <TextField
                            margin="dense"
                            label="Naziv"
                            fullWidth
                            required
                            value={name}
                            onChange={(e) =>
                                this.setState({ name: e.target.value })
                            }
                        />
                        <TextField
                            margin="dense"
                            label="PIB"
                            fullWidth
                            required
                            value={pib}
                            onChange={(e) =>
                                this.setState({ pib: e.target.value })
                            }
                        />
                        <TextField
                            margin="dense"
                            label="Matični broj"
                            fullWidth
                            value={registration_number}
                            onChange={(e) =>
                                this.setState({
                                    registration_number: e.target.value,
                                })
                            }
                        />
                        <TextField
                            margin="dense"
                            label="Adresa"
                            fullWidth
                            value={address}
                            onChange={(e) =>
                                this.setState({ address: e.target.value })
                            }
                        />
                        <TextField
                            margin="dense"
                            label="Telefon"
                            fullWidth
                            value={phone}
                            onChange={(e) =>
                                this.setState({ phone: e.target.value })
                            }
                        />
                        <TextField
                            margin="dense"
                            label="Email"
                            fullWidth
                            type="email"
                            value={email}
                            onChange={(e) =>
                                this.setState({ email: e.target.value })
                            }
                        />
                        <TextField
                            margin="dense"
                            label="Web sajt"
                            fullWidth
                            value={website}
                            onChange={(e) =>
                                this.setState({ website: e.target.value })
                            }
                        />
                        <TextField
                            margin="dense"
                            label="Beleške"
                            fullWidth
                            multiline
                            minRows={2}
                            value={notes}
                            onChange={(e) =>
                                this.setState({ notes: e.target.value })
                            }
                        />
                    </DialogContent>
                    <DialogActions>
                        <Button onClick={this.closeDialog}>Odustani</Button>
                        <Button
                            onClick={this.handleSave}
                            variant="contained"
                            disabled={!name.trim() || !pib.trim()}
                        >
                            Sačuvaj
                        </Button>
                    </DialogActions>
                </Dialog>
            </Box>
        );
    }
}

const mapDispatchToProps = (dispatch: AppDispatch): DispatchProps => ({
    setLastPath: (path: string) => dispatch(setLastPath(path)),
});

const Connected = connect<null, DispatchProps, OwnProps, RootState>(
    null,
    mapDispatchToProps,
)(ClientCompaniesListPage);

export default function ClientCompaniesListPageWrapper(): React.ReactElement {
    const navigate = useNavigate();
    return <Connected navigate={navigate} />;
}
