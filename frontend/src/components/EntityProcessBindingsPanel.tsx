import { Component } from "react";

import {
    Box,
    Button,
    Paper,
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableRow,
    Typography,
} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import BlockIcon from "@mui/icons-material/Block";
import { enqueueSnackbar } from "notistack";

import { updateProcessBinding } from "../api/processes";
import { AddProcessBindingDialog } from "./AddProcessBindingDialog";
import DateTextFieldWithPicker from "./DateTextFieldWithPicker";
import { PermissionGate } from "./PermissionGate";
import RowActionsMenu from "./RowActionsMenu";
import { bindingTermDateError, displayDateToIso, formatDateDisplay, isoDateToFormDisplay } from "../utils/date";

import type {
    EntityProcessBindingsPanelProps,
    EntityProcessBindingsPanelState,
} from "../types/processPages";

const STATUS_LABELS: Record<string, string> = {
    PENDING: "Na čekanju",
    SENT: "Poslato",
    COMPLETED: "Završeno",
    CANCELLED: "Otkazano",
    FAILED: "Neuspešno",
};

export class EntityProcessBindingsPanel extends Component<
    EntityProcessBindingsPanelProps,
    EntityProcessBindingsPanelState
> {
    state: EntityProcessBindingsPanelState = {
        dialogOpen: false,
        savingStartDateBindingId: null,
        deactivatingBindingId: null,
    };

    handleDeactivate = (bindingId: number): void => {
        this.setState({ deactivatingBindingId: bindingId });
        updateProcessBinding(bindingId, { is_active: false })
            .then(() => {
                this.setState({ deactivatingBindingId: null });
                enqueueSnackbar("Obaveza je deaktivirana.", {
                    variant: "success",
                });
                this.props.onRefresh();
            })
            .catch(
                (
                    err:
                        | { message?: string }
                        | { response?: { data?: { detail?: string } } },
                ) => {
                    this.setState({ deactivatingBindingId: null });
                    const msg =
                        (err as { response?: { data?: { detail?: string } } })
                            .response?.data?.detail ??
                        (err as { message?: string }).message ??
                        "Greška pri deaktivaciji obaveze.";
                    enqueueSnackbar(msg, { variant: "error" });
                },
            );
    };

    handleStartDateChange = (bindingId: number, displayDate: string): void => {
        const termError = bindingTermDateError(displayDate);
        if (termError) {
            enqueueSnackbar(termError, { variant: "error" });
            return;
        }
        const nextRunAtISO = displayDateToIso(displayDate);
        if (!nextRunAtISO) return;
        this.setState({ savingStartDateBindingId: bindingId });
        updateProcessBinding(bindingId, { next_run_at: nextRunAtISO })
            .then(() => {
                this.setState({ savingStartDateBindingId: null });
                enqueueSnackbar("Termin je sačuvan.", {
                    variant: "success",
                });
                this.props.onRefresh();
            })
            .catch(
                (
                    err:
                        | { message?: string }
                        | { response?: { data?: { detail?: string } } },
                ) => {
                    this.setState({ savingStartDateBindingId: null });
                    const msg =
                        (err as { response?: { data?: { detail?: string } } })
                            .response?.data?.detail ??
                        (err as { message?: string }).message ??
                        "Greška pri čuvanju termina.";
                    enqueueSnackbar(msg, { variant: "error" });
                },
            );
    };

    render() {
        const {
            subjectKind,
            subjectLabel,
            clientCompanyId,
            employeeId,
            equipmentItemId,
            bindings,
            runs,
            onRefresh,
        } = this.props;
        const { dialogOpen, savingStartDateBindingId, deactivatingBindingId } =
            this.state;
        const activeBindings = bindings.filter((b) => b.is_active);

        return (
            <>
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
                                this.setState({ dialogOpen: true })
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
                                <TableCell>Termin</TableCell>
                                <TableCell align="right" />
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {activeBindings.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={3} align="center">
                                        Nema aktivnih obaveza.
                                    </TableCell>
                                </TableRow>
                            ) : (
                                activeBindings.map((b) => (
                                    <TableRow key={b.id}>
                                        <TableCell>
                                            {b.process_type_name}
                                        </TableCell>
                                        <TableCell sx={{ minWidth: 220 }}>
                                            {b.has_open_run ? (
                                                formatDateDisplay(b.next_run_at)
                                            ) : (
                                                <PermissionGate permission="processes.change_processbinding">
                                                    <DateTextFieldWithPicker
                                                        label="Termin (dd.mm.yyyy)"
                                                        value={isoDateToFormDisplay(
                                                            b.next_run_at,
                                                        )}
                                                        helperText={
                                                            savingStartDateBindingId ===
                                                            b.id
                                                                ? "Čuvam..."
                                                                : undefined
                                                        }
                                                        onChange={(v) =>
                                                            this.handleStartDateChange(
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
                                                            deactivatingBindingId ===
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
                                                            deactivatingBindingId ===
                                                            b.id,
                                                        onClick: () =>
                                                            this.handleDeactivate(
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
                                <TableCell>Važi do</TableCell>
                                <TableCell>Status</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {runs.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={3} align="center">
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
                                            {formatDateDisplay(r.valid_until)}
                                        </TableCell>
                                        <TableCell>
                                            {STATUS_LABELS[r.status] ??
                                                r.status}
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </Paper>

                <AddProcessBindingDialog
                    open={dialogOpen}
                    onClose={() => this.setState({ dialogOpen: false })}
                    onSuccess={onRefresh}
                    subjectKind={subjectKind}
                    subjectLabel={subjectLabel}
                    clientCompanyId={clientCompanyId}
                    employeeId={employeeId}
                    equipmentItemId={equipmentItemId}
                />
            </>
        );
    }
}
