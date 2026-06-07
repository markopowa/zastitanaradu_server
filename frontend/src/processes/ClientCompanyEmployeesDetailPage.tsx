import { Component, type ReactElement } from "react";
import { useParams } from "react-router-dom";
import { connect } from "react-redux";

import {
    Box,
    Paper,
    Typography,
    CircularProgress,
    Button,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    FormControl,
    InputLabel,
    Select,
    MenuItem,
} from "@mui/material";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import EditIcon from "@mui/icons-material/Edit";
import SendIcon from "@mui/icons-material/Send";
import { enqueueSnackbar } from "notistack";

import {
    getEmployee,
    getProcessBindings,
    getProcessRuns,
    sendNowForEmployee,
} from "../api/processes";
import { EmployeeFormDialog } from "../components/EmployeeFormDialog";
import { EntityProcessBindingsPanel } from "../components/EntityProcessBindingsPanel";
import { PermissionGate } from "../components/PermissionGate";
import { ErrorState, RiskBadge } from "../design";
import { withNavigation } from "../hocs/withNavigation";
import {
    ensureClientCompanies,
    ensureProcessTypes,
} from "../store/processesSlice";
import { setBreadcrumbs, setLastPath } from "../store/locationSlice";
import { formatDateDisplay } from "../utils/date";

import type { AppDispatch, RootState } from "../store";
import type { Employee } from "../types/processes";
import type {
    ClientCompanyEmployeesDetailPageDispatchProps,
    ClientCompanyEmployeesDetailPageProps,
    ClientCompanyEmployeesDetailPageState,
} from "../types/processPages";

class ClientCompanyEmployeesDetailPageInner extends Component<
    ClientCompanyEmployeesDetailPageProps,
    ClientCompanyEmployeesDetailPageState
> {
    state: ClientCompanyEmployeesDetailPageState = {
        item: null,
        bindings: [],
        runs: [],
        loading: true,
        error: null,
        editDialogOpen: false,
        sendDialogOpen: false,
        sendProcessTypeId: "",
        sending: false,
    };

    loadProcessData = (id: number): void => {
        Promise.all([
            getProcessBindings({ employee_id: id }),
            getProcessRuns({ employee_id: id }),
        ])
            .then(([bindings, runs]) => {
                this.setState((prev) => ({ ...prev, bindings, runs }));
            })
            .catch(() => {
                enqueueSnackbar("Greška pri učitavanju obaveza.", {
                    variant: "error",
                });
            });
    };

    loadById = (id: number): void => {
        getEmployee(id)
            .then((item) => {
                this.setState((prev) => ({
                    ...prev,
                    item,
                    loading: false,
                    error: null,
                }));
                this.updateBreadcrumbs(item);
                this.loadProcessData(id);
            })
            .catch(() =>
                this.setState((prev) => ({
                    ...prev,
                    loading: false,
                    error: "Greška pri učitavanju.",
                })),
            );
    };

    private applyRouteId(mode: "mount" | "update"): void {
        const id = Number(this.props.id);
        if (!Number.isFinite(id)) {
            if (mode === "update") {
                this.setState((prev) => ({
                    ...prev,
                    loading: false,
                    error: "Neispravan ID.",
                    item: null,
                }));
            } else {
                this.setState((prev) => ({
                    ...prev,
                    loading: false,
                    error: "Neispravan ID.",
                }));
            }
            return;
        }
        if (mode === "mount") {
            this.props.setLastPath(`/client-companies-employees/${id}`);
        } else {
            this.setState((prev) => ({ ...prev, loading: true }));
        }
        this.loadById(id);
    }

    private updateBreadcrumbs(employee: Employee): void {
        const companyName = employee.client_company_name ?? "Firma";
        const companyId = employee.client_company;
        this.props.setBreadcrumbs([
            { label: "Firme", path: "/client-companies" },
            ...(companyId != null
                ? [
                      {
                          label: companyName,
                          path: `/client-companies/${companyId}`,
                      },
                  ]
                : []),
            {
                label: "Zaposleni",
                path: "/client-companies-employees",
            },
            {
                label: `${employee.first_name} ${employee.last_name}`,
            },
        ]);
    }

    componentDidMount(): void {
        this.props.ensureClientCompanies();
        this.props.ensureProcessTypes();
        this.applyRouteId("mount");
    }

    componentDidUpdate(prevProps: ClientCompanyEmployeesDetailPageProps): void {
        if (prevProps.id !== this.props.id) {
            this.applyRouteId("update");
        }
    }

    componentWillUnmount(): void {
        this.props.setBreadcrumbs([]);
    }

    openEdit = (): void => {
        this.setState({ editDialogOpen: true });
    };

    closeEdit = (): void => {
        this.setState({ editDialogOpen: false });
    };

    handleSaved = (saved: Employee): void => {
        this.setState({ item: saved });
    };

    openSendDialog = (): void => {
        const types = this.props.processTypes ?? [];
        this.setState({
            sendDialogOpen: true,
            sendProcessTypeId: types[0] ? String(types[0].id) : "",
        });
    };

    closeSendDialog = (): void => {
        this.setState({ sendDialogOpen: false, sendProcessTypeId: "" });
    };

    handleSend = (): void => {
        const { item, sendProcessTypeId } = this.state;
        if (!item || !sendProcessTypeId) return;
        this.setState({ sending: true });
        sendNowForEmployee(item.id, Number(sendProcessTypeId))
            .then((res) => {
                this.setState({ sending: false, sendDialogOpen: false });
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
                    this.setState({ sending: false });
                    const msg =
                        (err as { response?: { data?: { detail?: string } } })
                            .response?.data?.detail ??
                        (err as { message?: string }).message ??
                        "Greška pri slanju pregleda.";
                    enqueueSnackbar(msg, { variant: "error" });
                },
            );
    };

    render() {
        const { item, bindings, runs, loading, error } = this.state;
        const { editDialogOpen, sendDialogOpen, sendProcessTypeId, sending } =
            this.state;
        const { navigate, clientCompanies, processTypes } = this.props;

        if (loading) {
            return (
                <Box sx={{ display: "flex", justifyContent: "center", py: 4 }}>
                    <CircularProgress />
                </Box>
            );
        }
        if (error || !item) {
            return (
                <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
                    <ErrorState
                        message={error ?? "Zaposleni nisu pronađeni."}
                    />
                    <Button
                        startIcon={<ArrowBackIcon />}
                        onClick={() => navigate("/client-companies-employees")}
                    >
                        Nazad
                    </Button>
                </Box>
            );
        }

        const employeeName = `${item.first_name} ${item.last_name}`.trim();

        return (
            <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
                <Button
                    startIcon={<ArrowBackIcon />}
                    onClick={() => navigate("/client-companies-employees")}
                    sx={{ alignSelf: "flex-start" }}
                >
                    Nazad
                </Button>
                <Paper sx={{ p: 3 }}>
                    <Box
                        sx={{
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "space-between",
                            flexWrap: "wrap",
                            gap: 1,
                            mb: 2,
                        }}
                    >
                        <Box
                            sx={{
                                display: "flex",
                                alignItems: "center",
                                gap: 1,
                                flexWrap: "wrap",
                            }}
                        >
                            <Typography variant="h6">{employeeName}</Typography>
                            <RiskBadge
                                riskLevel={
                                    item.effective_risk_level ??
                                    item.risk_level_override_detail ??
                                    item.job_role_risk_level
                                }
                            />
                        </Box>
                        <Box sx={{ display: "flex", gap: 1 }}>
                            <PermissionGate permission="partners.change_employee">
                                <Button
                                    size="small"
                                    variant="outlined"
                                    startIcon={<EditIcon />}
                                    onClick={this.openEdit}
                                >
                                    Izmeni
                                </Button>
                            </PermissionGate>
                            <PermissionGate permission="processes.add_processrun">
                                <Button
                                    size="small"
                                    variant="contained"
                                    startIcon={<SendIcon />}
                                    onClick={this.openSendDialog}
                                >
                                    Pošalji na pregled
                                </Button>
                            </PermissionGate>
                        </Box>
                    </Box>
                    <Box
                        component="dl"
                        sx={{
                            m: 0,
                            "& dd": { ml: 2 },
                            "& dt": { fontWeight: 600, mt: 1 },
                        }}
                    >
                        <dt>Ime</dt>
                        <dd>{item.first_name ?? "—"}</dd>
                        <dt>Prezime</dt>
                        <dd>{item.last_name ?? "—"}</dd>
                        <dt>Ime oca</dt>
                        <dd>{item.father_name ?? "—"}</dd>
                        <dt>JMBG</dt>
                        <dd>{item.national_id ?? "—"}</dd>
                        <dt>Datum rođenja</dt>
                        <dd>{formatDateDisplay(item.date_of_birth)}</dd>
                        <dt>Mesto rođenja</dt>
                        <dd>{item.place_of_birth ?? "—"}</dd>
                        <dt>Firma</dt>
                        <dd>{item.client_company_name ?? "—"}</dd>
                        <dt>Email</dt>
                        <dd>{item.email ?? "—"}</dd>
                        <dt>Organizaciona jedinica</dt>
                        <dd>{item.org_unit ?? "—"}</dd>
                        <dt>Pozicija</dt>
                        <dd>{item.position ?? "—"}</dd>
                        <dt>Zanimanje</dt>
                        <dd>{item.occupation ?? "—"}</dd>
                        <dt>Naziv radnog mesta sa povećanim rizikom</dt>
                        <dd>{item.high_risk_position_name ?? "—"}</dd>
                        <dt>Radno mesto</dt>
                        <dd>{item.job_role_name ?? "—"}</dd>
                        <dt>Nivo rizika</dt>
                        <dd>
                            {item.effective_risk_level
                                ? `${item.effective_risk_level.label} (R=${item.effective_risk_level.score})${
                                      item.risk_level_override
                                          ? " — izuzetak"
                                          : " — iz radnog mesta"
                                  }`
                                : "—"}
                        </dd>
                    </Box>
                </Paper>

                <EntityProcessBindingsPanel
                    subjectKind="EMPLOYEE"
                    subjectLabel={employeeName || `Zaposleni #${item.id}`}
                    employeeId={item.id}
                    bindings={bindings}
                    runs={runs}
                    onRefresh={() => this.loadProcessData(item.id)}
                />

                <EmployeeFormDialog
                    open={editDialogOpen}
                    mode="edit"
                    initial={item}
                    clientCompanies={clientCompanies}
                    lockedClientCompanyId={item.client_company ?? undefined}
                    onClose={this.closeEdit}
                    onSaved={this.handleSaved}
                />

                <Dialog
                    open={sendDialogOpen}
                    onClose={this.closeSendDialog}
                    maxWidth="sm"
                    fullWidth
                >
                    <DialogTitle>
                        Pošalji na pregled — {employeeName}
                    </DialogTitle>
                    <DialogContent>
                        <FormControl fullWidth margin="dense">
                            <InputLabel>Vrsta pregleda</InputLabel>
                            <Select
                                value={sendProcessTypeId}
                                label="Vrsta pregleda"
                                onChange={(e) =>
                                    this.setState({
                                        sendProcessTypeId: e.target
                                            .value as string,
                                    })
                                }
                            >
                                {processTypes.map((t) => (
                                    <MenuItem key={t.id} value={String(t.id)}>
                                        {t.name}
                                    </MenuItem>
                                ))}
                            </Select>
                        </FormControl>
                    </DialogContent>
                    <DialogActions>
                        <Button
                            onClick={this.closeSendDialog}
                            disabled={sending}
                        >
                            Odustani
                        </Button>
                        <Button
                            onClick={this.handleSend}
                            variant="contained"
                            disabled={sending || !sendProcessTypeId}
                        >
                            {sending ? "Šaljem..." : "Pošalji"}
                        </Button>
                    </DialogActions>
                </Dialog>
            </Box>
        );
    }
}

const mapStateToProps = (state: RootState) => ({
    clientCompanies: state.processes.clientCompanies,
    processTypes: state.processes.processTypes,
});

const mapDispatchToProps = (
    dispatch: AppDispatch,
): ClientCompanyEmployeesDetailPageDispatchProps => ({
    setLastPath: (path: string) => dispatch(setLastPath(path)),
    setBreadcrumbs: (items) => dispatch(setBreadcrumbs(items)),
    ensureClientCompanies: () => {
        void dispatch(ensureClientCompanies());
    },
    ensureProcessTypes: () => {
        void dispatch(ensureProcessTypes());
    },
});

const Connected = connect(
    mapStateToProps,
    mapDispatchToProps,
)(ClientCompanyEmployeesDetailPageInner);
const ClientCompanyEmployeesDetailWithNavigation = withNavigation(Connected);

export default function ClientCompanyEmployeesDetailPage(): ReactElement {
    const { id } = useParams<{ id: string }>();
    return <ClientCompanyEmployeesDetailWithNavigation id={id ?? ""} />;
}
