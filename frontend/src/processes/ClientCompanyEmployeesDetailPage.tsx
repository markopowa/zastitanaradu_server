import { Component, type ReactElement } from "react";
import { useParams } from "react-router-dom";
import { connect } from "react-redux";

import {
    Box,
    CircularProgress,
    Button,
    Link,
    Stack,
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableRow,
} from "@mui/material";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import BusinessCenterIcon from "@mui/icons-material/BusinessCenter";
import ContactsIcon from "@mui/icons-material/Contacts";
import DescriptionIcon from "@mui/icons-material/Description";
import EditIcon from "@mui/icons-material/Edit";
import PersonIcon from "@mui/icons-material/Person";
import SendIcon from "@mui/icons-material/Send";
import { enqueueSnackbar } from "notistack";

import {
    getEmployee,
    getEmployeeDocuments,
    getProcessBindings,
    getProcessRuns,
    sendNowForEmployee,
} from "../api/processes";
import {
    DetailCard,
    DetailField,
    DetailFieldGrid,
    DetailHeaderCard,
} from "../components/DetailCard";
import { EmployeeFormDialog } from "../components/EmployeeFormDialog";
import { EntityProcessBindingsPanel } from "../components/EntityProcessBindingsPanel";
import { PermissionGate } from "../components/PermissionGate";
import { SendNowDialog } from "../components/SendNowDialog";
import { ErrorState, RiskBadge } from "../design";
import { withNavigation } from "../hocs/withNavigation";
import {
    ensureClientCompanies,
    ensureProcessTypes,
} from "../store/processesSlice";
import { setBreadcrumbs, setLastPath } from "../store/locationSlice";
import { formatDateDisplay, formatDateTimeDisplay } from "../utils/date";

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
        documents: [],
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
            getEmployeeDocuments(id),
        ])
            .then(([bindings, runs, documents]) => {
                this.setState((prev) => ({
                    ...prev,
                    bindings,
                    runs,
                    documents,
                }));
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
        const { item, bindings, runs, documents, loading, error } =
            this.state;
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
        const effectiveRisk =
            item.effective_risk_level ??
            item.risk_level_override_detail ??
            item.job_role_risk_level;

        return (
            <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
                <Button
                    startIcon={<ArrowBackIcon />}
                    onClick={() => navigate("/client-companies-employees")}
                    sx={{ alignSelf: "flex-start" }}
                >
                    Nazad
                </Button>
                <Stack spacing={2}>
                    <DetailHeaderCard
                        initials={[item.first_name, item.last_name]
                            .filter(Boolean)
                            .map((w) => (w ?? "")[0] ?? "")
                            .join("")
                            .toUpperCase()}
                        title={employeeName}
                        subtitle={
                            item.position ?? item.job_role_name ?? undefined
                        }
                        badges={<RiskBadge riskLevel={effectiveRisk} />}
                        action={
                            <>
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
                            </>
                        }
                    />

                    <DetailCard
                        title="Lični podaci"
                        icon={<PersonIcon fontSize="small" color="action" />}
                    >
                        <DetailFieldGrid>
                            <DetailField
                                label="JMBG"
                                value={item.national_id}
                            />
                            <DetailField
                                label="Datum rođenja"
                                value={
                                    formatDateDisplay(item.date_of_birth) ||
                                    undefined
                                }
                            />
                            <DetailField
                                label="Mesto rođenja"
                                value={item.place_of_birth}
                            />
                            <DetailField
                                label="Ime oca"
                                value={item.father_name}
                            />
                        </DetailFieldGrid>
                    </DetailCard>

                    <DetailCard
                        title="Posao"
                        icon={
                            <BusinessCenterIcon
                                fontSize="small"
                                color="action"
                            />
                        }
                    >
                        <DetailFieldGrid>
                            <DetailField
                                label="Firma"
                                value={
                                    item.client_company != null ? (
                                        <Link
                                            href={`/client-companies/${item.client_company}`}
                                            onClick={(e) => {
                                                e.preventDefault();
                                                navigate(
                                                    `/client-companies/${item.client_company}`,
                                                );
                                            }}
                                        >
                                            {item.client_company_name ??
                                                `Firma #${item.client_company}`}
                                        </Link>
                                    ) : (
                                        item.client_company_name
                                    )
                                }
                            />
                            <DetailField
                                label="Radno mesto"
                                value={item.job_role_name}
                            />
                            <DetailField
                                label="Organizaciona jedinica"
                                value={item.org_unit}
                            />
                            <DetailField
                                label="Zanimanje"
                                value={item.occupation}
                            />
                            <DetailField
                                label="Pozicija"
                                value={item.position}
                            />
                            {item.high_risk_position_name && (
                                <DetailField
                                    label="Radno mesto sa povećanim rizikom"
                                    value={item.high_risk_position_name}
                                />
                            )}
                            <DetailField
                                label="Nivo rizika"
                                value={
                                    item.effective_risk_level
                                        ? `${item.effective_risk_level.label} (R=${item.effective_risk_level.score}) — ${item.risk_level_override ? "izuzetak" : "iz radnog mesta"}`
                                        : undefined
                                }
                            />
                        </DetailFieldGrid>
                    </DetailCard>

                    <DetailCard
                        title="Kontakt"
                        icon={<ContactsIcon fontSize="small" color="action" />}
                    >
                        <DetailFieldGrid>
                            <DetailField
                                label="Email"
                                value={
                                    item.email ? (
                                        <Link href={`mailto:${item.email}`}>
                                            {item.email}
                                        </Link>
                                    ) : undefined
                                }
                            />
                        </DetailFieldGrid>
                    </DetailCard>
                    <DetailCard
                        title="Dokumenti"
                        icon={
                            <DescriptionIcon
                                fontSize="small"
                                color="action"
                            />
                        }
                    >
                        {documents.length === 0 ? (
                            <Box
                                sx={{
                                    color: "text.secondary",
                                    fontSize: "0.875rem",
                                }}
                            >
                                Nema generisanih dokumenata.
                            </Box>
                        ) : (
                            <Box sx={{ overflow: "auto" }}>
                                <Table size="small">
                                    <TableHead>
                                        <TableRow>
                                            <TableCell>Naziv</TableCell>
                                            <TableCell>Vrsta obaveze</TableCell>
                                            <TableCell>Datum</TableCell>
                                            <TableCell align="right">
                                                Akcije
                                            </TableCell>
                                        </TableRow>
                                    </TableHead>
                                    <TableBody>
                                        {documents.map((doc) => (
                                            <TableRow key={doc.id}>
                                                <TableCell>
                                                    {doc.name}
                                                </TableCell>
                                                <TableCell>
                                                    {doc.process_type_name}
                                                </TableCell>
                                                <TableCell>
                                                    {formatDateTimeDisplay(
                                                        doc.created_at,
                                                    )}
                                                </TableCell>
                                                <TableCell align="right">
                                                    <Link
                                                        href={doc.file_url}
                                                        target="_blank"
                                                        rel="noreferrer"
                                                    >
                                                        Preuzmi
                                                    </Link>
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </Box>
                        )}
                    </DetailCard>
                </Stack>

                <EntityProcessBindingsPanel
                    subjectKind="EMPLOYEE"
                    subjectLabel={employeeName || `Zaposleni #${item.id}`}
                    employeeId={item.id}
                    bindings={bindings}
                    runs={runs}
                    onRefresh={() => this.loadProcessData(item.id)}
                    navigate={navigate}
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

                <SendNowDialog
                    open={sendDialogOpen}
                    employeeName={employeeName}
                    processTypes={processTypes}
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
