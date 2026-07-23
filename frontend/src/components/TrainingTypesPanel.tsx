import { Component } from "react";

import {
    Box,
    Button,
    CircularProgress,
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
    Link,
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableRow,
    TextField,
} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";
import UploadFileIcon from "@mui/icons-material/UploadFile";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import VisibilityIcon from "@mui/icons-material/Visibility";
import BuildIcon from "@mui/icons-material/Build";
import { enqueueSnackbar } from "notistack";

import {
    clearTrainingTypeTemplate,
    createTrainingType,
    deleteTrainingType,
    getTrainingTypes,
    updateTrainingType,
    uploadTrainingTypeTemplate,
    blankTemplatePagesStreamUrl,
    getBlankTemplateFields,
    saveBlankTemplateFields,
} from "../api/processes";
import { PermissionGate } from "./PermissionGate";
import RowActionsMenu from "./RowActionsMenu";
import { ConfirmDialog, SectionCard, TableStateRow } from "../design";
import TemplateStructureEditorDialog from "../documents/TemplateStructureEditorDialog";
import type { DocumentTemplate } from "../api/documents";

import type { TrainingType } from "../types/processes";

const POTVRDA_TARGET = "training-type-potvrda" as const;

const ACCEPT = ".doc,.docx,.pdf";

interface TrainingTypesPanelProps {
    clientCompanyId: number;
}

interface TrainingTypesPanelState {
    items: TrainingType[];
    loading: boolean;
    error: boolean;
    dialogOpen: boolean;
    editingId: number | null;
    formName: string;
    formDescription: string;
    saving: boolean;
    deleteId: number | null;
    deleting: boolean;
    busyTemplateId: number | null;
    editingFieldsFor: TrainingType | null;
}

export class TrainingTypesPanel extends Component<
    TrainingTypesPanelProps,
    TrainingTypesPanelState
> {
    state: TrainingTypesPanelState = {
        items: [],
        loading: true,
        error: false,
        dialogOpen: false,
        editingId: null,
        formName: "",
        formDescription: "",
        saving: false,
        deleteId: null,
        deleting: false,
        busyTemplateId: null,
        editingFieldsFor: null,
    };

    componentDidMount(): void {
        this.load();
    }

    componentDidUpdate(prevProps: TrainingTypesPanelProps): void {
        if (prevProps.clientCompanyId !== this.props.clientCompanyId) {
            this.load();
        }
    }

    load = (): void => {
        const { clientCompanyId } = this.props;
        this.setState({ loading: true, error: false });
        getTrainingTypes({ client_company_id: clientCompanyId })
            .then((items) =>
                this.setState({ items, loading: false, error: false }),
            )
            .catch(() => {
                this.setState({ loading: false, error: true });
                enqueueSnackbar("Greška pri učitavanju vrsta obuka.", {
                    variant: "error",
                });
            });
    };

    openCreate = (): void => {
        this.setState({
            dialogOpen: true,
            editingId: null,
            formName: "",
            formDescription: "",
        });
    };

    openEdit = (item: TrainingType): void => {
        this.setState({
            dialogOpen: true,
            editingId: item.id,
            formName: item.name,
            formDescription: item.description ?? "",
        });
    };

    closeDialog = (): void => {
        this.setState({ dialogOpen: false, saving: false });
    };

    save = (): void => {
        const { editingId, formName, formDescription } = this.state;
        if (!formName.trim()) return;
        const { clientCompanyId } = this.props;
        const payload: Partial<TrainingType> = {
            client_company: clientCompanyId,
            name: formName.trim(),
            description: formDescription.trim() || undefined,
        };
        this.setState({ saving: true });
        const request =
            editingId != null
                ? updateTrainingType(editingId, payload)
                : createTrainingType(payload);
        request
            .then((saved) => {
                this.setState((prev) => {
                    const items =
                        editingId != null
                            ? prev.items.map((x) =>
                                  x.id === saved.id ? saved : x,
                              )
                            : [...prev.items, saved];
                    return {
                        items,
                        saving: false,
                        dialogOpen: false,
                    };
                });
                enqueueSnackbar(
                    editingId != null
                        ? "Vrsta obuke je izmenjena."
                        : "Vrsta obuke je dodata.",
                    { variant: "success" },
                );
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
                        "Greška pri čuvanju vrste obuke.";
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
        deleteTrainingType(deleteId)
            .then(() => {
                this.setState((prev) => ({
                    items: prev.items.filter((x) => x.id !== deleteId),
                    deleteId: null,
                    deleting: false,
                }));
                enqueueSnackbar("Vrsta obuke je obrisana.", {
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
                        "Greška pri brisanju vrste obuke.";
                    enqueueSnackbar(msg, { variant: "error" });
                    this.setState({ deleting: false });
                },
            );
    };

    handleUploadTemplate = (item: TrainingType, file: File): void => {
        this.setState({ busyTemplateId: item.id });
        uploadTrainingTypeTemplate(item.id, file)
            .then((saved) => {
                this.setState((prev) => ({
                    items: prev.items.map((x) =>
                        x.id === saved.id ? saved : x,
                    ),
                    busyTemplateId: null,
                }));
                enqueueSnackbar("Blanko potvrda otpremljena.", {
                    variant: "success",
                });
            })
            .catch(() => {
                enqueueSnackbar("Otpremanje blanko potvrde nije uspelo.", {
                    variant: "error",
                });
                this.setState({ busyTemplateId: null });
            });
    };

    handleClearTemplate = (item: TrainingType): void => {
        this.setState({ busyTemplateId: item.id });
        clearTrainingTypeTemplate(item.id)
            .then((saved) => {
                this.setState((prev) => ({
                    items: prev.items.map((x) =>
                        x.id === saved.id ? saved : x,
                    ),
                    busyTemplateId: null,
                }));
                enqueueSnackbar("Blanko potvrda uklonjena.", {
                    variant: "success",
                });
            })
            .catch(() => {
                enqueueSnackbar("Uklanjanje blanko potvrde nije uspelo.", {
                    variant: "error",
                });
                this.setState({ busyTemplateId: null });
            });
    };

    openFieldsEditor = (item: TrainingType): void => {
        this.setState({ editingFieldsFor: item });
    };

    closeFieldsEditor = (): void => {
        this.setState({ editingFieldsFor: null });
    };

    render() {
        const {
            items,
            loading,
            error,
            dialogOpen,
            editingId,
            formName,
            formDescription,
            saving,
            deleteId,
            deleting,
            busyTemplateId,
            editingFieldsFor,
        } = this.state;

        return (
            <>
                <SectionCard
                    title="Vrste obuka"
                    action={
                        <PermissionGate permission="partners.add_trainingtype">
                            <Button
                                size="small"
                                variant="contained"
                                startIcon={<AddIcon />}
                                onClick={this.openCreate}
                            >
                                Dodaj vrstu obuke
                            </Button>
                        </PermissionGate>
                    }
                >
                    <Box sx={{ overflow: "auto" }}>
                        <Table size="small">
                            <TableHead>
                                <TableRow>
                                    <TableCell>Naziv</TableCell>
                                    <TableCell>Opis</TableCell>
                                    <TableCell>Blanko potvrda</TableCell>
                                    <TableCell align="right">
                                        Akcije
                                    </TableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {loading ? (
                                    <TableStateRow
                                        colSpan={4}
                                        state="loading"
                                    />
                                ) : error ? (
                                    <TableStateRow
                                        colSpan={4}
                                        state="error"
                                        onRetry={this.load}
                                    />
                                ) : items.length === 0 ? (
                                    <TableStateRow
                                        colSpan={4}
                                        state="empty"
                                        emptyMessage="Nema vrsta obuka."
                                    />
                                ) : (
                                    items.map((item) => {
                                        const isBusy =
                                            busyTemplateId === item.id;
                                        return (
                                            <TableRow key={item.id}>
                                                <TableCell>
                                                    {item.name}
                                                </TableCell>
                                                <TableCell>
                                                    {item.description || "—"}
                                                </TableCell>
                                                <TableCell>
                                                    <Box
                                                        sx={{
                                                            display: "flex",
                                                            gap: 1,
                                                            alignItems:
                                                                "center",
                                                            flexWrap: "wrap",
                                                        }}
                                                    >
                                                        {isBusy && (
                                                            <CircularProgress
                                                                size={18}
                                                            />
                                                        )}
                                                        {!isBusy &&
                                                            item.potvrda_template && (
                                                                <>
                                                                    <Link
                                                                        href={
                                                                            item.potvrda_template
                                                                        }
                                                                        target="_blank"
                                                                        rel="noopener"
                                                                        sx={{
                                                                            display:
                                                                                "inline-flex",
                                                                            alignItems:
                                                                                "center",
                                                                            gap: 0.5,
                                                                        }}
                                                                    >
                                                                        <VisibilityIcon fontSize="small" />
                                                                        Pregled
                                                                    </Link>
                                                                    <PermissionGate permission="partners.change_trainingtype">
                                                                        <Button
                                                                            size="small"
                                                                            startIcon={
                                                                                <BuildIcon fontSize="small" />
                                                                            }
                                                                            onClick={() =>
                                                                                this.openFieldsEditor(
                                                                                    item,
                                                                                )
                                                                            }
                                                                        >
                                                                            Uredi polja
                                                                        </Button>
                                                                    </PermissionGate>
                                                                    <PermissionGate permission="partners.change_trainingtype">
                                                                        <Button
                                                                            size="small"
                                                                            color="error"
                                                                            startIcon={
                                                                                <DeleteOutlineIcon fontSize="small" />
                                                                            }
                                                                            onClick={() =>
                                                                                this.handleClearTemplate(
                                                                                    item,
                                                                                )
                                                                            }
                                                                        >
                                                                            Ukloni
                                                                        </Button>
                                                                    </PermissionGate>
                                                                </>
                                                            )}
                                                        {!isBusy &&
                                                            !item.potvrda_template && (
                                                                <PermissionGate permission="partners.change_trainingtype">
                                                                    <Button
                                                                        size="small"
                                                                        variant="outlined"
                                                                        component="label"
                                                                        startIcon={
                                                                            <UploadFileIcon fontSize="small" />
                                                                        }
                                                                    >
                                                                        Otpremi
                                                                        <input
                                                                            type="file"
                                                                            hidden
                                                                            accept={
                                                                                ACCEPT
                                                                            }
                                                                            onChange={(
                                                                                e,
                                                                            ) => {
                                                                                const f =
                                                                                    e
                                                                                        .target
                                                                                        .files?.[0];
                                                                                e.target.value =
                                                                                    "";
                                                                                if (
                                                                                    f
                                                                                )
                                                                                    this.handleUploadTemplate(
                                                                                        item,
                                                                                        f,
                                                                                    );
                                                                            }}
                                                                        />
                                                                    </Button>
                                                                </PermissionGate>
                                                            )}
                                                    </Box>
                                                </TableCell>
                                                <TableCell align="right">
                                                    <RowActionsMenu
                                                        actions={[
                                                            {
                                                                label: "Izmeni",
                                                                icon: (
                                                                    <EditIcon fontSize="small" />
                                                                ),
                                                                permission:
                                                                    "partners.change_trainingtype",
                                                                onClick: () =>
                                                                    this.openEdit(
                                                                        item,
                                                                    ),
                                                            },
                                                            {
                                                                label: "Obriši",
                                                                icon: (
                                                                    <DeleteIcon fontSize="small" />
                                                                ),
                                                                permission:
                                                                    "partners.delete_trainingtype",
                                                                color: "error",
                                                                onClick: () =>
                                                                    this.confirmDelete(
                                                                        item.id,
                                                                    ),
                                                            },
                                                        ]}
                                                    />
                                                </TableCell>
                                            </TableRow>
                                        );
                                    })
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
                    <DialogTitle>
                        {editingId != null
                            ? "Izmena vrste obuke"
                            : "Nova vrsta obuke"}
                    </DialogTitle>
                    <DialogContent>
                        <TextField
                            margin="dense"
                            label="Naziv"
                            fullWidth
                            required
                            value={formName}
                            onChange={(e) =>
                                this.setState({ formName: e.target.value })
                            }
                        />
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
                    </DialogContent>
                    <DialogActions>
                        <Button onClick={this.closeDialog} disabled={saving}>
                            Odustani
                        </Button>
                        <Button
                            variant="contained"
                            disabled={saving || !formName.trim()}
                            onClick={this.save}
                        >
                            {saving ? "Čuvam..." : "Sačuvaj"}
                        </Button>
                    </DialogActions>
                </Dialog>

                <ConfirmDialog
                    open={deleteId != null}
                    title="Obriši vrstu obuke"
                    message="Da li si siguran da želiš da obrišeš ovu vrstu obuke?"
                    loading={deleting}
                    onConfirm={this.executeDelete}
                    onClose={this.cancelDelete}
                />

                {editingFieldsFor && (
                    <TemplateStructureEditorDialog
                        open={Boolean(editingFieldsFor)}
                        template={
                            {
                                id: editingFieldsFor.id,
                                name: `Blanko potvrda — ${editingFieldsFor.name}`,
                                category: null,
                                context_type: "EMPLOYEE",
                                generation_config: null,
                            } as DocumentTemplate
                        }
                        streamUrl={blankTemplatePagesStreamUrl(
                            POTVRDA_TARGET,
                            editingFieldsFor.id,
                        )}
                        loadFields={() =>
                            getBlankTemplateFields(
                                POTVRDA_TARGET,
                                editingFieldsFor.id,
                            )
                        }
                        saveFields={(placeholders) =>
                            saveBlankTemplateFields(
                                POTVRDA_TARGET,
                                editingFieldsFor.id,
                                placeholders,
                            )
                        }
                        onClose={this.closeFieldsEditor}
                        onSaved={this.closeFieldsEditor}
                    />
                )}
            </>
        );
    }
}
