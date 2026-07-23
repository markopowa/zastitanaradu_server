import { Component } from "react";

import {
    Box,
    Button,
    Chip,
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
    FormControl,
    InputLabel,
    MenuItem,
    Select,
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableRow,
    TextField,
    Typography,
} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import DeleteIcon from "@mui/icons-material/Delete";
import { enqueueSnackbar } from "notistack";

import DateTextFieldWithPicker from "./DateTextFieldWithPicker";
import {
    createWorkInjury,
    deleteWorkInjury,
    getWorkInjuries,
} from "../api/processes";
import { PermissionGate } from "./PermissionGate";
import RowActionsMenu from "./RowActionsMenu";
import { ConfirmDialog, SectionCard, TableStateRow } from "../design";
import { displayDateToIso, formatDateDisplay } from "../utils/date";

import type { EmployeeSummary, WorkInjury, WorkInjurySeverity } from "../types/processes";

const SEVERITY_OPTIONS: {
    value: WorkInjurySeverity;
    label: string;
    color: "success" | "warning" | "error" | "secondary";
}[] = [
    { value: "LAKA", label: "Laka", color: "success" },
    { value: "TESKA", label: "Teška", color: "warning" },
    { value: "SMRTNA", label: "Smrtna", color: "error" },
    { value: "KOLEKTIVNA", label: "Kolektivna", color: "secondary" },
];

const severityLabel = (value: WorkInjurySeverity): string =>
    SEVERITY_OPTIONS.find((s) => s.value === value)?.label ?? value;

const severityColor = (
    value: WorkInjurySeverity,
): "success" | "warning" | "error" | "secondary" =>
    SEVERITY_OPTIONS.find((s) => s.value === value)?.color ?? "secondary";

interface WorkInjuriesPanelProps {
    clientCompanyId: number;
    employees: EmployeeSummary[];
}

interface WorkInjuriesPanelState {
    items: WorkInjury[];
    loading: boolean;
    error: boolean;
    dialogOpen: boolean;
    formEmployeeId: string;
    formDate: string;
    formSeverity: WorkInjurySeverity;
    formDescription: string;
    formFile: File | null;
    saving: boolean;
    deleteId: number | null;
    deleting: boolean;
}

export class WorkInjuriesPanel extends Component<
    WorkInjuriesPanelProps,
    WorkInjuriesPanelState
> {
    state: WorkInjuriesPanelState = {
        items: [],
        loading: true,
        error: false,
        dialogOpen: false,
        formEmployeeId: "",
        formDate: "",
        formSeverity: "LAKA",
        formDescription: "",
        formFile: null,
        saving: false,
        deleteId: null,
        deleting: false,
    };

    componentDidMount(): void {
        this.load();
    }

    componentDidUpdate(prevProps: WorkInjuriesPanelProps): void {
        if (prevProps.clientCompanyId !== this.props.clientCompanyId) {
            this.load();
        }
    }

    load = (): void => {
        const { clientCompanyId } = this.props;
        this.setState({ loading: true, error: false });
        getWorkInjuries({ client_company_id: clientCompanyId })
            .then((items) =>
                this.setState({ items, loading: false, error: false }),
            )
            .catch(() => {
                this.setState({ loading: false, error: true });
                enqueueSnackbar("Greška pri učitavanju povreda na radu.", {
                    variant: "error",
                });
            });
    };

    openCreate = (): void => {
        this.setState({
            dialogOpen: true,
            formEmployeeId: "",
            formDate: "",
            formSeverity: "LAKA",
            formDescription: "",
            formFile: null,
        });
    };

    closeDialog = (): void => {
        this.setState({ dialogOpen: false, saving: false });
    };

    isValid = (): boolean => {
        const { formEmployeeId, formDate } = this.state;
        return Boolean(formEmployeeId) && Boolean(displayDateToIso(formDate));
    };

    save = (): void => {
        const {
            formEmployeeId,
            formDate,
            formSeverity,
            formDescription,
            formFile,
        } = this.state;
        if (!this.isValid()) return;
        const isoDate = displayDateToIso(formDate);
        if (!isoDate) return;
        const { clientCompanyId } = this.props;
        this.setState({ saving: true });
        createWorkInjury({
            client_company: clientCompanyId,
            employee: Number(formEmployeeId),
            date: isoDate,
            severity: formSeverity,
            description: formDescription.trim() || undefined,
            report_file: formFile,
        })
            .then((saved) => {
                this.setState((prev) => ({
                    items: [saved, ...prev.items],
                    saving: false,
                    dialogOpen: false,
                }));
                enqueueSnackbar("Povreda na radu je dodata.", {
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
                        "Greška pri čuvanju povrede na radu.";
                    enqueueSnackbar(msg, { variant: "error" });
                    this.setState({ saving: false });
                },
            );
    };

    confirmDelete = (id: number): void => {
        this.setState({ deleteId: id });
    };

    cancelDelete = (): void => {
        this.setState({ deleteId: null, deleting: false });
    };

    executeDelete = (): void => {
        const { deleteId } = this.state;
        if (deleteId == null) return;
        this.setState({ deleting: true });
        deleteWorkInjury(deleteId)
            .then(() => {
                this.setState((prev) => ({
                    items: prev.items.filter((x) => x.id !== deleteId),
                    deleteId: null,
                    deleting: false,
                }));
                enqueueSnackbar("Povreda na radu je obrisana.", {
                    variant: "success",
                });
            })
            .catch(() => {
                enqueueSnackbar("Greška pri brisanju povrede na radu.", {
                    variant: "error",
                });
                this.setState({ deleting: false });
            });
    };

    render() {
        const { employees } = this.props;
        const {
            items,
            loading,
            error,
            dialogOpen,
            formEmployeeId,
            formDate,
            formSeverity,
            formDescription,
            saving,
            deleteId,
            deleting,
        } = this.state;

        return (
            <>
                <SectionCard
                    title="Povrede na radu"
                    action={
                        <PermissionGate permission="partners.add_workinjury">
                            <Button
                                size="small"
                                variant="contained"
                                startIcon={<AddIcon />}
                                onClick={this.openCreate}
                            >
                                Dodaj povredu
                            </Button>
                        </PermissionGate>
                    }
                >
                    <Box sx={{ overflow: "auto" }}>
                        <Table size="small">
                            <TableHead>
                                <TableRow>
                                    <TableCell>Datum</TableCell>
                                    <TableCell>Zaposleni</TableCell>
                                    <TableCell>Težina</TableCell>
                                    <TableCell>Opis</TableCell>
                                    <TableCell>Povredna lista</TableCell>
                                    <TableCell align="right" />
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {loading ? (
                                    <TableStateRow colSpan={6} state="loading" />
                                ) : error ? (
                                    <TableStateRow
                                        colSpan={6}
                                        state="error"
                                        onRetry={this.load}
                                    />
                                ) : items.length === 0 ? (
                                    <TableStateRow
                                        colSpan={6}
                                        state="empty"
                                        emptyMessage="Nema evidentiranih povreda na radu."
                                    />
                                ) : (
                                    items.map((wi) => (
                                        <TableRow key={wi.id}>
                                            <TableCell>
                                                {formatDateDisplay(wi.date)}
                                            </TableCell>
                                            <TableCell>
                                                {wi.employee_name ?? "—"}
                                            </TableCell>
                                            <TableCell>
                                                <Chip
                                                    size="small"
                                                    label={severityLabel(
                                                        wi.severity,
                                                    )}
                                                    color={severityColor(
                                                        wi.severity,
                                                    )}
                                                />
                                            </TableCell>
                                            <TableCell>
                                                {wi.description || "—"}
                                            </TableCell>
                                            <TableCell>
                                                {wi.report_file ? (
                                                    <Button
                                                        size="small"
                                                        href={wi.report_file}
                                                        target="_blank"
                                                        rel="noreferrer"
                                                    >
                                                        Preuzmi
                                                    </Button>
                                                ) : (
                                                    "—"
                                                )}
                                            </TableCell>
                                            <TableCell align="right">
                                                <RowActionsMenu
                                                    actions={[
                                                        {
                                                            label: "Obriši",
                                                            icon: (
                                                                <DeleteIcon fontSize="small" />
                                                            ),
                                                            permission:
                                                                "partners.delete_workinjury",
                                                            color: "error",
                                                            onClick: () =>
                                                                this.confirmDelete(
                                                                    wi.id,
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
                    </Box>
                </SectionCard>

                <Dialog
                    open={dialogOpen}
                    onClose={this.closeDialog}
                    maxWidth="sm"
                    fullWidth
                >
                    <DialogTitle>Nova povreda na radu</DialogTitle>
                    <DialogContent>
                        <FormControl margin="dense" fullWidth size="small">
                            <InputLabel>Zaposleni</InputLabel>
                            <Select
                                label="Zaposleni"
                                value={formEmployeeId}
                                onChange={(e) =>
                                    this.setState({
                                        formEmployeeId: e.target.value,
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
                        <DateTextFieldWithPicker
                            label="Datum povrede (dd.mm.yyyy)"
                            value={formDate}
                            allowPast
                            onChange={(v) => this.setState({ formDate: v })}
                        />
                        <FormControl margin="dense" fullWidth size="small">
                            <InputLabel>Težina</InputLabel>
                            <Select
                                label="Težina"
                                value={formSeverity}
                                onChange={(e) =>
                                    this.setState({
                                        formSeverity: e.target
                                            .value as WorkInjurySeverity,
                                    })
                                }
                            >
                                {SEVERITY_OPTIONS.map((s) => (
                                    <MenuItem key={s.value} value={s.value}>
                                        {s.label}
                                    </MenuItem>
                                ))}
                            </Select>
                        </FormControl>
                        <TextField
                            margin="dense"
                            label="Opis"
                            fullWidth
                            multiline
                            minRows={2}
                            value={formDescription}
                            onChange={(e) =>
                                this.setState({
                                    formDescription: e.target.value,
                                })
                            }
                        />
                        <Box sx={{ mt: 1.5 }}>
                            <Button size="small" variant="outlined" component="label">
                                {this.state.formFile
                                    ? this.state.formFile.name
                                    : "Priloži povrednu listu"}
                                <input
                                    type="file"
                                    hidden
                                    onChange={(e) =>
                                        this.setState({
                                            formFile:
                                                e.target.files?.[0] ?? null,
                                        })
                                    }
                                />
                            </Button>
                            {this.state.formFile && (
                                <Button
                                    size="small"
                                    onClick={() =>
                                        this.setState({ formFile: null })
                                    }
                                >
                                    Ukloni
                                </Button>
                            )}
                        </Box>
                        <Typography
                            variant="caption"
                            color="text.secondary"
                            sx={{ display: "block", mt: 0.5 }}
                        >
                            Prilog povredne liste je opcion.
                        </Typography>
                    </DialogContent>
                    <DialogActions>
                        <Button onClick={this.closeDialog} disabled={saving}>
                            Odustani
                        </Button>
                        <Button
                            variant="contained"
                            disabled={saving || !this.isValid()}
                            onClick={this.save}
                        >
                            {saving ? "Čuvam..." : "Sačuvaj"}
                        </Button>
                    </DialogActions>
                </Dialog>

                <ConfirmDialog
                    open={deleteId != null}
                    title="Obriši povredu na radu"
                    message="Da li si siguran da želiš da obrišeš ovu povredu na radu?"
                    loading={deleting}
                    onConfirm={this.executeDelete}
                    onClose={this.cancelDelete}
                />
            </>
        );
    }
}
