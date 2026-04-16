import { Component } from "react";
import { connect } from "react-redux";

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
    Tooltip,
} from "@mui/material";
import BusinessIcon from "@mui/icons-material/Business";
import ChevronRightIcon from "@mui/icons-material/ChevronRight";
import AddIcon from "@mui/icons-material/Add";
import { enqueueSnackbar } from "notistack";

import { PermissionGate } from "../components/PermissionGate";
import { withNavigation } from "../hocs/withNavigation";
import {
    addClientCompany,
    ensureClientCompanies,
} from "../store/processesSlice";
import { setLastPath } from "../store/locationSlice";

import type { AppDispatch, RootState } from "../store";
import type { ClientCompany } from "../types/processes";
import type {
    ClientCompaniesListPageDispatchProps,
    ClientCompaniesListPageProps,
    ClientCompaniesListPageState,
    ClientCompaniesListPageStateProps,
} from "../types/processPages";

class ClientCompaniesListPage extends Component<
    ClientCompaniesListPageProps,
    ClientCompaniesListPageState
> {
    state: ClientCompaniesListPageState = {
        dialogOpen: false,
        name: "",
        tax_id: "",
        registration_number: "",
        address: "",
        phone: "",
        email: "",
        website: "",
        notes: "",
        activity_code: "",
    };

    componentDidMount(): void {
        this.props.setLastPath("/client-companies");
        this.props.ensureClientCompanies();
    }

    openCreate = (): void => {
        this.setState((prev) => ({
            ...prev,
            dialogOpen: true,
            name: "",
            tax_id: "",
            registration_number: "",
            address: "",
            phone: "",
            email: "",
            website: "",
            notes: "",
            activity_code: "",
        }));
    };

    closeDialog = (): void => {
        this.setState((prev) => ({ ...prev, dialogOpen: false }));
    };

    handleSave = (): void => {
        const {
            name,
            tax_id,
            registration_number,
            address,
            phone,
            email,
            website,
            notes,
            activity_code,
        } = this.state;
        if (!name.trim() || !tax_id.trim()) return;
        const payload: Partial<ClientCompany> = {
            name: name.trim(),
            tax_id: tax_id.trim(),
            registration_number: registration_number.trim() || undefined,
            address: address.trim() || undefined,
            phone: phone.trim() || undefined,
            email: email.trim() || undefined,
            website: website.trim() || undefined,
            notes: notes.trim() || undefined,
            activity_code: activity_code.trim() || undefined,
        };
        void this.props
            .addClientCompany(payload)
            .unwrap()
            .then(() => {
                this.setState((prev) => ({ ...prev, dialogOpen: false }));
            })
            .catch(
                (
                    err:
                        | { message?: string }
                        | { response?: { data?: { detail?: string } } },
                ) => {
                    const msg =
                        (err as { response?: { data?: { detail?: string } } })
                            .response?.data?.detail ??
                        (err as { message?: string }).message ??
                        "Greška pri čuvanju klijenta.";
                    enqueueSnackbar(msg, { variant: "error" });
                },
            );
    };

    render() {
        const {
            clientCompanies: items,
            listLoading: loading,
            listError: error,
        } = this.props;
        const {
            dialogOpen,
            name,
            tax_id,
            registration_number,
            address,
            phone,
            email,
            website,
            notes,
            activity_code,
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
                                            <TableCell>{row.tax_id}</TableCell>
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
                                this.setState((prev) => ({
                                    ...prev,
                                    name: e.target.value,
                                }))
                            }
                        />
                        <TextField
                            margin="dense"
                            label="PIB"
                            fullWidth
                            required
                            value={tax_id}
                            onChange={(e) =>
                                this.setState((prev) => ({
                                    ...prev,
                                    tax_id: e.target.value,
                                }))
                            }
                        />
                        <TextField
                            margin="dense"
                            label="Matični broj"
                            fullWidth
                            value={registration_number}
                            onChange={(e) =>
                                this.setState((prev) => ({
                                    ...prev,
                                    registration_number: e.target.value,
                                }))
                            }
                        />
                        <TextField
                            margin="dense"
                            label="Adresa"
                            fullWidth
                            value={address}
                            onChange={(e) =>
                                this.setState((prev) => ({
                                    ...prev,
                                    address: e.target.value,
                                }))
                            }
                        />
                        <TextField
                            margin="dense"
                            label="Telefon"
                            fullWidth
                            value={phone}
                            onChange={(e) =>
                                this.setState((prev) => ({
                                    ...prev,
                                    phone: e.target.value,
                                }))
                            }
                        />
                        <TextField
                            margin="dense"
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
                            margin="dense"
                            label="Web sajt"
                            fullWidth
                            value={website}
                            onChange={(e) =>
                                this.setState((prev) => ({
                                    ...prev,
                                    website: e.target.value,
                                }))
                            }
                        />
                        <Tooltip title="Šifra delatnosti">
                            <TextField
                                margin="dense"
                                label="Šifra delatnosti"
                                fullWidth
                                value={activity_code}
                                onChange={(e) =>
                                    this.setState((prev) => ({
                                        ...prev,
                                        activity_code: e.target.value,
                                    }))
                                }
                            />
                        </Tooltip>
                        <TextField
                            margin="dense"
                            label="Beleške"
                            fullWidth
                            multiline
                            minRows={2}
                            value={notes}
                            onChange={(e) =>
                                this.setState((prev) => ({
                                    ...prev,
                                    notes: e.target.value,
                                }))
                            }
                        />
                    </DialogContent>
                    <DialogActions>
                        <Button onClick={this.closeDialog}>Odustani</Button>
                        <Button
                            onClick={this.handleSave}
                            variant="contained"
                            disabled={!name.trim() || !tax_id.trim()}
                        >
                            Sačuvaj
                        </Button>
                    </DialogActions>
                </Dialog>
            </Box>
        );
    }
}

const mapStateToProps = (
    state: RootState,
): ClientCompaniesListPageStateProps => ({
    clientCompanies: state.processes.clientCompanies,
    listLoading: state.processes.clientCompaniesStatus === "loading",
    listError:
        state.processes.clientCompaniesStatus === "failed"
            ? (state.processes.clientCompaniesError ?? "Greška")
            : null,
});

const mapDispatchToProps = (
    dispatch: AppDispatch,
): ClientCompaniesListPageDispatchProps => ({
    setLastPath: (path: string) => dispatch(setLastPath(path)),
    ensureClientCompanies: () => {
        void dispatch(ensureClientCompanies());
    },
    addClientCompany: (payload: Partial<ClientCompany>) =>
        dispatch(addClientCompany(payload)),
});

const Connected = connect(
    mapStateToProps,
    mapDispatchToProps,
)(ClientCompaniesListPage);
const ClientCompaniesListPageWithNavigation = withNavigation(Connected);
export default ClientCompaniesListPageWithNavigation;
