import { Component, createRef } from "react";
import { connect } from "react-redux";

import {
    Box,
    Paper,
    Table,
    TableHead,
    TableRow,
    TableCell,
    TableBody,
    IconButton,
    Button,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    TextField,
    FormControl,
    InputLabel,
    Select,
    MenuItem,
    Typography,
} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import EditIcon from "@mui/icons-material/Edit";
import UploadFileIcon from "@mui/icons-material/UploadFile";
import DownloadIcon from "@mui/icons-material/Download";

import { PermissionGate } from "../components/PermissionGate";
import DateTextFieldWithPicker from "../components/DateTextFieldWithPicker";
import {
    fetchDocuments,
    fetchDocumentCategories,
    createDocument,
    updateDocument,
} from "../store/documentsSlice";
import { setLastPath } from "../store/locationSlice";
import { DateToString, StringToDate, formatDateTimeISO } from "../utils/date";

import type { RootState, AppDispatch } from "../store";
import type { DocumentFile } from "../types/documents";
import type {
    DocumentsListPageDispatchProps,
    DocumentsListPageProps,
    DocumentsListPageState,
    DocumentsListPageStateProps,
} from "../types/documentPages";

class DocumentsListPage extends Component<
    DocumentsListPageProps,
    DocumentsListPageState
> {
    fileInputRef = createRef<HTMLInputElement>();

    state: DocumentsListPageState = {
        dialogOpen: false,
        editingDoc: null,
        category_id: "",
        title: "",
        file: null,
        valid_from: "",
        valid_until: "",
        version: "",
        language: "",
    };

    componentDidMount(): void {
        this.props.fetchDocuments();
        this.props.fetchDocumentCategories();
        this.props.setLastPath("/documents");
    }

    openCreate = (): void => {
        this.setState((prev) => ({
            ...prev,
            dialogOpen: true,
            editingDoc: null,
            category_id: this.props.categories[0]?.id ?? "",
            title: "",
            file: null,
            valid_from: "",
            valid_until: "",
            version: "",
            language: "",
        }));
    };

    openEdit = (doc: DocumentFile): void => {
        this.setState((prev) => ({
            ...prev,
            dialogOpen: true,
            editingDoc: doc,
            category_id:
                typeof doc.category === "object"
                    ? doc.category.id
                    : ((doc as { category_id?: number }).category_id ?? ""),
            title: doc.title,
            file: null,
            valid_from: doc.valid_from
                ? DateToString(new Date(doc.valid_from))
                : "",
            valid_until: doc.valid_until
                ? DateToString(new Date(doc.valid_until))
                : "",
            version: doc.version ?? "",
            language: doc.language ?? "",
        }));
    };

    closeDialog = (): void => {
        this.setState((prev) => ({
            ...prev,
            dialogOpen: false,
            editingDoc: null,
            category_id: "",
            title: "",
            file: null,
            valid_from: "",
            valid_until: "",
            version: "",
            language: "",
        }));
    };

    handleSave = (): void => {
        const {
            editingDoc,
            category_id,
            title,
            file,
            valid_from,
            valid_until,
            version,
            language,
        } = this.state;
        if (!title.trim()) return;
        const catId = category_id === "" ? undefined : Number(category_id);
        const toIso = (val: string): string | undefined => {
            const d = StringToDate(val);
            if (!d) return undefined;
            const y = d.getFullYear();
            const m = (d.getMonth() + 1).toString().padStart(2, "0");
            const day = d.getDate().toString().padStart(2, "0");
            return `${y}-${m}-${day}`;
        };
        const validFromIso = toIso(valid_from);
        const validUntilIso = toIso(valid_until);
        if (editingDoc != null) {
            this.props.updateDocument({
                id: editingDoc.id,
                category_id: catId,
                title: title.trim(),
                file: file ?? undefined,
                valid_from: validFromIso,
                valid_until: validUntilIso,
                version: version || undefined,
                language: language || undefined,
            });
        } else {
            if (!file || catId == null) return;
            this.props.createDocument({
                category_id: catId,
                title: title.trim(),
                file,
                valid_from: validFromIso,
                valid_until: validUntilIso,
                version: version || undefined,
                language: language || undefined,
            });
        }
        this.closeDialog();
    };

    render() {
        const { documents, categories, error } = this.props;
        const list = Array.isArray(documents) ? documents : [];
        const {
            dialogOpen,
            editingDoc,
            category_id,
            title,
            file,
            valid_from,
            valid_until,
            version,
            language,
        } = this.state;
        const categoryList = Array.isArray(categories) ? categories : [];

        return (
            <Box>
                {error && (
                    <Typography color="error" sx={{ mb: 2 }}>
                        {error}
                    </Typography>
                )}
                <Box
                    sx={{ display: "flex", justifyContent: "flex-end", mb: 2 }}
                >
                    <PermissionGate permission="documents.add_documentfile">
                        <Button
                            variant="contained"
                            startIcon={<AddIcon />}
                            onClick={this.openCreate}
                        >
                            Dodaj dokument
                        </Button>
                    </PermissionGate>
                </Box>
                <Paper sx={{ overflowX: "auto" }}>
                    <Table sx={{ minWidth: 400 }}>
                        <TableHead>
                            <TableRow>
                                <TableCell>Naziv</TableCell>
                                <TableCell>Kategorija</TableCell>
                                <TableCell>Datum učitavanja</TableCell>
                                <TableCell>Preuzmi</TableCell>
                                <TableCell align="right">Akcije</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {list.map((doc) => (
                                <TableRow key={doc.id}>
                                    <TableCell>{doc.title}</TableCell>
                                    <TableCell>
                                        {typeof doc.category === "object"
                                            ? (doc.category?.name ?? "—")
                                            : "—"}
                                    </TableCell>
                                    <TableCell>
                                        {formatDateTimeISO(doc.uploaded_at)}
                                    </TableCell>
                                    <TableCell>
                                        {doc.file ? (
                                            <Button
                                                component="a"
                                                href={doc.file}
                                                download
                                                target="_blank"
                                                rel="noopener"
                                                size="small"
                                                startIcon={<DownloadIcon />}
                                            >
                                                Preuzmi
                                            </Button>
                                        ) : (
                                            "—"
                                        )}
                                    </TableCell>
                                    <TableCell align="right">
                                        <PermissionGate permission="documents.change_documentfile">
                                            <IconButton
                                                size="small"
                                                aria-label="izmeni"
                                                onClick={() =>
                                                    this.openEdit(doc)
                                                }
                                            >
                                                <EditIcon />
                                            </IconButton>
                                        </PermissionGate>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </Paper>

                <Dialog
                    open={dialogOpen}
                    onClose={this.closeDialog}
                    maxWidth="sm"
                    fullWidth
                >
                    <DialogTitle>
                        {editingDoc != null
                            ? "Izmena dokumenta"
                            : "Novi dokument"}
                    </DialogTitle>
                    <DialogContent>
                        <FormControl
                            fullWidth
                            margin="dense"
                            required={editingDoc == null}
                        >
                            <InputLabel>Kategorija</InputLabel>
                            <Select
                                value={category_id}
                                onChange={(e) =>
                                    this.setState((prev) => ({
                                        ...prev,
                                        category_id: e.target.value as
                                            | number
                                            | "",
                                    }))
                                }
                                label="Kategorija"
                            >
                                {categoryList.map((c) => (
                                    <MenuItem key={c.id} value={c.id}>
                                        {c.name}
                                    </MenuItem>
                                ))}
                            </Select>
                        </FormControl>
                        <TextField
                            margin="dense"
                            label="Naziv"
                            fullWidth
                            required
                            value={title}
                            onChange={(e) =>
                                this.setState((prev) => ({
                                    ...prev,
                                    title: e.target.value,
                                }))
                            }
                        />
                        <Typography
                            variant="body2"
                            color="text.secondary"
                            sx={{ mt: 1.5, mb: 0.5 }}
                        >
                            Fajl dokumenta
                            {editingDoc == null && (
                                <Typography component="span" color="error">
                                    {" "}
                                    *
                                </Typography>
                            )}
                        </Typography>
                        {editingDoc != null && editingDoc.file && (
                            <Box sx={{ mb: 1.5 }}>
                                <Button
                                    component="a"
                                    href={editingDoc.file}
                                    download
                                    variant="outlined"
                                    size="small"
                                    startIcon={<DownloadIcon />}
                                >
                                    Preuzmi trenutni fajl
                                </Button>
                            </Box>
                        )}
                        <Box
                            onClick={() => this.fileInputRef.current?.click()}
                            onDragOver={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                            }}
                            onDrop={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                const f = e.dataTransfer.files?.[0];
                                if (f)
                                    this.setState((prev) => ({
                                        ...prev,
                                        file: f,
                                    }));
                            }}
                            sx={{
                                border: "2px dashed",
                                borderColor: file ? "primary.main" : "divider",
                                borderRadius: 2,
                                p: 2,
                                textAlign: "center",
                                cursor: "pointer",
                                bgcolor: file
                                    ? "action.hover"
                                    : "action.selected",
                                "&:hover": { bgcolor: "action.hover" },
                            }}
                        >
                            <input
                                ref={this.fileInputRef}
                                type="file"
                                accept=".pdf,.doc,.docx,application/pdf"
                                style={{ display: "none" }}
                                onChange={(e) => {
                                    const f = e.target.files?.[0];
                                    this.setState((prev) => ({
                                        ...prev,
                                        file: f ?? null,
                                    }));
                                }}
                            />
                            {file ? (
                                <Typography variant="body2">
                                    <UploadFileIcon
                                        sx={{
                                            verticalAlign: "middle",
                                            mr: 0.5,
                                        }}
                                    />
                                    {file.name} ({(file.size / 1024).toFixed(1)}{" "}
                                    KB)
                                </Typography>
                            ) : (
                                <Typography
                                    variant="body2"
                                    color="text.secondary"
                                >
                                    Klikni ili prevuci fajl ovde (PDF, DOC,
                                    DOCX)
                                </Typography>
                            )}
                            {editingDoc != null && (
                                <Typography
                                    variant="caption"
                                    display="block"
                                    color="text.secondary"
                                    sx={{ mt: 0.5 }}
                                >
                                    Ostavite prazno da ne menjate fajl
                                </Typography>
                            )}
                        </Box>
                        <DateTextFieldWithPicker
                            label="Važi od (datum)"
                            value={valid_from}
                            onChange={(newValue) =>
                                this.setState((prev) => ({
                                    ...prev,
                                    valid_from: newValue,
                                }))
                            }
                        />
                        <DateTextFieldWithPicker
                            label="Važi do (datum)"
                            value={valid_until}
                            onChange={(newValue) =>
                                this.setState((prev) => ({
                                    ...prev,
                                    valid_until: newValue,
                                }))
                            }
                        />
                        <TextField
                            margin="dense"
                            label="Verzija"
                            fullWidth
                            value={version}
                            onChange={(e) =>
                                this.setState((prev) => ({
                                    ...prev,
                                    version: e.target.value,
                                }))
                            }
                        />
                        <TextField
                            margin="dense"
                            label="Jezik"
                            fullWidth
                            value={language}
                            onChange={(e) =>
                                this.setState((prev) => ({
                                    ...prev,
                                    language: e.target.value,
                                }))
                            }
                        />
                    </DialogContent>
                    <DialogActions>
                        <Button onClick={this.closeDialog}>Odustani</Button>
                        <Button
                            onClick={this.handleSave}
                            variant="contained"
                            disabled={
                                !title.trim() ||
                                (editingDoc == null &&
                                    (category_id === "" || file == null))
                            }
                        >
                            {editingDoc != null ? "Sačuvaj" : "Dodaj"}
                        </Button>
                    </DialogActions>
                </Dialog>
            </Box>
        );
    }
}

const mapStateToProps = (state: RootState): DocumentsListPageStateProps => ({
    documents: state.documents.documents,
    categories: state.documents.categories,
    error: state.documents.error,
});

const mapDispatchToProps = (
    dispatch: AppDispatch,
): DocumentsListPageDispatchProps => ({
    fetchDocuments: () => dispatch(fetchDocuments()),
    fetchDocumentCategories: () => dispatch(fetchDocumentCategories()),
    createDocument: (p) => dispatch(createDocument(p)),
    updateDocument: (p) => dispatch(updateDocument(p)),
    setLastPath: (path) => dispatch(setLastPath(path)),
});

export default connect(mapStateToProps, mapDispatchToProps)(DocumentsListPage);
