import { Component } from "react";

import {
    Button,
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
    FormControl,
    InputLabel,
    MenuItem,
    Select,
    TextField,
    useMediaQuery,
    useTheme,
} from "@mui/material";
import { enqueueSnackbar } from "notistack";

import {
    createProcessBinding,
    getClientCompanies,
    getEmployees,
    getEquipment,
    getProcessTypes,
} from "../api/processes";
import DateTextFieldWithPicker from "./DateTextFieldWithPicker";
import { subjectKindLabel } from "../design/labels";
import {
    addMonths,
    bindingTermDateError,
    DateToString,
    displayDateToIso,
    todayLocalDate,
} from "../utils/date";

import type { ProcessType } from "../types/processes";
import type {
    AddProcessBindingDialogProps,
    AddProcessBindingDialogState,
} from "../types/processPages";
import { setupTestFill } from "../testFlow/registerTestFill";
import { TEST_FLOW, bindingTermDateDisplay } from "../testFlow/fixture";
import { idByCode, idByName } from "../testFlow/helpers";

function suggestedNextRunAt(processType: ProcessType | undefined): string {
    if (!processType?.default_period_months) return "";
    return DateToString(
        addMonths(todayLocalDate(), processType.default_period_months),
    );
}

class AddProcessBindingDialogInner extends Component<
    AddProcessBindingDialogProps & { fullScreen: boolean },
    AddProcessBindingDialogState
> {
    private testFillCleanup: (() => void) | null = null;

    state: AddProcessBindingDialogState = {
        processTypes: [],
        processTypeId: "",
        nextRunAt: "",
        saving: false,
        unlockedSubjectKind: "EMPLOYEE",
        unlockedEmployeeId: "",
        unlockedEquipmentId: "",
        unlockedClientCompanyId: "",
        employees: [],
        equipment: [],
        clientCompanies: [],
    };

    componentDidMount(): void {
        this.testFillCleanup = setupTestFill(
            "J1",
            () => {
                const typeId =
                    idByCode(
                        this.state.processTypes,
                        TEST_FLOW.processBinding.process_type_code,
                    ) ||
                    idByName(
                        this.state.processTypes,
                        TEST_FLOW.processBinding.process_type_name,
                    );
                this.setState({
                    processTypeId: typeId || this.state.processTypeId,
                    nextRunAt: bindingTermDateDisplay(),
                });
                return this.props.open;
            },
            () => this.props.open,
        );
    }

    componentWillUnmount(): void {
        this.testFillCleanup?.();
    }

    componentDidUpdate(prevProps: AddProcessBindingDialogProps): void {
        if (
            this.props.open &&
            (!prevProps.open ||
                prevProps.subjectKind !== this.props.subjectKind)
        ) {
            this.loadProcessTypes();
        }
    }

    loadProcessTypes = (): void => {
        const { subjectKind, unlocked } = this.props;
        getProcessTypes().then((types) => {
            const filtered = unlocked
                ? types
                : types.filter((t) => t.subject_kind === subjectKind);
            const first = filtered[0];
            const kind = unlocked
                ? (first?.subject_kind ?? "EMPLOYEE")
                : (subjectKind ?? "EMPLOYEE");
            this.setState({
                processTypes: filtered,
                processTypeId: first ? String(first.id) : "",
                nextRunAt: suggestedNextRunAt(first),
                unlockedSubjectKind: kind,
            });
        });
        if (unlocked) {
            void getEmployees().then((employees) =>
                this.setState({ employees }),
            );
            void getEquipment().then((equipment) =>
                this.setState({ equipment }),
            );
            void getClientCompanies().then((clientCompanies) =>
                this.setState({ clientCompanies }),
            );
        }
    };

    handleClose = (): void => {
        if (this.state.saving) return;
        this.props.onClose();
    };

    handleSubmit = (): void => {
        const {
            subjectKind: propsSubjectKind,
            clientCompanyId,
            employeeId,
            equipmentItemId,
            onClose,
            onSuccess,
            unlocked,
        } = this.props;
        const {
            processTypeId,
            nextRunAt,
            unlockedSubjectKind,
            unlockedEmployeeId,
            unlockedEquipmentId,
            unlockedClientCompanyId,
        } = this.state;
        if (!processTypeId) return;

        const nextRunAtISO = displayDateToIso(nextRunAt);
        if (!nextRunAtISO) return;
        const termError = bindingTermDateError(nextRunAt);
        if (termError) {
            enqueueSnackbar(termError, { variant: "error" });
            return;
        }

        const subjectKind = unlocked
            ? unlockedSubjectKind
            : (propsSubjectKind ?? "EMPLOYEE");

        let payload: Record<string, unknown> = {
            process_type: Number(processTypeId),
            subject_kind: subjectKind,
            next_run_at: nextRunAtISO,
            is_active: true,
        };

        if (unlocked) {
            if (subjectKind === "EMPLOYEE" && unlockedEmployeeId)
                payload.employee = Number(unlockedEmployeeId);
            else if (subjectKind === "EQUIPMENT" && unlockedEquipmentId)
                payload.equipment_item = Number(unlockedEquipmentId);
            else if (
                subjectKind === "CLIENT_COMPANY" &&
                unlockedClientCompanyId
            )
                payload.client_company = Number(unlockedClientCompanyId);
            else return;
        } else {
            if (subjectKind === "EMPLOYEE" && employeeId != null)
                payload.employee = employeeId;
            else if (subjectKind === "EQUIPMENT" && equipmentItemId != null)
                payload.equipment_item = equipmentItemId;
            else if (
                subjectKind === "CLIENT_COMPANY" &&
                clientCompanyId != null
            )
                payload.client_company = clientCompanyId;
        }

        this.setState({ saving: true });
        createProcessBinding(payload)
            .then(() => {
                enqueueSnackbar("Obaveza je dodata.", { variant: "success" });
                this.setState({ saving: false });
                onClose();
                onSuccess();
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
                        "Greška pri dodavanju obaveze.";
                    enqueueSnackbar(msg, { variant: "error" });
                    this.setState({ saving: false });
                },
            );
    };

    render() {
        const {
            open,
            subjectKind: propsSubjectKind,
            subjectLabel,
            unlocked,
            fullScreen,
        } = this.props;
        const {
            processTypes,
            processTypeId,
            nextRunAt,
            saving,
            unlockedSubjectKind,
            unlockedEmployeeId,
            unlockedEquipmentId,
            unlockedClientCompanyId,
            employees,
            equipment,
            clientCompanies,
        } = this.state;
        const termError = bindingTermDateError(nextRunAt);

        const subjectKind = unlocked
            ? unlockedSubjectKind
            : (propsSubjectKind ?? "EMPLOYEE");

        const canSubmit =
            !saving &&
            !!processTypeId &&
            !!nextRunAt.trim() &&
            termError == null &&
            (!unlocked ||
                (subjectKind === "EMPLOYEE" && !!unlockedEmployeeId) ||
                (subjectKind === "EQUIPMENT" && !!unlockedEquipmentId) ||
                (subjectKind === "CLIENT_COMPANY" &&
                    !!unlockedClientCompanyId));

        return (
            <Dialog
                open={open}
                onClose={this.handleClose}
                maxWidth="sm"
                fullWidth
                fullScreen={fullScreen}
            >
                <DialogTitle>Dodeli obavezu</DialogTitle>
                <DialogContent>
                    {!unlocked && subjectLabel && (
                        <TextField
                            margin="dense"
                            label={subjectKindLabel(subjectKind)}
                            fullWidth
                            value={subjectLabel}
                            slotProps={{ input: { readOnly: true } }}
                        />
                    )}
                    <FormControl fullWidth margin="dense">
                        <InputLabel>Vrsta obaveze</InputLabel>
                        <Select
                            value={processTypeId}
                            label="Vrsta obaveze"
                            onChange={(e) => {
                                const selectedType = processTypes.find(
                                    (t) => String(t.id) === e.target.value,
                                );
                                const nextKind:
                                    | "EMPLOYEE"
                                    | "EQUIPMENT"
                                    | "CLIENT_COMPANY" =
                                    selectedType?.subject_kind ??
                                    unlockedSubjectKind;
                                if (unlocked) {
                                    this.setState({
                                        processTypeId: e.target.value,
                                        nextRunAt:
                                            suggestedNextRunAt(selectedType),
                                        unlockedSubjectKind: nextKind,
                                        unlockedEmployeeId: "",
                                        unlockedEquipmentId: "",
                                        unlockedClientCompanyId: "",
                                    });
                                } else {
                                    this.setState({
                                        processTypeId: e.target.value,
                                        nextRunAt:
                                            suggestedNextRunAt(selectedType),
                                    });
                                }
                            }}
                        >
                            {processTypes.map((t) => (
                                <MenuItem key={t.id} value={String(t.id)}>
                                    {t.name}
                                </MenuItem>
                            ))}
                        </Select>
                    </FormControl>
                    {unlocked && subjectKind === "EMPLOYEE" && (
                        <FormControl fullWidth margin="dense">
                            <InputLabel>Zaposleni</InputLabel>
                            <Select
                                value={unlockedEmployeeId}
                                label="Zaposleni"
                                onChange={(e) =>
                                    this.setState({
                                        unlockedEmployeeId: e.target.value,
                                    })
                                }
                            >
                                {employees.map((emp) => (
                                    <MenuItem
                                        key={emp.id}
                                        value={String(emp.id)}
                                    >
                                        {emp.first_name} {emp.last_name}
                                    </MenuItem>
                                ))}
                            </Select>
                        </FormControl>
                    )}
                    {unlocked && subjectKind === "EQUIPMENT" && (
                        <FormControl fullWidth margin="dense">
                            <InputLabel>Oprema</InputLabel>
                            <Select
                                value={unlockedEquipmentId}
                                label="Oprema"
                                onChange={(e) =>
                                    this.setState({
                                        unlockedEquipmentId: e.target.value,
                                    })
                                }
                            >
                                {equipment.map((eq) => (
                                    <MenuItem key={eq.id} value={String(eq.id)}>
                                        {eq.name}
                                    </MenuItem>
                                ))}
                            </Select>
                        </FormControl>
                    )}
                    {unlocked && subjectKind === "CLIENT_COMPANY" && (
                        <FormControl fullWidth margin="dense">
                            <InputLabel>
                                {subjectKindLabel("CLIENT_COMPANY")}
                            </InputLabel>
                            <Select
                                value={unlockedClientCompanyId}
                                label={subjectKindLabel("CLIENT_COMPANY")}
                                onChange={(e) =>
                                    this.setState({
                                        unlockedClientCompanyId: e.target.value,
                                    })
                                }
                            >
                                {clientCompanies.map((c) => (
                                    <MenuItem key={c.id} value={String(c.id)}>
                                        {c.name}
                                    </MenuItem>
                                ))}
                            </Select>
                        </FormControl>
                    )}
                    <DateTextFieldWithPicker
                        label="Termin (dd.mm.yyyy)"
                        value={nextRunAt}
                        error={termError != null}
                        helperText={
                            termError ??
                            "Kada obaveza prvi put treba da se desi"
                        }
                        onChange={(v) => this.setState({ nextRunAt: v })}
                    />
                </DialogContent>
                <DialogActions sx={{ px: 3, pb: 2 }}>
                    <Button onClick={this.handleClose} disabled={saving}>
                        Odustani
                    </Button>
                    <Button
                        onClick={this.handleSubmit}
                        variant="contained"
                        disableElevation
                        disabled={!canSubmit}
                    >
                        {saving ? "Čuvam..." : "Dodaj"}
                    </Button>
                </DialogActions>
            </Dialog>
        );
    }
}

export function AddProcessBindingDialog(props: AddProcessBindingDialogProps) {
    const theme = useTheme();
    const fullScreen = useMediaQuery(theme.breakpoints.down("sm"));
    return <AddProcessBindingDialogInner {...props} fullScreen={fullScreen} />;
}
