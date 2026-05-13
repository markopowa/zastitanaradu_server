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
    CircularProgress,
    Alert,
    Button,
    Chip,
    Collapse,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    FormControl,
    InputLabel,
    Select,
    MenuItem,
    TextField,
    FormControlLabel,
    Switch,
    IconButton,
    Tooltip,
} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import ExpandLessIcon from "@mui/icons-material/ExpandLess";
import { enqueueSnackbar } from "notistack";

import { PermissionGate } from "../components/PermissionGate";
import TemplateTextField from "../components/TemplateTextField";
import type { TemplateVariable } from "../components/TemplateTextField";
import { ScrollableTablePaper } from "../components/ScrollableTablePaper";
import {
    addProcessTemplate,
    ensureProcessDocTemplates,
    ensureProcessTypes,
    fetchProcessTypes,
    removeProcessTemplate,
    saveProcessTemplate,
} from "../store/processesSlice";
import { loadRoles } from "../store/authSlice";
import { setLastPath } from "../store/locationSlice";

import type { AppDispatch, RootState } from "../store";
import type { ProcessTemplate, ProcessType } from "../types/processes";
import type { DocumentTemplate } from "../api/documents";
import type { Role } from "../types/auth";

const TRIGGER_OPTIONS = [
    { value: "ON_SCHEDULED", label: "Na zakazani datum" },
    { value: "ON_COMPLETED", label: "Kada se završi pregled" },
    { value: "ON_EXPIRED", label: "Kada istekne rok važenja" },
] as const;

const EMAIL_TO_OPTIONS = [
    { value: "CLIENT_MAIN_EMAIL", label: "Glavni email klijenta" },
    { value: "EMPLOYEE_EMAIL", label: "Email zaposlenog" },
    { value: "INTERNAL_ROLE", label: "Interna uloga" },
    { value: "CUSTOM", label: "Prilagođena adresa" },
] as const;

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

function triggerLabel(trigger: string): string {
    return TRIGGER_OPTIONS.find((o) => o.value === trigger)?.label ?? trigger;
}

interface StateProps {
    processTypes: ProcessType[];
    typesLoading: boolean;
    docTemplates: DocumentTemplate[];
    docTemplatesLoading: boolean;
    roles: Role[];
}

interface DispatchProps {
    setLastPath: (path: string) => void;
    ensureProcessTypes: () => void;
    reloadProcessTypes: () => void;
    ensureProcessDocTemplates: () => void;
    loadRoles: () => void;
    addTemplate: (payload: Partial<ProcessTemplate>) => Promise<unknown>;
    saveTemplate: (args: { id: number; payload: Partial<ProcessTemplate> }) => Promise<unknown>;
    removeTemplate: (id: number) => Promise<unknown>;
}

type Props = StateProps & DispatchProps;

interface State {
    expandedTypeId: number | null;
    dialogOpen: boolean;
    editingId: number | null;
    forProcessTypeId: number | null;
    deleteConfirmId: number | null;
    form_trigger: string;
    form_document_template_id: string;
    form_generate_document: boolean;
    form_send_email: boolean;
    form_email_to_kind: string;
    form_email_subject_template: string;
    form_email_body_template: string;
    form_custom_email_recipient: string;
    form_followup_process_type_id: string;
    form_notification_role_group_id: string;
}

class ProcessTemplatesListPageInner extends Component<Props, State> {
    state: State = {
        expandedTypeId: null,
        dialogOpen: false,
        editingId: null,
        forProcessTypeId: null,
        deleteConfirmId: null,
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

    componentDidMount(): void {
        this.props.setLastPath("/processes/templates");
        this.props.ensureProcessTypes();
        this.props.ensureProcessDocTemplates();
        this.props.loadRoles();
    }

    toggleExpand = (typeId: number): void => {
        this.setState((prev) => ({
            expandedTypeId: prev.expandedTypeId === typeId ? null : typeId,
        }));
    };

    openCreate = (processTypeId: number): void => {
        this.setState({
            dialogOpen: true,
            editingId: null,
            forProcessTypeId: processTypeId,
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
        });
    };

    openEdit = (template: ProcessTemplate): void => {
        this.setState({
            dialogOpen: true,
            editingId: template.id,
            forProcessTypeId: template.process_type,
            form_trigger: template.trigger,
            form_document_template_id: template.document_template
                ? String(template.document_template)
                : "",
            form_generate_document: template.generate_document,
            form_send_email: template.send_email,
            form_email_to_kind: template.email_to_kind ?? "",
            form_email_subject_template: template.email_subject_template ?? "",
            form_email_body_template: template.email_body_template ?? "",
            form_custom_email_recipient: template.custom_email_recipient ?? "",
            form_followup_process_type_id: template.followup_process_type
                ? String(template.followup_process_type)
                : "",
            form_notification_role_group_id: template.notification_role_group
                ? String(template.notification_role_group)
                : "",
        });
    };

    closeDialog = (): void => {
        this.setState({ dialogOpen: false, editingId: null, forProcessTypeId: null });
    };

    handleSave = (): void => {
        const {
            editingId,
            forProcessTypeId,
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

        if (!forProcessTypeId || !form_trigger) return;
        if (form_send_email && form_email_to_kind === "INTERNAL_ROLE" && !form_notification_role_group_id) {
            enqueueSnackbar("Izaberite internu ulogu za primalac mejla.", { variant: "warning" });
            return;
        }

        const payload: Partial<ProcessTemplate> = {
            process_type: forProcessTypeId,
            trigger: form_trigger,
            document_template: form_document_template_id ? Number(form_document_template_id) : null,
            generate_document: form_generate_document,
            send_email: form_send_email,
            email_to_kind: form_send_email ? form_email_to_kind || undefined : "",
            email_subject_template: form_send_email ? form_email_subject_template || "" : "",
            email_body_template: form_send_email ? form_email_body_template || "" : "",
            custom_email_recipient:
                form_send_email && form_email_to_kind === "CUSTOM"
                    ? form_custom_email_recipient || ""
                    : "",
            notification_role_group:
                form_send_email && form_email_to_kind === "INTERNAL_ROLE" && form_notification_role_group_id
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

        void (op as Promise<unknown>)
            .then(() => {
                this.closeDialog();
                this.props.reloadProcessTypes();
            })
            .catch((err: { response?: { data?: { detail?: string } }; message?: string }) => {
                const msg =
                    err.response?.data?.detail ?? err.message ?? "Greška pri čuvanju.";
                enqueueSnackbar(msg, { variant: "error" });
            });
    };

    confirmDelete = (id: number): void => {
        this.setState({ deleteConfirmId: id });
    };

    cancelDelete = (): void => {
        this.setState({ deleteConfirmId: null });
    };

    doDelete = (): void => {
        const { deleteConfirmId } = this.state;
        if (deleteConfirmId == null) return;
        void (this.props.removeTemplate(deleteConfirmId) as Promise<unknown>)
            .then(() => {
                this.setState({ deleteConfirmId: null });
                this.props.reloadProcessTypes();
            })
            .catch((err: { response?: { data?: { detail?: string } }; message?: string }) => {
                const msg = err.response?.data?.detail ?? err.message ?? "Greška pri brisanju.";
                enqueueSnackbar(msg, { variant: "error" });
                this.setState({ deleteConfirmId: null });
            });
    };

    render() {
        const { processTypes, typesLoading, docTemplates, docTemplatesLoading } = this.props;
        const loading = typesLoading || docTemplatesLoading;
        const {
            expandedTypeId,
            dialogOpen,
            deleteConfirmId,
            editingId,
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

        return (
            <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
                <Typography variant="h6">Šabloni procesa</Typography>

                {loading ? (
                    <Box sx={{ display: "flex", justifyContent: "center", py: 4 }}>
                        <CircularProgress />
                    </Box>
                ) : (
                    <ScrollableTablePaper sx={{ pb: 2 }}>
                        <Table
                            size="small"
                            sx={{
                                width: "100%",
                                "& .MuiTableCell-head": { fontWeight: 600 },
                            }}
                        >
                            <TableHead>
                                <TableRow>
                                    <TableCell sx={{ width: 40 }} />
                                    <TableCell>Vrsta obaveze</TableCell>
                                    <TableCell>Okidači</TableCell>
                                    <TableCell align="right" />
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {processTypes.map((pt) => (
                                    <>
                                        <TableRow
                                            key={pt.id}
                                            hover
                                            sx={{ cursor: "pointer" }}
                                            onClick={() => this.toggleExpand(pt.id)}
                                        >
                                            <TableCell padding="checkbox">
                                                <IconButton size="small">
                                                    {expandedTypeId === pt.id
                                                        ? <ExpandLessIcon fontSize="small" />
                                                        : <ExpandMoreIcon fontSize="small" />}
                                                </IconButton>
                                            </TableCell>
                                            <TableCell>
                                                <Typography variant="body2" fontWeight={500}>
                                                    {pt.name}
                                                </Typography>
                                                <Typography variant="caption" color="text.secondary">
                                                    {pt.code}
                                                </Typography>
                                            </TableCell>
                                            <TableCell>
                                                <Box sx={{ display: "flex", gap: 0.5, flexWrap: "wrap" }}>
                                                    {pt.templates.length === 0 ? (
                                                        <Typography variant="caption" color="text.disabled">
                                                            Nema okidača
                                                        </Typography>
                                                    ) : (
                                                        pt.templates.map((t) => (
                                                            <Chip
                                                                key={t.id}
                                                                label={triggerLabel(t.trigger)}
                                                                size="small"
                                                                variant="outlined"
                                                            />
                                                        ))
                                                    )}
                                                </Box>
                                            </TableCell>
                                            <TableCell align="right" onClick={(e) => e.stopPropagation()}>
                                                <PermissionGate permission="processes.add_processtemplate">
                                                    <Button
                                                        size="small"
                                                        startIcon={<AddIcon />}
                                                        onClick={() => this.openCreate(pt.id)}
                                                    >
                                                        Dodaj okidač
                                                    </Button>
                                                </PermissionGate>
                                            </TableCell>
                                        </TableRow>

                                        <TableRow key={`${pt.id}-expanded`}>
                                            <TableCell colSpan={4} sx={{ py: 0, borderBottom: expandedTypeId === pt.id ? undefined : "none" }}>
                                                <Collapse in={expandedTypeId === pt.id} unmountOnExit>
                                                    <Box sx={{ py: 1, pl: 6 }}>
                                                        {pt.templates.length === 0 ? (
                                                            <Typography variant="body2" color="text.secondary" sx={{ py: 1 }}>
                                                                Nema definisanih okidača za ovaj tip.
                                                            </Typography>
                                                        ) : (
                                                            <Table size="small">
                                                                <TableHead>
                                                                    <TableRow>
                                                                        <TableCell>Okidač</TableCell>
                                                                        <TableCell>Šablon dokumenta</TableCell>
                                                                        <TableCell>Dokument</TableCell>
                                                                        <TableCell>Mejl</TableCell>
                                                                        <TableCell align="right" />
                                                                    </TableRow>
                                                                </TableHead>
                                                                <TableBody>
                                                                    {pt.templates.map((t) => (
                                                                        <TableRow key={t.id}>
                                                                            <TableCell>
                                                                                {triggerLabel(t.trigger)}
                                                                            </TableCell>
                                                                            <TableCell>
                                                                                {t.document_template
                                                                                    ? (docTemplates.find((d) => d.id === t.document_template)?.name ?? `#${t.document_template}`)
                                                                                    : "—"}
                                                                            </TableCell>
                                                                            <TableCell>
                                                                                {t.generate_document ? "Da" : "Ne"}
                                                                            </TableCell>
                                                                            <TableCell>
                                                                                {t.send_email ? "Da" : "Ne"}
                                                                            </TableCell>
                                                                            <TableCell align="right">
                                                                                <PermissionGate permission="processes.change_processtemplate">
                                                                                    <Tooltip title="Izmeni">
                                                                                        <IconButton
                                                                                            size="small"
                                                                                            onClick={() => this.openEdit(t)}
                                                                                        >
                                                                                            <EditIcon fontSize="small" />
                                                                                        </IconButton>
                                                                                    </Tooltip>
                                                                                </PermissionGate>
                                                                                <PermissionGate permission="processes.delete_processtemplate">
                                                                                    <Tooltip title="Obriši">
                                                                                        <IconButton
                                                                                            size="small"
                                                                                            color="error"
                                                                                            onClick={() => this.confirmDelete(t.id)}
                                                                                        >
                                                                                            <DeleteIcon fontSize="small" />
                                                                                        </IconButton>
                                                                                    </Tooltip>
                                                                                </PermissionGate>
                                                                            </TableCell>
                                                                        </TableRow>
                                                                    ))}
                                                                </TableBody>
                                                            </Table>
                                                        )}
                                                    </Box>
                                                </Collapse>
                                            </TableCell>
                                        </TableRow>
                                    </>
                                ))}
                            </TableBody>
                        </Table>
                    </ScrollableTablePaper>
                )}

                <Dialog open={dialogOpen} onClose={this.closeDialog} maxWidth="md" fullWidth>
                    <DialogTitle>
                        {editingId != null ? "Izmena okidača" : "Novi okidač"}
                    </DialogTitle>
                    <DialogContent>
                        <FormControl fullWidth margin="dense">
                            <InputLabel>Okidač</InputLabel>
                            <Select
                                value={form_trigger}
                                label="Okidač"
                                onChange={(e) => this.setState({ form_trigger: e.target.value })}
                                required
                            >
                                {TRIGGER_OPTIONS.map((opt) => (
                                    <MenuItem key={opt.value} value={opt.value}>
                                        {opt.label}
                                    </MenuItem>
                                ))}
                            </Select>
                        </FormControl>

                        <FormControl fullWidth margin="dense">
                            <InputLabel>Šablon dokumenta</InputLabel>
                            <Select
                                value={form_document_template_id}
                                label="Šablon dokumenta"
                                onChange={(e) => this.setState({ form_document_template_id: e.target.value })}
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
                                onChange={(e) => this.setState({ form_followup_process_type_id: e.target.value })}
                            >
                                <MenuItem value="">—</MenuItem>
                                {processTypes.map((t) => (
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
                                    onChange={(e) => this.setState({ form_generate_document: e.target.checked })}
                                />
                            }
                            label="Generiši dokument"
                            sx={{ mt: 1 }}
                        />

                        <FormControlLabel
                            control={
                                <Switch
                                    checked={form_send_email}
                                    onChange={(e) => this.setState({ form_send_email: e.target.checked })}
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
                                        onChange={(e) => this.setState({ form_email_to_kind: e.target.value })}
                                        required
                                    >
                                        {EMAIL_TO_OPTIONS.map((opt) => (
                                            <MenuItem key={opt.value} value={opt.value}>
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
                                        onChange={(e) => this.setState({ form_custom_email_recipient: e.target.value })}
                                    />
                                )}

                                {form_email_to_kind === "INTERNAL_ROLE" && (
                                    <FormControl fullWidth margin="dense">
                                        <InputLabel>Interna uloga</InputLabel>
                                        <Select
                                            value={form_notification_role_group_id}
                                            label="Interna uloga"
                                            onChange={(e) => this.setState({ form_notification_role_group_id: e.target.value })}
                                        >
                                            <MenuItem value=""><em>Izaberi...</em></MenuItem>
                                            {this.props.roles.map((r) => (
                                                <MenuItem key={r.id} value={String(r.id)}>
                                                    {r.name}
                                                </MenuItem>
                                            ))}
                                        </Select>
                                    </FormControl>
                                )}

                                <TemplateTextField
                                    margin="normal"
                                    label="Naslov mejla"
                                    fullWidth
                                    value={form_email_subject_template}
                                    onChange={(v) => this.setState({ form_email_subject_template: v })}
                                    variables={TEMPLATE_VARIABLES}
                                />
                                <TemplateTextField
                                    margin="normal"
                                    label="Telo mejla"
                                    fullWidth
                                    multiline
                                    minRows={4}
                                    value={form_email_body_template}
                                    onChange={(v) => this.setState({ form_email_body_template: v })}
                                    variables={TEMPLATE_VARIABLES}
                                />
                            </>
                        )}
                    </DialogContent>
                    <DialogActions>
                        <Button onClick={this.closeDialog}>Odustani</Button>
                        <Button onClick={this.handleSave} variant="contained" disabled={!form_trigger}>
                            Sačuvaj
                        </Button>
                    </DialogActions>
                </Dialog>

                <Dialog open={deleteConfirmId != null} onClose={this.cancelDelete}>
                    <DialogTitle>Obriši okidač?</DialogTitle>
                    <DialogActions>
                        <Button onClick={this.cancelDelete}>Ne</Button>
                        <Button onClick={this.doDelete} color="error" variant="contained">
                            Da, obriši
                        </Button>
                    </DialogActions>
                </Dialog>
            </Box>
        );
    }
}

const mapStateToProps = (state: RootState): StateProps => ({
    processTypes: state.processes.processTypes,
    typesLoading: state.processes.processTypesStatus === "loading",
    docTemplates: state.processes.processDocTemplates,
    docTemplatesLoading: state.processes.processDocTemplatesStatus === "loading",
    roles: state.auth.roles,
});

const mapDispatchToProps = (dispatch: AppDispatch): DispatchProps => ({
    setLastPath: (path: string) => dispatch(setLastPath(path)),
    loadRoles: () => { void dispatch(loadRoles()); },
    ensureProcessTypes: () => { void dispatch(ensureProcessTypes()); },
    reloadProcessTypes: () => { void dispatch(fetchProcessTypes()); },
    ensureProcessDocTemplates: () => { void dispatch(ensureProcessDocTemplates()); },
    addTemplate: (payload: Partial<ProcessTemplate>) =>
        dispatch(addProcessTemplate(payload)) as unknown as Promise<unknown>,
    saveTemplate: (args: { id: number; payload: Partial<ProcessTemplate> }) =>
        dispatch(saveProcessTemplate(args)) as unknown as Promise<unknown>,
    removeTemplate: (id: number) =>
        dispatch(removeProcessTemplate(id)) as unknown as Promise<unknown>,
});

export default connect(mapStateToProps, mapDispatchToProps)(ProcessTemplatesListPageInner);
