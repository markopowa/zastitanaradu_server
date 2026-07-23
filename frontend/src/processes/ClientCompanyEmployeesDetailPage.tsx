import { Component, type ReactElement } from "react";
import { useParams } from "react-router-dom";
import { connect } from "react-redux";

import {
    Box,
    CircularProgress,
    Button,
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
    FormControl,
    InputLabel,
    Link,
    MenuItem,
    Select,
    Stack,
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableRow,
} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import BusinessCenterIcon from "@mui/icons-material/BusinessCenter";
import ContactsIcon from "@mui/icons-material/Contacts";
import DeleteIcon from "@mui/icons-material/Delete";
import DescriptionIcon from "@mui/icons-material/Description";
import DownloadIcon from "@mui/icons-material/Download";
import EditIcon from "@mui/icons-material/Edit";
import PersonIcon from "@mui/icons-material/Person";
import QuizIcon from "@mui/icons-material/Quiz";
import SchoolIcon from "@mui/icons-material/School";
import SendIcon from "@mui/icons-material/Send";
import { enqueueSnackbar } from "notistack";

import {
    createEmployeeTraining,
    deleteEmployeeTraining,
    generateEmployeeDocument,
    getEmployee,
    getEmployeeDocuments,
    getEmployeeTrainings,
    getProcessBindings,
    getProcessRuns,
    getTrainingTypes,
    sendNowForEmployee,
} from "../api/processes";
import DateTextFieldWithPicker from "../components/DateTextFieldWithPicker";
import {
    DetailCard,
    DetailField,
    DetailFieldGrid,
    DetailHeaderCard,
} from "../components/DetailCard";
import { EmployeeFormDialog } from "../components/EmployeeFormDialog";
import { EntityProcessBindingsPanel } from "../components/EntityProcessBindingsPanel";
import { PermissionGate } from "../components/PermissionGate";
import RowActionsMenu from "../components/RowActionsMenu";
import { SendNowDialog } from "../components/SendNowDialog";
import { ConfirmDialog, ErrorState, RiskBadge } from "../design";
import { withNavigation } from "../hocs/withNavigation";
import {
    ensureClientCompanies,
    ensureProcessTypes,
} from "../store/processesSlice";
import { setBreadcrumbs, setLastPath } from "../store/locationSlice";
import {
    displayDateToIso,
    formatDateDisplay,
    formatDateTimeDisplay,
} from "../utils/date";

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
        generatingObrazac6: false,
        generatingLzoRevers: false,
        trainingTypes: [],
        trainings: [],
        potvrdaDialogOpen: false,
        potvrdaTrainingTypeId: "",
        generatingPotvrda: false,
        trainingDialogOpen: false,
        trainingFormTypeId: "",
        trainingFormCompletedAt: "",
        trainingFormValidUntil: "",
        savingTraining: false,
        trainingDeleteId: null,
        deletingTraining: false,
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

    loadTrainings = (id: number): void => {
        getEmployeeTrainings({ employee_id: id })
            .then((trainings) => this.setState({ trainings }))
            .catch(() => {
                enqueueSnackbar("Greška pri učitavanju obuka.", {
                    variant: "error",
                });
            });
    };

    loadTrainingTypes = (clientCompanyId: number | null): void => {
        if (clientCompanyId == null) {
            this.setState({ trainingTypes: [] });
            return;
        }
        getTrainingTypes({ client_company_id: clientCompanyId })
            .then((trainingTypes) => this.setState({ trainingTypes }))
            .catch(() => {
                enqueueSnackbar("Greška pri učitavanju vrsta obuka.", {
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
                this.loadTrainings(id);
                this.loadTrainingTypes(item.client_company ?? null);
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

    refreshDocuments = (): void => {
        const { item } = this.state;
        if (!item) return;
        getEmployeeDocuments(item.id)
            .then((documents) => this.setState({ documents }))
            .catch(() => {
                enqueueSnackbar("Greška pri učitavanju dokumenata.", {
                    variant: "error",
                });
            });
    };

    setGeneratingState = (
        kind: "OBRAZAC6" | "LZO_REVERS",
        value: boolean,
    ): void => {
        if (kind === "OBRAZAC6") {
            this.setState({ generatingObrazac6: value });
        } else {
            this.setState({ generatingLzoRevers: value });
        }
    };

    handleGenerateDocument = (kind: "OBRAZAC6" | "LZO_REVERS"): void => {
        const { item } = this.state;
        if (!item) return;
        this.setGeneratingState(kind, true);
        generateEmployeeDocument(item.id, kind)
            .then(() => {
                this.setGeneratingState(kind, false);
                enqueueSnackbar("Dokument generisan.", {
                    variant: "success",
                });
                this.refreshDocuments();
            })
            .catch((err: { message?: string }) => {
                this.setGeneratingState(kind, false);
                enqueueSnackbar(
                    err.message ?? "Greška pri generisanju dokumenta.",
                    { variant: "error" },
                );
            });
    };

    openPotvrdaDialog = (): void => {
        const { trainingTypes } = this.state;
        this.setState({
            potvrdaDialogOpen: true,
            potvrdaTrainingTypeId: trainingTypes[0]
                ? String(trainingTypes[0].id)
                : "",
        });
    };

    closePotvrdaDialog = (): void => {
        this.setState({ potvrdaDialogOpen: false, potvrdaTrainingTypeId: "" });
    };

    handleGeneratePotvrda = (): void => {
        const { item, potvrdaTrainingTypeId } = this.state;
        if (!item || !potvrdaTrainingTypeId) return;
        this.setState({ generatingPotvrda: true });
        generateEmployeeDocument(item.id, "POTVRDA_CLAN5", {
            training_type_id: Number(potvrdaTrainingTypeId),
        })
            .then(() => {
                this.setState({
                    generatingPotvrda: false,
                    potvrdaDialogOpen: false,
                });
                enqueueSnackbar("Dokument generisan.", {
                    variant: "success",
                });
                this.refreshDocuments();
            })
            .catch((err: { message?: string }) => {
                this.setState({ generatingPotvrda: false });
                enqueueSnackbar(
                    err.message ?? "Greška pri generisanju dokumenta.",
                    { variant: "error" },
                );
            });
    };

    openTrainingDialog = (): void => {
        const { trainingTypes } = this.state;
        this.setState({
            trainingDialogOpen: true,
            trainingFormTypeId: trainingTypes[0]
                ? String(trainingTypes[0].id)
                : "",
            trainingFormCompletedAt: "",
            trainingFormValidUntil: "",
        });
    };

    closeTrainingDialog = (): void => {
        this.setState({ trainingDialogOpen: false, savingTraining: false });
    };

    saveTraining = (): void => {
        const { item, trainingFormTypeId, trainingFormCompletedAt } =
            this.state;
        const { trainingFormValidUntil } = this.state;
        if (!item || !trainingFormTypeId) return;
        this.setState({ savingTraining: true });
        createEmployeeTraining({
            employee: item.id,
            training_type: Number(trainingFormTypeId),
            completed_at:
                displayDateToIso(trainingFormCompletedAt) ?? undefined,
            valid_until:
                displayDateToIso(trainingFormValidUntil) ?? undefined,
        })
            .then((saved) => {
                this.setState((prev) => ({
                    trainings: [saved, ...prev.trainings],
                    savingTraining: false,
                    trainingDialogOpen: false,
                }));
                enqueueSnackbar("Obuka je dodata.", { variant: "success" });
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
                        "Greška pri čuvanju obuke.";
                    enqueueSnackbar(msg, { variant: "error" });
                    this.setState({ savingTraining: false });
                },
            );
    };

    confirmDeleteTraining = (id: number): void => {
        this.setState({ trainingDeleteId: id });
    };

    cancelDeleteTraining = (): void => {
        this.setState({ trainingDeleteId: null, deletingTraining: false });
    };

    executeDeleteTraining = (): void => {
        const { trainingDeleteId } = this.state;
        if (trainingDeleteId == null) return;
        this.setState({ deletingTraining: true });
        deleteEmployeeTraining(trainingDeleteId)
            .then(() => {
                this.setState((prev) => ({
                    trainings: prev.trainings.filter(
                        (x) => x.id !== trainingDeleteId,
                    ),
                    trainingDeleteId: null,
                    deletingTraining: false,
                }));
                enqueueSnackbar("Obuka je obrisana.", { variant: "success" });
            })
            .catch(() => {
                enqueueSnackbar("Greška pri brisanju obuke.", {
                    variant: "error",
                });
                this.setState({ deletingTraining: false });
            });
    };

    render() {
        const { item, bindings, runs, documents, loading, error } =
            this.state;
        const { editDialogOpen, sendDialogOpen, sendProcessTypeId, sending } =
            this.state;
        const { generatingObrazac6, generatingLzoRevers } = this.state;
        const {
            trainingTypes,
            trainings,
            potvrdaDialogOpen,
            potvrdaTrainingTypeId,
            generatingPotvrda,
            trainingDialogOpen,
            trainingFormTypeId,
            trainingFormCompletedAt,
            trainingFormValidUntil,
            savingTraining,
            trainingDeleteId,
            deletingTraining,
        } = this.state;
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
                                <Button
                                    size="small"
                                    variant="outlined"
                                    startIcon={
                                        generatingObrazac6 ? (
                                            <CircularProgress size={16} />
                                        ) : (
                                            <DownloadIcon />
                                        )
                                    }
                                    disabled={generatingObrazac6}
                                    onClick={() =>
                                        this.handleGenerateDocument(
                                            "OBRAZAC6",
                                        )
                                    }
                                >
                                    Obrazac 6
                                </Button>
                                <Button
                                    size="small"
                                    variant="outlined"
                                    startIcon={
                                        generatingLzoRevers ? (
                                            <CircularProgress size={16} />
                                        ) : (
                                            <DownloadIcon />
                                        )
                                    }
                                    disabled={generatingLzoRevers}
                                    onClick={() =>
                                        this.handleGenerateDocument(
                                            "LZO_REVERS",
                                        )
                                    }
                                >
                                    Revers LZO
                                </Button>
                                <Button
                                    size="small"
                                    variant="outlined"
                                    startIcon={<DownloadIcon />}
                                    disabled={trainingTypes.length === 0}
                                    title={
                                        trainingTypes.length === 0
                                            ? "Firma nema definisane vrste obuka."
                                            : undefined
                                    }
                                    onClick={this.openPotvrdaDialog}
                                >
                                    Potvrda (čl. 5)
                                </Button>
                                <Button
                                    size="small"
                                    variant="outlined"
                                    startIcon={<QuizIcon />}
                                    onClick={() =>
                                        navigate(`/testing/${item.id}`)
                                    }
                                >
                                    Test obuke
                                </Button>
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
                    <DetailCard
                        title="Obuke"
                        icon={
                            <SchoolIcon fontSize="small" color="action" />
                        }
                        action={
                            <PermissionGate permission="partners.add_employeetraining">
                                <Button
                                    size="small"
                                    variant="outlined"
                                    startIcon={<AddIcon />}
                                    disabled={trainingTypes.length === 0}
                                    onClick={this.openTrainingDialog}
                                >
                                    Dodaj obuku
                                </Button>
                            </PermissionGate>
                        }
                    >
                        {trainings.length === 0 ? (
                            <Box
                                sx={{
                                    color: "text.secondary",
                                    fontSize: "0.875rem",
                                }}
                            >
                                Nema evidentiranih obuka.
                            </Box>
                        ) : (
                            <Box sx={{ overflow: "auto" }}>
                                <Table size="small">
                                    <TableHead>
                                        <TableRow>
                                            <TableCell>Vrsta</TableCell>
                                            <TableCell>Završena</TableCell>
                                            <TableCell>Važi do</TableCell>
                                            <TableCell align="right">
                                                Akcije
                                            </TableCell>
                                        </TableRow>
                                    </TableHead>
                                    <TableBody>
                                        {trainings.map((tr) => (
                                            <TableRow key={tr.id}>
                                                <TableCell>
                                                    {tr.training_type_name}
                                                </TableCell>
                                                <TableCell>
                                                    {formatDateDisplay(
                                                        tr.completed_at,
                                                    )}
                                                </TableCell>
                                                <TableCell>
                                                    {formatDateDisplay(
                                                        tr.valid_until,
                                                    )}
                                                </TableCell>
                                                <TableCell align="right">
                                                    <RowActionsMenu
                                                        actions={[
                                                            {
                                                                label: "Obriši",
                                                                icon: (
                                                                    <DeleteIcon fontSize="small" />
                                                                ),
                                                                permission:
                                                                    "partners.delete_employeetraining",
                                                                color: "error",
                                                                onClick: () =>
                                                                    this.confirmDeleteTraining(
                                                                        tr.id,
                                                                    ),
                                                            },
                                                        ]}
                                                    />
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

                <Dialog
                    open={potvrdaDialogOpen}
                    onClose={this.closePotvrdaDialog}
                    maxWidth="xs"
                    fullWidth
                >
                    <DialogTitle>Potvrda po članu 5</DialogTitle>
                    <DialogContent>
                        <FormControl margin="dense" fullWidth size="small">
                            <InputLabel>Vrsta obuke</InputLabel>
                            <Select
                                label="Vrsta obuke"
                                value={potvrdaTrainingTypeId}
                                onChange={(e) =>
                                    this.setState({
                                        potvrdaTrainingTypeId:
                                            e.target.value,
                                    })
                                }
                            >
                                {trainingTypes.map((tt) => (
                                    <MenuItem key={tt.id} value={String(tt.id)}>
                                        {tt.name}
                                    </MenuItem>
                                ))}
                            </Select>
                        </FormControl>
                    </DialogContent>
                    <DialogActions>
                        <Button
                            onClick={this.closePotvrdaDialog}
                            disabled={generatingPotvrda}
                        >
                            Odustani
                        </Button>
                        <Button
                            variant="contained"
                            disabled={
                                generatingPotvrda || !potvrdaTrainingTypeId
                            }
                            onClick={this.handleGeneratePotvrda}
                        >
                            {generatingPotvrda
                                ? "Generišem..."
                                : "Generiši dokument"}
                        </Button>
                    </DialogActions>
                </Dialog>

                <Dialog
                    open={trainingDialogOpen}
                    onClose={this.closeTrainingDialog}
                    maxWidth="xs"
                    fullWidth
                >
                    <DialogTitle>Nova obuka</DialogTitle>
                    <DialogContent>
                        <FormControl margin="dense" fullWidth size="small">
                            <InputLabel>Vrsta obuke</InputLabel>
                            <Select
                                label="Vrsta obuke"
                                value={trainingFormTypeId}
                                onChange={(e) =>
                                    this.setState({
                                        trainingFormTypeId: e.target.value,
                                    })
                                }
                            >
                                {trainingTypes.map((tt) => (
                                    <MenuItem key={tt.id} value={String(tt.id)}>
                                        {tt.name}
                                    </MenuItem>
                                ))}
                            </Select>
                        </FormControl>
                        <DateTextFieldWithPicker
                            label="Datum završetka"
                            value={trainingFormCompletedAt}
                            allowPast
                            onChange={(value) =>
                                this.setState({
                                    trainingFormCompletedAt: value,
                                })
                            }
                        />
                        <DateTextFieldWithPicker
                            label="Važi do"
                            value={trainingFormValidUntil}
                            allowPast
                            onChange={(value) =>
                                this.setState({
                                    trainingFormValidUntil: value,
                                })
                            }
                        />
                    </DialogContent>
                    <DialogActions>
                        <Button
                            onClick={this.closeTrainingDialog}
                            disabled={savingTraining}
                        >
                            Odustani
                        </Button>
                        <Button
                            variant="contained"
                            disabled={savingTraining || !trainingFormTypeId}
                            onClick={this.saveTraining}
                        >
                            {savingTraining ? "Čuvam..." : "Sačuvaj"}
                        </Button>
                    </DialogActions>
                </Dialog>

                <ConfirmDialog
                    open={trainingDeleteId != null}
                    title="Obriši obuku"
                    message="Da li si siguran da želiš da obrišeš ovu obuku?"
                    loading={deletingTraining}
                    onConfirm={this.executeDeleteTraining}
                    onClose={this.cancelDeleteTraining}
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
