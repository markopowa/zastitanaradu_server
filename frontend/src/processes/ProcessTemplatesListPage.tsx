import { Component } from "react";
import { connect } from "react-redux";

import {
    Box,
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableRow,
    Typography,
    FormControl,
    InputLabel,
    Select,
    MenuItem,
    CircularProgress,
    Alert,
    Button,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    TextField,
    FormControlLabel,
    Switch,
    Tooltip,
    Stack,
} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";
import { enqueueSnackbar } from "notistack";

import { PermissionGate } from "../components/PermissionGate";
import TemplateTextField from "../components/TemplateTextField";
import RowActionsMenu from "../components/RowActionsMenu";
import type { TemplateVariable } from "../components/TemplateTextField";
import {
    ScrollableTablePaper,
    tableCellEllipsis,
} from "../components/ScrollableTablePaper";
import {
    addProcessTemplate,
    ensureProcessDocTemplates,
    ensureProcessTypes,
    fetchProcessTemplatesList,
    removeProcessTemplate,
    saveProcessTemplate,
} from "../store/processesSlice";
import { loadRoles } from "../store/authSlice";
import { setLastPath } from "../store/locationSlice";

import type { AppDispatch, RootState } from "../store";
import type { ProcessTemplate } from "../types/processes";
import type {
    ProcessTemplatesListEmailToKindValue,
    ProcessTemplatesListPageDispatchProps,
    ProcessTemplatesListPageProps,
    ProcessTemplatesListPageState,
    ProcessTemplatesListPageStateProps,
    ProcessTemplatesListTriggerValue,
} from "../types/processPages";

const TRIGGER_OPTIONS: {
    value: ProcessTemplatesListTriggerValue;
    label: string;
}[] = [
    { value: "ON_SCHEDULED", label: "Na zakazani datum" },
    { value: "ON_COMPLETED", label: "Kada se završi pregled" },
    { value: "ON_EXPIRED", label: "Kada istekne rok važenja" },
];

const TEMPLATE_VARIABLES: TemplateVariable[] = [
    { key: "scheduled_for", label: "Datum termina" },
    { key: "process_type_name", label: "Vrsta obaveze" },
    { key: "valid_until", label: "Važi do" },
    { key: "last_exam_date", label: "Prethodni pregled" },
    { key: "instruction_number", label: "Broj uputa" },
    { key: "employee.first_name", label: "Ime" },
    { key: "employee.last_name", label: "Prezime" },
    { key: "employee.national_id", label: "JMBG" },
    { key: "employee.position", label: "Radno mesto" },
    { key: "employee.org_unit", label: "Org. jedinica" },
    { key: "employee.email", label: "Email zaposlenog" },
    { key: "client.name", label: "Naziv firme" },
    { key: "client.tax_id", label: "PIB" },
];

const EMAIL_TO_OPTIONS: {
    value: ProcessTemplatesListEmailToKindValue;
    label: string;
}[] = [
    { value: "CLIENT_MAIN_EMAIL", label: "Glavni email klijenta" },
    { value: "EMPLOYEE_EMAIL", label: "Email zaposlenog" },
    { value: "INTERNAL_ROLE", label: "Interna uloga (npr. HS služba)" },
    { value: "CUSTOM", label: "Prilagođena adresa" },
];

class ProcessTemplatesListPageInner extends Component<
    ProcessTemplatesListPageProps,
    ProcessTemplatesListPageState
> {
    state: ProcessTemplatesListPageState = {
        process_type_id: "",
        dialogOpen: false,
        deleteConfirmId: null,
        editingId: null,
        form_process_type_id: "",
        form_trigger: "",
        form_document_template_id: "",
        form_generate_document: false,
        form_send_email: false,
        form_email_to_kind: "",
        form_email_subject_template: "",
        form_email_body_template: "",
        form_custom_email_recipient: "",
        form_followup_process_type_id: "",
        form_notification_role_group_id: "",
    };

    load = (): void => {
        const { process_type_id } = this.state;
        const id = process_type_id ? Number(process_type_id) : undefined;
        this.props.loadTemplates(id);
    };

    componentDidMount(): void {
        this.props.setLastPath("/processes/templates");
        this.props.ensureProcessTypes();
        this.props.ensureProcessDocTemplates();
        this.props.loadRoles();
        this.load();
    }

    openCreate = (): void => {
        this.setState((prev) => {
            const types = this.props.processTypes;
            const defaultTypeId =
                prev.process_type_id ||
                (types.length > 0 ? String(types[0].id) : "");
            return {
                dialogOpen: true,
                editingId: null,
                form_process_type_id: defaultTypeId,
                form_trigger: "ON_SCHEDULED",
                form_document_template_id: "",
                form_generate_document: false,
                form_send_email: false,
                form_email_to_kind: "",
                form_email_subject_template: "",
                form_email_body_template: "",
                form_custom_email_recipient: "",
                form_followup_process_type_id: "",
                form_notification_role_group_id: "",
            };
        });
    };

    openEdit = (row: ProcessTemplate): void => {
        this.setState((prev) => ({
            ...prev,
            dialogOpen: true,
            editingId: row.id,
            form_process_type_id: String(row.process_type),
            form_trigger: row.trigger as ProcessTemplatesListTriggerValue,
            form_document_template_id: row.document_template
                ? String(row.document_template)
                : "",
            form_generate_document: row.generate_document,
            form_send_email: row.send_email,
            form_email_to_kind: (row.email_to_kind ??
                "") as ProcessTemplatesListEmailToKindValue,
            form_email_subject_template: row.email_subject_template ?? "",
            form_email_body_template: row.email_body_template ?? "",
            form_custom_email_recipient: row.custom_email_recipient ?? "",
            form_followup_process_type_id: row.followup_process_type
                ? String(row.followup_process_type)
                : "",
            form_notification_role_group_id: row.notification_role_group
                ? String(row.notification_role_group)
                : "",
        }));
    };

    closeDialog = (): void => {
        this.setState((prev) => ({
            ...prev,
            dialogOpen: false,
            editingId: null,
            form_process_type_id: "",
            form_trigger: "",
            form_document_template_id: "",
            form_generate_document: false,
            form_send_email: false,
            form_email_to_kind: "",
            form_email_subject_template: "",
            form_email_body_template: "",
            form_custom_email_recipient: "",
            form_followup_process_type_id: "",
            form_notification_role_group_id: "",
        }));
    };

    handleSave = (): void => {
        const {
            editingId,
            form_process_type_id,
            form_trigger,
            form_document_template_id,
            form_generate_document,
            form_send_email,
            form_email_to_kind,
            form_email_subject_template,
            form_email_body_template,
            form_custom_email_recipient,
            form_followup_process_type_id,
            form_notification_role_group_id,
        } = this.state;

        if (!form_process_type_id || !form_trigger) return;
        if (
            form_send_email &&
            form_email_to_kind === "INTERNAL_ROLE" &&
            !form_notification_role_group_id
        ) {
            enqueueSnackbar("Izaberite internu ulogu za primalac mejla.", {
                variant: "warning",
            });
            return;
        }

        const payload: Partial<ProcessTemplate> = {
            process_type: Number(form_process_type_id),
            trigger: form_trigger,
            document_template: form_document_template_id
                ? Number(form_document_template_id)
                : null,
            generate_document: form_generate_document,
            send_email: form_send_email,
            email_to_kind: form_send_email
                ? form_email_to_kind || undefined
                : "",
            email_subject_template: form_send_email
                ? form_email_subject_template || ""
                : "",
            email_body_template: form_send_email
                ? form_email_body_template || ""
                : "",
            custom_email_recipient:
                form_send_email && form_email_to_kind === "CUSTOM"
                    ? form_custom_email_recipient || ""
                    : "",
            notification_role_group:
                form_send_email &&
                form_email_to_kind === "INTERNAL_ROLE" &&
                form_notification_role_group_id
                    ? Number(form_notification_role_group_id)
                    : null,
            followup_process_type: form_followup_process_type_id
                ? Number(form_followup_process_type_id)
                : null,
        };

        const op =
            editingId != null
                ? this.props.saveTemplate({ id: editingId, payload })
                : this.props.addTemplate(payload);
        void op
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
                        "Greška pri čuvanju šablona.";
                    enqueueSnackbar(msg, { variant: "error" });
                },
            );
    };

    confirmDelete = (id: number): void => {
        this.setState((prev) => ({ ...prev, deleteConfirmId: id }));
    };

    cancelDelete = (): void => {
        this.setState((prev) => ({ ...prev, deleteConfirmId: null }));
    };

    doDelete = (): void => {
        const { deleteConfirmId } = this.state;
        if (deleteConfirmId == null) return;
        void this.props
            .removeTemplate(deleteConfirmId)
            .unwrap()
            .then(() => {
                this.setState((prev) => ({ ...prev, deleteConfirmId: null }));
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
                        "Greška pri brisanju šablona.";
                    enqueueSnackbar(msg, { variant: "error" });
                    this.setState((prev) => ({
                        ...prev,
                        deleteConfirmId: null,
                    }));
                },
            );
    };

    render() {
        const {
            processTypes: types,
            templatesItems: items,
            docTemplates,
            templatesLoading,
            templatesError: error,
            docTemplatesLoading,
        } = this.props;
        const loading = templatesLoading || docTemplatesLoading;
        const {
            process_type_id,
            dialogOpen,
            deleteConfirmId,
            editingId,
            form_process_type_id,
            form_trigger,
            form_document_template_id,
            form_generate_document,
            form_send_email,
            form_email_to_kind,
            form_email_subject_template,
            form_email_body_template,
            form_custom_email_recipient,
            form_followup_process_type_id,
            form_notification_role_group_id,
        } = this.state;

        const selectedType =
            types.find((t) => String(t.id) === form_process_type_id) ?? null;

        return (
            <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
                <Typography variant="h6">Šabloni procesa</Typography>
                <Box
                    sx={{
                        display: "flex",
                        flexWrap: "wrap",
                        gap: 2,
                        alignItems: "center",
                    }}
                >
                    <FormControl sx={{ minWidth: 260 }}>
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
                            <MenuItem value="">Sve vrste</MenuItem>
                            {types.map((t) => (
                                <MenuItem key={t.id} value={String(t.id)}>
                                    {t.name}
                                </MenuItem>
                            ))}
                        </Select>
                    </FormControl>
                    <Box sx={{ flex: 1 }} />
                    <PermissionGate permission="processes.add_processtemplate">
                        <Button
                            variant="contained"
                            startIcon={<AddIcon />}
                            onClick={this.openCreate}
                        >
                            Dodaj šablon
                        </Button>
                    </PermissionGate>
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
                    <ScrollableTablePaper sx={{ pb: 2 }}>
                        <Table
                            size="small"
                            sx={{
                                width: "100%",
                                tableLayout: "fixed",
                                "& .MuiTableCell-head": {
                                    fontWeight: 600,
                                },
                            }}
                        >
                            <TableHead>
                                <TableRow>
                                    <TableCell sx={tableCellEllipsis}>
                                        Vrsta obaveze
                                    </TableCell>
                                    <TableCell sx={tableCellEllipsis}>
                                        Trigger
                                    </TableCell>
                                    <TableCell sx={tableCellEllipsis}>
                                        Šablon dokumenta
                                    </TableCell>
                                    <TableCell sx={tableCellEllipsis}>
                                        Dokument
                                    </TableCell>
                                    <TableCell sx={tableCellEllipsis}>
                                        Mejl
                                    </TableCell>
                                    <TableCell
                                        align="right"
                                        sx={tableCellEllipsis}
                                    >
                                        Akcije
                                    </TableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {items.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={6} align="center">
                                            Nema šablona.
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    items.map((row) => (
                                        <TableRow key={row.id}>
                                            <TableCell sx={tableCellEllipsis}>
                                                {row.process_type_name}
                                            </TableCell>
                                            <TableCell sx={tableCellEllipsis}>
                                                {TRIGGER_OPTIONS.find(
                                                    (o) =>
                                                        o.value === row.trigger,
                                                )?.label ?? row.trigger}
                                            </TableCell>
                                            <TableCell sx={tableCellEllipsis}>
                                                {row.document_template
                                                    ? (docTemplates.find(
                                                          (d) =>
                                                              d.id ===
                                                              row.document_template,
                                                      )?.name ??
                                                      row.document_template)
                                                    : "—"}
                                            </TableCell>
                                            <TableCell>
                                                {row.generate_document
                                                    ? "Da"
                                                    : "Ne"}
                                            </TableCell>
                                            <TableCell>
                                                {row.send_email ? "Da" : "Ne"}
                                            </TableCell>
                                            <TableCell
                                                align="right"
                                                sx={{
                                                    verticalAlign: "middle",
                                                    py: 1.25,
                                                }}
                                            >
                                                <RowActionsMenu
                                                    actions={[
                                                        {
                                                            label: "Izmeni",
                                                            icon: (
                                                                <EditIcon fontSize="small" />
                                                            ),
                                                            permission:
                                                                "processes.change_processtemplate",
                                                            onClick: () =>
                                                                this.openEdit(
                                                                    row,
                                                                ),
                                                        },
                                                        {
                                                            label: "Obriši",
                                                            icon: (
                                                                <DeleteIcon fontSize="small" />
                                                            ),
                                                            permission:
                                                                "processes.delete_processtemplate",
                                                            color: "error",
                                                            onClick: () =>
                                                                this.confirmDelete(
                                                                    row.id,
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
                    </ScrollableTablePaper>
                )}

                <Dialog
                    open={dialogOpen}
                    onClose={this.closeDialog}
                    maxWidth="md"
                    fullWidth
                >
                    <DialogTitle>
                        {editingId != null
                            ? "Izmena šablona procesa"
                            : "Novi šablon procesa"}
                    </DialogTitle>
                    <DialogContent>
                        <FormControl fullWidth margin="dense">
                            <InputLabel>Vrsta obaveze</InputLabel>
                            <Select
                                value={form_process_type_id}
                                label="Vrsta obaveze"
                                onChange={(e) =>
                                    this.setState((prev) => ({
                                        ...prev,
                                        form_process_type_id: e.target
                                            .value as string,
                                    }))
                                }
                                required
                            >
                                {types.map((t) => (
                                    <MenuItem key={t.id} value={String(t.id)}>
                                        {t.name}
                                    </MenuItem>
                                ))}
                            </Select>
                        </FormControl>

                        {selectedType && (
                            <Typography
                                variant="body2"
                                color="text.secondary"
                                sx={{ mt: 0.5 }}
                            >
                                Subjekt:{" "}
                                {selectedType.subject_kind === "EMPLOYEE"
                                    ? "Zaposleni"
                                    : selectedType.subject_kind === "EQUIPMENT"
                                      ? "Oprema"
                                      : "Firma"}
                            </Typography>
                        )}

                        <Tooltip title="Kada da se izvrši akcija: pri zakazivanju, pri završetku obaveze ili kada istekne rok.">
                            <FormControl fullWidth margin="dense">
                                <InputLabel>Trigger</InputLabel>
                                <Select
                                    value={form_trigger}
                                    label="Trigger"
                                    onChange={(e) =>
                                        this.setState((prev) => ({
                                            ...prev,
                                            form_trigger: e.target
                                                .value as ProcessTemplatesListTriggerValue,
                                        }))
                                    }
                                    required
                                >
                                    {TRIGGER_OPTIONS.map((opt) => (
                                        <MenuItem
                                            key={opt.value}
                                            value={opt.value}
                                        >
                                            {opt.label}
                                        </MenuItem>
                                    ))}
                                </Select>
                            </FormControl>
                        </Tooltip>

                        <FormControl fullWidth margin="dense">
                            <InputLabel>Šablon dokumenta</InputLabel>
                            <Select
                                value={form_document_template_id}
                                label="Šablon dokumenta"
                                onChange={(e) =>
                                    this.setState((prev) => ({
                                        ...prev,
                                        form_document_template_id: e.target
                                            .value as string,
                                    }))
                                }
                            >
                                <MenuItem value="">—</MenuItem>
                                {docTemplates.map((d) => (
                                    <MenuItem key={d.id} value={String(d.id)}>
                                        {d.name}
                                    </MenuItem>
                                ))}
                            </Select>
                        </FormControl>

                        <FormControl fullWidth margin="dense">
                            <InputLabel>Sledeća vrsta obaveze</InputLabel>
                            <Select
                                value={form_followup_process_type_id}
                                label="Sledeća vrsta obaveze"
                                onChange={(e) =>
                                    this.setState((prev) => ({
                                        ...prev,
                                        form_followup_process_type_id: e.target
                                            .value as string,
                                    }))
                                }
                            >
                                <MenuItem value="">—</MenuItem>
                                {types.map((t) => (
                                    <MenuItem key={t.id} value={String(t.id)}>
                                        {t.name}
                                    </MenuItem>
                                ))}
                            </Select>
                        </FormControl>

                        <FormControlLabel
                            control={
                                <Switch
                                    checked={form_generate_document}
                                    onChange={(e) =>
                                        this.setState((prev) => ({
                                            ...prev,
                                            form_generate_document:
                                                e.target.checked,
                                        }))
                                    }
                                />
                            }
                            label="Generiši dokument"
                            sx={{ mt: 1 }}
                        />

                        <FormControlLabel
                            control={
                                <Switch
                                    checked={form_send_email}
                                    onChange={(e) =>
                                        this.setState((prev) => ({
                                            ...prev,
                                            form_send_email: e.target.checked,
                                        }))
                                    }
                                />
                            }
                            label="Pošalji mejl"
                        />

                        {form_send_email && (
                            <>
                                <FormControl fullWidth margin="dense">
                                    <InputLabel>Primalac</InputLabel>
                                    <Select
                                        value={form_email_to_kind}
                                        label="Primalac"
                                        onChange={(e) =>
                                            this.setState((prev) => ({
                                                ...prev,
                                                form_email_to_kind: e.target
                                                    .value as ProcessTemplatesListEmailToKindValue,
                                            }))
                                        }
                                        required
                                    >
                                        {EMAIL_TO_OPTIONS.map((opt) => (
                                            <MenuItem
                                                key={opt.value}
                                                value={opt.value}
                                            >
                                                {opt.label}
                                            </MenuItem>
                                        ))}
                                    </Select>
                                </FormControl>

                                {form_email_to_kind === "CUSTOM" && (
                                    <TextField
                                        margin="dense"
                                        label="Prilagođeni email"
                                        fullWidth
                                        type="email"
                                        value={form_custom_email_recipient}
                                        onChange={(e) =>
                                            this.setState((prev) => ({
                                                ...prev,
                                                form_custom_email_recipient:
                                                    e.target.value,
                                            }))
                                        }
                                    />
                                )}

                                {form_email_to_kind === "INTERNAL_ROLE" && (
                                    <FormControl fullWidth margin="dense">
                                        <InputLabel>Interna uloga</InputLabel>
                                        <Select
                                            value={
                                                form_notification_role_group_id
                                            }
                                            label="Interna uloga"
                                            onChange={(e) =>
                                                this.setState((prev) => ({
                                                    ...prev,
                                                    form_notification_role_group_id:
                                                        e.target
                                                            .value as string,
                                                }))
                                            }
                                        >
                                            <MenuItem value="">
                                                <em>Izaberi...</em>
                                            </MenuItem>
                                            {this.props.roles.map((r) => (
                                                <MenuItem
                                                    key={r.id}
                                                    value={String(r.id)}
                                                >
                                                    {r.name}
                                                </MenuItem>
                                            ))}
                                        </Select>
                                    </FormControl>
                                )}

                                <TemplateTextField
                                    margin="dense"
                                    label="Naslov mejla"
                                    fullWidth
                                    value={form_email_subject_template}
                                    onChange={(v) =>
                                        this.setState((prev) => ({
                                            ...prev,
                                            form_email_subject_template: v,
                                        }))
                                    }
                                    variables={TEMPLATE_VARIABLES}
                                />
                                <TemplateTextField
                                    margin="dense"
                                    label="Telo mejla"
                                    fullWidth
                                    multiline
                                    minRows={4}
                                    value={form_email_body_template}
                                    onChange={(v) =>
                                        this.setState((prev) => ({
                                            ...prev,
                                            form_email_body_template: v,
                                        }))
                                    }
                                    variables={TEMPLATE_VARIABLES}
                                />
                            </>
                        )}
                    </DialogContent>
                    <DialogActions>
                        <Button onClick={this.closeDialog}>Odustani</Button>
                        <Button
                            onClick={this.handleSave}
                            variant="contained"
                            disabled={!form_process_type_id || !form_trigger}
                        >
                            Sačuvaj
                        </Button>
                    </DialogActions>
                </Dialog>

                <Dialog
                    open={deleteConfirmId != null}
                    onClose={this.cancelDelete}
                >
                    <DialogTitle>Obriši šablon procesa?</DialogTitle>
                    <DialogActions>
                        <Button onClick={this.cancelDelete}>Ne</Button>
                        <Button
                            onClick={this.doDelete}
                            color="error"
                            variant="contained"
                        >
                            Da, obriši
                        </Button>
                    </DialogActions>
                </Dialog>
            </Box>
        );
    }
}

const mapStateToProps = (
    state: RootState,
): ProcessTemplatesListPageStateProps => ({
    processTypes: state.processes.processTypes,
    templatesItems: state.processes.templatesItems,
    templatesLoading: state.processes.templatesStatus === "loading",
    templatesError:
        state.processes.templatesStatus === "failed"
            ? (state.processes.templatesError ?? "Greška")
            : null,
    docTemplates: state.processes.processDocTemplates,
    docTemplatesLoading:
        state.processes.processDocTemplatesStatus === "loading",
    roles: state.auth.roles,
});

const mapDispatchToProps = (
    dispatch: AppDispatch,
): ProcessTemplatesListPageDispatchProps => ({
    setLastPath: (path: string) => dispatch(setLastPath(path)),
    loadRoles: () => {
        void dispatch(loadRoles());
    },
    ensureProcessTypes: () => {
        void dispatch(ensureProcessTypes());
    },
    ensureProcessDocTemplates: () => {
        void dispatch(ensureProcessDocTemplates());
    },
    loadTemplates: (processTypeId: number | undefined) => {
        void dispatch(fetchProcessTemplatesList(processTypeId));
    },
    addTemplate: (payload: Partial<ProcessTemplate>) =>
        dispatch(addProcessTemplate(payload)),
    saveTemplate: (args: { id: number; payload: Partial<ProcessTemplate> }) =>
        dispatch(saveProcessTemplate(args)),
    removeTemplate: (id: number) => dispatch(removeProcessTemplate(id)),
});

export default connect(
    mapStateToProps,
    mapDispatchToProps,
)(ProcessTemplatesListPageInner);
