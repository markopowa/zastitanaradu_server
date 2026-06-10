import { Component } from "react";
import { connect } from "react-redux";

import {
    Alert,
    Box,
    Button,
    CircularProgress,
    FormControl,
    InputLabel,
    MenuItem,
    Paper,
    Select,
    Step,
    StepLabel,
    Stepper,
    TextField,
    Typography,
} from "@mui/material";

import { AppButton } from "../design/AppButton";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import { enqueueSnackbar } from "notistack";

import {
    registryLookup,
    createClientCompany,
    createJobRole,
    getEmployees,
    getProcessTypes,
    getRiskLevels,
} from "../api/processes";
import { AddProcessBindingDialog } from "../components/AddProcessBindingDialog";
import { CompanyDocumentsPanel } from "../components/CompanyDocumentsPanel";
import { EmployeeFormDialog } from "../components/EmployeeFormDialog";
import { PermissionGate } from "../components/PermissionGate";
import { withNavigation } from "../hocs/withNavigation";
import { setBreadcrumbs, setLastPath } from "../store/locationSlice";
import { companyTabUrl } from "../utils/companyTabs";
import { EmptyState } from "../design";

import type { AppDispatch } from "../store";
import type { WithNavigationProps } from "../hocs/withNavigation";
import type { ClientCompany, EmployeeSummary, RiskLevel } from "../types/processes";
import { setupTestFill } from "../testFlow/registerTestFill";
import { TEST_FLOW } from "../testFlow/fixture";
import { riskLevelIdByLabel } from "../testFlow/helpers";

const WIZARD_STEPS = [
    "Lična karta",
    "Obavezna dokumentacija",
    "Radna mesta i rizik",
    "Zaposleni",
    "Lekarski pregledi",
    "Stručni nalazi",
] as const;

interface DispatchProps {
    setLastPath: (path: string) => void;
    setBreadcrumbs: (items: { label: string; path?: string }[]) => void;
}

type Props = DispatchProps & WithNavigationProps;

interface State {
    activeStep: number;
    companyId: number | null;
    name: string;
    tax_id: string;
    registration_number: string;
    address: string;
    phone: string;
    email: string;
    website: string;
    notes: string;
    activity_code: string;
    registryImporting: boolean;
    saving: boolean;
    stepError: string | null;
    riskLevels: RiskLevel[];
    roleName: string;
    roleRiskLevelId: string;
    roleDescription: string;
    savingRole: boolean;
    addedRoles: { id: number; name: string }[];
    addedEmployees: EmployeeSummary[];
    employeesLoading: boolean;
    hasEmployeeProcessTypes: boolean;
    empDialogOpen: boolean;
    bindingDialogOpen: boolean;
    bindingEmployeeId: number | null;
    bindingEmployeeLabel: string;
}

class NewCompanyWizardPage extends Component<Props, State> {
    private testFillCleanups: Array<() => void> = [];

    state: State = {
        activeStep: 0,
        companyId: null,
        name: "",
        tax_id: "",
        registration_number: "",
        address: "",
        phone: "",
        email: "",
        website: "",
        notes: "",
        activity_code: "",
        registryImporting: false,
        saving: false,
        stepError: null,
        riskLevels: [],
        roleName: "",
        roleRiskLevelId: "",
        roleDescription: "",
        savingRole: false,
        addedRoles: [],
        addedEmployees: [],
        employeesLoading: false,
        hasEmployeeProcessTypes: false,
        empDialogOpen: false,
        bindingDialogOpen: false,
        bindingEmployeeId: null,
        bindingEmployeeLabel: "",
    };

    componentDidMount(): void {
        this.props.setLastPath("/client-companies/new");
        this.props.setBreadcrumbs([
            { label: "Firme", path: "/client-companies" },
            { label: "Nova firma" },
        ]);
        getRiskLevels()
            .then((items) =>
                this.setState((prev) => ({ ...prev, riskLevels: items })),
            )
            .catch(() => undefined);
        this.bindTestFillHandlers();
    }

    componentDidUpdate(_prevProps: Props, prevState: State): void {
        this.bindTestFillHandlers();
        const { activeStep, companyId } = this.state;
        if (companyId == null) return;
        if (activeStep === 3 && prevState.activeStep !== 3) {
            this.loadEmployees();
        }
        if (activeStep === 4 && prevState.activeStep !== 4) {
            this.loadMedicalStepContext();
        }
    }

    loadEmployees = (): void => {
        const { companyId } = this.state;
        if (companyId == null) return;
        this.setState({ employeesLoading: true });
        getEmployees({ client_company_id: companyId })
            .then((items) =>
                this.setState({
                    addedEmployees: items,
                    employeesLoading: false,
                }),
            )
            .catch(() => this.setState({ employeesLoading: false }));
    };

    loadMedicalStepContext = (): void => {
        this.loadEmployees();
        getProcessTypes()
            .then((types) => {
                const hasEmployee = types.some(
                    (t) => t.subject_kind === "EMPLOYEE" && t.is_active,
                );
                this.setState({ hasEmployeeProcessTypes: hasEmployee });
            })
            .catch(() => undefined);
    };

    openBindingForEmployee = (emp: EmployeeSummary): void => {
        this.setState({
            bindingDialogOpen: true,
            bindingEmployeeId: emp.id,
            bindingEmployeeLabel: `${emp.first_name} ${emp.last_name}`,
        });
    };

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
        const c = TEST_FLOW.company;
        this.testFillCleanups.push(
            setupTestFill(
                "A1",
                () => {
                    this.setState({
                        name: c.name,
                        tax_id: c.tax_id,
                        registration_number: c.registration_number,
                        address: c.address,
                        phone: c.phone,
                        email: c.email,
                        website: "",
                        notes: c.notes,
                        activity_code: c.activity_code,
                    });
                    return true;
                },
                () => this.state.activeStep === 0,
            ),
            setupTestFill(
                "A3",
                () => {
                    const jr = TEST_FLOW.jobRoleWizard;
                    this.setState({
                        roleName: jr.name,
                        roleRiskLevelId: riskLevelIdByLabel(
                            this.state.riskLevels,
                            jr.riskLevelLabel,
                        ),
                        roleDescription: "",
                    });
                    return true;
                },
                () => this.state.activeStep === 2,
            ),
        );
    };

    handleRegistryImport = (): void => {
        const { registration_number } = this.state;
        if (!registration_number.trim()) return;
        this.setState((prev) => ({ ...prev, registryImporting: true }));
        registryLookup(registration_number.trim())
            .then((data) => {
                this.setState((prev) => ({
                    ...prev,
                    registryImporting: false,
                    name: data.name ?? prev.name,
                    registration_number:
                        data.registration_number ?? prev.registration_number,
                    address: data.address ?? prev.address,
                    activity_code: data.activity_code ?? prev.activity_code,
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

    saveStep1 = (): Promise<number | null> => {
        const {
            companyId,
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
        if (companyId != null) return Promise.resolve(companyId);
        if (!name.trim() || !tax_id.trim()) {
            this.setState((prev) => ({
                ...prev,
                stepError: "Naziv i PIB su obavezni.",
            }));
            return Promise.resolve(null);
        }
        this.setState((prev) => ({ ...prev, saving: true, stepError: null }));
        return createClientCompany({
            name: name.trim(),
            tax_id: tax_id.trim(),
            registration_number: registration_number.trim() || undefined,
            address: address.trim() || undefined,
            phone: phone.trim() || undefined,
            email: email.trim() || undefined,
            website: website.trim() || undefined,
            notes: notes.trim() || undefined,
            activity_code: activity_code.trim() || undefined,
        })
            .then((created) => {
                this.setState((prev) => ({
                    ...prev,
                    saving: false,
                    companyId: created.id,
                }));
                enqueueSnackbar("Firma je kreirana.", { variant: "success" });
                return created.id;
            })
            .catch(() => {
                this.setState((prev) => ({
                    ...prev,
                    saving: false,
                    stepError: "Greška pri kreiranju firme.",
                }));
                return null;
            });
    };

    addRole = async (): Promise<boolean> => {
        const { companyId, roleName, roleRiskLevelId, roleDescription } =
            this.state;
        if (companyId == null) return false;
        if (!roleName.trim() || !roleRiskLevelId) {
            this.setState((prev) => ({
                ...prev,
                stepError: "Naziv i nivo rizika su obavezni.",
            }));
            return false;
        }
        this.setState((prev) => ({
            ...prev,
            savingRole: true,
            stepError: null,
        }));
        try {
            const created = await createJobRole({
                client_company: companyId,
                name: roleName.trim(),
                risk_level: Number(roleRiskLevelId),
                description: roleDescription.trim() || undefined,
            });
            this.setState((prev) => ({
                ...prev,
                savingRole: false,
                roleName: "",
                roleRiskLevelId: "",
                roleDescription: "",
                addedRoles: [
                    ...prev.addedRoles,
                    { id: created.id, name: created.name },
                ],
            }));
            enqueueSnackbar("Radno mesto je dodato.", { variant: "success" });
            return true;
        } catch {
            this.setState((prev) => ({
                ...prev,
                savingRole: false,
                stepError: "Greška pri dodavanju radnog mesta.",
            }));
            return false;
        }
    };

    handleNext = (): void => {
        const { activeStep } = this.state;
        if (activeStep === 0) {
            void this.saveStep1().then((id) => {
                if (id != null) {
                    this.setState((prev) => ({
                        ...prev,
                        activeStep: prev.activeStep + 1,
                    }));
                }
            });
            return;
        }
        if (activeStep === 2) {
            const { roleName, roleRiskLevelId } = this.state;
            const hasPending = roleName.trim() !== "" || roleRiskLevelId !== "";
            if (hasPending) {
                void this.addRole().then((ok) => {
                    if (ok) {
                        this.setState((prev) => ({
                            ...prev,
                            activeStep: prev.activeStep + 1,
                        }));
                    }
                });
            } else {
                this.setState((prev) => ({
                    ...prev,
                    activeStep: prev.activeStep + 1,
                }));
            }
            return;
        }
        if (activeStep === 3) {
            const { addedEmployees } = this.state;
            if (addedEmployees.length === 0) {
                enqueueSnackbar("Dodaj bar jednog zaposlenog pre sledećeg koraka.", {
                    variant: "warning",
                });
                return;
            }
            this.setState((prev) => ({
                ...prev,
                activeStep: prev.activeStep + 1,
            }));
            this.loadMedicalStepContext();
            return;
        }
        this.setState((prev) => ({
            ...prev,
            activeStep: Math.min(prev.activeStep + 1, WIZARD_STEPS.length - 1),
        }));
    };

    handleBack = (): void => {
        this.setState((prev) => ({
            ...prev,
            activeStep: Math.max(prev.activeStep - 1, 0),
            stepError: null,
        }));
    };

    handleFinish = (): void => {
        const { navigate } = this.props;
        const id = this.state.companyId;
        if (id == null) {
            void this.saveStep1().then((createdId) => {
                if (createdId != null) {
                    navigate(companyTabUrl(createdId, "compliance"));
                }
            });
            return;
        }
        navigate(companyTabUrl(id, "compliance"));
    };

    renderStepContent(): React.ReactNode {
        const {
            activeStep,
            companyId,
            name,
            tax_id,
            registration_number,
            address,
            phone,
            email,
            website,
            notes,
            activity_code,
            registryImporting,
            saving,
            stepError,
            riskLevels,
            roleName,
            roleRiskLevelId,
            roleDescription,
            savingRole,
            addedRoles,
            addedEmployees,
            employeesLoading,
            hasEmployeeProcessTypes,
            empDialogOpen,
            bindingDialogOpen,
            bindingEmployeeId,
            bindingEmployeeLabel,
        } = this.state;

        if (activeStep === 0) {
            return (
                <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
                    {stepError && <Alert severity="error">{stepError}</Alert>}
                    <TextField
                        label="Naziv"
                        required
                        fullWidth
                        value={name}
                        onChange={(e) =>
                            this.setState((prev) => ({
                                ...prev,
                                name: e.target.value,
                            }))
                        }
                    />
                    <TextField
                        label="PIB"
                        required
                        fullWidth
                        value={tax_id}
                        onChange={(e) =>
                            this.setState((prev) => ({
                                ...prev,
                                tax_id: e.target.value,
                            }))
                        }
                    />
                    <Box sx={{ display: "flex", gap: 1, alignItems: "center" }}>
                        <TextField
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
                        <AppButton
                            label="Uvezi"
                            tooltip="Uvezi iz javnog registra."
                            loading={registryImporting}
                            loadingLabel="Tražim…"
                            variant="outlined"
                            disabled={!registration_number.trim()}
                            onClick={this.handleRegistryImport}
                            sx={{ flexShrink: 0 }}
                        />
                    </Box>
                    <TextField
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
                    <TextField
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
                    <TextField
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
                    {saving && (
                        <Box sx={{ display: "flex", justifyContent: "center" }}>
                            <CircularProgress size={24} />
                        </Box>
                    )}
                </Box>
            );
        }

        if (companyId == null) {
            return (
                <Alert severity="warning">
                    Prvo sačuvajte osnovne podatke firme u koraku 1.
                </Alert>
            );
        }

        if (activeStep === 1) {
            return (
                <CompanyDocumentsPanel clientCompanyId={companyId} embedded />
            );
        }

        if (activeStep === 2) {
            return (
                <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
                    {stepError && <Alert severity="error">{stepError}</Alert>}
                    {addedRoles.length > 0 && (
                        <Box>
                            {addedRoles.map((r) => (
                                <Typography key={r.id} variant="body2">
                                    • {r.name}
                                </Typography>
                            ))}
                        </Box>
                    )}
                    <TextField
                        label="Naziv radnog mesta"
                        fullWidth
                        value={roleName}
                        onChange={(e) =>
                            this.setState((prev) => ({
                                ...prev,
                                roleName: e.target.value,
                            }))
                        }
                    />
                    <FormControl fullWidth>
                        <InputLabel>Nivo rizika</InputLabel>
                        <Select
                            label="Nivo rizika"
                            value={roleRiskLevelId}
                            onChange={(e) =>
                                this.setState((prev) => ({
                                    ...prev,
                                    roleRiskLevelId: e.target.value,
                                }))
                            }
                        >
                            {riskLevels.map((r) => (
                                <MenuItem key={r.id} value={String(r.id)}>
                                    {r.label}
                                </MenuItem>
                            ))}
                        </Select>
                    </FormControl>
                    <TextField
                        label="Opis"
                        fullWidth
                        multiline
                        minRows={2}
                        value={roleDescription}
                        onChange={(e) =>
                            this.setState((prev) => ({
                                ...prev,
                                roleDescription: e.target.value,
                            }))
                        }
                    />
                    <Box>
                        <Button
                            variant="outlined"
                            disabled={
                                savingRole ||
                                !roleName.trim() ||
                                !roleRiskLevelId
                            }
                            onClick={() => void this.addRole()}
                        >
                            Dodaj radno mesto
                        </Button>
                    </Box>
                    {savingRole && (
                        <Box sx={{ display: "flex", justifyContent: "center" }}>
                            <CircularProgress size={24} />
                        </Box>
                    )}
                </Box>
            );
        }

        if (activeStep === 3) {
            const companyStub: ClientCompany = {
                id: companyId,
                name: this.state.name,
                tax_id: this.state.tax_id,
            };
            return (
                <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
                    {employeesLoading && (
                        <Box sx={{ display: "flex", justifyContent: "center" }}>
                            <CircularProgress size={24} />
                        </Box>
                    )}
                    {addedEmployees.length > 0 && (
                        <Box>
                            <Typography variant="subtitle2" gutterBottom>
                                Dodati zaposleni
                            </Typography>
                            {addedEmployees.map((e) => (
                                <Typography key={e.id} variant="body2">
                                    • {e.first_name} {e.last_name}
                                    {e.position ? ` — ${e.position}` : ""}
                                </Typography>
                            ))}
                        </Box>
                    )}
                    {addedEmployees.length === 0 && !employeesLoading && (
                        <Alert severity="info">
                            Dodaj bar jednog zaposlenog pre sledećeg koraka
                            (integration tests: F1).
                        </Alert>
                    )}
                    <PermissionGate permission="partners.add_employee">
                        <Button
                            variant="contained"
                            onClick={() =>
                                this.setState((prev) => ({
                                    ...prev,
                                    empDialogOpen: true,
                                }))
                            }
                        >
                            Dodaj zaposlenog
                        </Button>
                    </PermissionGate>
                    <EmployeeFormDialog
                        open={empDialogOpen}
                        mode="create"
                        clientCompanies={[companyStub]}
                        lockedClientCompanyId={companyId}
                        onClose={() =>
                            this.setState((prev) => ({
                                ...prev,
                                empDialogOpen: false,
                            }))
                        }
                        onSaved={() => {
                            this.setState((prev) => ({
                                ...prev,
                                empDialogOpen: false,
                            }));
                            this.loadEmployees();
                        }}
                    />
                </Box>
            );
        }

        if (activeStep === 4) {
            return (
                <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
                    {!hasEmployeeProcessTypes && (
                        <Alert severity="warning">
                            Nema vrste obaveze za zaposlenog (integration
                            tests: H). Šablon dokumenta (G) ovde ne pomaže —
                            mora Periodični lekarski pregled u Vrste obaveza.
                        </Alert>
                    )}
                    {addedEmployees.length === 0 && (
                        <Alert severity="warning">
                            Nema zaposlenih. Vrati se na korak Zaposleni.
                        </Alert>
                    )}
                    {addedEmployees.length > 0 && hasEmployeeProcessTypes && (
                        <Alert severity="info">
                            Dodaj obavezu za zaposlenog (J1 u integration
                            tests).
                        </Alert>
                    )}
                    {employeesLoading && (
                        <Box sx={{ display: "flex", justifyContent: "center" }}>
                            <CircularProgress size={24} />
                        </Box>
                    )}
                    {addedEmployees.map((emp) => (
                        <Box
                            key={emp.id}
                            sx={{
                                display: "flex",
                                justifyContent: "space-between",
                                alignItems: "center",
                                gap: 1,
                                flexWrap: "wrap",
                            }}
                        >
                            <Typography variant="body2">
                                {emp.first_name} {emp.last_name}
                                {emp.position ? ` — ${emp.position}` : ""}
                            </Typography>
                            <PermissionGate permission="processes.add_processbinding">
                                <Button
                                    variant="outlined"
                                    size="small"
                                    disabled={!hasEmployeeProcessTypes}
                                    onClick={() =>
                                        this.openBindingForEmployee(emp)
                                    }
                                >
                                    Dodaj obavezu
                                </Button>
                            </PermissionGate>
                        </Box>
                    ))}
                    <AddProcessBindingDialog
                        open={bindingDialogOpen}
                        onClose={() =>
                            this.setState((prev) => ({
                                ...prev,
                                bindingDialogOpen: false,
                                bindingEmployeeId: null,
                                bindingEmployeeLabel: "",
                            }))
                        }
                        onSuccess={() =>
                            this.setState((prev) => ({
                                ...prev,
                                bindingDialogOpen: false,
                                bindingEmployeeId: null,
                                bindingEmployeeLabel: "",
                            }))
                        }
                        subjectKind="EMPLOYEE"
                        subjectLabel={bindingEmployeeLabel}
                        employeeId={bindingEmployeeId ?? undefined}
                        clientCompanyId={companyId}
                    />
                </Box>
            );
        }

        return (
            <EmptyState message="Modul stručnih nalaza još nije dostupan. Nastavite na završetak čarobnjaka." />
        );
    }

    render() {
        const { activeStep, saving } = this.state;
        const { navigate } = this.props;
        const isLast = activeStep === WIZARD_STEPS.length - 1;

        return (
            <Box sx={{ display: "flex", flexDirection: "column", gap: 3 }}>
                <Button
                    startIcon={<ArrowBackIcon />}
                    onClick={() => navigate("/client-companies")}
                    sx={{ alignSelf: "flex-start" }}
                >
                    Nazad na listu
                </Button>
                <Typography variant="h6">Nova firma</Typography>
                <Stepper activeStep={activeStep} alternativeLabel>
                    {WIZARD_STEPS.map((label) => (
                        <Step key={label}>
                            <StepLabel>{label}</StepLabel>
                        </Step>
                    ))}
                </Stepper>
                <Paper sx={{ p: 3 }}>{this.renderStepContent()}</Paper>
                <Box
                    sx={{
                        display: "flex",
                        justifyContent: "space-between",
                        gap: 1,
                        flexWrap: "wrap",
                    }}
                >
                    <Box sx={{ display: "flex", gap: 1 }}>
                        {activeStep > 0 && (
                            <Button
                                variant="contained"
                                disabled={saving}
                                onClick={this.handleBack}
                            >
                                Nazad
                            </Button>
                        )}
                    </Box>
                    <Box sx={{ display: "flex", gap: 1 }}>
                        {isLast ? (
                            <Button
                                variant="contained"
                                disabled={saving}
                                onClick={this.handleFinish}
                            >
                                Završi
                            </Button>
                        ) : (
                            <Button
                                variant="contained"
                                disabled={saving}
                                onClick={this.handleNext}
                            >
                                Sledeći
                            </Button>
                        )}
                    </Box>
                </Box>
            </Box>
        );
    }
}

const mapDispatchToProps = (dispatch: AppDispatch): DispatchProps => ({
    setLastPath: (path) => dispatch(setLastPath(path)),
    setBreadcrumbs: (items) => dispatch(setBreadcrumbs(items)),
});

export default connect(
    null,
    mapDispatchToProps,
)(withNavigation(NewCompanyWizardPage));
