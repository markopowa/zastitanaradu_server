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

import type { RootState, AppDispatch } from "../store";
import {
    fetchDocumentCategories,
    createDocumentCategory,
    updateDocumentCategory,
    deleteDocumentCategory,
} from "../store/documentsSlice";
import type { DocumentCategory } from "../types/documents";
import { setLastPath } from "../store/locationSlice";

interface StateProps {
    categories: DocumentCategory[];
    error?: string;
}

interface DispatchProps {
    fetchDocumentCategories: () => void;
    createDocumentCategory: (p: {
        code: string;
        name: string;
        description?: string;
    }) => void;
    updateDocumentCategory: (p: {
        id: number;
        code: string;
        name: string;
        description?: string;
    }) => void;
    deleteDocumentCategory: (id: number) => void;
    setLastPath: (path: string) => void;
}

type Props = StateProps & DispatchProps;

interface State {
    dialogOpen: boolean;
    editingId: number | null;
    code: string;
    name: string;
    description: string;
    deleteConfirmId: number | null;
}

class DocumentCategoriesListPage extends Component<Props, State> {
    state: State = {
        dialogOpen: false,
        editingId: null,
        code: "",
        name: "",
        description: "",
        deleteConfirmId: null,
    };

    componentDidMount(): void {
        this.props.fetchDocumentCategories();
        this.props.setLastPath("/documents/categories");
    }

    openCreate = (): void => {
        this.setState({
            dialogOpen: true,
            editingId: null,
            code: "",
            name: "",
            description: "",
        });
    };

    openEdit = (cat: DocumentCategory): void => {
        this.setState({
            dialogOpen: true,
            editingId: Number(cat.id),
            code: cat.code,
            name: cat.name,
            description: cat.description ?? "",
        });
    };

    closeDialog = (): void => {
        this.setState({
            dialogOpen: false,
            editingId: null,
            code: "",
            name: "",
            description: "",
        });
    };

    handleSave = (): void => {
        const { code, name, description, editingId } = this.state;
        if (!code.trim() || !name.trim()) return;
        if (editingId != null) {
            this.props.updateDocumentCategory({
                id: editingId,
                code: code.trim(),
                name: name.trim(),
                description: description.trim() || undefined,
            });
        } else {
            this.props.createDocumentCategory({
                code: code.trim(),
                name: name.trim(),
                description: description.trim() || undefined,
            });
        }
        this.closeDialog();
    };

    confirmDelete = (id: number): void => {
        this.setState({ deleteConfirmId: id });
    };

    cancelDelete = (): void => {
        this.setState({ deleteConfirmId: null });
    };

    doDelete = (): void => {
        const { deleteConfirmId } = this.state;
        if (deleteConfirmId != null) {
            this.props.deleteDocumentCategory(deleteConfirmId);
            this.setState({ deleteConfirmId: null });
        }
    };

    render() {
        const { categories, error } = this.props;
        const list = Array.isArray(categories) ? categories : [];
        const {
            dialogOpen,
            editingId,
            code,
            name,
            description,
            deleteConfirmId,
        } = this.state;

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
                                <TableCell>Šifra</TableCell>
                                <TableCell>Naziv</TableCell>
                                <TableCell>Opis</TableCell>
                                <TableCell align="right">Akcije</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {list.map((cat) => (
                                <TableRow key={cat.id}>
                                    <TableCell>{cat.code}</TableCell>
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
                            label="Šifra"
                            fullWidth
                            value={code}
                            onChange={(e) =>
                                this.setState({ code: e.target.value })
                            }
                            disabled={editingId != null}
                        />
                        <TextField
                            margin="dense"
                            label="Naziv"
                            fullWidth
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
                            rows={2}
                            value={description}
                            onChange={(e) =>
                                this.setState({ description: e.target.value })
                            }
                        />
                    </DialogContent>
                    <DialogActions>
                        <Button onClick={this.closeDialog}>Odustani</Button>
                        <Button
                            onClick={this.handleSave}
                            variant="contained"
                            disabled={!code.trim() || !name.trim()}
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

const mapStateToProps = (state: RootState): StateProps => ({
    categories: state.documents.categories,
    error: state.documents.error,
});

const mapDispatchToProps = (dispatch: AppDispatch): DispatchProps => ({
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
