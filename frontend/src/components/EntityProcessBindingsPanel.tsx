import { Component } from "react";
import { Link } from "react-router-dom";

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
import CheckCircleIcon from "@mui/icons-material/CheckCircle";

import { updateProcessBinding } from "../api/processes";
import { AddProcessBindingDialog } from "./AddProcessBindingDialog";
import DateTextFieldWithPicker from "./DateTextFieldWithPicker";
import { PermissionGate } from "./PermissionGate";
import RowActionsMenu from "./RowActionsMenu";
import {
    bindingTermDateError,
    displayDateToIso,
    formatDateDisplay,
    isoDateToFormDisplay,
    isScheduledOverdue,
} from "../utils/date";
import { notifyError, notifySuccess, StatusBadge } from "../design";

import type {
    EntityProcessBindingsPanelProps,
    EntityProcessBindingsPanelState,
} from "../types/processPages";

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
                notifySuccess("Obaveza je deaktivirana.");
                this.props.onRefresh();
            })
            .catch((err: unknown) => {
                this.setState({ deactivatingBindingId: null });
                notifyError(err, "Greška pri deaktivaciji obaveze.");
            });
    };

    handleStartDateChange = (bindingId: number, displayDate: string): void => {
        const termError = bindingTermDateError(displayDate);
        if (termError) {
            notifyError(termError, "Greška pri čuvanju termina.");
            return;
        }
        const nextRunAtISO = displayDateToIso(displayDate);
        if (!nextRunAtISO) return;
        this.setState({ savingStartDateBindingId: bindingId });
        updateProcessBinding(bindingId, { next_run_at: nextRunAtISO })
            .then(() => {
                this.setState({ savingStartDateBindingId: null });
                notifySuccess("Termin je sačuvan.");
                this.props.onRefresh();
            })
            .catch((err: unknown) => {
                this.setState({ savingStartDateBindingId: null });
                notifyError(err, "Greška pri čuvanju termina.");
            });
    };

    openRunForBinding = (bindingId: number) => {
        const { runs } = this.props;
        return runs.find(
            (r) =>
                r.process_binding === bindingId &&
                (r.status === "PENDING" || r.status === "SENT"),
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
            navigate,
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
                            onClick={() => this.setState({ dialogOpen: true })}
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
                                            <Box
                                                sx={{
                                                    display: "flex",
                                                    gap: 1,
                                                    justifyContent: "flex-end",
                                                    alignItems: "center",
                                                }}
                                            >
                                                {(() => {
                                                    const openRun =
                                                        this.openRunForBinding(
                                                            b.id,
                                                        );
                                                    return openRun ? (
                                                        <Button
                                                            size="small"
                                                            variant="outlined"
                                                            startIcon={
                                                                <CheckCircleIcon fontSize="small" />
                                                            }
                                                            onClick={() =>
                                                                navigate(
                                                                    `/processes/runs/${openRun.id}`,
                                                                )
                                                            }
                                                        >
                                                            Završi
                                                        </Button>
                                                    ) : null;
                                                })()}
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
                                            </Box>
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
                                <TableCell align="right" />
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
                                runs.slice(0, 20).map((r) => {
                                    const isOpen =
                                        r.status === "PENDING" ||
                                        r.status === "SENT";
                                    const isOverdue =
                                        isOpen &&
                                        isScheduledOverdue(r.scheduled_for);
                                    return (
                                        <TableRow
                                            key={r.id}
                                            hover
                                            component={Link}
                                            to={`/processes/runs/${r.id}`}
                                            sx={{
                                                textDecoration: "none",
                                                cursor: "pointer",
                                            }}
                                        >
                                            <TableCell>
                                                {r.process_type_name}
                                            </TableCell>
                                            <TableCell>
                                                {formatDateDisplay(
                                                    r.valid_until,
                                                )}
                                            </TableCell>
                                            <TableCell>
                                                <StatusBadge
                                                    status={r.status}
                                                    isOverdue={isOverdue}
                                                />
                                            </TableCell>
                                            <TableCell align="right">
                                                {isOpen && (
                                                    <Button
                                                        size="small"
                                                        variant="outlined"
                                                        startIcon={
                                                            <CheckCircleIcon fontSize="small" />
                                                        }
                                                        onClick={(e) => {
                                                            e.preventDefault();
                                                            e.stopPropagation();
                                                            navigate(
                                                                `/processes/runs/${r.id}`,
                                                            );
                                                        }}
                                                    >
                                                        Završi
                                                    </Button>
                                                )}
                                            </TableCell>
                                        </TableRow>
                                    );
                                })
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
