import { Component, useState, type MouseEvent } from "react";
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
    Menu,
} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";
import BuildIcon from "@mui/icons-material/Build";
import MoreVertIcon from "@mui/icons-material/MoreVert";
import CloudUploadIcon from "@mui/icons-material/CloudUpload";
import { enqueueSnackbar } from "notistack";

import TemplateStructureEditorDialog from "./TemplateStructureEditorDialog";
import { PermissionGate } from "../components/PermissionGate";
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
import { setLastPath } from "../store/locationSlice";

import type { AppDispatch, RootState } from "../store";
import type { DocumentFile } from "../types/documents";
import type {
    DocumentTemplatesListContextType,
    DocumentTemplatesListPageDispatchProps,
    DocumentTemplatesListPageProps,
    DocumentTemplatesListPageState,
    DocumentTemplatesListPageStateProps,
} from "../types/documentPages";

const CONTEXT_OPTIONS: {
    value: DocumentTemplatesListContextType;
    label: string;
}[] = [
    { value: "", label: "Svi konteksti" },
    { value: "EMPLOYEE", label: "Zaposleni" },
    { value: "EQUIPMENT", label: "Oprema" },
    { value: "CLIENT_COMPANY", label: "Firma" },
    { value: "MIXED", label: "Mešovito" },
];

class DocumentTemplatesListPageInner extends Component<
    DocumentTemplatesListPageProps,
    DocumentTemplatesListPageState
> {
    state: DocumentTemplatesListPageState = {
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
        create_mode: "FROM_DOCUMENT",
        document_file_id: "",
        upload_file: null,
        filter_context_type: "",
    };

    componentDidMount(): void {
        this.props.setLastPath?.("/documents/templates");
        this.load();
    }

    load = (): void => {
        this.setState((prev) => ({ ...prev, loading: true, error: null }));
        Promise.all([
            getDocumentCategories(),
            getDocumentTemplates(),
            getDocumentFiles(),
        ])
            .then(([categories, templates, documents]) => {
                this.setState((prev) => ({
                    ...prev,
                    categories: Array.isArray(categories) ? categories : [],
                    items: Array.isArray(templates) ? templates : [],
                    documents: Array.isArray(documents) ? documents : [],
                    loading: false,
                    error: null,
                }));
            })
            .catch(() =>
                this.setState((prev) => ({
                    ...prev,
                    loading: false,
                    error: "Greška pri učitavanju šablona dokumenata.",
                })),
            );
    };

    openCreate = (): void => {
        this.setState((prev) => ({
            ...prev,
            dialogOpen: true,
            editingId: null,
            name: "",
            description: "",
            category_id: "",
            context_type: "EMPLOYEE",
            create_mode: "FROM_DOCUMENT",
            document_file_id: "",
            upload_file: null,
        }));
    };

    openEdit = (tpl: DocumentTemplate): void => {
        this.setState((prev) => ({
            ...prev,
            dialogOpen: true,
            editingId: tpl.id,
            name: tpl.name ?? "",
            description: tpl.description ?? "",
            category_id:
                tpl.category?.id != null ? String(tpl.category.id) : "",
            context_type: tpl.context_type ?? "",
            create_mode: "FROM_DOCUMENT",
            document_file_id: "",
            upload_file: null,
        }));
    };

    closeDialog = (): void => {
        this.setState((prev) => ({
            ...prev,
            dialogOpen: false,
            editingId: null,
            name: "",
            description: "",
            category_id: "",
            context_type: "",
            create_mode: "FROM_DOCUMENT",
            document_file_id: "",
            upload_file: null,
        }));
    };

    handleSave = (): void => {
        const {
            editingId,
            name,
            description,
            category_id,
            context_type,
            document_file_id,
            create_mode,
            upload_file,
        } = this.state;
        if (!name.trim() || !context_type) return;

        const categoryIdNum = category_id ? Number(category_id) : null;

        let op: Promise<DocumentTemplate>;
        if (editingId != null) {
            const payload = {
                name: name.trim(),
                description: description.trim() || undefined,
                context_type: context_type as DocumentTemplate["context_type"],
                category_id: categoryIdNum,
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
        }).catch((error: unknown) => {
            let responseData: { detail?: string; reason?: string } | undefined;
            if (
                typeof error === "object" &&
                error !== null &&
                "response" in error
            ) {
                const res = (error as { response?: { data?: unknown } })
                    .response;
                const data = res?.data;
                if (data && typeof data === "object") {
                    responseData = data as {
                        detail?: string;
                        reason?: string;
                    };
                }
            }

            let message =
                responseData?.detail || "Greška pri čuvanju šablona dokumenta.";

            if (responseData?.reason === "pdf_no_text") {
                message =
                    "PDF ne sadrži čitljiv tekst (verovatno je sken). Trenutno su podržani samo PDF-ovi sa tekstom.";
            } else if (responseData?.reason === "pdf_read_error") {
                message =
                    "PDF fajl ne može da se obradi. Proveri da li je fajl ispravan ili probaj drugi format.";
            }

            enqueueSnackbar(message, { variant: "error" });
        });
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
        deleteDocumentTemplate(deleteConfirmId).then(() => {
            this.setState((prev) => ({ ...prev, deleteConfirmId: null }));
            this.load();
        });
    };

    render() {
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
            document_file_id,
            create_mode,
            upload_file,
            filter_context_type,
        } = this.state;

        const filteredItems = filter_context_type
            ? items.filter((i) => i.context_type === filter_context_type)
            : items;

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
                                this.setState((prev) => ({
                                    ...prev,
                                    filter_context_type: e.target
                                        .value as DocumentTemplatesListContextType,
                                }))
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
                                                <RowActions
                                                    template={tpl}
                                                    onEdit={() =>
                                                        this.openEdit(tpl)
                                                    }
                                                    onDelete={() =>
                                                        this.confirmDelete(
                                                            tpl.id,
                                                        )
                                                    }
                                                    onTemplateUpdated={(
                                                        updated,
                                                    ) => {
                                                        this.setState(
                                                            (prev) => ({
                                                                items: prev.items.map(
                                                                    (t) =>
                                                                        t.id ===
                                                                        updated.id
                                                                            ? updated
                                                                            : t,
                                                                ),
                                                            }),
                                                        );
                                                    }}
                                                />
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
                                this.setState((prev) => ({
                                    ...prev,
                                    name: e.target.value,
                                }))
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
                                this.setState((prev) => ({
                                    ...prev,
                                    description: e.target.value,
                                }))
                            }
                        />
                        <FormControl fullWidth margin="dense">
                            <InputLabel>Kontekst</InputLabel>
                            <Select
                                value={context_type}
                                label="Kontekst"
                                onChange={(e) =>
                                    this.setState((prev) => ({
                                        ...prev,
                                        context_type: e.target
                                            .value as DocumentTemplatesListContextType,
                                    }))
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
                                    this.setState((prev) => ({
                                        ...prev,
                                        category_id: e.target.value as string,
                                    }))
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
                        {editingId == null && (
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
                                            this.setState((prev) => ({
                                                ...prev,
                                                create_mode: e.target.value as
                                                    | "FROM_DOCUMENT"
                                                    | "FROM_FILE",
                                                document_file_id: "",
                                                upload_file: null,
                                            }))
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
                                                this.setState((prev) => ({
                                                    ...prev,
                                                    document_file_id: e.target
                                                        .value as string,
                                                }))
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
                                        <Box
                                            sx={{
                                                display: "flex",
                                                alignItems: "center",
                                                gap: 1.5,
                                                flexWrap: "wrap",
                                            }}
                                        >
                                            <Button
                                                component="label"
                                                variant="outlined"
                                                startIcon={<CloudUploadIcon />}
                                            >
                                                {upload_file
                                                    ? "Promeni fajl"
                                                    : "Izaberi fajl"}
                                                <input
                                                    type="file"
                                                    hidden
                                                    onChange={(e) => {
                                                        const file =
                                                            e.target
                                                                .files?.[0] ??
                                                            null;
                                                        this.setState(
                                                            (prev) => ({
                                                                ...prev,
                                                                upload_file:
                                                                    file,
                                                            }),
                                                        );
                                                    }}
                                                />
                                            </Button>
                                            <Typography
                                                variant="body2"
                                                color={
                                                    upload_file
                                                        ? "text.primary"
                                                        : "text.secondary"
                                                }
                                            >
                                                {upload_file
                                                    ? upload_file.name
                                                    : "Nijedan fajl nije izabran"}
                                            </Typography>
                                        </Box>
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

function RowActions({
    template,
    onEdit,
    onDelete,
    onTemplateUpdated,
}: {
    template: DocumentTemplate;
    onEdit: () => void;
    onDelete: () => void;
    onTemplateUpdated: (updated: DocumentTemplate) => void;
}) {
    const [menuAnchor, setMenuAnchor] = useState<null | HTMLElement>(null);
    const [structureOpen, setStructureOpen] = useState(false);

    const handleOpenMenu = (event: MouseEvent<HTMLElement>) => {
        setMenuAnchor(event.currentTarget);
    };

    const handleCloseMenu = () => {
        setMenuAnchor(null);
    };

    return (
        <>
            <Button
                size="small"
                onClick={handleOpenMenu}
                startIcon={<MoreVertIcon />}
            >
                Akcije
            </Button>
            <Menu
                anchorEl={menuAnchor}
                open={Boolean(menuAnchor)}
                onClose={handleCloseMenu}
            >
                <PermissionGate permission="documents.change_documenttemplate">
                    <MenuItem
                        onClick={() => {
                            handleCloseMenu();
                            onEdit();
                        }}
                    >
                        <EditIcon fontSize="small" style={{ marginRight: 8 }} />
                        Izmeni
                    </MenuItem>
                    {template.template_file && (
                        <MenuItem
                            onClick={() => {
                                handleCloseMenu();
                                setStructureOpen(true);
                            }}
                        >
                            <BuildIcon
                                fontSize="small"
                                style={{ marginRight: 8 }}
                            />
                            Uredi polja
                        </MenuItem>
                    )}
                </PermissionGate>
                <PermissionGate permission="documents.delete_documenttemplate">
                    <MenuItem
                        onClick={() => {
                            handleCloseMenu();
                            onDelete();
                        }}
                    >
                        <DeleteIcon
                            fontSize="small"
                            style={{ marginRight: 8 }}
                        />
                        Obriši
                    </MenuItem>
                </PermissionGate>
            </Menu>
            {structureOpen && (
                <TemplateStructureEditorDialog
                    open={structureOpen}
                    template={template}
                    onClose={() => setStructureOpen(false)}
                    onSaved={(updated) => {
                        onTemplateUpdated(updated);
                        setStructureOpen(false);
                    }}
                />
            )}
        </>
    );
}

const mapStateToProps = (
    _state: RootState,
): DocumentTemplatesListPageStateProps => ({});

const mapDispatchToProps = (
    dispatch: AppDispatch,
): DocumentTemplatesListPageDispatchProps => ({
    setLastPath: (path: string) => dispatch(setLastPath(path)),
});

export default connect(
    mapStateToProps,
    mapDispatchToProps,
)(DocumentTemplatesListPageInner);
