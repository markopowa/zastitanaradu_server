import { Component } from "react";

import {
    Dialog,
    DialogContent,
    DialogTitle,
    Paper,
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableRow,
} from "@mui/material";

import { getProcessRuns } from "../api/processes";
import {
    ErrorState,
    FormActions,
    LoadingState,
    StatusBadge,
    TableStateRow,
} from "../design";
import { formatDateDisplay } from "../utils/date";

import type {
    EmployeeExamHistoryDialogProps,
    EmployeeExamHistoryDialogState,
} from "../types/processPages";

export class EmployeeExamHistoryDialog extends Component<
    EmployeeExamHistoryDialogProps,
    EmployeeExamHistoryDialogState
> {
    state: EmployeeExamHistoryDialogState = {
        runs: [],
        loading: false,
        error: null,
    };

    componentDidUpdate(prevProps: EmployeeExamHistoryDialogProps): void {
        if (
            this.props.open &&
            (!prevProps.open || prevProps.employeeId !== this.props.employeeId)
        ) {
            this.load();
        }
    }

    load = (): void => {
        const { employeeId } = this.props;
        if (employeeId == null) return;
        this.setState({ loading: true, error: null, runs: [] });
        getProcessRuns({ employee_id: employeeId })
            .then((runs) =>
                this.setState({ runs, loading: false, error: null }),
            )
            .catch(() =>
                this.setState({
                    loading: false,
                    error: "Greška pri učitavanju istorije pregleda.",
                }),
            );
    };

    render() {
        const { open, employeeName, onClose } = this.props;
        const { runs, loading, error } = this.state;

        return (
            <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
                <DialogTitle>Istorija pregleda — {employeeName}</DialogTitle>
                <DialogContent>
                    {loading ? (
                        <LoadingState />
                    ) : error ? (
                        <ErrorState message={error} />
                    ) : (
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
                                        <TableStateRow
                                            colSpan={3}
                                            state="empty"
                                            emptyMessage="Nema zapisa."
                                        />
                                    ) : (
                                        runs.map((r) => (
                                            <TableRow key={r.id}>
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
                                                    />
                                                </TableCell>
                                            </TableRow>
                                        ))
                                    )}
                                </TableBody>
                            </Table>
                        </Paper>
                    )}
                </DialogContent>
                <FormActions onCancel={onClose} cancelLabel="Zatvori" />
            </Dialog>
        );
    }
}
