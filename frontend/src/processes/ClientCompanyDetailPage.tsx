import { Component, type ReactElement } from "react";
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
    StringToDate,
} from "../utils/date";
import {
    aprLookup,
    clearClientCompanyRiskAssessmentAct,
    createEquipmentItem,
    createJobRole,
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
    uploadClientCompanyRiskAssessmentAct,
} from "../api/processes";
import { PermissionGate } from "../components/PermissionGate";
import { AddProcessBindingDialog } from "../components/AddProcessBindingDialog";
import { EmployeeFormDialog } from "../components/EmployeeFormDialog";
import { CompanyDocumentsPanel } from "../components/CompanyDocumentsPanel";
import { ContactPersonsPanel } from "../components/ContactPersonsPanel";
import { FilePreviewContent } from "../components/FilePreviewContent";
import RowActionsMenu from "../components/RowActionsMenu";
import { withNavigation } from "../hocs/withNavigation";
import { setLastPath } from "../store/locationSlice";
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
        aprImporting: false,
        riskActDateValue: "",
        savingRiskActDate: false,
        riskActUploading: false,
        riskActPreviewOpen: false,
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
            role_risk_level: role.risk_level
                ? String(role.risk_level)
                : "",
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
        const {
            editingRoleId,
            role_name,
            role_risk_level,
            role_description,
        } = this.state;
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

    handleAprImport = (): void => {
        const { editTaxId } = this.state;
        if (!editTaxId.trim()) return;
        this.setState((prev) => ({ ...prev, aprImporting: true }));
        aprLookup(editTaxId.trim())
            .then((data) => {
                this.setState((prev) => ({
                    ...prev,
                    aprImporting: false,
                    editName: data.name ?? prev.editName,
                    editRegistration_number:
                        data.registration_number ??
                        prev.editRegistration_number,
                    editAddress: data.address ?? prev.editAddress,
                    editActivity_code:
                        data.activity_code ?? prev.editActivity_code,
                }));
                enqueueSnackbar("Podaci preuzeti iz APR-a.", {
                    variant: "success",
                });
            })
            .catch(() => {
                this.setState((prev) => ({ ...prev, aprImporting: false }));
                enqueueSnackbar(
                    "APR pretraga trenutno nije dostupna. Unesite podatke ručno.",
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

    handleRiskActUpload = (file: File | null): void => {
        if (!file) return;
        const id = Number(this.props.id);
        this.setState((prev) => ({ ...prev, riskActUploading: true }));
        uploadClientCompanyRiskAssessmentAct(id, file)
            .then((item) => {
                this.setState((prev) => ({
                    ...prev,
                    item,
                    riskActUploading: false,
                }));
                enqueueSnackbar("Akt o proceni rizika je sačuvan.", {
                    variant: "success",
                });
            })
            .catch(() => {
                this.setState((prev) => ({ ...prev, riskActUploading: false }));
                enqueueSnackbar("Greška pri otpremanju fajla.", {
                    variant: "error",
                });
            });
    };

    handleRiskActClear = (): void => {
        const id = Number(this.props.id);
        if (
            !window.confirm(
                "Da li si siguran da želiš da obrišeš Akt o proceni rizika?",
            )
        ) {
            return;
        }
        this.setState((prev) => ({ ...prev, riskActUploading: true }));
        clearClientCompanyRiskAssessmentAct(id)
            .then((item) => {
                this.setState((prev) => ({
                    ...prev,
                    item,
                    riskActUploading: false,
                }));
                enqueueSnackbar("Akt o proceni rizika je obrisan.", {
                    variant: "success",
                });
            })
            .catch(() => {
                this.setState((prev) => ({ ...prev, riskActUploading: false }));
                enqueueSnackbar("Greška pri brisanju fajla.", {
                    variant: "error",
                });
            });
    };

    openRiskActPreview = (): void => {
        this.setState((prev) => ({ ...prev, riskActPreviewOpen: true }));
    };

    closeRiskActPreview = (): void => {
        this.setState((prev) => ({ ...prev, riskActPreviewOpen: false }));
    };

    saveRiskActDate = (): void => {
        const id = Number(this.props.id);
        const { riskActDateValue } = this.state;
        let dateSent: string | null;
        if (riskActDateValue.trim()) {
            const d = StringToDate(riskActDateValue);
            dateSent = d
                ? `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`
                : null;
        } else {
            dateSent = null;
        }
        this.setState((prev) => ({ ...prev, savingRiskActDate: true }));
        updateClientCompany(id, { risk_assessment_act_date: dateSent })
            .then((item) => {
                this.setState((prev) => ({
                    ...prev,
                    item,
                    riskActDateValue:
                        ClientCompanyDetailPageInner.dateToDisplay(
                            item.risk_assessment_act_date,
                        ),
                    savingRiskActDate: false,
                }));
                enqueueSnackbar("Datum donošenja akta je sačuvan.", {
                    variant: "success",
                });
            })
            .catch(() => {
                this.setState((prev) => ({
                    ...prev,
                    savingRiskActDate: false,
                }));
                enqueueSnackbar("Greška pri čuvanju datuma.", {
                    variant: "error",
                });
            });
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
        ]).then(([employees, equipment, bindings, runs, jobRoles, riskLevels]) => {
            this.setState((prev) => ({
                ...prev,
                employees,
                equipment,
                bindings,
                runs,
                jobRoles,
                riskLevels,
            }));
        });
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

    private static dateToDisplay(iso: string | null | undefined): string {
        if (!iso) return "";
        const d = new Date(iso);
        const dd = String(d.getDate()).padStart(2, "0");
        const mm = String(d.getMonth() + 1).padStart(2, "0");
        return `${dd}.${mm}.${d.getFullYear()}`;
    }

    loadById = (id: number): void => {
        getClientCompany(id)
            .then((item) => {
                this.setState((prev) => ({
                    ...prev,
                    item,
                    riskActDateValue:
                        ClientCompanyDetailPageInner.dateToDisplay(
                            item.risk_assessment_act_date,
                        ),
                    loading: false,
                    error: null,
                    editing: false,
                    saveError: null,
                }));
                this.loadExtra(id);
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
            aprImporting,
            riskActDateValue,
            savingRiskActDate,
            riskActUploading,
            riskActPreviewOpen,
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
        const { navigate } = this.props;

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
                        {error ?? "Klijent nije pronađen."}
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
                            <Typography variant="h6">{item.name}</Typography>
                        )}
                        {!editing && (
                            <PermissionGate permission="partners.change_clientcompany">
                                <Button
                                    variant="outlined"
                                    onClick={this.startEdit}
                                >
                                    Izmeni podatke
                                </Button>
                            </PermissionGate>
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
                            <Box
                                sx={{
                                    display: "flex",
                                    gap: 1,
                                    alignItems: "flex-start",
                                }}
                            >
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
                                <Button
                                    variant="outlined"
                                    disabled={
                                        aprImporting || !editTaxId.trim()
                                    }
                                    onClick={this.handleAprImport}
                                    sx={{ mt: 1, flexShrink: 0 }}
                                >
                                    {aprImporting
                                        ? "Tražim..."
                                        : "Uvezi iz APR-a"}
                                </Button>
                            </Box>
                            <TextField
                                margin="dense"
                                label="Matični broj"
                                fullWidth
                                value={editRegistration_number}
                                onChange={(e) =>
                                    this.setState((prev) => ({
                                        ...prev,
                                        editRegistration_number: e.target.value,
                                    }))
                                }
                            />
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

                <ContactPersonsPanel clientCompanyId={item.id} />

                <Box
                    sx={{
                        display: "flex",
                        alignItems: "center",
                        gap: 2,
                        mt: 1,
                    }}
                >
                    <Button
                        variant="outlined"
                        disabled={generatingDoc}
                        onClick={this.handleGenerateMedicalExamRecord}
                    >
                        {generatingDoc ? "Generišem..." : "Generiši Obrazac 1"}
                    </Button>
                    {docError && <Alert severity="error">{docError}</Alert>}
                </Box>

                <Paper sx={{ p: 2 }}>
                    <Typography
                        variant="subtitle1"
                        fontWeight={600}
                        gutterBottom
                    >
                        Akt o proceni rizika
                    </Typography>
                    <PermissionGate permission="partners.change_clientcompany">
                        <Box
                            sx={{
                                display: "flex",
                                alignItems: "center",
                                gap: 1,
                                mb: 2,
                            }}
                        >
                            <Box sx={{ flex: 1 }}>
                                <DateTextFieldWithPicker
                                    label="Datum donošenja (dd.mm.yyyy)"
                                    value={riskActDateValue}
                                    allowPast
                                    onChange={(v) =>
                                        this.setState((prev) => ({
                                            ...prev,
                                            riskActDateValue: v,
                                        }))
                                    }
                                />
                            </Box>
                            <Button
                                variant="contained"
                                size="small"
                                disabled={savingRiskActDate}
                                onClick={this.saveRiskActDate}
                                sx={{ mt: 1 }}
                            >
                                {savingRiskActDate
                                    ? "Čuvam..."
                                    : "Sačuvaj datum"}
                            </Button>
                        </Box>
                    </PermissionGate>
                    {item.risk_assessment_act_file ? (
                        <Box
                            sx={{
                                display: "flex",
                                alignItems: "center",
                                gap: 1,
                                flexWrap: "wrap",
                            }}
                        >
                            <Typography variant="body2">
                                {item.risk_assessment_act_name ||
                                    "Akt o proceni rizika"}
                            </Typography>
                            <Box sx={{ flex: 1 }} />
                            <Button
                                size="small"
                                variant="outlined"
                                onClick={this.openRiskActPreview}
                            >
                                Pregled
                            </Button>
                            <PermissionGate permission="partners.change_clientcompany">
                                <Button
                                    size="small"
                                    component="label"
                                    variant="outlined"
                                    disabled={riskActUploading}
                                >
                                    Promeni fajl
                                    <input
                                        type="file"
                                        hidden
                                        accept=".pdf,.docx,.doc,.png,.jpg,.jpeg,.gif,.webp,image/*,application/pdf"
                                        onChange={(e) =>
                                            this.handleRiskActUpload(
                                                e.target.files?.[0] ?? null,
                                            )
                                        }
                                    />
                                </Button>
                                <Button
                                    size="small"
                                    variant="outlined"
                                    color="error"
                                    disabled={riskActUploading}
                                    onClick={this.handleRiskActClear}
                                >
                                    Obriši
                                </Button>
                            </PermissionGate>
                        </Box>
                    ) : (
                        <Box
                            sx={{
                                display: "flex",
                                alignItems: "center",
                                gap: 1,
                                flexWrap: "wrap",
                            }}
                        >
                            <Typography variant="body2" color="text.secondary">
                                Nije priložen fajl.
                            </Typography>
                            <Box sx={{ flex: 1 }} />
                            <PermissionGate permission="partners.change_clientcompany">
                                <Button
                                    size="small"
                                    component="label"
                                    variant="contained"
                                    disabled={riskActUploading}
                                >
                                    {riskActUploading
                                        ? "Otpremam..."
                                        : "Priloži fajl"}
                                    <input
                                        type="file"
                                        hidden
                                        accept=".pdf,.docx,.doc,.png,.jpg,.jpeg,.gif,.webp,image/*,application/pdf"
                                        onChange={(e) =>
                                            this.handleRiskActUpload(
                                                e.target.files?.[0] ?? null,
                                            )
                                        }
                                    />
                                </Button>
                            </PermissionGate>
                        </Box>
                    )}
                </Paper>

                <CompanyDocumentsPanel clientCompanyId={item.id} />

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
                                <TableCell align="right">Akcije</TableCell>
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
                                                riskLevel={r.risk_level_detail}
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
                                        <TableCell>{e.first_name}</TableCell>
                                        <TableCell>{e.last_name}</TableCell>
                                        <TableCell>{e.email ?? "—"}</TableCell>
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
                                    <TableCell colSpan={3} align="center">
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
                                            navigate(`/equipment/${eq.id}`)
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
                            {bindings.filter((b) => b.is_active).length ===
                            0 ? (
                                <TableRow>
                                    <TableCell colSpan={4} align="center">
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
                                            <TableCell sx={{ minWidth: 220 }}>
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
                                                                this.state
                                                                    .savingStartDateBindingId ===
                                                                b.id
                                                                    ? "Čuvam..."
                                                                    : undefined
                                                            }
                                                            onChange={(v) =>
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
                                                                this.state
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
                                                            hidden:
                                                                !b.has_open_run,
                                                            disabled:
                                                                this.state
                                                                    .deactivatingBindingId ===
                                                                b.id,
                                                            onClick: () =>
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

                <Typography variant="subtitle1" fontWeight={600} sx={{ mt: 2 }}>
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
                                    <TableCell colSpan={4} align="center">
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
                                            {r.subject_snapshot?.name ?? "—"}
                                        </TableCell>
                                        <TableCell>
                                            {formatDate(r.valid_until)}
                                        </TableCell>
                                        <TableCell>
                                            <StatusBadge status={r.status} />
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </Paper>

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

                {item.risk_assessment_act_file && (
                    <Dialog
                        open={riskActPreviewOpen}
                        onClose={this.closeRiskActPreview}
                        maxWidth="lg"
                        fullWidth
                    >
                        <DialogTitle>
                            {item.risk_assessment_act_name ||
                                "Akt o proceni rizika"}
                        </DialogTitle>
                        <DialogContent>
                            <FilePreviewContent
                                url={item.risk_assessment_act_file}
                                label={
                                    item.risk_assessment_act_name ||
                                    "Akt o proceni rizika"
                                }
                            />
                        </DialogContent>
                        <DialogActions>
                            <Button
                                href={item.risk_assessment_act_file}
                                target="_blank"
                                rel="noreferrer"
                            >
                                Otvori u novom prozoru
                            </Button>
                            <Button onClick={this.closeRiskActPreview}>
                                Zatvori
                            </Button>
                        </DialogActions>
                    </Dialog>
                )}

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
                                Da li si siguran da želiš da obrišeš radno
                                mesto „{this.state.roleDeleteTarget.name}"?
                            </>
                        ) : (
                            ""
                        )
                    }
                    loading={this.state.deletingRole}
                    onConfirm={this.confirmRoleDelete}
                    onClose={this.closeRoleDelete}
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
