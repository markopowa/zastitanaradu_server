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
    Tooltip,
} from "@mui/material";
import BuildIcon from "@mui/icons-material/Build";
import ChevronRightIcon from "@mui/icons-material/ChevronRight";
import AddIcon from "@mui/icons-material/Add";

import DateTextFieldWithPicker from "../components/DateTextFieldWithPicker";
import { PermissionGate } from "../components/PermissionGate";
import { withNavigation } from "../hocs/withNavigation";
import {
    addEmployee,
    ensureClientCompanies,
    fetchEmployeesList,
} from "../store/processesSlice";
import { setLastPath } from "../store/locationSlice";
import { StringToDate } from "../utils/date";

import type { AppDispatch, RootState } from "../store";
import type { Employee } from "../types/processes";
import type {
    ClientCompaniesEmployeesListPageDispatchProps,
    ClientCompaniesEmployeesListPageProps,
    ClientCompaniesEmployeesListPageState,
} from "../types/processPages";

class ClientCompaniesEmployeesListPageInner extends Component<
    ClientCompaniesEmployeesListPageProps,
    ClientCompaniesEmployeesListPageState
> {
    state: ClientCompaniesEmployeesListPageState = {
        client_company_id: "",
        dialogOpen: false,
        first_name: "",
        last_name: "",
        father_name: "",
        national_id: "",
        date_of_birth: "",
        place_of_birth: "",
        email: "",
        org_unit: "",
        position: "",
        occupation: "",
        high_risk_position_name: "",
        new_client_company_id: "",
    };

    isFilled = (): boolean => {
        const {
            first_name,
            last_name,
            email,
            org_unit,
            position,
            new_client_company_id,
        } = this.state;

        return [
            first_name,
            last_name,
            email,
            org_unit,
            position,
            new_client_company_id,
        ].every((elem) => elem !== "");
    };

    getEmployeesForClient = (): void => {
        this.props.loadEmployees(this.state.client_company_id);
    };

    componentDidMount(): void {
        this.props.setLastPath("/client-companies-employees");
        this.props.ensureClientCompanies();
        this.getEmployeesForClient();
    }

    openCreate = (): void => {
        this.setState((prev) => ({
            dialogOpen: true,
            first_name: "",
            last_name: "",
            father_name: "",
            national_id: "",
            date_of_birth: "",
            place_of_birth: "",
            email: "",
            org_unit: "",
            position: "",
            occupation: "",
            high_risk_position_name: "",
            new_client_company_id: prev.client_company_id,
        }));
    };

    closeDialog = (): void => {
        this.setState((prev) => ({ ...prev, dialogOpen: false }));
    };

    handleSave = (): void => {
        const {
            first_name,
            last_name,
            email,
            org_unit,
            position,
            new_client_company_id,
        } = this.state;
        if (!first_name.trim() || !new_client_company_id) return;
        const {
            father_name,
            national_id,
            date_of_birth,
            place_of_birth,
            occupation,
            high_risk_position_name,
        } = this.state;
        let dateOfBirthSent: string | undefined;
        if (date_of_birth.trim()) {
            const d = StringToDate(date_of_birth);
            dateOfBirthSent = d
                ? `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`
                : undefined;
        }
        const payload: Partial<Employee> = {
            first_name: first_name.trim(),
            last_name: last_name.trim(),
            father_name: father_name.trim() || undefined,
            national_id: national_id.trim() || undefined,
            date_of_birth: dateOfBirthSent,
            place_of_birth: place_of_birth.trim() || undefined,
            email: email.trim(),
            org_unit: org_unit.trim(),
            position: position.trim(),
            occupation: occupation.trim() || undefined,
            high_risk_position_name:
                high_risk_position_name.trim() || undefined,
            client_company: Number(new_client_company_id),
        };
        void this.props
            .addEmployee(payload)
            .unwrap()
            .then(() => {
                this.setState((prev) => ({ ...prev, dialogOpen: false }));
            });
    };

    render() {
        const {
            clientCompanies: clients,
            employeesItems: items,
            employeesLoading: loading,
            employeesError: error,
        } = this.props;
        const {
            client_company_id,
            dialogOpen,
            first_name,
            last_name,
            father_name,
            national_id,
            date_of_birth,
            place_of_birth,
            email,
            org_unit,
            position,
            occupation,
            high_risk_position_name,
            new_client_company_id,
        } = this.state;
        const { navigate } = this.props;

        return (
            <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
                <Typography
                    variant="h6"
                    sx={{ display: "flex", alignItems: "center", gap: 1 }}
                >
                    <BuildIcon /> Zaposleni
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
                                    (prev) => ({
                                        ...prev,
                                        client_company_id: e.target
                                            .value as string,
                                    }),
                                    () => this.getEmployeesForClient(),
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
                    <PermissionGate permission="partners.add_employee">
                        <Button
                            variant="contained"
                            startIcon={<AddIcon />}
                            onClick={this.openCreate}
                        >
                            Dodaj zaposlenog
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
                                    <TableCell>Ime</TableCell>
                                    <TableCell>Prezime</TableCell>
                                    <TableCell>Email</TableCell>
                                    <TableCell>
                                        Organizaciona jedinica
                                    </TableCell>
                                    <TableCell>Pozicija</TableCell>
                                    <TableCell align="right" />
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {items.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={5} align="center">
                                            Nema zaposlenih.
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
                                                    `/client-companies-employees/${row.id}`,
                                                )
                                            }
                                        >
                                            <TableCell>
                                                {row.first_name}
                                            </TableCell>
                                            <TableCell>
                                                {row.last_name}
                                            </TableCell>
                                            <TableCell>{row.email}</TableCell>
                                            <TableCell>
                                                {row.org_unit ?? "—"}
                                            </TableCell>
                                            <TableCell>
                                                {row.position ?? "—"}
                                            </TableCell>
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
                    <DialogTitle>Nov zaposleni</DialogTitle>
                    <DialogContent>
                        <FormControl fullWidth margin="dense">
                            <InputLabel>Klijent</InputLabel>
                            <Select
                                value={new_client_company_id}
                                label="Klijent"
                                onChange={(e) =>
                                    this.setState((prev) => ({
                                        ...prev,
                                        new_client_company_id: e.target
                                            .value as string,
                                    }))
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
                            label="Ime"
                            fullWidth
                            required
                            value={first_name}
                            onChange={(e) =>
                                this.setState((prev) => ({
                                    ...prev,
                                    first_name: e.target.value,
                                }))
                            }
                        />
                        <TextField
                            margin="dense"
                            label="Prezime"
                            required
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
                            margin="dense"
                            label="Ime oca"
                            fullWidth
                            value={father_name}
                            onChange={(e) =>
                                this.setState((prev) => ({
                                    ...prev,
                                    father_name: e.target.value,
                                }))
                            }
                        />
                        <Tooltip title="Jedinstveni matični broj građanina (13 cifara).">
                            <TextField
                                margin="dense"
                                label="JMBG"
                                fullWidth
                                value={national_id}
                                onChange={(e) =>
                                    this.setState((prev) => ({
                                        ...prev,
                                        national_id: e.target.value,
                                    }))
                                }
                            />
                        </Tooltip>
                        <Tooltip title="Datum rođenja zaposlenog za lekarske obrasce.">
                            <Box>
                                <DateTextFieldWithPicker
                                    label="Datum rođenja (dd.mm.yyyy)"
                                    value={date_of_birth}
                                    onChange={(v) =>
                                        this.setState((prev) => ({
                                            ...prev,
                                            date_of_birth: v,
                                        }))
                                    }
                                    defaultYearsAgo={18}
                                    minYearsAgo={18}
                                    minYearsAgoMessage="Zaposleni mora imati najmanje 18 godina. Da li si siguran da želiš da nastaviš sa izabranim datumom?"
                                />
                            </Box>
                        </Tooltip>
                        <TextField
                            margin="dense"
                            label="Mesto rođenja"
                            fullWidth
                            value={place_of_birth}
                            onChange={(e) =>
                                this.setState((prev) => ({
                                    ...prev,
                                    place_of_birth: e.target.value,
                                }))
                            }
                        />
                        <TextField
                            margin="dense"
                            label="Email"
                            required
                            fullWidth
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
                            label="Organizaciona jedinica"
                            required
                            fullWidth
                            value={org_unit}
                            onChange={(e) =>
                                this.setState((prev) => ({
                                    ...prev,
                                    org_unit: e.target.value,
                                }))
                            }
                        />
                        <TextField
                            margin="dense"
                            label="Pozicija"
                            required
                            fullWidth
                            value={position}
                            onChange={(e) =>
                                this.setState((prev) => ({
                                    ...prev,
                                    position: e.target.value,
                                }))
                            }
                        />
                        <TextField
                            margin="dense"
                            label="Zanimanje"
                            fullWidth
                            value={occupation}
                            onChange={(e) =>
                                this.setState((prev) => ({
                                    ...prev,
                                    occupation: e.target.value,
                                }))
                            }
                        />
                        <TextField
                            margin="dense"
                            label="Naziv radnog mesta sa povećanim rizikom"
                            fullWidth
                            value={high_risk_position_name}
                            onChange={(e) =>
                                this.setState((prev) => ({
                                    ...prev,
                                    high_risk_position_name: e.target.value,
                                }))
                            }
                        />
                    </DialogContent>
                    <DialogActions>
                        <Button onClick={this.closeDialog}>Odustani</Button>
                        <Button
                            onClick={this.handleSave}
                            variant="contained"
                            disabled={!this.isFilled()}
                        >
                            Sačuvaj
                        </Button>
                    </DialogActions>
                </Dialog>
            </Box>
        );
    }
}
const mapStateToProps = (state: RootState) => ({
    clientCompanies: state.processes.clientCompanies,
    employeesItems: state.processes.employeesItems,
    employeesLoading: state.processes.employeesStatus === "loading",
    employeesError:
        state.processes.employeesStatus === "failed"
            ? (state.processes.employeesError ?? "Greška")
            : null,
});

const mapDispatchToProps = (
    dispatch: AppDispatch,
): ClientCompaniesEmployeesListPageDispatchProps => ({
    setLastPath: (path: string) => dispatch(setLastPath(path)),
    ensureClientCompanies: () => {
        void dispatch(ensureClientCompanies());
    },
    loadEmployees: (clientCompanyId: string) => {
        void dispatch(fetchEmployeesList(clientCompanyId));
    },
    addEmployee: (payload: Partial<Employee>) => dispatch(addEmployee(payload)),
});

const Connected = connect(
    mapStateToProps,
    mapDispatchToProps,
)(ClientCompaniesEmployeesListPageInner);
const ClientCompaniesEmployeesListPageWithNavigation =
    withNavigation(Connected);
export default ClientCompaniesEmployeesListPageWithNavigation;
