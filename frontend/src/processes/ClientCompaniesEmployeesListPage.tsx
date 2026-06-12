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
    TextField,
} from "@mui/material";
import BuildIcon from "@mui/icons-material/Build";
import ChevronRightIcon from "@mui/icons-material/ChevronRight";
import AddIcon from "@mui/icons-material/Add";
import SendIcon from "@mui/icons-material/Send";
import HistoryIcon from "@mui/icons-material/History";
import EditIcon from "@mui/icons-material/Edit";
import { enqueueSnackbar } from "notistack";

import { EmployeeExamHistoryDialog } from "../components/EmployeeExamHistoryDialog";
import { EmployeeFormDialog } from "../components/EmployeeFormDialog";
import RowActionsMenu from "../components/RowActionsMenu";
import { PermissionGate } from "../components/PermissionGate";
import { SendNowDialog } from "../components/SendNowDialog";
import { withNavigation } from "../hocs/withNavigation";
import { RiskBadge } from "../design";
import {
    getEmployee,
    getRiskLevels,
    sendNowForEmployee,
} from "../api/processes";
import {
    ensureClientCompanies,
    ensureProcessTypes,
    fetchEmployeesList,
} from "../store/processesSlice";
import { setLastPath } from "../store/locationSlice";

import type { AppDispatch, RootState } from "../store";
import type {
    ClientCompaniesEmployeesListPageDispatchProps,
    ClientCompaniesEmployeesListPageProps,
    ClientCompaniesEmployeesListPageState,
} from "../types/processPages";

class ClientCompaniesEmployeesListPageInner extends Component<
    ClientCompaniesEmployeesListPageProps,
    ClientCompaniesEmployeesListPageState
> {
    searchDebounceTimer: ReturnType<typeof setTimeout> | null = null;

    state: ClientCompaniesEmployeesListPageState = {
        client_company_id: "",
        search: "",
        risk_level_id: "",
        riskLevels: [],
        dialogOpen: false,
        editDialogOpen: false,
        editEmployee: null,
        historyDialogOpen: false,
        historyEmployeeId: null,
        historyEmployeeName: "",
        sendDialogOpen: false,
        sendEmployeeId: null,
        sendEmployeeName: "",
        sendProcessTypeId: "",
        sending: false,
    };

    componentWillUnmount(): void {
        if (this.searchDebounceTimer) {
            clearTimeout(this.searchDebounceTimer);
        }
    }

    openSendDialog = (employeeId: number, name: string): void => {
        const types = this.props.processTypes ?? [];
        this.setState((prev) => ({
            ...prev,
            sendDialogOpen: true,
            sendEmployeeId: employeeId,
            sendEmployeeName: name,
            sendProcessTypeId: types[0] ? String(types[0].id) : "",
        }));
    };

    closeSendDialog = (): void => {
        this.setState((prev) => ({
            ...prev,
            sendDialogOpen: false,
            sendEmployeeId: null,
            sendProcessTypeId: "",
        }));
    };

    handleSend = (): void => {
        const { sendEmployeeId, sendProcessTypeId } = this.state;
        if (sendEmployeeId == null || !sendProcessTypeId) return;
        this.setState((prev) => ({ ...prev, sending: true }));
        sendNowForEmployee(sendEmployeeId, Number(sendProcessTypeId))
            .then((res) => {
                this.setState((prev) => ({
                    ...prev,
                    sending: false,
                    sendDialogOpen: false,
                }));
                if (res.email_sent) {
                    enqueueSnackbar("Uput je poslat na mejl.", {
                        variant: "success",
                    });
                } else {
                    enqueueSnackbar(
                        "Uput je generisan, ali mejl nije poslat. Možeš ga skinuti iz aktivnosti.",
                        { variant: "warning" },
                    );
                }
                this.props.navigate("/processes/runs");
            })
            .catch(
                (
                    err:
                        | { message?: string }
                        | { response?: { data?: { detail?: string } } },
                ) => {
                    this.setState((prev) => ({ ...prev, sending: false }));
                    const msg =
                        (err as { response?: { data?: { detail?: string } } })
                            .response?.data?.detail ??
                        (err as { message?: string }).message ??
                        "Greška pri slanju pregleda.";
                    enqueueSnackbar(msg, { variant: "error" });
                },
            );
    };

    getEmployeesForClient = (): void => {
        const { client_company_id, search, risk_level_id } = this.state;
        this.props.loadEmployees({
            clientCompanyId: client_company_id,
            search,
            risk_level_id,
        });
    };

    componentDidMount(): void {
        this.props.setLastPath("/client-companies-employees");
        this.props.ensureClientCompanies();
        this.props.ensureProcessTypes();
        getRiskLevels().then((riskLevels) => this.setState({ riskLevels }));
        this.getEmployeesForClient();
    }

    openCreate = (): void => {
        this.setState({ dialogOpen: true });
    };

    closeCreateDialog = (): void => {
        this.setState({ dialogOpen: false });
    };

    openEdit = (employeeId: number): void => {
        getEmployee(employeeId).then((editEmployee) =>
            this.setState({ editDialogOpen: true, editEmployee }),
        );
    };

    closeEditDialog = (): void => {
        this.setState({ editDialogOpen: false, editEmployee: null });
    };

    openHistory = (employeeId: number, name: string): void => {
        this.setState({
            historyDialogOpen: true,
            historyEmployeeId: employeeId,
            historyEmployeeName: name,
        });
    };

    closeHistory = (): void => {
        this.setState({
            historyDialogOpen: false,
            historyEmployeeId: null,
            historyEmployeeName: "",
        });
    };

    handleSearchChange = (value: string): void => {
        this.setState({ search: value }, () => {
            if (this.searchDebounceTimer) {
                clearTimeout(this.searchDebounceTimer);
            }
            this.searchDebounceTimer = setTimeout(
                () => this.getEmployeesForClient(),
                300,
            );
        });
    };

    handleEmployeeSaved = (): void => {
        this.getEmployeesForClient();
    };

    render() {
        const {
            clientCompanies: clients,
            processTypes: types,
            employeesItems: items,
            employeesLoading: loading,
            employeesError: error,
        } = this.props;
        const {
            client_company_id,
            search,
            risk_level_id,
            riskLevels,
            dialogOpen,
            editDialogOpen,
            editEmployee,
            historyDialogOpen,
            historyEmployeeId,
            historyEmployeeName,
            sendDialogOpen,
            sendEmployeeName,
            sendProcessTypeId,
            sending,
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
                    <TextField
                        size="small"
                        label="Pretraga"
                        value={search}
                        onChange={(e) =>
                            this.handleSearchChange(e.target.value)
                        }
                        sx={{ minWidth: 200 }}
                    />
                    <FormControl size="small" sx={{ minWidth: 180 }}>
                        <InputLabel>Nivo rizika</InputLabel>
                        <Select
                            value={risk_level_id}
                            label="Nivo rizika"
                            onChange={(e) =>
                                this.setState(
                                    { risk_level_id: e.target.value as string },
                                    () => this.getEmployeesForClient(),
                                )
                            }
                        >
                            <MenuItem value="">Svi</MenuItem>
                            {riskLevels.map((rl) => (
                                <MenuItem key={rl.id} value={String(rl.id)}>
                                    {rl.label} (R={rl.score})
                                </MenuItem>
                            ))}
                        </Select>
                    </FormControl>
                    <FormControl size="small" sx={{ minWidth: 220 }}>
                        <InputLabel>Firma</InputLabel>
                        <Select
                            value={client_company_id}
                            label="Firma"
                            onChange={(e) =>
                                this.setState(
                                    {
                                        client_company_id: e.target
                                            .value as string,
                                    },
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
                                    <TableCell>Rizik</TableCell>
                                    <TableCell align="right" />
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {items.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={7} align="center">
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
                                            <TableCell>
                                                <RiskBadge
                                                    riskLevel={
                                                        row.effective_risk_level ??
                                                        row.risk_level_override_detail ??
                                                        row.job_role_risk_level
                                                    }
                                                />
                                            </TableCell>
                                            <TableCell
                                                align="right"
                                                sx={{ whiteSpace: "nowrap" }}
                                                onClick={(e) =>
                                                    e.stopPropagation()
                                                }
                                            >
                                                <Box
                                                    sx={{
                                                        display: "inline-flex",
                                                        alignItems: "center",
                                                        gap: 0.5,
                                                    }}
                                                >
                                                    <RowActionsMenu
                                                        actions={[
                                                            {
                                                                label: "Istorija pregleda",
                                                                icon: (
                                                                    <HistoryIcon fontSize="small" />
                                                                ),
                                                                onClick: () => {
                                                                    this.openHistory(
                                                                        row.id,
                                                                        `${row.first_name} ${row.last_name}`.trim(),
                                                                    );
                                                                },
                                                            },
                                                            {
                                                                label: "Izmeni",
                                                                icon: (
                                                                    <EditIcon fontSize="small" />
                                                                ),
                                                                permission:
                                                                    "partners.change_employee",
                                                                onClick: () => {
                                                                    this.openEdit(
                                                                        row.id,
                                                                    );
                                                                },
                                                            },
                                                            {
                                                                label: "Pošalji na pregled",
                                                                icon: (
                                                                    <SendIcon fontSize="small" />
                                                                ),
                                                                permission:
                                                                    "processes.add_processrun",
                                                                onClick: () => {
                                                                    this.openSendDialog(
                                                                        row.id,
                                                                        `${row.first_name} ${row.last_name}`.trim(),
                                                                    );
                                                                },
                                                            },
                                                        ]}
                                                    />
                                                    <IconButton size="small">
                                                        <ChevronRightIcon />
                                                    </IconButton>
                                                </Box>
                                            </TableCell>
                                        </TableRow>
                                    ))
                                )}
                            </TableBody>
                        </Table>
                    </Paper>
                )}

                <EmployeeFormDialog
                    open={dialogOpen}
                    mode="create"
                    clientCompanies={clients}
                    initialClientCompanyId={client_company_id}
                    onClose={this.closeCreateDialog}
                    onSaved={() => this.handleEmployeeSaved()}
                />

                <EmployeeFormDialog
                    open={editDialogOpen}
                    mode="edit"
                    initial={editEmployee ?? undefined}
                    clientCompanies={clients}
                    onClose={this.closeEditDialog}
                    onSaved={() => this.handleEmployeeSaved()}
                />

                <EmployeeExamHistoryDialog
                    open={historyDialogOpen}
                    employeeId={historyEmployeeId}
                    employeeName={historyEmployeeName}
                    onClose={this.closeHistory}
                />

                <SendNowDialog
                    open={sendDialogOpen}
                    employeeName={sendEmployeeName}
                    processTypes={types}
                    processTypeId={sendProcessTypeId}
                    sending={sending}
                    onChangeProcessType={(id) =>
                        this.setState({ sendProcessTypeId: id })
                    }
                    onClose={this.closeSendDialog}
                    onSend={this.handleSend}
                />
            </Box>
        );
    }
}
const mapStateToProps = (state: RootState) => ({
    clientCompanies: state.processes.clientCompanies,
    processTypes: state.processes.processTypes,
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
    ensureProcessTypes: () => {
        void dispatch(ensureProcessTypes());
    },
    loadEmployees: (params) => {
        void dispatch(fetchEmployeesList(params));
    },
});

const Connected = connect(
    mapStateToProps,
    mapDispatchToProps,
)(ClientCompaniesEmployeesListPageInner);
const ClientCompaniesEmployeesListPageWithNavigation =
    withNavigation(Connected);
export default ClientCompaniesEmployeesListPageWithNavigation;
