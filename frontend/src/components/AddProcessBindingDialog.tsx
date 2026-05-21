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
} from "@mui/material";
import { enqueueSnackbar } from "notistack";

import { createProcessBinding, getProcessTypes } from "../api/processes";
import DateTextFieldWithPicker from "./DateTextFieldWithPicker";
import { StringToDate } from "../utils/date";

import type { ProcessType } from "../types/processes";
import type {
    AddProcessBindingDialogProps,
    AddProcessBindingDialogState,
} from "../types/processPages";

const SUBJECT_KIND_LABELS: Record<ProcessType["subject_kind"], string> = {
    EMPLOYEE: "Zaposleni",
    EQUIPMENT: "Oprema",
    CLIENT_COMPANY: "Klijent",
};

export class AddProcessBindingDialog extends Component<
    AddProcessBindingDialogProps,
    AddProcessBindingDialogState
> {
    state: AddProcessBindingDialogState = {
        processTypes: [],
        processTypeId: "",
        period: "",
        nextRunAt: "",
        saving: false,
    };

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
        const { subjectKind } = this.props;
        getProcessTypes().then((types) => {
            const filtered = types.filter((t) => t.subject_kind === subjectKind);
            const first = filtered[0];
            this.setState({
                processTypes: filtered,
                processTypeId: first ? String(first.id) : "",
                period: "",
                nextRunAt: "",
            });
        });
    };

    handleClose = (): void => {
        if (this.state.saving) return;
        this.props.onClose();
    };

    handleSubmit = (): void => {
        const { subjectKind, clientCompanyId, employeeId, equipmentItemId, onClose, onSuccess } =
            this.props;
        const { processTypeId, period, nextRunAt } = this.state;
        if (!processTypeId) return;

        const nextRunAtDate = nextRunAt.trim() ? StringToDate(nextRunAt) : null;
        const nextRunAtISO =
            nextRunAtDate != null
                ? `${nextRunAtDate.getFullYear()}-${String(nextRunAtDate.getMonth() + 1).padStart(2, "0")}-${String(nextRunAtDate.getDate()).padStart(2, "0")}`
                : undefined;

        const payload = {
            process_type: Number(processTypeId),
            subject_kind: subjectKind,
            custom_period_months: period ? Number(period) : undefined,
            next_run_at: nextRunAtISO,
            is_active: true,
            ...(subjectKind === "EMPLOYEE" && employeeId != null
                ? { employee: employeeId }
                : {}),
            ...(subjectKind === "EQUIPMENT" && equipmentItemId != null
                ? { equipment_item: equipmentItemId }
                : {}),
            ...(subjectKind === "CLIENT_COMPANY" && clientCompanyId != null
                ? { client_company: clientCompanyId }
                : {}),
        };

        this.setState({ saving: true });
        createProcessBinding(payload)
            .then(() => {
                enqueueSnackbar("Proces je dodat.", { variant: "success" });
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
                        "Greška pri dodavanju procesa.";
                    enqueueSnackbar(msg, { variant: "error" });
                    this.setState({ saving: false });
                },
            );
    };

    render() {
        const { open, subjectKind, subjectLabel } = this.props;
        const { processTypes, processTypeId, period, nextRunAt, saving } =
            this.state;

        const selectedType = processTypes.find(
            (t) => String(t.id) === processTypeId,
        );
        const defaultPeriod = selectedType?.default_period_months;

        return (
            <Dialog open={open} onClose={this.handleClose} maxWidth="sm" fullWidth>
                <DialogTitle>Dodaj proces</DialogTitle>
                <DialogContent>
                    <TextField
                        margin="dense"
                        label={SUBJECT_KIND_LABELS[subjectKind]}
                        fullWidth
                        value={subjectLabel}
                        slotProps={{ input: { readOnly: true } }}
                    />
                    <FormControl fullWidth margin="dense">
                        <InputLabel>Vrsta obaveze</InputLabel>
                        <Select
                            value={processTypeId}
                            label="Vrsta obaveze"
                            onChange={(e) =>
                                this.setState({ processTypeId: e.target.value })
                            }
                        >
                            {processTypes.map((t) => (
                                <MenuItem key={t.id} value={String(t.id)}>
                                    {t.name}
                                </MenuItem>
                            ))}
                        </Select>
                    </FormControl>
                    <TextField
                        margin="dense"
                        label="Period (meseci)"
                        type="number"
                        fullWidth
                        value={period}
                        placeholder={
                            defaultPeriod != null
                                ? String(defaultPeriod)
                                : undefined
                        }
                        helperText={
                            defaultPeriod != null
                                ? `Podrazumevano iz vrste obaveze: ${defaultPeriod} mes. — ostavi prazno da koristiš tu vrednost`
                                : "Ostavi prazno za jednokratno"
                        }
                        onChange={(e) =>
                            this.setState({ period: e.target.value })
                        }
                    />
                    <DateTextFieldWithPicker
                        label="Sledeći termin (dd.mm.yyyy)"
                        value={nextRunAt}
                        helperText="Datum zakazanog pregleda / obaveze"
                        onChange={(v) => this.setState({ nextRunAt: v })}
                    />
                </DialogContent>
                <DialogActions>
                    <Button onClick={this.handleClose} disabled={saving}>
                        Odustani
                    </Button>
                    <Button
                        onClick={this.handleSubmit}
                        variant="contained"
                        disabled={saving || !processTypeId}
                    >
                        {saving ? "Čuvam..." : "Dodaj"}
                    </Button>
                </DialogActions>
            </Dialog>
        );
    }
}
