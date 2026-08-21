import { Component, Fragment, type ReactElement } from "react";
import { useParams } from "react-router-dom";
import { connect } from "react-redux";

import {
    Box,
    Checkbox,
    Chip,
    FormControl,
    FormControlLabel,
    FormGroup,
    FormLabel,
    InputLabel,
    Link,
    MenuItem,
    Paper,
    Select,
    Stack,
    Switch,
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
} from "@mui/material";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import AddIcon from "@mui/icons-material/Add";
import BlockIcon from "@mui/icons-material/Block";
import BusinessIcon from "@mui/icons-material/Business";
import ContactsIcon from "@mui/icons-material/Contacts";
import DeleteIcon from "@mui/icons-material/Delete";
import EditIcon from "@mui/icons-material/Edit";
import InfoOutlinedIcon from "@mui/icons-material/InfoOutlined";
import NotesIcon from "@mui/icons-material/Notes";
import { enqueueSnackbar } from "notistack";

import DateTextFieldWithPicker from "../components/DateTextFieldWithPicker";
import {
    DetailCard,
    DetailField,
    DetailFieldGrid,
    DetailHeaderCard,
} from "../components/DetailCard";
import {
    bindingTermDateError,
    displayDateToIso,
    formatDateDisplay,
    isoDateToFormDisplay,
} from "../utils/date";
import {
    registryLookup,
    createEquipmentItem,
    getProcessTypes,
    createJobRole,
    deleteClientCompany,
    deleteJobRole,
    generateMedicalExamRecord,
    generateHighRiskRegistry,
    generateInspectionBundle,
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
import {
    JobRoleFormFields,
    jobRoleFormIsValid,
} from "../components/JobRoleFormFields";
import type { JobRoleFormValues } from "../components/JobRoleFormFields";
import { CompanyDocumentsPanel } from "../components/CompanyDocumentsPanel";
import { GeneratedDocumentsPanel } from "../components/GeneratedDocumentsPanel";
import { CompanyObligationPlanPanel } from "../components/CompanyObligationPlanPanel";
import { TrainingTypesPanel } from "../components/TrainingTypesPanel";
import { AppButton } from "../design/AppButton";
import { CompanyTabBar } from "../components/CompanyTabBar";
import { ContactPersonsPanel } from "../components/ContactPersonsPanel";
import { ClientIntakePanel } from "../components/ClientIntakePanel";
import { WorkInjuriesPanel } from "../components/WorkInjuriesPanel";
import { ComplianceFindingsPanel } from "../components/ComplianceFindingsPanel";
import { RiskAssessmentActPanel } from "../components/RiskAssessmentActPanel";
import { WorkplaceRiskAssessmentPanel } from "../components/WorkplaceRiskAssessmentPanel";
import { JobRoleLZOPanel } from "../components/JobRoleLZOPanel";
import { generateRiskAssessmentActDoc } from "../api/riskAssessment";
import { BzrDocumentsPanel } from "../components/BzrDocumentsPanel";
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
import { setupTestFill } from "../testFlow/registerTestFill";
import { TEST_FLOW } from "../testFlow/fixture";
import { riskLevelIdByCode } from "../testFlow/helpers";

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
    private testFillCleanups: Array<() => void> = [];

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
        generatingInspectionBundle: false,
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
        editZop_category: "",
        editHigh_risk_activity: false,
        editInstallations: [] as string[],
        editEmailTestMode: true,
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
        eq_service_process_type: null,
        equipmentProcessTypes: [],
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
            eq_service_process_type: null,
        }));
        if (this.state.equipmentProcessTypes.length === 0) {
            getProcessTypes()
                .then((types) =>
                    this.setState((prev) => ({
                        ...prev,
                        equipmentProcessTypes: types.filter(
                            (t) => t.subject_kind === "EQUIPMENT",
                        ),
                    })),
                )
                .catch(() => undefined);
        }
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
            eq_service_process_type,
        } = this.state;
        if (!eq_name.trim()) return;
        const payload: Partial<EquipmentItem> = {
            name: eq_name.trim(),
            category: eq_category.trim() || undefined,
            inventory_number: eq_inventory_number.trim() || undefined,
            location: eq_location.trim() || undefined,
            notes: eq_notes.trim() || undefined,
            service_process_type: eq_service_process_type ?? null,
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
            editZop_category: item.zop_category ?? "",
            editHigh_risk_activity: item.high_risk_activity ?? false,
            editInstallations: Array.isArray(item.installations)
                ? item.installations
                : [],
            editEmailTestMode: item.email_test_mode ?? true,
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
            editZop_category,
            editHigh_risk_activity,
            editInstallations,
            editEmailTestMode,
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
            zop_category: editZop_category || null,
            high_risk_activity: editHigh_risk_activity,
            installations: editInstallations,
            email_test_mode: editEmailTestMode,
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

    handleGenerateHighRiskRegistry = (): void => {
        const id = Number(this.props.id);
        this.setState((prev) => ({
            ...prev,
            generatingDoc: true,
            docError: null,
        }));
        generateHighRiskRegistry(id)
            .then(() =>
                this.setState((prev) => ({ ...prev, generatingDoc: false })),
            )
            .catch(() =>
                this.setState((prev) => ({
                    ...prev,
                    generatingDoc: false,
                    docError: "Greška pri generisanju registra.",
                })),
            );
    };

    handleGenerateRiskAssessmentAct = (): void => {
        const id = Number(this.props.id);
        this.setState((prev) => ({
            ...prev,
            generatingDoc: true,
            docError: null,
        }));
        generateRiskAssessmentActDoc(id)
            .then(() =>
                this.setState((prev) => ({ ...prev, generatingDoc: false })),
            )
            .catch(() =>
                this.setState((prev) => ({
                    ...prev,
                    generatingDoc: false,
                    docError: "Greška pri generisanju Akta o proceni rizika.",
                })),
            );
    };

    handleGenerateInspectionBundle = (): void => {
        const id = Number(this.props.id);
        this.setState((prev) => ({
            ...prev,
            generatingInspectionBundle: true,
        }));
        generateInspectionBundle(id)
            .then(() =>
                this.setState((prev) => ({
                    ...prev,
                    generatingInspectionBundle: false,
                })),
            )
            .catch((err: Error) => {
                this.setState((prev) => ({
                    ...prev,
                    generatingInspectionBundle: false,
                }));
                enqueueSnackbar(
                    err.message || "Greška pri pripremi paketa za inspekciju.",
                    { variant: "error" },
                );
            });
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

    handleIntakeApproved = (): void => {
        const { item } = this.state;
        if (item) this.loadExtra(item.id);
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
        this.bindTestFillHandlers();
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
        this.bindTestFillHandlers();
    }

    componentWillUnmount(): void {
        this.props.setBreadcrumbs([]);
        this.clearTestFillHandlers();
    }

    clearTestFillHandlers = (): void => {
        for (const cleanup of this.testFillCleanups) {
            cleanup();
        }
        this.testFillCleanups = [];
    };

    bindTestFillHandlers = (): void => {
        this.clearTestFillHandlers();
        this.testFillCleanups.push(
            setupTestFill(
                "E_ADD",
                () => {
                    const ja = TEST_FLOW.jobRoleAdd;
                    this.setState({
                        roleDialogOpen: true,
                        editingRoleId: null,
                        role_name: ja.name,
                        role_risk_level: riskLevelIdByCode(
                            this.state.riskLevels,
                            ja.riskLevelCode,
                        ),
                        role_description: "",
                        roleError: null,
                    });
                    return true;
                },
                () =>
                    parseCompanyTab(this.props.location.search) === "job_roles",
            ),
            setupTestFill(
                "E_EDIT",
                () => {
                    if (
                        !this.state.roleDialogOpen ||
                        this.state.editingRoleId == null
                    ) {
                        return false;
                    }
                    this.setState({
                        role_description: TEST_FLOW.jobRoleEdit.description,
                    });
                    return true;
                },
                () =>
                    parseCompanyTab(this.props.location.search) === "job_roles",
            ),
            setupTestFill(
                "P_PROFIL",
                () => {
                    if (!this.state.editing) {
                        return false;
                    }
                    const p = TEST_FLOW.companyProfile;
                    this.setState({
                        editZop_category: p.zop_category,
                        editHigh_risk_activity: p.high_risk_activity,
                        editInstallations: [...p.installations],
                    });
                    return true;
                },
                () =>
                    parseCompanyTab(this.props.location.search) === "identity",
            ),
            setupTestFill(
                "EQ1",
                () => {
                    const eq = TEST_FLOW.equipment;
                    if (this.state.equipmentProcessTypes.length === 0) {
                        return false;
                    }
                    const serviceType =
                        this.state.equipmentProcessTypes.find(
                            (t) => t.code === eq.service_process_type_code,
                        ) ??
                        this.state.equipmentProcessTypes.find(
                            (t) => t.name === eq.service_process_type_name,
                        );
                    this.setState({
                        eqDialogOpen: true,
                        equipmentError: null,
                        eq_name: eq.name,
                        eq_category: eq.category,
                        eq_inventory_number: eq.inventory_number,
                        eq_location: eq.location,
                        eq_notes: "",
                        eq_service_process_type: serviceType?.id ?? null,
                    });
                    return serviceType != null;
                },
                () =>
                    parseCompanyTab(this.props.location.search) === "employees",
            ),
        );
    };

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
            generatingInspectionBundle,
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
            editZop_category,
            editHigh_risk_activity,
            editInstallations,
            editEmailTestMode,
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
            eq_service_process_type,
            equipmentProcessTypes,
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

                {activeTab === "overview" && (
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
                                justifyContent: "flex-end",
                                gap: 1,
                            }}
                        >
                            <Button
                                variant="outlined"
                                onClick={this.handleGenerateMedicalExamRecord}
                                disabled={generatingDoc}
                                startIcon={
                                    generatingDoc ? (
                                        <CircularProgress size={16} />
                                    ) : undefined
                                }
                            >
                                {generatingDoc
                                    ? "Generiše se…"
                                    : "Generiši Obrazac 1"}
                            </Button>
                            <Button
                                variant="outlined"
                                onClick={this.handleGenerateHighRiskRegistry}
                                disabled={generatingDoc}
                            >
                                Registar radnih mesta sa povećanim rizikom
                            </Button>
                            <Button
                                variant="outlined"
                                onClick={this.handleGenerateRiskAssessmentAct}
                                disabled={generatingDoc}
                            >
                                Generiši Akt o proceni rizika
                            </Button>
                        </Box>
                        {docError && (
                            <Alert severity="error">{docError}</Alert>
                        )}
                        <CompanyObligationPlanPanel companyId={item.id} />
                    </Box>
                )}

                {activeTab === "identity" && editing && (
                    <Paper sx={{ p: 3 }}>
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
                                            editActivity_code: e.target.value,
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
                            <FormControl margin="dense" fullWidth>
                                <InputLabel id="zop-cat-label">
                                    ZOP kategorija
                                </InputLabel>
                                <Select
                                    labelId="zop-cat-label"
                                    label="ZOP kategorija"
                                    value={editZop_category}
                                    onChange={(e) =>
                                        this.setState((prev) => ({
                                            ...prev,
                                            editZop_category: e.target.value,
                                        }))
                                    }
                                >
                                    <MenuItem value="">
                                        <em>Nije određena</em>
                                    </MenuItem>
                                    <MenuItem value="I">Kategorija I</MenuItem>
                                    <MenuItem value="II">
                                        Kategorija II
                                    </MenuItem>
                                    <MenuItem value="III">
                                        Kategorija III
                                    </MenuItem>
                                </Select>
                            </FormControl>
                            <FormControlLabel
                                sx={{ mt: 1 }}
                                control={
                                    <Switch
                                        checked={editHigh_risk_activity}
                                        onChange={(e) =>
                                            this.setState((prev) => ({
                                                ...prev,
                                                editHigh_risk_activity:
                                                    e.target.checked,
                                            }))
                                        }
                                    />
                                }
                                label="Delatnost visokog rizika"
                            />
                            <FormControl component="fieldset" margin="dense">
                                <FormLabel component="legend">
                                    Instalacije
                                </FormLabel>
                                <FormGroup>
                                    {[
                                        {
                                            value: "HYDRANT_NETWORK",
                                            label: "Hidrantska mreža",
                                        },
                                        {
                                            value: "FIRE_ALARM_SYSTEM",
                                            label: "Sistem za detekciju požara",
                                        },
                                        {
                                            value: "LIGHTNING_PROTECTION",
                                            label: "Gromobranska zaštita",
                                        },
                                        {
                                            value: "STABLE_EXTINGUISHING_SYSTEM",
                                            label: "Stabilni sistem za gašenje",
                                        },
                                        {
                                            value: "FIRE_EXTINGUISHERS",
                                            label: "Aparati za gašenje požara",
                                        },
                                    ].map((inst) => (
                                        <FormControlLabel
                                            key={inst.value}
                                            control={
                                                <Checkbox
                                                    size="small"
                                                    checked={editInstallations.includes(
                                                        inst.value,
                                                    )}
                                                    onChange={(e) => {
                                                        const next = e.target
                                                            .checked
                                                            ? [
                                                                  ...editInstallations,
                                                                  inst.value,
                                                              ]
                                                            : editInstallations.filter(
                                                                  (v) =>
                                                                      v !==
                                                                      inst.value,
                                                              );
                                                        this.setState(
                                                            (prev) => ({
                                                                ...prev,
                                                                editInstallations:
                                                                    next,
                                                            }),
                                                        );
                                                    }}
                                                />
                                            }
                                            label={inst.label}
                                        />
                                    ))}
                                </FormGroup>
                            </FormControl>
                            <PermissionGate permission="auth.view_user">
                                <FormControlLabel
                                    sx={{ mt: 1, display: "block" }}
                                    control={
                                        <Switch
                                            checked={editEmailTestMode}
                                            onChange={(e) =>
                                                this.setState((prev) => ({
                                                    ...prev,
                                                    editEmailTestMode:
                                                        e.target.checked,
                                                }))
                                            }
                                        />
                                    }
                                    label={
                                        editEmailTestMode
                                            ? "Test režim: svi mejlovi idu samo na EMAIL_REDIRECT_TO (backend.env), ne na firmu"
                                            : "Uživo: mejlovi idu na firmu / MAK po šablonu (bez redirecta)"
                                    }
                                />
                            </PermissionGate>
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
                    </Paper>
                )}

                {activeTab === "identity" && !editing && (
                    <Stack spacing={2}>
                        <DetailHeaderCard
                            initials={item.name
                                .split(" ")
                                .slice(0, 2)
                                .map((w) => w[0] ?? "")
                                .join("")
                                .toUpperCase()}
                            title={item.name}
                            badges={
                                <>
                                    <PermissionGate permission="auth.view_user">
                                        {item.email_test_mode ? (
                                            <Chip
                                                label="Test režim mejlova"
                                                size="small"
                                                color="warning"
                                            />
                                        ) : (
                                            <Chip
                                                label="Mejlovi uživo"
                                                size="small"
                                                color="success"
                                                variant="outlined"
                                            />
                                        )}
                                    </PermissionGate>
                                    {item.zop_category && (
                                        <Chip
                                            label={`ZOP kategorija ${item.zop_category}`}
                                            size="small"
                                            variant="outlined"
                                            color="primary"
                                        />
                                    )}
                                    {item.high_risk_activity && (
                                        <Chip
                                            label="Povećan rizik"
                                            size="small"
                                            variant="outlined"
                                            color="warning"
                                        />
                                    )}
                                    {Array.isArray(item.installations) &&
                                        item.installations.map((inst) => {
                                            const instLabels: Record<
                                                string,
                                                string
                                            > = {
                                                HYDRANT_NETWORK:
                                                    "Hidrantska mreža",
                                                FIRE_ALARM_SYSTEM:
                                                    "Detekcija požara",
                                                LIGHTNING_PROTECTION:
                                                    "Gromobran",
                                                STABLE_EXTINGUISHING_SYSTEM:
                                                    "Stabilni sistem",
                                                FIRE_EXTINGUISHERS:
                                                    "Aparati PP",
                                            };
                                            return (
                                                <Chip
                                                    key={inst}
                                                    label={
                                                        instLabels[inst] ?? inst
                                                    }
                                                    size="small"
                                                    variant="outlined"
                                                />
                                            );
                                        })}
                                </>
                            }
                            action={
                                <>
                                    <PermissionGate permission="partners.change_clientcompany">
                                        <Button
                                            variant="outlined"
                                            startIcon={<EditIcon />}
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
                                </>
                            }
                        />

                        <DetailCard
                            title="Osnovni podaci"
                            icon={
                                <BusinessIcon fontSize="small" color="action" />
                            }
                        >
                            <DetailFieldGrid>
                                <DetailField label="PIB" value={item.tax_id} />
                                <DetailField
                                    label="Matični broj"
                                    value={item.registration_number}
                                />
                                <DetailField
                                    label="Šifra delatnosti"
                                    value={item.activity_code}
                                />
                            </DetailFieldGrid>
                        </DetailCard>

                        <DetailCard
                            title="Kontakt"
                            icon={
                                <ContactsIcon fontSize="small" color="action" />
                            }
                        >
                            <DetailFieldGrid>
                                <DetailField
                                    label="Adresa"
                                    value={item.address}
                                />
                                <DetailField
                                    label="Telefon"
                                    value={item.phone}
                                />
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
                                <DetailField
                                    label="Web sajt"
                                    value={
                                        item.website ? (
                                            <Link
                                                href={item.website}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                            >
                                                {item.website}
                                            </Link>
                                        ) : undefined
                                    }
                                />
                            </DetailFieldGrid>
                        </DetailCard>

                        {item.notes && (
                            <DetailCard
                                title="Napomene"
                                icon={
                                    <NotesIcon
                                        fontSize="small"
                                        color="action"
                                    />
                                }
                            >
                                <Typography
                                    variant="body2"
                                    sx={{
                                        whiteSpace: "pre-wrap",
                                        overflowWrap: "break-word",
                                    }}
                                >
                                    {item.notes}
                                </Typography>
                            </DetailCard>
                        )}

                        <DetailCard
                            title="ZOP profil"
                            icon={
                                <InfoOutlinedIcon
                                    fontSize="small"
                                    color="action"
                                />
                            }
                        >
                            <DetailFieldGrid>
                                <DetailField
                                    label="ZOP kategorija"
                                    value={
                                        item.zop_category
                                            ? `Kategorija ${item.zop_category}`
                                            : undefined
                                    }
                                />
                                <DetailField
                                    label="Delatnost visokog rizika"
                                    value={
                                        item.high_risk_activity ? "Da" : "Ne"
                                    }
                                />
                            </DetailFieldGrid>
                        </DetailCard>

                        <ContactPersonsPanel clientCompanyId={item.id} />

                        <ClientIntakePanel
                            clientCompanyId={item.id}
                            clientCompanyEmail={item.email}
                            onSubmissionApproved={this.handleIntakeApproved}
                        />
                    </Stack>
                )}

                {activeTab === "documents" && (
                    <Box
                        sx={{
                            display: "flex",
                            flexDirection: "column",
                            gap: 1,
                        }}
                    >
                        <Box
                            sx={{
                                display: "flex",
                                justifyContent: "flex-end",
                            }}
                        >
                            <Button
                                variant="contained"
                                onClick={this.handleGenerateInspectionBundle}
                                disabled={generatingInspectionBundle}
                                startIcon={
                                    generatingInspectionBundle ? (
                                        <CircularProgress size={16} />
                                    ) : undefined
                                }
                            >
                                {generatingInspectionBundle
                                    ? "Priprema se…"
                                    : "Za inspekciju (PDF)"}
                            </Button>
                        </Box>
                    </Box>
                )}

                {activeTab === "documents" && (
                    <RiskAssessmentActPanel clientCompanyId={item.id} />
                )}

                {activeTab === "documents" && (
                    <SectionCard title="BZR dokumenti (nacrti)">
                        <BzrDocumentsPanel clientCompanyId={item.id} />
                    </SectionCard>
                )}

                {activeTab === "documents" && (
                    <CompanyDocumentsPanel clientCompanyId={item.id} />
                )}

                {activeTab === "documents" && (
                    <ComplianceFindingsPanel clientCompanyId={item.id} />
                )}

                {activeTab === "documents" && (
                    <GeneratedDocumentsPanel clientCompanyId={item.id} />
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

                {activeTab === "job_roles" && (
                    <SectionCard title="Procena rizika po radnom mestu">
                        <WorkplaceRiskAssessmentPanel jobRoles={jobRoles} />
                    </SectionCard>
                )}

                {activeTab === "job_roles" && (
                    <SectionCard title="Lična zaštitna oprema po radnom mestu">
                        <JobRoleLZOPanel jobRoles={jobRoles} />
                    </SectionCard>
                )}

                {activeTab === "job_roles" && (
                    <TrainingTypesPanel clientCompanyId={item.id} />
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

                        <Box sx={{ mt: 2 }}>
                            <WorkInjuriesPanel
                                clientCompanyId={item.id}
                                employees={employees}
                            />
                        </Box>
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
                        <FormControl fullWidth margin="dense">
                            <InputLabel id="eq-service-pt-label">
                                Vrsta obaveze servisa/pregleda
                            </InputLabel>
                            <Select
                                labelId="eq-service-pt-label"
                                label="Vrsta obaveze servisa/pregleda"
                                value={
                                    eq_service_process_type == null
                                        ? ""
                                        : String(eq_service_process_type)
                                }
                                onChange={(e) =>
                                    this.setState((prev) => ({
                                        ...prev,
                                        eq_service_process_type:
                                            e.target.value === ""
                                                ? null
                                                : Number(e.target.value),
                                    }))
                                }
                            >
                                <MenuItem value="">
                                    <em>— bez obaveze —</em>
                                </MenuItem>
                                {equipmentProcessTypes.map((pt) => (
                                    <MenuItem key={pt.id} value={String(pt.id)}>
                                        {pt.name}
                                    </MenuItem>
                                ))}
                            </Select>
                        </FormControl>
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
                        <JobRoleFormFields
                            values={{
                                name: this.state.role_name,
                                riskLevelId: this.state.role_risk_level,
                                description: this.state.role_description,
                            }}
                            riskLevels={riskLevels}
                            disabled={this.state.savingRole}
                            onChange={(v: JobRoleFormValues) =>
                                this.setState((prev) => ({
                                    ...prev,
                                    role_name: v.name,
                                    role_risk_level: v.riskLevelId,
                                    role_description: v.description,
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
                                !jobRoleFormIsValid({
                                    name: this.state.role_name,
                                    riskLevelId: this.state.role_risk_level,
                                    description: this.state.role_description,
                                })
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
