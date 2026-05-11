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
} from "@mui/material";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import AddIcon from "@mui/icons-material/Add";
import { enqueueSnackbar } from "notistack";

import DateTextFieldWithPicker from "../components/DateTextFieldWithPicker";
import { StringToDate } from "../utils/date";
import {
    createEmployee,
    createEquipmentItem,
    generateMedicalExamRecord,
    getClientCompany,
    getEmployees,
    getEquipment,
    getProcessBindings,
    getProcessRuns,
    updateClientCompany,
} from "../api/processes";
import { PermissionGate } from "../components/PermissionGate";
import { withNavigation } from "../hocs/withNavigation";
import { setLastPath } from "../store/locationSlice";

import type {
    ClientCompanyDetailPageProps,
    ClientCompanyDetailPageState,
} from "../types/processPages";
import type {
    ClientCompany,
    Employee,
    EmployeeSummary,
    EquipmentItem,
    ProcessBinding,
} from "../types/processes";

const formatDate = (v?: string | null) =>
    v ? new Date(v).toLocaleDateString("sr-RS") : "—";

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
        empDialogOpen: false,
        emp_first_name: "",
        emp_last_name: "",
        emp_father_name: "",
        emp_national_id: "",
        emp_date_of_birth: "",
        emp_place_of_birth: "",
        emp_email: "",
        emp_org_unit: "",
        emp_position: "",
        emp_occupation: "",
        emp_high_risk_position_name: "",
        savingEmployee: false,
        employeeError: null,
        eqDialogOpen: false,
        eq_name: "",
        eq_category: "",
        eq_inventory_number: "",
        eq_location: "",
        eq_notes: "",
        savingEquipment: false,
        equipmentError: null,
    };

    openEmpDialog = (): void => {
        this.setState((prev) => ({
            ...prev,
            empDialogOpen: true,
            employeeError: null,
            emp_first_name: "",
            emp_last_name: "",
            emp_father_name: "",
            emp_national_id: "",
            emp_date_of_birth: "",
            emp_place_of_birth: "",
            emp_email: "",
            emp_org_unit: "",
            emp_position: "",
            emp_occupation: "",
            emp_high_risk_position_name: "",
        }));
    };

    closeEmpDialog = (): void => {
        this.setState((prev) => ({ ...prev, empDialogOpen: false }));
    };

    saveEmployee = (): void => {
        const id = Number(this.props.id);
        const {
            emp_first_name,
            emp_last_name,
            emp_father_name,
            emp_national_id,
            emp_date_of_birth,
            emp_place_of_birth,
            emp_email,
            emp_org_unit,
            emp_position,
            emp_occupation,
            emp_high_risk_position_name,
        } = this.state;
        if (
            !emp_first_name.trim() ||
            !emp_last_name.trim() ||
            !emp_email.trim() ||
            !emp_org_unit.trim() ||
            !emp_position.trim()
        )
            return;
        let dateOfBirthSent: string | undefined;
        if (emp_date_of_birth.trim()) {
            const d = StringToDate(emp_date_of_birth);
            dateOfBirthSent = d
                ? `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`
                : undefined;
        }
        const payload: Partial<Employee> = {
            first_name: emp_first_name.trim(),
            last_name: emp_last_name.trim(),
            father_name: emp_father_name.trim() || undefined,
            national_id: emp_national_id.trim() || undefined,
            date_of_birth: dateOfBirthSent,
            place_of_birth: emp_place_of_birth.trim() || undefined,
            email: emp_email.trim(),
            org_unit: emp_org_unit.trim(),
            position: emp_position.trim(),
            occupation: emp_occupation.trim() || undefined,
            high_risk_position_name:
                emp_high_risk_position_name.trim() || undefined,
            client_company: id,
        };
        this.setState((prev) => ({
            ...prev,
            savingEmployee: true,
            employeeError: null,
        }));
        createEmployee(payload)
            .then((created) => {
                const summary: EmployeeSummary = {
                    id: created.id,
                    client_company: created.client_company ?? id,
                    first_name: created.first_name,
                    last_name: created.last_name,
                    email: created.email,
                    org_unit: created.org_unit,
                    position: created.position,
                };
                this.setState((prev) => ({
                    ...prev,
                    employees: [...prev.employees, summary],
                    savingEmployee: false,
                    empDialogOpen: false,
                }));
                enqueueSnackbar("Zaposleni dodat.", { variant: "success" });
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
                        "Greška pri čuvanju zaposlenog.";
                    this.setState((prev) => ({
                        ...prev,
                        savingEmployee: false,
                        employeeError: msg,
                    }));
                },
            );
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
        ]).then(([employees, equipment, bindings, runs]) => {
            this.setState((prev) => ({
                ...prev,
                employees,
                equipment,
                bindings,
                runs,
            }));
        });
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
            empDialogOpen,
            emp_first_name,
            emp_last_name,
            emp_father_name,
            emp_national_id,
            emp_date_of_birth,
            emp_place_of_birth,
            emp_email,
            emp_org_unit,
            emp_position,
            emp_occupation,
            emp_high_risk_position_name,
            savingEmployee,
            employeeError,
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
                        {generatingDoc
                            ? "Generišem..."
                            : "Generiši Obrazac 1"}
                    </Button>
                    {docError && <Alert severity="error">{docError}</Alert>}
                </Box>

                <Box
                    sx={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        mt: 2,
                    }}
                >
                    <Typography variant="subtitle1" fontWeight={600}>
                        Zaposleni
                    </Typography>
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
                </Box>
                <Paper sx={{ overflow: "auto" }}>
                    <Table size="small">
                        <TableHead>
                            <TableRow>
                                <TableCell>Ime</TableCell>
                                <TableCell>Prezime</TableCell>
                                <TableCell>Email</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {employees.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={3} align="center">
                                        Nema zaposlenih.
                                    </TableCell>
                                </TableRow>
                            ) : (
                                employees.map((e) => (
                                    <TableRow key={e.id}>
                                        <TableCell>{e.first_name}</TableCell>
                                        <TableCell>{e.last_name}</TableCell>
                                        <TableCell>{e.email ?? "—"}</TableCell>
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
                                    <TableRow key={eq.id}>
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

                <Typography variant="subtitle1" fontWeight={600} sx={{ mt: 2 }}>
                    Aktivni rasporedi
                </Typography>
                <Paper sx={{ overflow: "auto" }}>
                    <Table size="small">
                        <TableHead>
                            <TableRow>
                                <TableCell>Vrsta obaveze</TableCell>
                                <TableCell>Subjekt</TableCell>
                                <TableCell>Sledeći termin</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {bindings.filter((b) => b.is_active).length ===
                            0 ? (
                                <TableRow>
                                    <TableCell colSpan={3} align="center">
                                        Nema aktivnih rasporeda.
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
                                            <TableCell>
                                                {formatDate(b.next_run_at)}
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
                                        <TableCell>{r.status}</TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </Paper>

                <Dialog
                    open={empDialogOpen}
                    onClose={this.closeEmpDialog}
                    maxWidth="sm"
                    fullWidth
                >
                    <DialogTitle>Nov zaposleni</DialogTitle>
                    <DialogContent>
                        {employeeError && (
                            <Alert severity="error" sx={{ mb: 1 }}>
                                {employeeError}
                            </Alert>
                        )}
                        <TextField
                            margin="dense"
                            label="Ime"
                            fullWidth
                            required
                            value={emp_first_name}
                            onChange={(e) =>
                                this.setState((prev) => ({
                                    ...prev,
                                    emp_first_name: e.target.value,
                                }))
                            }
                        />
                        <TextField
                            margin="dense"
                            label="Prezime"
                            fullWidth
                            required
                            value={emp_last_name}
                            onChange={(e) =>
                                this.setState((prev) => ({
                                    ...prev,
                                    emp_last_name: e.target.value,
                                }))
                            }
                        />
                        <TextField
                            margin="dense"
                            label="Ime oca"
                            fullWidth
                            value={emp_father_name}
                            onChange={(e) =>
                                this.setState((prev) => ({
                                    ...prev,
                                    emp_father_name: e.target.value,
                                }))
                            }
                        />
                        <Tooltip title="Jedinstveni matični broj građanina (13 cifara).">
                            <TextField
                                margin="dense"
                                label="JMBG"
                                fullWidth
                                value={emp_national_id}
                                onChange={(e) =>
                                    this.setState((prev) => ({
                                        ...prev,
                                        emp_national_id: e.target.value,
                                    }))
                                }
                            />
                        </Tooltip>
                        <Box>
                            <DateTextFieldWithPicker
                                label="Datum rođenja (dd.mm.yyyy)"
                                value={emp_date_of_birth}
                                onChange={(v) =>
                                    this.setState((prev) => ({
                                        ...prev,
                                        emp_date_of_birth: v,
                                    }))
                                }
                                defaultYearsAgo={18}
                                minYearsAgo={18}
                                minYearsAgoMessage="Zaposleni mora imati najmanje 18 godina. Da li si siguran da želiš da nastaviš sa izabranim datumom?"
                            />
                        </Box>
                        <TextField
                            margin="dense"
                            label="Mesto rođenja"
                            fullWidth
                            value={emp_place_of_birth}
                            onChange={(e) =>
                                this.setState((prev) => ({
                                    ...prev,
                                    emp_place_of_birth: e.target.value,
                                }))
                            }
                        />
                        <TextField
                            margin="dense"
                            label="Email"
                            fullWidth
                            required
                            value={emp_email}
                            onChange={(e) =>
                                this.setState((prev) => ({
                                    ...prev,
                                    emp_email: e.target.value,
                                }))
                            }
                        />
                        <TextField
                            margin="dense"
                            label="Organizaciona jedinica"
                            fullWidth
                            required
                            value={emp_org_unit}
                            onChange={(e) =>
                                this.setState((prev) => ({
                                    ...prev,
                                    emp_org_unit: e.target.value,
                                }))
                            }
                        />
                        <TextField
                            margin="dense"
                            label="Pozicija"
                            fullWidth
                            required
                            value={emp_position}
                            onChange={(e) =>
                                this.setState((prev) => ({
                                    ...prev,
                                    emp_position: e.target.value,
                                }))
                            }
                        />
                        <TextField
                            margin="dense"
                            label="Zanimanje"
                            fullWidth
                            value={emp_occupation}
                            onChange={(e) =>
                                this.setState((prev) => ({
                                    ...prev,
                                    emp_occupation: e.target.value,
                                }))
                            }
                        />
                        <TextField
                            margin="dense"
                            label="Naziv radnog mesta sa povećanim rizikom"
                            fullWidth
                            value={emp_high_risk_position_name}
                            onChange={(e) =>
                                this.setState((prev) => ({
                                    ...prev,
                                    emp_high_risk_position_name: e.target.value,
                                }))
                            }
                        />
                    </DialogContent>
                    <DialogActions>
                        <Button
                            onClick={this.closeEmpDialog}
                            disabled={savingEmployee}
                        >
                            Odustani
                        </Button>
                        <Button
                            onClick={this.saveEmployee}
                            variant="contained"
                            disabled={
                                savingEmployee ||
                                !emp_first_name.trim() ||
                                !emp_last_name.trim() ||
                                !emp_email.trim() ||
                                !emp_org_unit.trim() ||
                                !emp_position.trim()
                            }
                        >
                            {savingEmployee ? "Čuvam..." : "Sačuvaj"}
                        </Button>
                    </DialogActions>
                </Dialog>

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
