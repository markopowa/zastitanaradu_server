import { Component } from "react";
import { connect } from "react-redux";

import {
    Box,
    Paper,
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableRow,
    Typography,
    Button,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    FormControl,
    InputLabel,
    Select,
    MenuItem,
    CircularProgress,
    Alert,
    Tooltip,
} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import SendIcon from "@mui/icons-material/Send";
import { enqueueSnackbar } from "notistack";

import type { ProcessBindingsParams } from "../api/processes";
import {
    getEmployees,
    getEquipment,
    sendNowForBinding,
} from "../api/processes";
import { PermissionGate } from "../components/PermissionGate";
import { withNavigation } from "../hocs/withNavigation";
import DateTextFieldWithPicker from "../components/DateTextFieldWithPicker";
import {
    addProcessBinding,
    ensureClientCompanies,
    ensureProcessTypes,
    fetchBindings,
    saveProcessBinding,
} from "../store/processesSlice";
import { setLastPath } from "../store/locationSlice";
import {
    bindingTermDateError,
    displayDateToIso,
    isoDateToFormDisplay,
} from "../utils/date";

import type { AppDispatch, RootState } from "../store";
import type { ProcessBinding } from "../types/processes";
import type {
    ProcessBindingsListPageDispatchProps,
    ProcessBindingsListPageProps,
    ProcessBindingsListPageState,
    ProcessBindingsListPageStateProps,
} from "../types/processPages";

class ProcessBindingsListPageInner extends Component<
    ProcessBindingsListPageProps,
    ProcessBindingsListPageState
> {
    state: ProcessBindingsListPageState = {
        employees: [],
        equipment: [],
        client_company_id: "",
        process_type_id: "",
        dialogOpen: false,
        new_subject_kind: "EMPLOYEE",
        new_employee: "",
        new_equipment: "",
        new_client_company: "",
        new_process_type: "",
        new_next_run_at: "",
        sendingBindingId: null,
        savingStartDateBindingId: null,
    };

    handleSendNow = (bindingId: number): void => {
        this.setState((prev) => ({ ...prev, sendingBindingId: bindingId }));
        sendNowForBinding(bindingId)
            .then((res) => {
                this.setState((prev) => ({ ...prev, sendingBindingId: null }));
                if (res.email_sent) {
                    enqueueSnackbar("Uput je poslat na mejl.", {
                        variant: "success",
                    });
                } else {
                    enqueueSnackbar(
                        "Uput je generisan, ali mejl nije poslat. Možeš ga skinuti iz aktivnosti.",
                        { variant: "warning" },
                    );
                }
                this.props.navigate("/processes/runs");
            })
            .catch(
                (
                    err:
                        | { message?: string }
                        | { response?: { data?: { detail?: string } } },
                ) => {
                    this.setState((prev) => ({
                        ...prev,
                        sendingBindingId: null,
                    }));
                    const msg =
                        (err as { response?: { data?: { detail?: string } } })
                            .response?.data?.detail ??
                        (err as { message?: string }).message ??
                        "Greška pri slanju pregleda.";
                    enqueueSnackbar(msg, { variant: "error" });
                },
            );
    };

    load = (): void => {
        const { client_company_id, process_type_id } = this.state;
        const params: ProcessBindingsParams = {};
        if (client_company_id)
            params.client_company_id = Number(client_company_id);
        if (process_type_id) params.process_type_id = Number(process_type_id);
        this.props.loadBindings?.(params);
    };

    componentDidMount(): void {
        this.props.setLastPath?.("/processes/bindings");
        this.props.ensureClientCompanies?.();
        this.props.ensureProcessTypes?.();
        this.load();
    }

    openAdd = (): void => {
        const types = this.props.processTypes;
        const firstType = types[0];
        this.setState((prev) => ({
            ...prev,
            dialogOpen: true,
            new_subject_kind: firstType?.subject_kind ?? "EMPLOYEE",
            new_employee: "",
            new_equipment: "",
            new_client_company: "",
            new_process_type: firstType ? String(firstType.id) : "",
            new_next_run_at: "",
        }));
        getEmployees().then((e) =>
            this.setState((prev) => ({ ...prev, employees: e })),
        );
        getEquipment().then((eq) =>
            this.setState((prev) => ({ ...prev, equipment: eq })),
        );
    };

    closeDialog = (): void => {
        this.setState((prev) => ({ ...prev, dialogOpen: false }));
    };

    handleStartDateChange = (bindingId: number, displayDate: string): void => {
        const termError = bindingTermDateError(displayDate);
        if (termError) {
            enqueueSnackbar(termError, { variant: "error" });
            return;
        }
        const nextRunAtISO = displayDateToIso(displayDate);
        if (!nextRunAtISO) return;
        this.setState((prev) => ({
            ...prev,
            savingStartDateBindingId: bindingId,
        }));
        void this.props
            .saveBinding?.({
                id: bindingId,
                payload: { next_run_at: nextRunAtISO },
            })
            .unwrap()
            .then(() => {
                this.setState((prev) => ({
                    ...prev,
                    savingStartDateBindingId: null,
                }));
                enqueueSnackbar("Termin je sačuvan.", {
                    variant: "success",
                });
            })
            .catch(
                (
                    err:
                        | { message?: string }
                        | { response?: { data?: { detail?: string } } },
                ) => {
                    this.setState((prev) => ({
                        ...prev,
                        savingStartDateBindingId: null,
                    }));
                    const msg =
                        (err as { response?: { data?: { detail?: string } } })
                            .response?.data?.detail ??
                        (err as { message?: string }).message ??
                        "Greška pri čuvanju termina.";
                    enqueueSnackbar(msg, { variant: "error" });
                },
            );
    };

    handleCreate = (): void => {
        const {
            new_subject_kind,
            new_employee,
            new_equipment,
            new_client_company,
            new_process_type,
            new_next_run_at,
        } = this.state;
        if (!new_process_type) return;
        const termError = bindingTermDateError(new_next_run_at);
        if (termError) {
            enqueueSnackbar(termError, { variant: "error" });
            return;
        }
        const nextRunAtISO = displayDateToIso(new_next_run_at);
        if (!nextRunAtISO) return;
        const payload: Partial<ProcessBinding> = {
            process_type: Number(new_process_type),
            subject_kind: new_subject_kind as
                | "EMPLOYEE"
                | "EQUIPMENT"
                | "CLIENT_COMPANY",
            next_run_at: nextRunAtISO,
            is_active: true,
        };
        if (new_subject_kind === "EMPLOYEE" && new_employee)
            payload.employee = Number(new_employee);
        else if (new_subject_kind === "EQUIPMENT" && new_equipment)
            payload.equipment_item = Number(new_equipment);
        else if (new_subject_kind === "CLIENT_COMPANY" && new_client_company)
            payload.client_company = Number(new_client_company);
        else return;
        void this.props
            .addBinding(payload)
            .unwrap()
            .then(() => {
                this.closeDialog();
                this.load();
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
                },
            );
    };

    render() {
        const {
            client_company_id,
            process_type_id,
            dialogOpen,
            new_subject_kind,
            new_employee,
            new_equipment,
            new_client_company,
            new_process_type,
            new_next_run_at,
            employees,
            equipment,
            sendingBindingId,
            savingStartDateBindingId,
        } = this.state;
        const {
            clientCompanies: clients,
            processTypes: types,
            bindingsItems: items,
            bindingsLoading: loading,
            bindingsError: error,
        } = this.props;

        const newTermError = bindingTermDateError(new_next_run_at);

        const subjectLabel = (b: ProcessBinding) => {
            if (b.employee) {
                const name = `${b.employee_first_name ?? ""} ${b.employee_last_name ?? ""}`.trim();
                return name || "—";
            }
            if (b.equipment_item) return b.equipment_item_name || "—";
            if (b.client_company) return b.client_company_name || "—";
            return "—";
        };

        return (
            <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
                <Typography variant="h6">Obaveze</Typography>
                <Box sx={{ display: "flex", flexWrap: "wrap", gap: 2 }}>
                    <FormControl size="small" sx={{ minWidth: 200 }}>
                        <InputLabel>Klijent</InputLabel>
                        <Select
                            value={client_company_id}
                            label="Klijent"
                            onChange={(e) =>
                                this.setState(
                                    (prev) => ({
                                        ...prev,
                                        client_company_id: e.target
                                            .value as string,
                                    }),
                                    () => this.load(),
                                )
                            }
                        >
                            <MenuItem value="">Svi</MenuItem>
                            {clients.map((c) => (
                                <MenuItem key={c.id} value={String(c.id)}>
                                    {c.name}
                                </MenuItem>
                            ))}
                        </Select>
                    </FormControl>
                    <FormControl size="small" sx={{ minWidth: 200 }}>
                        <InputLabel>Vrsta obaveze</InputLabel>
                        <Select
                            value={process_type_id}
                            label="Vrsta obaveze"
                            onChange={(e) =>
                                this.setState(
                                    (prev) => ({
                                        ...prev,
                                        process_type_id: e.target
                                            .value as string,
                                    }),
                                    () => this.load(),
                                )
                            }
                        >
                            <MenuItem value="">Svi</MenuItem>
                            {types.map((t) => (
                                <MenuItem key={t.id} value={String(t.id)}>
                                    {t.name}
                                </MenuItem>
                            ))}
                        </Select>
                    </FormControl>
                    <Button
                        variant="contained"
                        startIcon={<AddIcon />}
                        onClick={this.openAdd}
                    >
                        Dodaj obavezu
                    </Button>
                </Box>
                {error && <Alert severity="error">{error}</Alert>}
                {loading ? (
                    <Box
                        sx={{
                            display: "flex",
                            justifyContent: "center",
                            py: 4,
                        }}
                    >
                        <CircularProgress />
                    </Box>
                ) : (
                    <Paper sx={{ overflow: "auto" }}>
                        <Table size="small">
                            <TableHead>
                                <TableRow>
                                    <TableCell>Vrsta obaveze</TableCell>
                                    <TableCell>Subjekt</TableCell>
                                    <TableCell>Termin</TableCell>
                                    <TableCell>Aktivan</TableCell>
                                    <TableCell align="right" />
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {items.map((row) => (
                                    <TableRow key={row.id}>
                                        <TableCell>
                                            {row.process_type_name}
                                        </TableCell>
                                        <TableCell>
                                            {subjectLabel(row)}
                                        </TableCell>
                                        <TableCell
                                            sx={{ minWidth: 220 }}
                                            onClick={(e) => e.stopPropagation()}
                                        >
                                            <PermissionGate permission="processes.change_processbinding">
                                                <DateTextFieldWithPicker
                                                    label="Termin (dd.mm.yyyy)"
                                                    value={isoDateToFormDisplay(
                                                        row.next_run_at,
                                                    )}
                                                    minToday
                                                    helperText={
                                                        savingStartDateBindingId ===
                                                        row.id
                                                            ? "Čuvam..."
                                                            : undefined
                                                    }
                                                    onChange={(v) =>
                                                        this.handleStartDateChange(
                                                            row.id,
                                                            v,
                                                        )
                                                    }
                                                />
                                            </PermissionGate>
                                        </TableCell>
                                        <TableCell>
                                            {row.is_active ? "Da" : "Ne"}
                                        </TableCell>
                                        <TableCell align="right">
                                            <PermissionGate permission="processes.add_processrun">
                                                <Tooltip
                                                    title={
                                                        row.next_run_at
                                                            ? ""
                                                            : "Postavi termin pre slanja"
                                                    }
                                                >
                                                    <span>
                                                        <Button
                                                            size="small"
                                                            variant="outlined"
                                                            startIcon={
                                                                <SendIcon />
                                                            }
                                                            disabled={
                                                                sendingBindingId ===
                                                                    row.id ||
                                                                !row.next_run_at
                                                            }
                                                            onClick={() =>
                                                                this.handleSendNow(
                                                                    row.id,
                                                                )
                                                            }
                                                            sx={{
                                                                whiteSpace:
                                                                    "nowrap",
                                                            }}
                                                        >
                                                            {sendingBindingId ===
                                                            row.id
                                                                ? "Šaljem..."
                                                                : "Pošalji sad"}
                                                        </Button>
                                                    </span>
                                                </Tooltip>
                                            </PermissionGate>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </Paper>
                )}

                <Dialog
                    open={dialogOpen}
                    onClose={this.closeDialog}
                    maxWidth="sm"
                    fullWidth
                >
                    <DialogTitle>Dodaj obavezu</DialogTitle>
                    <DialogContent>
                        <FormControl fullWidth margin="dense">
                            <InputLabel>Vrsta obaveze</InputLabel>
                            <Select
                                value={new_process_type}
                                label="Vrsta obaveze"
                                onChange={(e) => {
                                    const selectedType = types.find(
                                        (t) => String(t.id) === e.target.value,
                                    );
                                    this.setState((prev) => ({
                                        ...prev,
                                        new_process_type: e.target.value,
                                        new_subject_kind:
                                            selectedType?.subject_kind ??
                                            prev.new_subject_kind,
                                        new_employee: "",
                                        new_equipment: "",
                                        new_client_company: "",
                                    }));
                                }}
                            >
                                {types.map((t) => (
                                    <MenuItem key={t.id} value={String(t.id)}>
                                        {t.name}
                                    </MenuItem>
                                ))}
                            </Select>
                        </FormControl>
                        {new_subject_kind === "EMPLOYEE" && (
                            <FormControl fullWidth margin="dense">
                                <InputLabel>Zaposleni</InputLabel>
                                <Select
                                    value={new_employee}
                                    label="Zaposleni"
                                    onChange={(e) =>
                                        this.setState((prev) => ({
                                            ...prev,
                                            new_employee: e.target.value,
                                        }))
                                    }
                                >
                                    {employees.map((e) => (
                                        <MenuItem
                                            key={e.id}
                                            value={String(e.id)}
                                        >
                                            {e.first_name} {e.last_name}
                                        </MenuItem>
                                    ))}
                                </Select>
                            </FormControl>
                        )}
                        {new_subject_kind === "EQUIPMENT" && (
                            <FormControl fullWidth margin="dense">
                                <InputLabel>Oprema</InputLabel>
                                <Select
                                    value={new_equipment}
                                    label="Oprema"
                                    onChange={(e) =>
                                        this.setState((prev) => ({
                                            ...prev,
                                            new_equipment: e.target.value,
                                        }))
                                    }
                                >
                                    {equipment.map((e) => (
                                        <MenuItem
                                            key={e.id}
                                            value={String(e.id)}
                                        >
                                            {e.name}
                                        </MenuItem>
                                    ))}
                                </Select>
                            </FormControl>
                        )}
                        {new_subject_kind === "CLIENT_COMPANY" && (
                            <FormControl fullWidth margin="dense">
                                <InputLabel>Klijent</InputLabel>
                                <Select
                                    value={new_client_company}
                                    label="Klijent"
                                    onChange={(e) =>
                                        this.setState((prev) => ({
                                            ...prev,
                                            new_client_company: e.target.value,
                                        }))
                                    }
                                >
                                    {clients.map((c) => (
                                        <MenuItem
                                            key={c.id}
                                            value={String(c.id)}
                                        >
                                            {c.name}
                                        </MenuItem>
                                    ))}
                                </Select>
                            </FormControl>
                        )}
                        <DateTextFieldWithPicker
                            label="Termin (dd.mm.yyyy)"
                            value={new_next_run_at}
                            minToday
                            error={newTermError != null}
                            helperText={
                                newTermError ??
                                "Kada obaveza prvi put treba da se desi"
                            }
                            onChange={(v) =>
                                this.setState((prev) => ({
                                    ...prev,
                                    new_next_run_at: v,
                                }))
                            }
                        />
                    </DialogContent>
                    <DialogActions sx={{ px: 3, pb: 2 }}>
                        <Button onClick={this.closeDialog}>Odustani</Button>
                        <Button
                            onClick={this.handleCreate}
                            variant="contained"
                            disableElevation
                            disabled={
                                !new_process_type ||
                                !new_next_run_at.trim() ||
                                newTermError != null ||
                                (new_subject_kind === "EMPLOYEE" &&
                                    !new_employee) ||
                                (new_subject_kind === "EQUIPMENT" &&
                                    !new_equipment) ||
                                (new_subject_kind === "CLIENT_COMPANY" &&
                                    !new_client_company)
                            }
                        >
                            Dodaj
                        </Button>
                    </DialogActions>
                </Dialog>
            </Box>
        );
    }
}

const mapStateToProps = (
    state: RootState,
): ProcessBindingsListPageStateProps => ({
    clientCompanies: state.processes.clientCompanies,
    processTypes: state.processes.processTypes,
    bindingsItems: state.processes.bindingsItems,
    bindingsLoading: state.processes.bindingsStatus === "loading",
    bindingsError:
        state.processes.bindingsStatus === "failed"
            ? (state.processes.bindingsError ?? "Greška")
            : null,
});

const mapDispatchToProps = (
    dispatch: AppDispatch,
): ProcessBindingsListPageDispatchProps => ({
    setLastPath: (path: string) => dispatch(setLastPath(path)),
    ensureClientCompanies: () => {
        void dispatch(ensureClientCompanies());
    },
    ensureProcessTypes: () => {
        void dispatch(ensureProcessTypes());
    },
    loadBindings: (params) => {
        void dispatch(fetchBindings(params));
    },
    addBinding: (payload) => dispatch(addProcessBinding(payload)),
    saveBinding: (args) => dispatch(saveProcessBinding(args)),
});

const Connected = connect(
    mapStateToProps,
    mapDispatchToProps,
)(ProcessBindingsListPageInner);

export default withNavigation(Connected);
