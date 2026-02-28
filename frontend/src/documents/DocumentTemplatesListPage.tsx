import { Component, createRef } from "react";
import {
    Box,
    Paper,
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
    TextField,
    Button,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    CircularProgress,
    Alert,
    RadioGroup,
    FormControlLabel,
    Radio,
    List,
    ListItem,
    ListItemText,
    Chip,
} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";

import type { DocumentCategory, DocumentFile } from "../types/documents";
import {
    getDocumentCategories,
    getDocumentTemplates,
    getDocumentFiles,
    createDocumentTemplateFromDocument,
    createDocumentTemplateFromUpload,
    updateDocumentTemplate,
    deleteDocumentTemplate,
    type DocumentTemplate,
} from "../api/documents";
import { PermissionGate } from "../components/PermissionGate";
import { connect } from "react-redux";
import type { AppDispatch, RootState } from "../store";
import { setLastPath } from "../store/locationSlice";

interface DispatchProps {
    setLastPath?: (path: string) => void;
}

type Props = DispatchProps;

type ContextType = DocumentTemplate["context_type"] | "";

interface TemplateField {
    key: string;
    label: string;
    snippet: string;
}

const EMPLOYEE_FIELDS: TemplateField[] = [
    {
        key: "employee.first_name",
        label: "Ime zaposlenog",
        snippet: "{{ employee.first_name }}",
    },
    {
        key: "employee.last_name",
        label: "Prezime zaposlenog",
        snippet: "{{ employee.last_name }}",
    },
    {
        key: "employee.full_name",
        label: "Ime i prezime",
        snippet: "{{ employee.first_name }} {{ employee.last_name }}",
    },
    {
        key: "employee.org_unit",
        label: "Organizaciona jedinica",
        snippet: "{{ employee.org_unit }}",
    },
    {
        key: "employee.position",
        label: "Pozicija",
        snippet: "{{ employee.position }}",
    },
    {
        key: "employee.email",
        label: "Email zaposlenog",
        snippet: "{{ employee.email }}",
    },
];

const EQUIPMENT_FIELDS: TemplateField[] = [
    {
        key: "equipment.name",
        label: "Naziv opreme/mašine",
        snippet: "{{ equipment.name }}",
    },
    {
        key: "equipment.category",
        label: "Kategorija opreme",
        snippet: "{{ equipment.category }}",
    },
    {
        key: "equipment.inventory_number",
        label: "Inventarski broj",
        snippet: "{{ equipment.inventory_number }}",
    },
    {
        key: "equipment.location",
        label: "Lokacija opreme",
        snippet: "{{ equipment.location }}",
    },
];

const CLIENT_FIELDS: TemplateField[] = [
    { key: "client.name", label: "Naziv firme", snippet: "{{ client.name }}" },
    { key: "client.pib", label: "PIB", snippet: "{{ client.pib }}" },
    {
        key: "client.address",
        label: "Adresa firme",
        snippet: "{{ client.address }}",
    },
    {
        key: "client.phone",
        label: "Telefon firme",
        snippet: "{{ client.phone }}",
    },
    {
        key: "client.email",
        label: "Email firme",
        snippet: "{{ client.email }}",
    },
    {
        key: "client.website",
        label: "Web sajt firme",
        snippet: "{{ client.website }}",
    },
];

function fieldsForContext(context: ContextType): TemplateField[] {
    if (context === "EMPLOYEE") return EMPLOYEE_FIELDS;
    if (context === "EQUIPMENT") return EQUIPMENT_FIELDS;
    if (context === "CLIENT_COMPANY") return CLIENT_FIELDS;
    if (context === "MIXED") {
        return [...EMPLOYEE_FIELDS, ...EQUIPMENT_FIELDS, ...CLIENT_FIELDS];
    }
    return [...EMPLOYEE_FIELDS, ...EQUIPMENT_FIELDS];
}

interface State {
    items: DocumentTemplate[];
    categories: DocumentCategory[];
    documents: DocumentFile[];
    loading: boolean;
    error: string | null;
    dialogOpen: boolean;
    deleteConfirmId: number | null;
    editingId: number | null;
    name: string;
    description: string;
    category_id: string;
    context_type: ContextType;
    template_body: string;
    create_mode: "FROM_DOCUMENT" | "FROM_FILE";
    document_file_id: string;
    upload_file: File | null;
    filter_context_type: ContextType;
}

const CONTEXT_OPTIONS: { value: ContextType; label: string }[] = [
    { value: "", label: "Svi konteksti" },
    { value: "EMPLOYEE", label: "Zaposleni" },
    { value: "EQUIPMENT", label: "Oprema" },
    { value: "CLIENT_COMPANY", label: "Firma" },
    { value: "MIXED", label: "Mešovito" },
];

class DocumentTemplatesListPageInner extends Component<Props, State> {
    state: State = {
        items: [],
        categories: [],
        documents: [],
        loading: true,
        error: null,
        dialogOpen: false,
        deleteConfirmId: null,
        editingId: null,
        name: "",
        description: "",
        category_id: "",
        context_type: "",
        template_body: "",
        create_mode: "FROM_DOCUMENT",
        document_file_id: "",
        upload_file: null,
        filter_context_type: "",
    };

    private templateBodyRef = createRef<HTMLTextAreaElement>();

    componentDidMount(): void {
        this.props.setLastPath?.("/documents/templates");
        this.load();
    }

    load = (): void => {
        this.setState({ loading: true, error: null });
        Promise.all([
            getDocumentCategories(),
            getDocumentTemplates(),
            getDocumentFiles(),
        ])
            .then(([categories, templates, documents]) => {
                this.setState({
                    categories: Array.isArray(categories) ? categories : [],
                    items: Array.isArray(templates) ? templates : [],
                    documents: Array.isArray(documents) ? documents : [],
                    loading: false,
                    error: null,
                });
            })
            .catch(() =>
                this.setState({
                    loading: false,
                    error: "Greška pri učitavanju šablona dokumenata.",
                }),
            );
    };

    openCreate = (): void => {
        this.setState({
            dialogOpen: true,
            editingId: null,
            name: "",
            description: "",
            category_id: "",
            context_type: "EMPLOYEE",
            template_body: "",
            create_mode: "FROM_DOCUMENT",
            document_file_id: "",
            upload_file: null,
        });
    };

    openEdit = (tpl: DocumentTemplate): void => {
        this.setState({
            dialogOpen: true,
            editingId: tpl.id,
            name: tpl.name ?? "",
            description: tpl.description ?? "",
            category_id:
                tpl.category?.id != null ? String(tpl.category.id) : "",
            context_type: tpl.context_type ?? "",
            template_body: tpl.template_body ?? "",
            create_mode: "FROM_DOCUMENT",
            document_file_id: "",
            upload_file: null,
        });
    };

    closeDialog = (): void => {
        this.setState({
            dialogOpen: false,
            editingId: null,
            name: "",
            description: "",
            category_id: "",
            context_type: "",
            template_body: "",
            create_mode: "FROM_DOCUMENT",
            document_file_id: "",
            upload_file: null,
        });
    };

    handleSave = (): void => {
        const {
            editingId,
            name,
            description,
            category_id,
            context_type,
            template_body,
            document_file_id,
            create_mode,
            upload_file,
        } = this.state;
        if (!name.trim() || !context_type) return;

        const categoryIdNum = category_id ? Number(category_id) : null;

        let op: Promise<unknown>;
        if (editingId != null) {
            const payload = {
                name: name.trim(),
                description: description.trim() || undefined,
                context_type: context_type as DocumentTemplate["context_type"],
                category_id: categoryIdNum,
                template_body: template_body || "",
            };
            op = updateDocumentTemplate(editingId, payload);
        } else {
            if (create_mode === "FROM_DOCUMENT") {
                if (!document_file_id) return;
                const payload = {
                    name: name.trim(),
                    description: description.trim() || undefined,
                    context_type:
                        context_type as DocumentTemplate["context_type"],
                    category_id: categoryIdNum,
                    document_file_id: Number(document_file_id),
                };
                op = createDocumentTemplateFromDocument(payload);
            } else {
                if (!upload_file) return;
                const payload = {
                    name: name.trim(),
                    description: description.trim() || undefined,
                    context_type:
                        context_type as DocumentTemplate["context_type"],
                    category_id: categoryIdNum,
                    file: upload_file,
                };
                op = createDocumentTemplateFromUpload(payload);
            }
        }

        op.then(() => {
            this.closeDialog();
            this.load();
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
        deleteDocumentTemplate(deleteConfirmId).then(() => {
            this.setState({ deleteConfirmId: null });
            this.load();
        });
    };

    render(): React.ReactNode {
        const {
            items,
            categories,
            loading,
            error,
            dialogOpen,
            deleteConfirmId,
            editingId,
            name,
            description,
            category_id,
            context_type,
            template_body,
            document_file_id,
            create_mode,
            upload_file,
            filter_context_type,
        } = this.state;

        const filteredItems = filter_context_type
            ? items.filter((i) => i.context_type === filter_context_type)
            : items;

        const availableFields: TemplateField[] = fieldsForContext(context_type);

        return (
            <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
                <Typography variant="h6">Šabloni dokumenata</Typography>

                <Box
                    sx={{
                        display: "flex",
                        flexWrap: "wrap",
                        gap: 2,
                        alignItems: "center",
                    }}
                >
                    <FormControl size="small" sx={{ minWidth: 220 }}>
                        <InputLabel>Kontekst</InputLabel>
                        <Select
                            value={filter_context_type}
                            label="Kontekst"
                            onChange={(e) =>
                                this.setState({
                                    filter_context_type: e.target
                                        .value as ContextType,
                                })
                            }
                        >
                            {CONTEXT_OPTIONS.map((opt) => (
                                <MenuItem
                                    key={opt.value || "ALL"}
                                    value={opt.value}
                                >
                                    {opt.label}
                                </MenuItem>
                            ))}
                        </Select>
                    </FormControl>
                    <Box sx={{ flex: 1 }} />
                    <PermissionGate permission="documents.add_documenttemplate">
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
                    <Paper sx={{ overflow: "auto" }}>
                        <Table size="small">
                            <TableHead>
                                <TableRow>
                                    <TableCell>Naziv</TableCell>
                                    <TableCell>Kontekst</TableCell>
                                    <TableCell>Kategorija</TableCell>
                                    <TableCell>Opis</TableCell>
                                    <TableCell align="right">Akcije</TableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {filteredItems.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={5} align="center">
                                            Nema šablona.
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    filteredItems.map((tpl) => (
                                        <TableRow key={tpl.id}>
                                            <TableCell>{tpl.name}</TableCell>
                                            <TableCell>
                                                {CONTEXT_OPTIONS.find(
                                                    (c) =>
                                                        c.value ===
                                                        tpl.context_type,
                                                )?.label ?? tpl.context_type}
                                            </TableCell>
                                            <TableCell>
                                                {tpl.category?.name ?? "—"}
                                            </TableCell>
                                            <TableCell>
                                                {tpl.description ?? "—"}
                                            </TableCell>
                                            <TableCell align="right">
                                                <PermissionGate permission="documents.change_documenttemplate">
                                                    <Button
                                                        size="small"
                                                        startIcon={<EditIcon />}
                                                        onClick={() =>
                                                            this.openEdit(tpl)
                                                        }
                                                        sx={{ mr: 1 }}
                                                    >
                                                        Izmeni
                                                    </Button>
                                                </PermissionGate>
                                                <PermissionGate permission="documents.delete_documenttemplate">
                                                    <Button
                                                        size="small"
                                                        color="error"
                                                        startIcon={
                                                            <DeleteIcon />
                                                        }
                                                        onClick={() =>
                                                            this.confirmDelete(
                                                                tpl.id,
                                                            )
                                                        }
                                                    >
                                                        Obriši
                                                    </Button>
                                                </PermissionGate>
                                            </TableCell>
                                        </TableRow>
                                    ))
                                )}
                            </TableBody>
                        </Table>
                    </Paper>
                )}

                <Dialog
                    open={dialogOpen}
                    onClose={this.closeDialog}
                    maxWidth="md"
                    fullWidth
                >
                    <DialogTitle>
                        {editingId != null
                            ? "Izmena šablona dokumenta"
                            : "Novi šablon dokumenta"}
                    </DialogTitle>
                    <DialogContent>
                        <TextField
                            margin="dense"
                            label="Naziv"
                            fullWidth
                            required
                            value={name}
                            onChange={(e) =>
                                this.setState({ name: e.target.value })
                            }
                        />
                        <TextField
                            margin="dense"
                            label="Opis"
                            fullWidth
                            multiline
                            minRows={2}
                            value={description}
                            onChange={(e) =>
                                this.setState({ description: e.target.value })
                            }
                        />
                        <FormControl fullWidth margin="dense">
                            <InputLabel>Kontekst</InputLabel>
                            <Select
                                value={context_type}
                                label="Kontekst"
                                onChange={(e) =>
                                    this.setState({
                                        context_type: e.target
                                            .value as ContextType,
                                    })
                                }
                                required
                            >
                                {CONTEXT_OPTIONS.filter(
                                    (c) => c.value !== "",
                                ).map((opt) => (
                                    <MenuItem key={opt.value} value={opt.value}>
                                        {opt.label}
                                    </MenuItem>
                                ))}
                            </Select>
                        </FormControl>
                        <FormControl fullWidth margin="dense">
                            <InputLabel>Kategorija</InputLabel>
                            <Select
                                value={category_id}
                                label="Kategorija"
                                onChange={(e) =>
                                    this.setState({
                                        category_id: e.target.value as string,
                                    })
                                }
                            >
                                <MenuItem value="">—</MenuItem>
                                {categories.map((c) => (
                                    <MenuItem key={c.id} value={String(c.id)}>
                                        {c.name}
                                    </MenuItem>
                                ))}
                            </Select>
                        </FormControl>
                        {editingId == null ? (
                            <>
                                <Box sx={{ mt: 2 }}>
                                    <Typography
                                        variant="subtitle2"
                                        gutterBottom
                                    >
                                        Način kreiranja šablona
                                    </Typography>
                                    <RadioGroup
                                        row
                                        value={create_mode}
                                        onChange={(e) =>
                                            this.setState({
                                                create_mode: e.target.value as
                                                    | "FROM_DOCUMENT"
                                                    | "FROM_FILE",
                                                document_file_id: "",
                                                upload_file: null,
                                            })
                                        }
                                    >
                                        <FormControlLabel
                                            value="FROM_DOCUMENT"
                                            control={<Radio />}
                                            label="Kreiraj iz postojećeg dokumenta"
                                        />
                                        <FormControlLabel
                                            value="FROM_FILE"
                                            control={<Radio />}
                                            label="Kreiraj iz fajla (upload)"
                                        />
                                    </RadioGroup>
                                </Box>

                                {create_mode === "FROM_DOCUMENT" ? (
                                    <FormControl fullWidth margin="dense">
                                        <InputLabel>Dokument</InputLabel>
                                        <Select
                                            value={document_file_id}
                                            label="Dokument"
                                            onChange={(e) =>
                                                this.setState({
                                                    document_file_id: e.target
                                                        .value as string,
                                                })
                                            }
                                        >
                                            <MenuItem value="">—</MenuItem>
                                            {this.state.documents.map(
                                                (d: DocumentFile) => (
                                                    <MenuItem
                                                        key={d.id}
                                                        value={String(d.id)}
                                                    >
                                                        {d.title}
                                                    </MenuItem>
                                                ),
                                            )}
                                        </Select>
                                        <Typography
                                            variant="caption"
                                            color="text.secondary"
                                            sx={{ mt: 0.5, display: "block" }}
                                        >
                                            Fajl se otprema na ekranu
                                            “Dokumenti”. Ovde ga samo biramo kao
                                            izvor za šablon.
                                        </Typography>
                                    </FormControl>
                                ) : (
                                    <Box sx={{ mt: 2 }}>
                                        <Typography
                                            variant="subtitle2"
                                            gutterBottom
                                        >
                                            Fajl šablona
                                        </Typography>
                                        <input
                                            type="file"
                                            onChange={(e) => {
                                                const file =
                                                    e.target.files?.[0] ?? null;
                                                this.setState({
                                                    upload_file: file,
                                                });
                                            }}
                                        />
                                        {upload_file && (
                                            <Typography
                                                variant="caption"
                                                color="text.secondary"
                                                sx={{
                                                    display: "block",
                                                    mt: 0.5,
                                                }}
                                            >
                                                Izabrani fajl:{" "}
                                                {upload_file.name}
                                            </Typography>
                                        )}
                                    </Box>
                                )}
                            </>
                        ) : (
                            <>
                                <TextField
                                    margin="dense"
                                    label="Telo šablona (Jinja2 / tekst)"
                                    fullWidth
                                    multiline
                                    minRows={6}
                                    value={template_body}
                                    inputRef={this.templateBodyRef}
                                    onChange={(e) =>
                                        this.setState({
                                            template_body: e.target.value,
                                        })
                                    }
                                />
                                <Box sx={{ mt: 1.5 }}>
                                    <Typography
                                        variant="subtitle2"
                                        gutterBottom
                                    >
                                        Polja iz sistema (klikni da ubaciš u
                                        tekst)
                                    </Typography>
                                    <Box
                                        sx={{
                                            display: "flex",
                                            flexWrap: "wrap",
                                            gap: 1,
                                            mb: 1,
                                        }}
                                    >
                                        {availableFields.map((f) => (
                                            <Chip
                                                key={f.key}
                                                label={f.label}
                                                size="small"
                                                variant="outlined"
                                                onClick={() => {
                                                    const textarea =
                                                        this.templateBodyRef
                                                            .current;
                                                    const current =
                                                        this.state
                                                            .template_body ??
                                                        "";
                                                    if (!textarea) {
                                                        this.setState({
                                                            template_body:
                                                                (current
                                                                    ? current +
                                                                      " "
                                                                    : "") +
                                                                f.snippet,
                                                        });
                                                        return;
                                                    }
                                                    const start =
                                                        textarea.selectionStart ??
                                                        current.length;
                                                    const end =
                                                        textarea.selectionEnd ??
                                                        start;
                                                    const before =
                                                        current.slice(0, start);
                                                    const after =
                                                        current.slice(end);
                                                    const next = `${before}${f.snippet}${after}`;
                                                    this.setState(
                                                        { template_body: next },
                                                        () => {
                                                            const pos =
                                                                start +
                                                                f.snippet
                                                                    .length;
                                                            textarea.focus();
                                                            textarea.setSelectionRange(
                                                                pos,
                                                                pos,
                                                            );
                                                        },
                                                    );
                                                }}
                                            />
                                        ))}
                                    </Box>
                                </Box>
                                {template_body.trim() && (
                                    <Box sx={{ mt: 2 }}>
                                        <Typography
                                            variant="subtitle2"
                                            gutterBottom
                                        >
                                            Detektovani placeholder-i (Jinja2)
                                        </Typography>
                                        <List dense>
                                            {Array.from(
                                                new Set(
                                                    Array.from(
                                                        template_body.matchAll(
                                                            /\{\{\s*([^}]+?)\s*\}\}/g,
                                                        ),
                                                    ).map((m) => m[1].trim()),
                                                ),
                                            ).map((ph) => (
                                                <ListItem
                                                    key={ph}
                                                    sx={{ py: 0.25 }}
                                                >
                                                    <ListItemText
                                                        primary={`{{ ${ph} }}`}
                                                    />
                                                </ListItem>
                                            ))}
                                        </List>
                                        <Typography
                                            variant="caption"
                                            color="text.secondary"
                                        >
                                            Ovo je samo pregled placeholder-a u
                                            tekstu. Mapiranje na polja iz
                                            sistema rešavaš kroz sam Jinja2
                                            izraz (npr. &#123;&#123;
                                            employee.first_name &#125;&#125;).
                                        </Typography>
                                    </Box>
                                )}
                            </>
                        )}
                    </DialogContent>
                    <DialogActions>
                        <Button onClick={this.closeDialog}>Odustani</Button>
                        <Button
                            onClick={this.handleSave}
                            variant="contained"
                            disabled={!name.trim() || !context_type}
                        >
                            Sačuvaj
                        </Button>
                    </DialogActions>
                </Dialog>

                <Dialog
                    open={deleteConfirmId != null}
                    onClose={this.cancelDelete}
                >
                    <DialogTitle>Obriši šablon?</DialogTitle>
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

const Connected = connect<
    null,
    DispatchProps,
    Record<string, never>,
    RootState
>(null, (dispatch: AppDispatch) => ({
    setLastPath: (path: string) => dispatch(setLastPath(path)),
}))(DocumentTemplatesListPageInner);

export default function DocumentTemplatesListPage(): React.ReactElement {
    return <Connected />;
}
