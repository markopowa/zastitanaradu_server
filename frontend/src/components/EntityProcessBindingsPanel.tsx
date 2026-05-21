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

import { AddProcessBindingDialog } from "./AddProcessBindingDialog";
import { PermissionGate } from "./PermissionGate";
import { formatDateDisplay } from "../utils/date";

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
        const { dialogOpen } = this.state;
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
                                <TableCell>Sledeći termin</TableCell>
                                <TableCell>Aktivan</TableCell>
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
                                        <TableCell>
                                            {formatDateDisplay(b.next_run_at)}
                                        </TableCell>
                                        <TableCell>
                                            {b.is_active ? "Da" : "Ne"}
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
