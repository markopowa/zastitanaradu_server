import { Component } from "react";
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
    Typography,
} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";

import { PermissionGate } from "../components/PermissionGate";
import {
    fetchDocumentCategories,
    createDocumentCategory,
    updateDocumentCategory,
    deleteDocumentCategory,
} from "../store/documentsSlice";
import { setLastPath } from "../store/locationSlice";

import type { RootState, AppDispatch } from "../store";
import type { DocumentCategory } from "../types/documents";
import type {
    DocumentCategoriesListPageDispatchProps,
    DocumentCategoriesListPageProps,
    DocumentCategoriesListPageState,
    DocumentCategoriesListPageStateProps,
} from "../types/documentPages";

class DocumentCategoriesListPage extends Component<
    DocumentCategoriesListPageProps,
    DocumentCategoriesListPageState
> {
    state: DocumentCategoriesListPageState = {
        dialogOpen: false,
        editingId: null,
        name: "",
        description: "",
        deleteConfirmId: null,
    };

    componentDidMount(): void {
        this.props.fetchDocumentCategories();
        this.props.setLastPath("/documents/categories");
    }

    openCreate = (): void => {
        this.setState((prev) => ({
            ...prev,
            dialogOpen: true,
            editingId: null,
            name: "",
            description: "",
        }));
    };

    openEdit = (cat: DocumentCategory): void => {
        this.setState((prev) => ({
            ...prev,
            dialogOpen: true,
            editingId: Number(cat.id),
            name: cat.name,
            description: cat.description ?? "",
        }));
    };

    closeDialog = (): void => {
        this.setState((prev) => ({
            ...prev,
            dialogOpen: false,
            editingId: null,
            name: "",
            description: "",
        }));
    };

    handleSave = (): void => {
        const { name, description, editingId } = this.state;
        if (!name.trim()) return;
        if (editingId != null) {
            this.props.updateDocumentCategory({
                id: editingId,
                name: name.trim(),
                description: description.trim() || undefined,
            });
        } else {
            this.props.createDocumentCategory({
                name: name.trim(),
                description: description.trim() || undefined,
            });
        }
        this.closeDialog();
    };

    confirmDelete = (id: number): void => {
        this.setState((prev) => ({ ...prev, deleteConfirmId: id }));
    };

    cancelDelete = (): void => {
        this.setState((prev) => ({ ...prev, deleteConfirmId: null }));
    };

    doDelete = (): void => {
        const { deleteConfirmId } = this.state;
        if (deleteConfirmId != null) {
            this.props.deleteDocumentCategory(deleteConfirmId);
            this.setState((prev) => ({ ...prev, deleteConfirmId: null }));
        }
    };

    render() {
        const { categories, error } = this.props;
        const list = Array.isArray(categories) ? categories : [];
        const { dialogOpen, editingId, name, description, deleteConfirmId } =
            this.state;

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
                    <PermissionGate permission="documents.add_documentcategory">
                        <Button
                            variant="contained"
                            startIcon={<AddIcon />}
                            onClick={this.openCreate}
                        >
                            Dodaj kategoriju
                        </Button>
                    </PermissionGate>
                </Box>
                <Paper sx={{ overflowX: "auto" }}>
                    <Table sx={{ minWidth: 400 }}>
                        <TableHead>
                            <TableRow>
                                <TableCell>Naziv</TableCell>
                                <TableCell>Opis</TableCell>
                                <TableCell align="right">Akcije</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {list.map((cat) => (
                                <TableRow key={cat.id}>
                                    <TableCell>{cat.name}</TableCell>
                                    <TableCell>
                                        {cat.description ?? "—"}
                                    </TableCell>
                                    <TableCell align="right">
                                        <PermissionGate permission="documents.change_documentcategory">
                                            <IconButton
                                                size="small"
                                                aria-label="izmeni"
                                                onClick={() =>
                                                    this.openEdit(cat)
                                                }
                                            >
                                                <EditIcon />
                                            </IconButton>
                                        </PermissionGate>
                                        <PermissionGate permission="documents.delete_documentcategory">
                                            <IconButton
                                                size="small"
                                                aria-label="obriši"
                                                onClick={() =>
                                                    this.confirmDelete(
                                                        Number(cat.id),
                                                    )
                                                }
                                            >
                                                <DeleteIcon />
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
                        {editingId != null
                            ? "Izmena kategorije"
                            : "Nova kategorija"}
                    </DialogTitle>
                    <DialogContent>
                        <TextField
                            autoFocus
                            margin="dense"
                            label="Naziv"
                            fullWidth
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
                            rows={2}
                            value={description}
                            onChange={(e) =>
                                this.setState((prev) => ({
                                    ...prev,
                                    description: e.target.value,
                                }))
                            }
                        />
                    </DialogContent>
                    <DialogActions>
                        <Button onClick={this.closeDialog}>Odustani</Button>
                        <Button
                            onClick={this.handleSave}
                            variant="contained"
                            disabled={!name.trim()}
                        >
                            {editingId != null ? "Sačuvaj" : "Dodaj"}
                        </Button>
                    </DialogActions>
                </Dialog>

                <Dialog
                    open={deleteConfirmId != null}
                    onClose={this.cancelDelete}
                >
                    <DialogTitle>Obriši kategoriju?</DialogTitle>
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
): DocumentCategoriesListPageStateProps => ({
    categories: state.documents.categories,
    error: state.documents.error,
});

const mapDispatchToProps = (
    dispatch: AppDispatch,
): DocumentCategoriesListPageDispatchProps => ({
    fetchDocumentCategories: () => dispatch(fetchDocumentCategories()),
    createDocumentCategory: (p) => dispatch(createDocumentCategory(p)),
    updateDocumentCategory: (p) => dispatch(updateDocumentCategory(p)),
    deleteDocumentCategory: (id) => dispatch(deleteDocumentCategory(id)),
    setLastPath: (path) => dispatch(setLastPath(path)),
});

export default connect(
    mapStateToProps,
    mapDispatchToProps,
)(DocumentCategoriesListPage);
