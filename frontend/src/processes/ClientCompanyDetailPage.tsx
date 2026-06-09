import { Component, Fragment, type ReactElement } from "react";
import { useParams } from "react-router-dom";
import { connect } from "react-redux";

import {
    Box,
    Paper,
    Typography,
    CircularProgress,
    Alert,
    Button,
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableRow,
    TextField,
    Tooltip,
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
import AddIcon from "@mui/icons-material/Add";
import BlockIcon from "@mui/icons-material/Block";
import DeleteIcon from "@mui/icons-material/Delete";
import EditIcon from "@mui/icons-material/Edit";
import { enqueueSnackbar } from "notistack";

import DateTextFieldWithPicker from "../components/DateTextFieldWithPicker";
import {
    bindingTermDateError,
    displayDateToIso,
    formatDateDisplay,
    isoDateToFormDisplay,
} from "../utils/date";
import {
    registryLookup,
    createEquipmentItem,
    createJobRole,
    deleteClientCompany,
    deleteJobRole,
    generateMedicalExamRecord,
    getClientCompany,
    getEmployees,
    getEquipment,
    getJobRoles,
    getProcessBindings,
    getProcessRuns,
    getRiskLevels,
    updateClientCompany,
    updateJobRole,
    updateProcessBinding,
} from "../api/processes";
import { PermissionGate } from "../components/PermissionGate";
import { AddProcessBindingDialog } from "../components/AddProcessBindingDialog";
import { EmployeeFormDialog } from "../components/EmployeeFormDialog";
import { CompanyDocumentsPanel } from "../components/CompanyDocumentsPanel";
import { CompanyComplianceOverview } from "../components/CompanyComplianceOverview";
import { AppButton } from "../design/AppButton";
import { CompanyTabBar } from "../components/CompanyTabBar";
import { ContactPersonsPanel } from "../components/ContactPersonsPanel";
import { ComplianceFindingsPanel } from "../components/ComplianceFindingsPanel";
import { RiskAssessmentActPanel } from "../components/RiskAssessmentActPanel";
import RowActionsMenu from "../components/RowActionsMenu";
import { withNavigation } from "../hocs/withNavigation";
import { setBreadcrumbs, setLastPath } from "../store/locationSlice";
import {
    companyTabUrl,
    parseCompanyTab,
    type CompanyTabKey,
} from "../utils/companyTabs";
import {
    ConfirmDialog,
    RiskBadge,
    SectionCard,
    StatusBadge,
    TableStateRow,
} from "../design";

import type {
    ClientCompanyDetailPageProps,
    ClientCompanyDetailPageState,
} from "../types/processPages";
import type {
    ClientCompany,
    Employee,
    EmployeeSummary,
    EquipmentItem,
    JobRole,
    ProcessBinding,
} from "../types/processes";

const formatDate = (v?: string | null) => formatDateDisplay(v);

function jobRoleSaveError(
    err:
        | { message?: string }
        | { response?: { data?: { detail?: string; name?: string[] } } },
): string {
    const data = (err as { response?: { data?: Record<string, unknown> } })
        .response?.data;
    if (data != null) {
        const nameErr = data.name;
        if (Array.isArray(nameErr) && nameErr.length > 0) {
            return "Radno mesto sa tim nazivom već postoji.";
        }
        const detail = data.detail;
        if (typeof detail === "string") {
            const lower = detail.toLowerCase();
            if (lower.includes("unique") || lower.includes("naziv")) {
                return "Radno mesto sa tim nazivom već postoji.";
            }
            return detail;
        }
    }
    return (
        (err as { message?: string }).message ??
        "Greška pri čuvanju radnog mesta."
    );
}

function bindingSubjectLabel(
    b: ProcessBinding,
    employees: EmployeeSummary[],
    equipment: EquipmentItem[],
    company: ClientCompany,
): string {
    if (b.employee != null) {
        const e = employees.find((x) => x.id === b.employee);
        if (e) {
            const name = `${e.first_name} ${e.last_name}`.trim();
            if (name) return name;
        }
        return `Zaposleni #${b.employee}`;
    }
    if (b.equipment_item != null) {
        const eq = equipment.find((x) => x.id === b.equipment_item);
        if (eq?.name) return eq.name;
        return `Oprema #${b.equipment_item}`;
    }
    return company.name;
}

class ClientCompanyDetailPageInner extends Component<
    ClientCompanyDetailPageProps,
    ClientCompanyDetailPageState
> {
    state: ClientCompanyDetailPageState = {
        item: null,
        employees: [],
        equipment: [],
        bindings: [],
        runs: [],
        loading: true,
        error: null,
        generatingDoc: false,
        docError: null,
        editing: false,
        saving: false,
        saveError: null,
        editName: "",
        editTaxId: "",
        editRegistration_number: "",
        editAddress: "",
        editPhone: "",
        editEmail: "",
        editWebsite: "",
        editNotes: "",
        editActivity_code: "",
        registryImporting: false,
        riskLevels: [],
        jobRoles: [],
        roleDialogOpen: false,
        editingRoleId: null,
        role_name: "",
        role_risk_level: "",
        role_description: "",
        savingRole: false,
        roleError: null,
        roleDeleteTarget: null,
        deletingRole: false,
        empDialogOpen: false,
        eqDialogOpen: false,
        eq_name: "",
        eq_category: "",
        eq_inventory_number: "",
        eq_location: "",
        eq_notes: "",
        savingEquipment: false,
        equipmentError: null,
        bindingDialogOpen: false,
        savingStartDateBindingId: null,
        deactivatingBindingId: null,
        companyDeleteOpen: false,
        deletingCompany: false,
    };

    openCompanyDelete = (): void => {
        this.setState({ companyDeleteOpen: true });
    };

    closeCompanyDelete = (): void => {
        this.setState({ companyDeleteOpen: false });
    };

    confirmCompanyDelete = (): void => {
        const id = Number(this.props.id);
        if (!Number.isFinite(id)) return;
        this.setState({ deletingCompany: true });
        deleteClientCompany(id)
            .then(() => {
                enqueueSnackbar("Firma je obrisana.", { variant: "success" });
                this.props.navigate("/client-companies");
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
                        "Greška pri brisanju firme.";
                    enqueueSnackbar(msg, { variant: "error" });
                    this.setState({
                        deletingCompany: false,
                        companyDeleteOpen: false,
                    });
                },
            );
    };

    openEmpDialog = (): void => {
        this.setState({ empDialogOpen: true });
    };

    closeEmpDialog = (): void => {
        this.setState({ empDialogOpen: false });
    };

    handleEmployeeSaved = (created: Employee): void => {
        const id = Number(this.props.id);
        const summary: EmployeeSummary = {
            id: created.id,
            client_company: created.client_company ?? id,
            first_name: created.first_name,
            last_name: created.last_name,
            email: created.email,
            org_unit: created.org_unit,
            position: created.position,
            job_role_risk_level: created.job_role_risk_level,
            risk_level_override: created.risk_level_override,
            risk_level_override_detail: created.risk_level_override_detail,
            effective_risk_level: created.effective_risk_level,
        };
        this.setState((prev) => ({
            ...prev,
            employees: [...prev.employees, summary],
        }));
    };

    openEqDialog = (): void => {
        this.setState((prev) => ({
            ...prev,
            eqDialogOpen: true,
            equipmentError: null,
            eq_name: "",
            eq_category: "",
            eq_inventory_number: "",
            eq_location: "",
            eq_notes: "",
        }));
    };

    closeEqDialog = (): void => {
        this.setState((prev) => ({ ...prev, eqDialogOpen: false }));
    };

    saveEquipment = (): void => {
        const id = Number(this.props.id);
        const {
            eq_name,
            eq_category,
            eq_inventory_number,
            eq_location,
            eq_notes,
        } = this.state;
        if (!eq_name.trim()) return;
        const payload: Partial<EquipmentItem> = {
            name: eq_name.trim(),
            category: eq_category.trim() || undefined,
            inventory_number: eq_inventory_number.trim() || undefined,
            location: eq_location.trim() || undefined,
            notes: eq_notes.trim() || undefined,
            client_company: id,
            is_active: true,
        };
        this.setState((prev) => ({
            ...prev,
            savingEquipment: true,
            equipmentError: null,
        }));
        createEquipmentItem(payload)
            .then((created) => {
                this.setState((prev) => ({
                    ...prev,
                    equipment: [...prev.equipment, created],
                    savingEquipment: false,
                    eqDialogOpen: false,
                }));
                enqueueSnackbar("Oprema dodata.", { variant: "success" });
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
                        "Greška pri čuvanju opreme.";
                    this.setState((prev) => ({
                        ...prev,
                        savingEquipment: false,
                        equipmentError: msg,
                    }));
                },
            );
    };

    openRoleDialog = (): void => {
        this.setState((prev) => ({
            ...prev,
            roleDialogOpen: true,
            roleError: null,
            editingRoleId: null,
            role_name: "",
            role_risk_level: "",
            role_description: "",
        }));
    };

    openRoleEdit = (role: JobRole): void => {
        this.setState((prev) => ({
            ...prev,
            roleDialogOpen: true,
            roleError: null,
            editingRoleId: role.id,
            role_name: role.name,
            role_risk_level: role.risk_level ? String(role.risk_level) : "",
            role_description: role.description ?? "",
        }));
    };

    closeRoleDialog = (): void => {
        this.setState((prev) => ({ ...prev, roleDialogOpen: false }));
    };

    openRoleDelete = (role: JobRole): void => {
        this.setState({ roleDeleteTarget: role });
    };

    closeRoleDelete = (): void => {
        this.setState({ roleDeleteTarget: null, deletingRole: false });
    };

    confirmRoleDelete = (): void => {
        const { roleDeleteTarget } = this.state;
        if (roleDeleteTarget == null) return;
        this.setState({ deletingRole: true });
        deleteJobRole(roleDeleteTarget.id)
            .then(() => {
                this.setState((prev) => ({
                    jobRoles: prev.jobRoles.filter(
                        (r) => r.id !== roleDeleteTarget.id,
                    ),
                    roleDeleteTarget: null,
                    deletingRole: false,
                }));
                enqueueSnackbar("Radno mesto obrisano.", {
                    variant: "success",
                });
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
                        "Greška pri brisanju radnog mesta.";
                    enqueueSnackbar(msg, { variant: "error" });
                    this.setState({ deletingRole: false });
                },
            );
    };

    saveRole = (): void => {
        const companyId = Number(this.props.id);
        const { editingRoleId, role_name, role_risk_level, role_description } =
            this.state;
        if (!role_name.trim()) return;
        const payload: Partial<JobRole> = {
            name: role_name.trim(),
            description: role_description.trim() || undefined,
            risk_level: role_risk_level ? Number(role_risk_level) : null,
        };
        this.setState((prev) => ({
            ...prev,
            savingRole: true,
            roleError: null,
        }));
        const request =
            editingRoleId != null
                ? updateJobRole(editingRoleId, payload)
                : createJobRole({
                      ...payload,
                      client_company: companyId,
                  });
        request
            .then((saved) => {
                this.setState((prev) => ({
                    jobRoles:
                        editingRoleId != null
                            ? prev.jobRoles.map((r) =>
                                  r.id === saved.id ? saved : r,
                              )
                            : [...prev.jobRoles, saved],
                    savingRole: false,
                    roleDialogOpen: false,
                }));
                enqueueSnackbar(
                    editingRoleId != null
                        ? "Radno mesto sačuvano."
                        : "Radno mesto dodato.",
                    { variant: "success" },
                );
            })
            .catch((err) => {
                const msg = jobRoleSaveError(err);
                enqueueSnackbar(msg, { variant: "error" });
                this.setState((prev) => ({
                    ...prev,
                    savingRole: false,
                    roleError: msg,
                }));
            });
    };

    startEdit = (): void => {
        const { item } = this.state;
        if (!item) return;
        this.setState((prev) => ({
            ...prev,
            editing: true,
            saveError: null,
            editName: item.name,
            editTaxId: item.tax_id,
            editRegistration_number: item.registration_number ?? "",
            editAddress: item.address ?? "",
            editPhone: item.phone ?? "",
            editEmail: item.email ?? "",
            editWebsite: item.website ?? "",
            editNotes: item.notes ?? "",
            editActivity_code: item.activity_code ?? "",
        }));
    };

    cancelEdit = (): void => {
        this.setState((prev) => ({
            ...prev,
            editing: false,
            saveError: null,
        }));
    };

    handleRegistryImport = (): void => {
        const { editRegistration_number } = this.state;
        if (!editRegistration_number.trim()) return;
        this.setState((prev) => ({ ...prev, registryImporting: true }));
        registryLookup(editRegistration_number.trim())
            .then((data) => {
                this.setState((prev) => ({
                    ...prev,
                    registryImporting: false,
                    editName: data.name ?? prev.editName,
                    editRegistration_number:
                        data.registration_number ??
                        prev.editRegistration_number,
                    editAddress: data.address ?? prev.editAddress,
                    editActivity_code:
                        data.activity_code ?? prev.editActivity_code,
                }));
                const cutOff = data.data_cut_off_date
                    ? ` (podaci od ${data.data_cut_off_date})`
                    : "";
                enqueueSnackbar(`Podaci preuzeti iz registra${cutOff}.`, {
                    variant: "success",
                });
            })
            .catch(() => {
                this.setState((prev) => ({
                    ...prev,
                    registryImporting: false,
                }));
                enqueueSnackbar(
                    "Firma nije pronađena u registru ili snapshot nije učitan. Unesite podatke ručno.",
                    { variant: "warning" },
                );
            });
    };

    saveCompany = (): void => {
        const id = Number(this.props.id);
        const {
            editName,
            editTaxId,
            editRegistration_number,
            editAddress,
            editPhone,
            editEmail,
            editWebsite,
            editNotes,
            editActivity_code,
        } = this.state;
        if (!editName.trim() || !editTaxId.trim()) return;
        this.setState((prev) => ({ ...prev, saving: true, saveError: null }));
        updateClientCompany(id, {
            name: editName.trim(),
            tax_id: editTaxId.trim(),
            registration_number: editRegistration_number.trim() || undefined,
            address: editAddress.trim() || undefined,
            phone: editPhone.trim() || undefined,
            email: editEmail.trim() || undefined,
            website: editWebsite.trim() || undefined,
            notes: editNotes.trim() || undefined,
            activity_code: editActivity_code.trim() || undefined,
        })
            .then((item) => {
                this.setState((prev) => ({
                    ...prev,
                    item,
                    saving: false,
                    editing: false,
                    saveError: null,
                }));
                enqueueSnackbar("Podaci o firmi su sačuvani.", {
                    variant: "success",
                });
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
                        "Greška pri čuvanju.";
                    this.setState((prev) => ({
                        ...prev,
                        saving: false,
                        saveError: msg,
                    }));
                },
            );
    };

    handleGenerateMedicalExamRecord = (): void => {
        const id = Number(this.props.id);
        this.setState((prev) => ({
            ...prev,
            generatingDoc: true,
            docError: null,
        }));
        generateMedicalExamRecord(id)
            .then(() =>
                this.setState((prev) => ({ ...prev, generatingDoc: false })),
            )
            .catch(() =>
                this.setState((prev) => ({
                    ...prev,
                    generatingDoc: false,
                    docError: "Greška pri generisanju evidencije.",
                })),
            );
    };

    loadExtra = (id: number): void => {
        Promise.all([
            getEmployees({ client_company_id: id }),
            getEquipment({ client_company_id: id }),
            getProcessBindings({ client_company_id: id }),
            getProcessRuns({ client_company_id: id }),
            getJobRoles({ client_company_id: id }),
            getRiskLevels(),
        ]).then(
            ([employees, equipment, bindings, runs, jobRoles, riskLevels]) => {
                this.setState((prev) => ({
                    ...prev,
                    employees,
                    equipment,
                    bindings,
                    runs,
                    jobRoles,
                    riskLevels,
                }));
            },
        );
    };

    handleBindingStartDateChange = (
        bindingId: number,
        displayDate: string,
    ): void => {
        const termError = bindingTermDateError(displayDate);
        if (termError) {
            enqueueSnackbar(termError, { variant: "error" });
            return;
        }
        const nextRunAtISO = displayDateToIso(displayDate);
        if (!nextRunAtISO) return;
        const companyId = Number(this.props.id);
        this.setState((prev) => ({
            ...prev,
            savingStartDateBindingId: bindingId,
        }));
        updateProcessBinding(bindingId, { next_run_at: nextRunAtISO })
            .then(() => {
                this.setState((prev) => ({
                    ...prev,
                    savingStartDateBindingId: null,
                }));
                enqueueSnackbar("Termin je sačuvan.", {
                    variant: "success",
                });
                this.loadExtra(companyId);
            })
            .catch(
                (
                    err:
                        | { message?: string }
                        | { response?: { data?: { detail?: string } } },
                ) => {
                    this.setState((prev) => ({
                        ...prev,
                        savingStartDateBindingId: null,
                    }));
                    const msg =
                        (err as { response?: { data?: { detail?: string } } })
                            .response?.data?.detail ??
                        (err as { message?: string }).message ??
                        "Greška pri čuvanju termina.";
                    enqueueSnackbar(msg, { variant: "error" });
                },
            );
    };

    handleBindingDeactivate = (bindingId: number): void => {
        const companyId = Number(this.props.id);
        this.setState((prev) => ({
            ...prev,
            deactivatingBindingId: bindingId,
        }));
        updateProcessBinding(bindingId, { is_active: false })
            .then(() => {
                this.setState((prev) => ({
                    ...prev,
                    deactivatingBindingId: null,
                }));
                enqueueSnackbar("Obaveza je deaktivirana.", {
                    variant: "success",
                });
                this.loadExtra(companyId);
            })
            .catch(
                (
                    err:
                        | { message?: string }
                        | { response?: { data?: { detail?: string } } },
                ) => {
                    this.setState((prev) => ({
                        ...prev,
                        deactivatingBindingId: null,
                    }));
                    const msg =
                        (err as { response?: { data?: { detail?: string } } })
                            .response?.data?.detail ??
                        (err as { message?: string }).message ??
                        "Greška pri deaktivaciji obaveze.";
                    enqueueSnackbar(msg, { variant: "error" });
                },
            );
    };

    loadById = (id: number): void => {
        getClientCompany(id)
            .then((item) => {
                this.setState((prev) => ({
                    ...prev,
                    item,
                    loading: false,
                    error: null,
                    editing: false,
                    saveError: null,
                }));
                this.updateBreadcrumbs(item);
                this.loadExtra(id);
            })
            .catch(() =>
                this.setState((prev) => ({
                    ...prev,
                    loading: false,
                    error: "Greška pri učitavanju podataka firme.",
                })),
            );
    };

    private updateBreadcrumbs(company: ClientCompany): void {
        this.props.setBreadcrumbs([
            { label: "Firme", path: "/client-companies" },
            { label: company.name },
        ]);
    }

    handleTabChange = (tab: CompanyTabKey): void => {
        const id = Number(this.props.id);
        if (!Number.isFinite(id)) return;
        this.props.navigate(companyTabUrl(id, tab));
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
            this.props.setLastPath(`/client-companies/${id}`);
        } else {
            this.setState((prev) => ({ ...prev, loading: true }));
        }
        this.loadById(id);
    }

    componentDidMount(): void {
        this.applyRouteId("mount");
    }

    componentDidUpdate(prevProps: ClientCompanyDetailPageProps): void {
        if (prevProps.id !== this.props.id) {
            this.applyRouteId("update");
        }
        if (
            this.state.item &&
            (prevProps.id !== this.props.id ||
                prevProps.location.search !== this.props.location.search)
        ) {
            this.updateBreadcrumbs(this.state.item);
        }
    }

    componentWillUnmount(): void {
        this.props.setBreadcrumbs([]);
    }

    render() {
        const {
            item,
            employees,
            equipment,
            bindings,
            runs,
            loading,
            error,
            generatingDoc,
            docError,
            editing,
            saving,
            saveError,
            editName,
            editTaxId,
            editRegistration_number,
            editAddress,
            editPhone,
            editEmail,
            editWebsite,
            editNotes,
            editActivity_code,
            registryImporting,
            jobRoles,
            riskLevels,
            empDialogOpen,
            eqDialogOpen,
            eq_name,
            eq_category,
            eq_inventory_number,
            eq_location,
            eq_notes,
            savingEquipment,
            equipmentError,
        } = this.state;
        const { navigate, location } = this.props;
        const activeTab = parseCompanyTab(location.search);

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
                    <Alert severity="error">
                        {error ?? "Firma nije pronađena."}
                    </Alert>
                    <Button
                        startIcon={<ArrowBackIcon />}
                        onClick={() => navigate("/client-companies")}
                    >
                        Nazad na listu
                    </Button>
                </Box>
            );
        }

        return (
            <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
                <Button
                    startIcon={<ArrowBackIcon />}
                    onClick={() => navigate("/client-companies")}
                    sx={{ alignSelf: "flex-start" }}
                >
                    Nazad na listu
                </Button>
                <CompanyTabBar
                    activeTab={activeTab}
                    onChange={this.handleTabChange}
                />
                {activeTab === "identity" && (
                    <Paper sx={{ p: 3 }}>
                        <Box
                            sx={{
                                display: "flex",
                                alignItems: "flex-start",
                                justifyContent: "space-between",
                                gap: 2,
                                mb: editing ? 2 : 0,
                            }}
                        >
                            {!editing && (
                                <Typography variant="h6">
                                    {item.name}
                                </Typography>
                            )}
                            {!editing && (
                                <Box sx={{ display: "flex", gap: 1 }}>
                                    <PermissionGate permission="partners.change_clientcompany">
                                        <Button
                                            variant="outlined"
                                            onClick={this.startEdit}
                                        >
                                            Izmeni podatke
                                        </Button>
                                    </PermissionGate>
                                    <PermissionGate permission="partners.delete_clientcompany">
                                        <Button
                                            variant="outlined"
                                            color="error"
                                            startIcon={<DeleteIcon />}
                                            onClick={this.openCompanyDelete}
                                        >
                                            Obriši firmu
                                        </Button>
                                    </PermissionGate>
                                </Box>
                            )}
                        </Box>
                        {editing ? (
                            <Box
                                sx={{
                                    display: "flex",
                                    flexDirection: "column",
                                    gap: 1,
                                    maxWidth: 560,
                                }}
                            >
                                {saveError && (
                                    <Alert severity="error">{saveError}</Alert>
                                )}
                                <TextField
                                    margin="dense"
                                    label="Naziv"
                                    fullWidth
                                    required
                                    value={editName}
                                    onChange={(e) =>
                                        this.setState((prev) => ({
                                            ...prev,
                                            editName: e.target.value,
                                        }))
                                    }
                                />
                                <TextField
                                    margin="dense"
                                    label="PIB"
                                    fullWidth
                                    required
                                    value={editTaxId}
                                    onChange={(e) =>
                                        this.setState((prev) => ({
                                            ...prev,
                                            editTaxId: e.target.value,
                                        }))
                                    }
                                />
                                <Box
                                    sx={{
                                        display: "flex",
                                        gap: 1,
                                        alignItems: "center",
                                    }}
                                >
                                    <TextField
                                        margin="dense"
                                        label="Matični broj"
                                        fullWidth
                                        value={editRegistration_number}
                                        onChange={(e) =>
                                            this.setState((prev) => ({
                                                ...prev,
                                                editRegistration_number:
                                                    e.target.value,
                                            }))
                                        }
                                    />
                                    <AppButton
                                        label="Uvezi"
                                        tooltip="Uvezi iz javnog registra."
                                        loading={registryImporting}
                                        loadingLabel="Tražim…"
                                        variant="outlined"
                                        disabled={!editRegistration_number.trim()}
                                        onClick={this.handleRegistryImport}
                                        sx={{ flexShrink: 0 }}
                                    />
                                </Box>
                                <TextField
                                    margin="dense"
                                    label="Adresa"
                                    fullWidth
                                    value={editAddress}
                                    onChange={(e) =>
                                        this.setState((prev) => ({
                                            ...prev,
                                            editAddress: e.target.value,
                                        }))
                                    }
                                />
                                <TextField
                                    margin="dense"
                                    label="Telefon"
                                    fullWidth
                                    value={editPhone}
                                    onChange={(e) =>
                                        this.setState((prev) => ({
                                            ...prev,
                                            editPhone: e.target.value,
                                        }))
                                    }
                                />
                                <TextField
                                    margin="dense"
                                    label="Email"
                                    fullWidth
                                    type="email"
                                    value={editEmail}
                                    onChange={(e) =>
                                        this.setState((prev) => ({
                                            ...prev,
                                            editEmail: e.target.value,
                                        }))
                                    }
                                />
                                <TextField
                                    margin="dense"
                                    label="Web sajt"
                                    fullWidth
                                    value={editWebsite}
                                    onChange={(e) =>
                                        this.setState((prev) => ({
                                            ...prev,
                                            editWebsite: e.target.value,
                                        }))
                                    }
                                />
                                <Tooltip title="Šifra delatnosti">
                                    <TextField
                                        margin="dense"
                                        label="Šifra delatnosti"
                                        fullWidth
                                        value={editActivity_code}
                                        onChange={(e) =>
                                            this.setState((prev) => ({
                                                ...prev,
                                                editActivity_code:
                                                    e.target.value,
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
                                    value={editNotes}
                                    onChange={(e) =>
                                        this.setState((prev) => ({
                                            ...prev,
                                            editNotes: e.target.value,
                                        }))
                                    }
                                />
                                <Box sx={{ display: "flex", gap: 1, mt: 1 }}>
                                    <Button
                                        variant="contained"
                                        disabled={
                                            saving ||
                                            !editName.trim() ||
                                            !editTaxId.trim()
                                        }
                                        onClick={this.saveCompany}
                                    >
                                        {saving ? "Čuvam..." : "Sačuvaj"}
                                    </Button>
                                    <Button
                                        disabled={saving}
                                        onClick={this.cancelEdit}
                                    >
                                        Otkaži
                                    </Button>
                                </Box>
                            </Box>
                        ) : (
                            <Box
                                component="dl"
                                sx={{
                                    m: 0,
                                    "& dd": { ml: 2 },
                                    "& dt": { fontWeight: 600, mt: 1 },
                                }}
                            >
                                <dt>PIB</dt>
                                <dd>{item.tax_id}</dd>
                                {item.registration_number && (
                                    <>
                                        <dt>Matični broj</dt>
                                        <dd>{item.registration_number}</dd>
                                    </>
                                )}
                                {item.address && (
                                    <>
                                        <dt>Adresa</dt>
                                        <dd>{item.address}</dd>
                                    </>
                                )}
                                {item.email && (
                                    <>
                                        <dt>Email</dt>
                                        <dd>{item.email}</dd>
                                    </>
                                )}
                                {item.phone && (
                                    <>
                                        <dt>Telefon</dt>
                                        <dd>{item.phone}</dd>
                                    </>
                                )}
                                {item.website && (
                                    <>
                                        <dt>Web</dt>
                                        <dd>{item.website}</dd>
                                    </>
                                )}
                                {item.activity_code && (
                                    <>
                                        <dt>Šifra delatnosti</dt>
                                        <dd>{item.activity_code}</dd>
                                    </>
                                )}
                                {item.notes && (
                                    <>
                                        <dt>Beleške</dt>
                                        <dd>{item.notes}</dd>
                                    </>
                                )}
                            </Box>
                        )}
                    </Paper>
                )}

                {activeTab === "identity" && (
                    <ContactPersonsPanel clientCompanyId={item.id} />
                )}

                {activeTab === "documents" && (
                    <RiskAssessmentActPanel clientCompanyId={item.id} />
                )}

                {activeTab === "documents" && (
                    <CompanyDocumentsPanel clientCompanyId={item.id} />
                )}

                {activeTab === "job_roles" && (
                    <SectionCard
                        title="Radna mesta"
                        action={
                            <PermissionGate permission="partners.add_jobrole">
                                <Button
                                    size="small"
                                    variant="contained"
                                    startIcon={<AddIcon />}
                                    onClick={this.openRoleDialog}
                                >
                                    Dodaj radno mesto
                                </Button>
                            </PermissionGate>
                        }
                    >
                        <Box sx={{ overflow: "auto" }}>
                            <Table size="small">
                                <TableHead>
                                    <TableRow>
                                        <TableCell>Naziv</TableCell>
                                        <TableCell>Nivo rizika</TableCell>
                                        <TableCell>Zaposleni</TableCell>
                                        <TableCell align="right">
                                            Akcije
                                        </TableCell>
                                    </TableRow>
                                </TableHead>
                                <TableBody>
                                    {jobRoles.length === 0 ? (
                                        <TableStateRow
                                            colSpan={4}
                                            state="empty"
                                            emptyMessage="Nema radnih mesta."
                                        />
                                    ) : (
                                        jobRoles.map((r) => (
                                            <TableRow key={r.id}>
                                                <TableCell>{r.name}</TableCell>
                                                <TableCell>
                                                    <RiskBadge
                                                        riskLevel={
                                                            r.risk_level_detail
                                                        }
                                                    />
                                                </TableCell>
                                                <TableCell>
                                                    {r.employee_count ?? 0}
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
                                                                    "partners.change_jobrole",
                                                                onClick: () =>
                                                                    this.openRoleEdit(
                                                                        r,
                                                                    ),
                                                            },
                                                            {
                                                                label: "Obriši",
                                                                icon: (
                                                                    <DeleteIcon fontSize="small" />
                                                                ),
                                                                permission:
                                                                    "partners.delete_jobrole",
                                                                color: "error",
                                                                disabled:
                                                                    (r.employee_count ??
                                                                        0) > 0,
                                                                disabledTitle:
                                                                    "Radno mesto ima zaposlene",
                                                                onClick: () =>
                                                                    this.openRoleDelete(
                                                                        r,
                                                                    ),
                                                            },
                                                        ]}
                                                    />
                                                </TableCell>
                                            </TableRow>
                                        ))
                                    )}
                                </TableBody>
                            </Table>
                        </Box>
                    </SectionCard>
                )}

                {activeTab === "employees" && (
                    <Fragment>
                        <SectionCard
                            title="Zaposleni"
                            action={
                                <PermissionGate permission="partners.add_employee">
                                    <Button
                                        size="small"
                                        variant="contained"
                                        startIcon={<AddIcon />}
                                        onClick={this.openEmpDialog}
                                    >
                                        Dodaj zaposlenog
                                    </Button>
                                </PermissionGate>
                            }
                        >
                            <Box sx={{ overflow: "auto" }}>
                                <Table size="small">
                                    <TableHead>
                                        <TableRow>
                                            <TableCell>Ime</TableCell>
                                            <TableCell>Prezime</TableCell>
                                            <TableCell>Email</TableCell>
                                            <TableCell>Rizik</TableCell>
                                        </TableRow>
                                    </TableHead>
                                    <TableBody>
                                        {employees.length === 0 ? (
                                            <TableStateRow
                                                colSpan={4}
                                                state="empty"
                                                emptyMessage="Nema zaposlenih."
                                            />
                                        ) : (
                                            employees.map((e) => (
                                                <TableRow
                                                    key={e.id}
                                                    hover
                                                    sx={{ cursor: "pointer" }}
                                                    onClick={() =>
                                                        navigate(
                                                            `/client-companies-employees/${e.id}`,
                                                        )
                                                    }
                                                >
                                                    <TableCell>
                                                        {e.first_name}
                                                    </TableCell>
                                                    <TableCell>
                                                        {e.last_name}
                                                    </TableCell>
                                                    <TableCell>
                                                        {e.email ?? "—"}
                                                    </TableCell>
                                                    <TableCell>
                                                        <RiskBadge
                                                            riskLevel={
                                                                e.effective_risk_level ??
                                                                e.risk_level_override_detail ??
                                                                e.job_role_risk_level
                                                            }
                                                        />
                                                    </TableCell>
                                                </TableRow>
                                            ))
                                        )}
                                    </TableBody>
                                </Table>
                            </Box>
                        </SectionCard>
                        <Box
                            sx={{
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "space-between",
                                mt: 2,
                            }}
                        >
                            <Typography variant="subtitle1" fontWeight={600}>
                                Oprema
                            </Typography>
                            <PermissionGate permission="partners.add_equipmentitem">
                                <Button
                                    size="small"
                                    variant="contained"
                                    startIcon={<AddIcon />}
                                    onClick={this.openEqDialog}
                                >
                                    Dodaj opremu
                                </Button>
                            </PermissionGate>
                        </Box>
                        <Paper sx={{ overflow: "auto" }}>
                            <Table size="small">
                                <TableHead>
                                    <TableRow>
                                        <TableCell>Naziv</TableCell>
                                        <TableCell>Kategorija</TableCell>
                                        <TableCell>Inventarski broj</TableCell>
                                    </TableRow>
                                </TableHead>
                                <TableBody>
                                    {equipment.length === 0 ? (
                                        <TableRow>
                                            <TableCell
                                                colSpan={3}
                                                align="center"
                                            >
                                                Nema opreme.
                                            </TableCell>
                                        </TableRow>
                                    ) : (
                                        equipment.map((eq) => (
                                            <TableRow
                                                key={eq.id}
                                                hover
                                                sx={{ cursor: "pointer" }}
                                                onClick={() =>
                                                    navigate(
                                                        `/equipment/${eq.id}`,
                                                    )
                                                }
                                            >
                                                <TableCell>{eq.name}</TableCell>
                                                <TableCell>
                                                    {eq.category ?? "—"}
                                                </TableCell>
                                                <TableCell>
                                                    {eq.inventory_number ?? "—"}
                                                </TableCell>
                                            </TableRow>
                                        ))
                                    )}
                                </TableBody>
                            </Table>
                        </Paper>
                    </Fragment>
                )}

                {activeTab === "obligations" && (
                    <Fragment>
                        <Box
                            sx={{
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "space-between",
                                mt: 2,
                            }}
                        >
                            <Typography variant="subtitle1" fontWeight={600}>
                                Aktivne obaveze
                            </Typography>
                            <PermissionGate permission="processes.add_processbinding">
                                <Button
                                    size="small"
                                    variant="contained"
                                    startIcon={<AddIcon />}
                                    onClick={() =>
                                        this.setState((prev) => ({
                                            ...prev,
                                            bindingDialogOpen: true,
                                        }))
                                    }
                                >
                                    Dodaj obavezu
                                </Button>
                            </PermissionGate>
                        </Box>
                        <Paper sx={{ overflow: "auto" }}>
                            <Table size="small">
                                <TableHead>
                                    <TableRow>
                                        <TableCell>Vrsta obaveze</TableCell>
                                        <TableCell>Subjekt</TableCell>
                                        <TableCell>Termin</TableCell>
                                        <TableCell align="right" />
                                    </TableRow>
                                </TableHead>
                                <TableBody>
                                    {bindings.filter((b) => b.is_active)
                                        .length === 0 ? (
                                        <TableRow>
                                            <TableCell
                                                colSpan={4}
                                                align="center"
                                            >
                                                Nema aktivnih obaveza.
                                            </TableCell>
                                        </TableRow>
                                    ) : (
                                        bindings
                                            .filter((b) => b.is_active)
                                            .map((b) => (
                                                <TableRow key={b.id}>
                                                    <TableCell>
                                                        {b.process_type_name}
                                                    </TableCell>
                                                    <TableCell>
                                                        {bindingSubjectLabel(
                                                            b,
                                                            employees,
                                                            equipment,
                                                            item,
                                                        )}
                                                    </TableCell>
                                                    <TableCell
                                                        sx={{ minWidth: 220 }}
                                                    >
                                                        {b.has_open_run ? (
                                                            formatDateDisplay(
                                                                b.next_run_at,
                                                            )
                                                        ) : (
                                                            <PermissionGate permission="processes.change_processbinding">
                                                                <DateTextFieldWithPicker
                                                                    label="Termin (dd.mm.yyyy)"
                                                                    value={isoDateToFormDisplay(
                                                                        b.next_run_at,
                                                                    )}
                                                                    helperText={
                                                                        this
                                                                            .state
                                                                            .savingStartDateBindingId ===
                                                                        b.id
                                                                            ? "Čuvam..."
                                                                            : undefined
                                                                    }
                                                                    onChange={(
                                                                        v,
                                                                    ) =>
                                                                        this.handleBindingStartDateChange(
                                                                            b.id,
                                                                            v,
                                                                        )
                                                                    }
                                                                />
                                                            </PermissionGate>
                                                        )}
                                                    </TableCell>
                                                    <TableCell align="right">
                                                        <RowActionsMenu
                                                            actions={[
                                                                {
                                                                    label:
                                                                        this
                                                                            .state
                                                                            .deactivatingBindingId ===
                                                                        b.id
                                                                            ? "Deaktiviram..."
                                                                            : "Deaktiviraj",
                                                                    icon: (
                                                                        <BlockIcon fontSize="small" />
                                                                    ),
                                                                    permission:
                                                                        "processes.change_processbinding",
                                                                    color: "warning",
                                                                    hidden: !b.has_open_run,
                                                                    disabled:
                                                                        this
                                                                            .state
                                                                            .deactivatingBindingId ===
                                                                        b.id,
                                                                    onClick:
                                                                        () =>
                                                                            this.handleBindingDeactivate(
                                                                                b.id,
                                                                            ),
                                                                },
                                                            ]}
                                                        />
                                                    </TableCell>
                                                </TableRow>
                                            ))
                                    )}
                                </TableBody>
                            </Table>
                        </Paper>

                        <Typography
                            variant="subtitle1"
                            fontWeight={600}
                            sx={{ mt: 2 }}
                        >
                            Istorija izvršenja
                        </Typography>
                        <Paper sx={{ overflow: "auto" }}>
                            <Table size="small">
                                <TableHead>
                                    <TableRow>
                                        <TableCell>Tip</TableCell>
                                        <TableCell>Subjekt</TableCell>
                                        <TableCell>Važi do</TableCell>
                                        <TableCell>Status</TableCell>
                                    </TableRow>
                                </TableHead>
                                <TableBody>
                                    {runs.length === 0 ? (
                                        <TableRow>
                                            <TableCell
                                                colSpan={4}
                                                align="center"
                                            >
                                                Nema zapisa.
                                            </TableCell>
                                        </TableRow>
                                    ) : (
                                        runs.slice(0, 20).map((r) => (
                                            <TableRow key={r.id}>
                                                <TableCell>
                                                    {r.process_type_name}
                                                </TableCell>
                                                <TableCell>
                                                    {r.subject_snapshot?.name ??
                                                        "—"}
                                                </TableCell>
                                                <TableCell>
                                                    {formatDate(r.valid_until)}
                                                </TableCell>
                                                <TableCell>
                                                    <StatusBadge
                                                        status={r.status}
                                                    />
                                                </TableCell>
                                            </TableRow>
                                        ))
                                    )}
                                </TableBody>
                            </Table>
                        </Paper>
                    </Fragment>
                )}

                {activeTab === "expert_findings" && (
                    <ComplianceFindingsPanel clientCompanyId={item.id} />
                )}

                {activeTab === "compliance" && (
                    <Box
                        sx={{
                            display: "flex",
                            flexDirection: "column",
                            gap: 2,
                        }}
                    >
                        <Box
                            sx={{
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "space-between",
                                gap: 2,
                                flexWrap: "wrap",
                            }}
                        >
                            <Typography variant="subtitle1" fontWeight={600}>
                                Usklađenost firme
                            </Typography>
                            <Button
                                variant="outlined"
                                disabled={generatingDoc}
                                onClick={this.handleGenerateMedicalExamRecord}
                            >
                                {generatingDoc
                                    ? "Generišem..."
                                    : "Generiši Obrazac 1"}
                            </Button>
                        </Box>
                        {docError && <Alert severity="error">{docError}</Alert>}
                        <CompanyComplianceOverview
                            companyId={item.id}
                            onOpenTab={this.handleTabChange}
                        />
                    </Box>
                )}

                <EmployeeFormDialog
                    open={empDialogOpen}
                    mode="create"
                    clientCompanies={[item]}
                    lockedClientCompanyId={item.id}
                    onClose={this.closeEmpDialog}
                    onSaved={this.handleEmployeeSaved}
                />

                <Dialog
                    open={eqDialogOpen}
                    onClose={this.closeEqDialog}
                    maxWidth="sm"
                    fullWidth
                >
                    <DialogTitle>Nova oprema</DialogTitle>
                    <DialogContent>
                        {equipmentError && (
                            <Alert severity="error" sx={{ mb: 1 }}>
                                {equipmentError}
                            </Alert>
                        )}
                        <TextField
                            margin="dense"
                            label="Naziv"
                            fullWidth
                            required
                            value={eq_name}
                            onChange={(e) =>
                                this.setState((prev) => ({
                                    ...prev,
                                    eq_name: e.target.value,
                                }))
                            }
                        />
                        <TextField
                            margin="dense"
                            label="Kategorija"
                            fullWidth
                            value={eq_category}
                            onChange={(e) =>
                                this.setState((prev) => ({
                                    ...prev,
                                    eq_category: e.target.value,
                                }))
                            }
                        />
                        <TextField
                            margin="dense"
                            label="Inventarski broj"
                            fullWidth
                            value={eq_inventory_number}
                            onChange={(e) =>
                                this.setState((prev) => ({
                                    ...prev,
                                    eq_inventory_number: e.target.value,
                                }))
                            }
                        />
                        <TextField
                            margin="dense"
                            label="Lokacija"
                            fullWidth
                            value={eq_location}
                            onChange={(e) =>
                                this.setState((prev) => ({
                                    ...prev,
                                    eq_location: e.target.value,
                                }))
                            }
                        />
                        <TextField
                            margin="dense"
                            label="Beleške"
                            fullWidth
                            multiline
                            minRows={2}
                            value={eq_notes}
                            onChange={(e) =>
                                this.setState((prev) => ({
                                    ...prev,
                                    eq_notes: e.target.value,
                                }))
                            }
                        />
                    </DialogContent>
                    <DialogActions>
                        <Button
                            onClick={this.closeEqDialog}
                            disabled={savingEquipment}
                        >
                            Odustani
                        </Button>
                        <Button
                            onClick={this.saveEquipment}
                            variant="contained"
                            disabled={savingEquipment || !eq_name.trim()}
                        >
                            {savingEquipment ? "Čuvam..." : "Sačuvaj"}
                        </Button>
                    </DialogActions>
                </Dialog>

                <Dialog
                    open={this.state.roleDialogOpen}
                    onClose={this.closeRoleDialog}
                    maxWidth="sm"
                    fullWidth
                >
                    <DialogTitle>
                        {this.state.editingRoleId != null
                            ? "Izmena radnog mesta"
                            : "Novo radno mesto"}
                    </DialogTitle>
                    <DialogContent>
                        {this.state.roleError && (
                            <Alert severity="error" sx={{ mb: 1 }}>
                                {this.state.roleError}
                            </Alert>
                        )}
                        <TextField
                            margin="dense"
                            label="Naziv radnog mesta"
                            fullWidth
                            required
                            value={this.state.role_name}
                            onChange={(e) =>
                                this.setState((prev) => ({
                                    ...prev,
                                    role_name: e.target.value,
                                }))
                            }
                        />
                        <FormControl margin="dense" fullWidth size="small">
                            <InputLabel>Nivo rizika</InputLabel>
                            <Select
                                label="Nivo rizika"
                                value={this.state.role_risk_level}
                                onChange={(e) =>
                                    this.setState((prev) => ({
                                        ...prev,
                                        role_risk_level: String(e.target.value),
                                    }))
                                }
                            >
                                <MenuItem value="">
                                    <em>—</em>
                                </MenuItem>
                                {riskLevels.map((rl) => (
                                    <MenuItem key={rl.id} value={String(rl.id)}>
                                        {rl.label} (R={rl.score})
                                    </MenuItem>
                                ))}
                            </Select>
                        </FormControl>
                        <TextField
                            margin="dense"
                            label="Opis"
                            fullWidth
                            multiline
                            minRows={2}
                            value={this.state.role_description}
                            onChange={(e) =>
                                this.setState((prev) => ({
                                    ...prev,
                                    role_description: e.target.value,
                                }))
                            }
                        />
                    </DialogContent>
                    <DialogActions>
                        <Button
                            onClick={this.closeRoleDialog}
                            disabled={this.state.savingRole}
                        >
                            Odustani
                        </Button>
                        <Button
                            onClick={this.saveRole}
                            variant="contained"
                            disabled={
                                this.state.savingRole ||
                                !this.state.role_name.trim()
                            }
                        >
                            {this.state.savingRole ? "Čuvam..." : "Sačuvaj"}
                        </Button>
                    </DialogActions>
                </Dialog>

                <ConfirmDialog
                    open={this.state.roleDeleteTarget != null}
                    title="Obriši radno mesto"
                    message={
                        this.state.roleDeleteTarget != null ? (
                            <>
                                Da li si siguran da želiš da obrišeš radno mesto
                                „{this.state.roleDeleteTarget.name}"?
                            </>
                        ) : (
                            ""
                        )
                    }
                    loading={this.state.deletingRole}
                    onConfirm={this.confirmRoleDelete}
                    onClose={this.closeRoleDelete}
                />

                <ConfirmDialog
                    open={this.state.companyDeleteOpen}
                    title="Obriši firmu"
                    message={
                        <>
                            Da li si siguran da želiš da obrišeš firmu „
                            {item.name}"? Briše se i sva povezana dokumentacija.
                        </>
                    }
                    loading={this.state.deletingCompany}
                    onConfirm={this.confirmCompanyDelete}
                    onClose={this.closeCompanyDelete}
                />

                <AddProcessBindingDialog
                    open={this.state.bindingDialogOpen}
                    onClose={() =>
                        this.setState((prev) => ({
                            ...prev,
                            bindingDialogOpen: false,
                        }))
                    }
                    onSuccess={() => this.loadExtra(Number(this.props.id))}
                    subjectKind="CLIENT_COMPANY"
                    subjectLabel={item.name}
                    clientCompanyId={item.id}
                />
            </Box>
        );
    }
}

const mapDispatchToProps = {
    setLastPath,
    setBreadcrumbs,
};

const Connected = connect(
    null,
    mapDispatchToProps,
)(ClientCompanyDetailPageInner);
const ClientCompanyDetailWithNavigation = withNavigation(Connected);

export default function ClientCompanyDetailPage(): ReactElement {
    const { id } = useParams<{ id: string }>();
    return <ClientCompanyDetailWithNavigation id={id ?? ""} />;
}
