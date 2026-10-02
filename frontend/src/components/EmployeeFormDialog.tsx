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
    updateEmployee,
} from "../api/processes";
import { FormActions } from "../design";
import {
    displayDateToIso,
    isoDateToFormDisplay,
    StringToDate,
} from "../utils/date";
import {
    isJmbgChecksumValid,
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
    TEST_EMPLOYEE_HIGH_RISK,
    TEST_EMPLOYEE_LOW_RISK,
    TEST_EMPLOYEE_PRIMARY,
    type TestEmployeeFixture,
} from "../testFlow/employeeFixture";
import { employeeFormFillFields } from "../testFlow/applyEmployeeFill";

const emptyForm = (): Omit<
    EmployeeFormDialogState,
    "jobRoles" | "saving" | "error"
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
    job_role: "",
    employment_end_date: "",
});

export class EmployeeFormDialog extends Component<
    EmployeeFormDialogProps,
    EmployeeFormDialogState
> {
    private testFillCleanups: Array<() => void> = [];

    state: EmployeeFormDialogState = {
        ...emptyForm(),
        jobRoles: [],
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
            setupTestFill("F2", () => apply(TEST_EMPLOYEE_HIGH_RISK), isOpen),
            setupTestFill("F3", () => apply(TEST_EMPLOYEE_LOW_RISK), isOpen),
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
                job_role:
                    initial.job_role != null ? String(initial.job_role) : "",
                employment_end_date: isoDateToFormDisplay(
                    initial.employment_end_date,
                ),
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
                saving: false,
            error: null,
        });
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
            client_company_id,
            job_role,
        } = this.state;
        return [first_name, last_name, client_company_id, job_role].every(
            (v) => v.trim() !== "",
        );
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
            client_company_id,
            job_role,
            employment_end_date,
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
            job_role: job_role ? Number(job_role) : null,
            client_company: Number(client_company_id),
            employment_end_date: employment_end_date.trim()
                ? (displayDateToIso(employment_end_date) ?? null)
                : null,
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
            .catch((err: unknown) => {
                    const data = (
                        err as {
                            response?: {
                                data?:
                                    | string
                                    | { detail?: string }
                                    | Record<string, string | string[]>;
                            };
                            message?: string;
                        }
                    ).response?.data;
                    let msg =
                        (err as { message?: string }).message ??
                        "Greška pri čuvanju zaposlenog.";
                    if (typeof data === "string" && data.trim()) {
                        msg = data;
                    } else if (data && typeof data === "object") {
                        if (
                            "detail" in data &&
                            typeof data.detail === "string"
                        ) {
                            msg = data.detail;
                        } else {
                            const parts = Object.entries(data).flatMap(
                                ([key, val]) => {
                                    const text = Array.isArray(val)
                                        ? val.join(" ")
                                        : String(val);
                                    return text ? [`${key}: ${text}`] : [];
                                },
                            );
                            if (parts.length > 0) msg = parts.join(" ");
                        }
                    }
                    this.setState({ saving: false, error: msg });
                });
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
            job_role,
            jobRoles,
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
                        {isJmbgComplete(national_id) &&
                            !isJmbgChecksumValid(national_id) && (
                                <Alert severity="error" sx={{ mt: 1 }}>
                                    JMBG nije ispravan (kontrolna cifra).
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
                        value={email}
                        onChange={(e) =>
                            this.setState({ email: e.target.value })
                        }
                    />
                    <TextField
                        margin="dense"
                        label="Organizaciona jedinica"
                        fullWidth
                        value={org_unit}
                        onChange={(e) =>
                            this.setState({ org_unit: e.target.value })
                        }
                    />
                    <TextField
                        margin="dense"
                        label="Pozicija"
                        fullWidth
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
                            {inheritedRisk.label}
                        </Typography>
                    )}
                    {this.props.mode === "edit" ? (
                        <Box sx={{ mt: 1 }}>
                            <DateTextFieldWithPicker
                                label="Datum prestanka radnog odnosa (dd.mm.yyyy)"
                                value={this.state.employment_end_date}
                                allowPast
                                onChange={(v) =>
                                    this.setState({ employment_end_date: v })
                                }
                            />
                            <Typography
                                variant="caption"
                                color="text.secondary"
                                sx={{ display: "block", mt: 0.5 }}
                            >
                                Od tog datuma zaposleni nema obaveze ni
                                podsetnike. Istorija ostaje sačuvana.
                            </Typography>
                        </Box>
                    ) : null}
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
