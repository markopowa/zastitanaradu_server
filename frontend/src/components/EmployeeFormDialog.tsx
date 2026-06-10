import { Component } from "react";

import {
    Alert,
    Box,
    Dialog,
    DialogContent,
    DialogTitle,
    Divider,
    FormControl,
    InputLabel,
    MenuItem,
    Select,
    TextField,
    Tooltip,
    Typography,
} from "@mui/material";
import { enqueueSnackbar } from "notistack";

import DateTextFieldWithPicker from "./DateTextFieldWithPicker";
import {
    createEmployee,
    getJobRoles,
    getRiskLevels,
    updateEmployee,
} from "../api/processes";
import { FormActions } from "../design";
import { isoDateToFormDisplay, StringToDate } from "../utils/date";
import {
    isJmbgComplete,
    jmbgMatchesDate,
    jmbgToDateString,
} from "../utils/jmbg";

import type {
    EmployeeFormDialogProps,
    EmployeeFormDialogState,
} from "../types/processPages";
import type { Employee } from "../types/processes";
import { setupTestFill } from "../testFlow/registerTestFill";
import {
    randomTestEmployee,
    TEST_EMPLOYEE_PRIMARY,
    type TestEmployeeFixture,
} from "../testFlow/employeeFixture";
import { employeeFormFillFields } from "../testFlow/applyEmployeeFill";

const emptyForm = (): Omit<
    EmployeeFormDialogState,
    "jobRoles" | "riskLevels" | "saving" | "error"
> => ({
    client_company_id: "",
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
    job_role: "",
    risk_level_override: "",
});

export class EmployeeFormDialog extends Component<
    EmployeeFormDialogProps,
    EmployeeFormDialogState
> {
    private testFillCleanups: Array<() => void> = [];

    state: EmployeeFormDialogState = {
        ...emptyForm(),
        jobRoles: [],
        riskLevels: [],
        saving: false,
        error: null,
    };

    componentDidMount(): void {
        this.bindTestFillHandlers();
    }

    componentWillUnmount(): void {
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
        const isOpen = () => this.props.open;
        const apply = (fixture: TestEmployeeFixture): boolean => {
            if (!this.props.open) {
                return false;
            }
            this.setState(employeeFormFillFields(fixture, this.state.jobRoles));
            return true;
        };
        this.testFillCleanups.push(
            setupTestFill("F1", () => apply(TEST_EMPLOYEE_PRIMARY), isOpen),
            setupTestFill("F2", () => apply(randomTestEmployee()), isOpen),
            setupTestFill("F3", () => apply(randomTestEmployee()), isOpen),
        );
    };

    componentDidUpdate(prevProps: EmployeeFormDialogProps): void {
        if (this.props.open && !prevProps.open) {
            this.initForm();
        }
        this.bindTestFillHandlers();
    }

    initForm = (): void => {
        const {
            mode,
            initial,
            lockedClientCompanyId,
            initialClientCompanyId,
            clientCompanies,
        } = this.props;
        const base = emptyForm();
        if (mode === "edit" && initial) {
            Object.assign(base, {
                client_company_id:
                    initial.client_company != null
                        ? String(initial.client_company)
                        : "",
                first_name: initial.first_name ?? "",
                last_name: initial.last_name ?? "",
                father_name: initial.father_name ?? "",
                national_id: initial.national_id ?? "",
                date_of_birth: isoDateToFormDisplay(initial.date_of_birth),
                place_of_birth: initial.place_of_birth ?? "",
                email: initial.email ?? "",
                org_unit: initial.org_unit ?? "",
                position: initial.position ?? "",
                occupation: initial.occupation ?? "",
                high_risk_position_name: initial.high_risk_position_name ?? "",
                job_role:
                    initial.job_role != null ? String(initial.job_role) : "",
                risk_level_override:
                    initial.risk_level_override != null
                        ? String(initial.risk_level_override)
                        : "",
            });
        } else if (lockedClientCompanyId != null) {
            base.client_company_id = String(lockedClientCompanyId);
        } else if (initialClientCompanyId) {
            base.client_company_id = initialClientCompanyId;
        } else if (clientCompanies.length === 1) {
            base.client_company_id = String(clientCompanies[0].id);
        }
        this.setState({
            ...base,
            jobRoles: [],
            riskLevels: [],
            saving: false,
            error: null,
        });
        void getRiskLevels().then((riskLevels) =>
            this.setState({ riskLevels }),
        );
        const companyId = base.client_company_id;
        if (companyId) {
            this.loadJobRoles(companyId);
        }
    };

    loadJobRoles = (clientCompanyId: string): void => {
        getJobRoles({ client_company_id: Number(clientCompanyId) }).then(
            (jobRoles) => this.setState({ jobRoles }),
        );
    };

    handleClientChange = (clientCompanyId: string): void => {
        this.setState(
            (prev) => ({
                ...prev,
                client_company_id: clientCompanyId,
                job_role: "",
            }),
            () => {
                if (clientCompanyId) {
                    this.loadJobRoles(clientCompanyId);
                } else {
                    this.setState({ jobRoles: [] });
                }
            },
        );
    };

    handleClose = (): void => {
        if (this.state.saving) return;
        this.props.onClose();
    };

    isValid = (): boolean => {
        const {
            first_name,
            last_name,
            email,
            org_unit,
            position,
            client_company_id,
            job_role,
        } = this.state;
        return [
            first_name,
            last_name,
            email,
            org_unit,
            position,
            client_company_id,
            job_role,
        ].every((v) => v.trim() !== "");
    };

    handleSave = (): void => {
        const {
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
            client_company_id,
            job_role,
            risk_level_override,
        } = this.state;
        if (!this.isValid()) return;

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
            job_role: job_role ? Number(job_role) : null,
            risk_level_override: risk_level_override
                ? Number(risk_level_override)
                : null,
            client_company: Number(client_company_id),
        };

        this.setState({ saving: true, error: null });
        const { mode, initial, onSaved, onClose } = this.props;
        const request =
            mode === "edit" && initial
                ? updateEmployee(initial.id, payload)
                : createEmployee(payload);

        request
            .then((saved) => {
                this.setState({ saving: false });
                enqueueSnackbar(
                    mode === "edit" ? "Zaposleni sačuvan." : "Zaposleni dodat.",
                    { variant: "success" },
                );
                onSaved(saved);
                onClose();
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
                    this.setState({ saving: false, error: msg });
                },
            );
    };

    render() {
        const { open, mode, clientCompanies, lockedClientCompanyId } =
            this.props;
        const {
            client_company_id,
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
            job_role,
            risk_level_override,
            jobRoles,
            riskLevels,
            saving,
            error,
        } = this.state;

        const selectedJobRole = jobRoles.find((r) => String(r.id) === job_role);
        const inheritedRisk = selectedJobRole?.risk_level_detail ?? null;
        const companyLocked = lockedClientCompanyId != null;

        return (
            <Dialog
                open={open}
                onClose={this.handleClose}
                maxWidth="sm"
                fullWidth
            >
                <DialogTitle>
                    {mode === "edit" ? "Izmena zaposlenog" : "Nov zaposleni"}
                </DialogTitle>
                <DialogContent>
                    {error && (
                        <Alert severity="error" sx={{ mb: 1 }}>
                            {error}
                        </Alert>
                    )}

                    <Typography variant="subtitle2" sx={{ mt: 1 }}>
                        Lični podaci
                    </Typography>
                    <Divider sx={{ mb: 1 }} />
                    <TextField
                        margin="dense"
                        label="Ime"
                        fullWidth
                        required
                        value={first_name}
                        onChange={(e) =>
                            this.setState({ first_name: e.target.value })
                        }
                    />
                    <TextField
                        margin="dense"
                        label="Prezime"
                        fullWidth
                        required
                        value={last_name}
                        onChange={(e) =>
                            this.setState({ last_name: e.target.value })
                        }
                    />
                    <TextField
                        margin="dense"
                        label="Ime oca"
                        fullWidth
                        value={father_name}
                        onChange={(e) =>
                            this.setState({ father_name: e.target.value })
                        }
                    />
                    <Tooltip title="JMBG.">
                        <TextField
                            margin="dense"
                            label="JMBG"
                            fullWidth
                            value={national_id}
                            onChange={(e) => {
                                const next = e.target.value;
                                this.setState((prev) => {
                                    const derived = isJmbgComplete(next)
                                        ? jmbgToDateString(next)
                                        : null;
                                    return {
                                        national_id: next,
                                        date_of_birth:
                                            derived &&
                                            !prev.date_of_birth.trim()
                                                ? derived
                                                : prev.date_of_birth,
                                    };
                                });
                            }}
                        />
                    </Tooltip>
                    <Box>
                        <DateTextFieldWithPicker
                            label="Datum rođenja (dd.mm.yyyy)"
                            value={date_of_birth}
                            allowPast
                            onChange={(v) =>
                                this.setState({ date_of_birth: v })
                            }
                            defaultYearsAgo={18}
                            minYearsAgo={18}
                            minYearsAgoMessage="Zaposleni mora imati najmanje 18 godina. Da li si siguran da želiš da nastaviš sa izabranim datumom?"
                        />
                        {!jmbgMatchesDate(national_id, date_of_birth) && (
                            <Alert severity="warning" sx={{ mt: 1 }}>
                                JMBG i datum rođenja se ne slažu (JMBG kaže{" "}
                                {jmbgToDateString(national_id)}).
                            </Alert>
                        )}
                    </Box>
                    <TextField
                        margin="dense"
                        label="Mesto rođenja"
                        fullWidth
                        value={place_of_birth}
                        onChange={(e) =>
                            this.setState({ place_of_birth: e.target.value })
                        }
                    />

                    <Typography variant="subtitle2" sx={{ mt: 2 }}>
                        Zaposlenje
                    </Typography>
                    <Divider sx={{ mb: 1 }} />
                    {!companyLocked && (
                        <FormControl fullWidth margin="dense" size="small">
                            <InputLabel>Firma</InputLabel>
                            <Select
                                value={client_company_id}
                                label="Firma"
                                onChange={(e) =>
                                    this.handleClientChange(
                                        String(e.target.value),
                                    )
                                }
                                required
                            >
                                {clientCompanies.map((c) => (
                                    <MenuItem key={c.id} value={String(c.id)}>
                                        {c.name}
                                    </MenuItem>
                                ))}
                            </Select>
                        </FormControl>
                    )}
                    <TextField
                        margin="dense"
                        label="Email"
                        fullWidth
                        required
                        value={email}
                        onChange={(e) =>
                            this.setState({ email: e.target.value })
                        }
                    />
                    <TextField
                        margin="dense"
                        label="Organizaciona jedinica"
                        fullWidth
                        required
                        value={org_unit}
                        onChange={(e) =>
                            this.setState({ org_unit: e.target.value })
                        }
                    />
                    <TextField
                        margin="dense"
                        label="Pozicija"
                        fullWidth
                        required
                        value={position}
                        onChange={(e) =>
                            this.setState({ position: e.target.value })
                        }
                    />
                    <TextField
                        margin="dense"
                        label="Zanimanje"
                        fullWidth
                        value={occupation}
                        onChange={(e) =>
                            this.setState({ occupation: e.target.value })
                        }
                    />
                    <TextField
                        margin="dense"
                        label="Naziv radnog mesta sa povećanim rizikom"
                        fullWidth
                        value={high_risk_position_name}
                        onChange={(e) =>
                            this.setState({
                                high_risk_position_name: e.target.value,
                            })
                        }
                    />

                    <Typography variant="subtitle2" sx={{ mt: 2 }}>
                        Radno mesto i rizik
                    </Typography>
                    <Divider sx={{ mb: 1 }} />
                    <FormControl margin="dense" fullWidth size="small" required>
                        <InputLabel>Radno mesto</InputLabel>
                        <Select
                            label="Radno mesto"
                            value={job_role}
                            onChange={(e) =>
                                this.setState({
                                    job_role: String(e.target.value),
                                })
                            }
                        >
                            {jobRoles.map((r) => (
                                <MenuItem key={r.id} value={String(r.id)}>
                                    {r.name}
                                </MenuItem>
                            ))}
                        </Select>
                    </FormControl>
                    {inheritedRisk && (
                        <Typography
                            variant="caption"
                            color="text.secondary"
                            sx={{ display: "block", mt: 0.5 }}
                        >
                            Nivo rizika se nasleđuje iz radnog mesta:{" "}
                            {inheritedRisk.label} (R={inheritedRisk.score})
                        </Typography>
                    )}
                    <FormControl margin="dense" fullWidth size="small">
                        <InputLabel>Rizik — izuzetak</InputLabel>
                        <Select
                            label="Rizik — izuzetak"
                            value={risk_level_override}
                            onChange={(e) =>
                                this.setState({
                                    risk_level_override: String(e.target.value),
                                })
                            }
                        >
                            <MenuItem value="">
                                <em>Nasleđeno iz radnog mesta</em>
                            </MenuItem>
                            {riskLevels.map((rl) => (
                                <MenuItem key={rl.id} value={String(rl.id)}>
                                    {rl.label} (R={rl.score})
                                </MenuItem>
                            ))}
                        </Select>
                    </FormControl>
                    <Typography
                        variant="caption"
                        color="text.secondary"
                        sx={{ display: "block", mt: 0.5, mb: 1 }}
                    >
                        Popuni samo ako se rizik za ovog zaposlenog razlikuje od
                        rizika radnog mesta.
                    </Typography>
                </DialogContent>
                <FormActions
                    onCancel={this.handleClose}
                    onSave={this.handleSave}
                    saving={saving}
                    disabled={!this.isValid()}
                    savePermission={
                        mode === "edit"
                            ? "partners.change_employee"
                            : "partners.add_employee"
                    }
                />
            </Dialog>
        );
    }
}
