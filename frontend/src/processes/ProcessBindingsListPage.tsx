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
    FormControl,
    InputLabel,
    Select,
    MenuItem,
    CircularProgress,
    Alert,
} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import SendIcon from "@mui/icons-material/Send";
import BlockIcon from "@mui/icons-material/Block";
import { enqueueSnackbar } from "notistack";

import type { ProcessBindingsParams } from "../api/processes";
import { sendNowForBinding } from "../api/processes";
import { AddProcessBindingDialog } from "../components/AddProcessBindingDialog";
import { PermissionGate } from "../components/PermissionGate";
import RowActionsMenu from "../components/RowActionsMenu";
import { withNavigation } from "../hocs/withNavigation";
import DateTextFieldWithPicker from "../components/DateTextFieldWithPicker";
import {
    ensureClientCompanies,
    ensureProcessTypes,
    fetchBindings,
    saveProcessBinding,
} from "../store/processesSlice";
import { setLastPath } from "../store/locationSlice";
import {
    bindingTermDateError,
    displayDateToIso,
    formatDateDisplay,
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
        client_company_id: "",
        process_type_id: "",
        dialogOpen: false,
        sendingBindingId: null,
        savingStartDateBindingId: null,
        deactivatingBindingId: null,
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

    handleDeactivate = (bindingId: number): void => {
        this.setState((prev) => ({
            ...prev,
            deactivatingBindingId: bindingId,
        }));
        void this.props
            .saveBinding?.({
                id: bindingId,
                payload: { is_active: false },
            })
            .unwrap()
            .then(() => {
                this.setState((prev) => ({
                    ...prev,
                    deactivatingBindingId: null,
                }));
                enqueueSnackbar("Obaveza je deaktivirana.", {
                    variant: "success",
                });
                this.load();
            })
            .catch(
                (
                    err:
                        | { message?: string }
                        | { response?: { data?: { detail?: string } } },
                ) => {
                    this.setState((prev) => ({
                        ...prev,
                        deactivatingBindingId: null,
                    }));
                    const msg =
                        (err as { response?: { data?: { detail?: string } } })
                            .response?.data?.detail ??
                        (err as { message?: string }).message ??
                        "Greška pri deaktivaciji obaveze.";
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
        this.setState((prev) => ({ ...prev, dialogOpen: true }));
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

    render() {
        const {
            client_company_id,
            process_type_id,
            dialogOpen,
            sendingBindingId,
            savingStartDateBindingId,
            deactivatingBindingId,
        } = this.state;
        const {
            clientCompanies: clients,
            processTypes: types,
            bindingsItems: items,
            bindingsLoading: loading,
            bindingsError: error,
        } = this.props;

        const subjectLabel = (b: ProcessBinding) => {
            if (b.employee) {
                const name =
                    `${b.employee_first_name ?? ""} ${b.employee_last_name ?? ""}`.trim();
                return name || "—";
            }
            if (b.equipment_item) return b.equipment_item_name || "—";
            if (b.client_company) return b.client_company_name || "—";
            return "—";
        };

        return (
            <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
                <Typography variant="h6">Dodeljene obaveze</Typography>
                <Box sx={{ display: "flex", flexWrap: "wrap", gap: 2 }}>
                    <FormControl size="small" sx={{ minWidth: 200 }}>
                        <InputLabel>Firma</InputLabel>
                        <Select
                            value={client_company_id}
                            label="Firma"
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
                                            {row.has_open_run ? (
                                                formatDateDisplay(
                                                    row.next_run_at,
                                                )
                                            ) : (
                                                <PermissionGate permission="processes.change_processbinding">
                                                    <DateTextFieldWithPicker
                                                        label="Termin (dd.mm.yyyy)"
                                                        value={isoDateToFormDisplay(
                                                            row.next_run_at,
                                                        )}
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
                                            )}
                                        </TableCell>
                                        <TableCell>
                                            {row.is_active ? "Da" : "Ne"}
                                        </TableCell>
                                        <TableCell align="right">
                                            <RowActionsMenu
                                                actions={[
                                                    {
                                                        label:
                                                            deactivatingBindingId ===
                                                            row.id
                                                                ? "Deaktiviram..."
                                                                : "Deaktiviraj",
                                                        icon: (
                                                            <BlockIcon fontSize="small" />
                                                        ),
                                                        permission:
                                                            "processes.change_processbinding",
                                                        color: "warning",
                                                        hidden: !(
                                                            row.has_open_run &&
                                                            row.is_active
                                                        ),
                                                        disabled:
                                                            deactivatingBindingId ===
                                                            row.id,
                                                        onClick: () =>
                                                            this.handleDeactivate(
                                                                row.id,
                                                            ),
                                                    },
                                                    {
                                                        label:
                                                            sendingBindingId ===
                                                            row.id
                                                                ? "Šaljem..."
                                                                : "Pošalji sad",
                                                        icon: (
                                                            <SendIcon fontSize="small" />
                                                        ),
                                                        permission:
                                                            "processes.add_processrun",
                                                        disabled:
                                                            sendingBindingId ===
                                                                row.id ||
                                                            !row.next_run_at,
                                                        disabledTitle:
                                                            !row.next_run_at
                                                                ? "Postavi termin pre slanja"
                                                                : undefined,
                                                        onClick: () =>
                                                            this.handleSendNow(
                                                                row.id,
                                                            ),
                                                    },
                                                ]}
                                            />
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </Paper>
                )}

                <AddProcessBindingDialog
                    open={dialogOpen}
                    onClose={this.closeDialog}
                    onSuccess={() => {
                        this.closeDialog();
                        this.load();
                    }}
                    unlocked
                />
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
    saveBinding: (args) => dispatch(saveProcessBinding(args)),
});

const Connected = connect(
    mapStateToProps,
    mapDispatchToProps,
)(ProcessBindingsListPageInner);

export default withNavigation(Connected);
