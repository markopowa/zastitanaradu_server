import { Component } from "react";

import {
    Box,
    Button,
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
    FormControl,
    FormControlLabel,
    InputLabel,
    MenuItem,
    Select,
    Switch,
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
import { enqueueSnackbar } from "notistack";

import {
    createContactPerson,
    deleteContactPerson,
    getContactPersons,
    updateContactPerson,
} from "../api/processes";
import { PermissionGate } from "./PermissionGate";
import RowActionsMenu from "./RowActionsMenu";
import { ConfirmDialog, SectionCard, TableStateRow } from "../design";

import type { ContactPerson, ContactPersonRole } from "../types/processes";
import { setupTestFill } from "../testFlow/registerTestFill";
import { TEST_FLOW } from "../testFlow/fixture";

const ROLE_OPTIONS: { value: ContactPersonRole; label: string }[] = [
    { value: "DIRECTOR", label: "Direktor" },
    { value: "SAFETY_OFFICER", label: "Lice za BZNR" },
    { value: "CONTACT", label: "Lice za kontakt" },
    { value: "OTHER", label: "Ostalo" },
];

interface ContactPersonsPanelProps {
    clientCompanyId: number;
}

interface ContactPersonsPanelState {
    items: ContactPerson[];
    loading: boolean;
    error: boolean;
    dialogOpen: boolean;
    editingId: number | null;
    formFullName: string;
    formRole: ContactPersonRole;
    formPhone: string;
    formEmail: string;
    formIsPrimary: boolean;
    saving: boolean;
    deleteId: number | null;
    deleting: boolean;
}

export class ContactPersonsPanel extends Component<
    ContactPersonsPanelProps,
    ContactPersonsPanelState
> {
    private testFillCleanup: (() => void) | null = null;

    state: ContactPersonsPanelState = {
        items: [],
        loading: true,
        error: false,
        dialogOpen: false,
        editingId: null,
        formFullName: "",
        formRole: "CONTACT",
        formPhone: "",
        formEmail: "",
        formIsPrimary: false,
        saving: false,
        deleteId: null,
        deleting: false,
    };

    componentDidMount(): void {
        this.load();
        this.testFillCleanup = setupTestFill("B", () => {
            const f = TEST_FLOW.contactPerson;
            this.setState({
                dialogOpen: true,
                editingId: null,
                formFullName: f.full_name,
                formRole: f.role,
                formPhone: f.phone,
                formEmail: f.email,
                formIsPrimary: f.is_primary,
            });
            return true;
        });
    }

    componentWillUnmount(): void {
        this.testFillCleanup?.();
    }

    componentDidUpdate(prevProps: ContactPersonsPanelProps): void {
        if (prevProps.clientCompanyId !== this.props.clientCompanyId) {
            this.load();
        }
    }

    load = (): void => {
        const { clientCompanyId } = this.props;
        this.setState({ loading: true, error: false });
        getContactPersons({ client_company_id: clientCompanyId })
            .then((items) =>
                this.setState({ items, loading: false, error: false }),
            )
            .catch(() => {
                this.setState({ loading: false, error: true });
                enqueueSnackbar("Greška pri učitavanju kontakt-lica.", {
                    variant: "error",
                });
            });
    };

    openCreate = (): void => {
        this.setState({
            dialogOpen: true,
            editingId: null,
            formFullName: "",
            formRole: "CONTACT",
            formPhone: "",
            formEmail: "",
            formIsPrimary: false,
        });
    };

    openEdit = (item: ContactPerson): void => {
        this.setState({
            dialogOpen: true,
            editingId: item.id,
            formFullName: item.full_name,
            formRole: item.role,
            formPhone: item.phone ?? "",
            formEmail: item.email ?? "",
            formIsPrimary: item.is_primary,
        });
    };

    closeDialog = (): void => {
        this.setState({ dialogOpen: false, saving: false });
    };

    save = (): void => {
        const {
            editingId,
            formFullName,
            formRole,
            formPhone,
            formEmail,
            formIsPrimary,
        } = this.state;
        if (!formFullName.trim()) return;
        const { clientCompanyId } = this.props;
        const payload: Partial<ContactPerson> = {
            client_company: clientCompanyId,
            full_name: formFullName.trim(),
            role: formRole,
            phone: formPhone.trim() || undefined,
            email: formEmail.trim() || undefined,
            is_primary: formIsPrimary,
        };
        this.setState({ saving: true });
        const request =
            editingId != null
                ? updateContactPerson(editingId, payload)
                : createContactPerson(payload);
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
                        ? "Kontakt-lice je izmenjeno."
                        : "Kontakt-lice je dodato.",
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
                        "Greška pri čuvanju kontakt-lica.";
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
        deleteContactPerson(deleteId)
            .then(() => {
                this.setState((prev) => ({
                    items: prev.items.filter((x) => x.id !== deleteId),
                    deleteId: null,
                    deleting: false,
                }));
                enqueueSnackbar("Kontakt-lice je obrisano.", {
                    variant: "success",
                });
            })
            .catch(() => {
                enqueueSnackbar("Greška pri brisanju kontakt-lica.", {
                    variant: "error",
                });
                this.setState({ deleting: false });
            });
    };

    render() {
        const {
            items,
            loading,
            error,
            dialogOpen,
            editingId,
            formFullName,
            formRole,
            formPhone,
            formEmail,
            formIsPrimary,
            saving,
            deleteId,
            deleting,
        } = this.state;

        return (
            <>
                <SectionCard
                    title="Kontakt-lica"
                    action={
                        <PermissionGate permission="partners.add_contactperson">
                            <Button
                                size="small"
                                variant="contained"
                                startIcon={<AddIcon />}
                                onClick={this.openCreate}
                            >
                                Dodaj kontakt-lice
                            </Button>
                        </PermissionGate>
                    }
                >
                    <Box sx={{ overflow: "auto" }}>
                        <Table size="small">
                            <TableHead>
                                <TableRow>
                                    <TableCell>Ime i prezime</TableCell>
                                    <TableCell>Uloga</TableCell>
                                    <TableCell>Telefon</TableCell>
                                    <TableCell>Email</TableCell>
                                    <TableCell align="right" />
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {loading ? (
                                    <TableStateRow
                                        colSpan={5}
                                        state="loading"
                                    />
                                ) : error ? (
                                    <TableStateRow
                                        colSpan={5}
                                        state="error"
                                        onRetry={this.load}
                                    />
                                ) : items.length === 0 ? (
                                    <TableStateRow
                                        colSpan={5}
                                        state="empty"
                                        emptyMessage="Nema kontakt-lica."
                                    />
                                ) : (
                                    items.map((cp) => (
                                        <TableRow key={cp.id}>
                                            <TableCell>
                                                {cp.full_name}
                                                {cp.is_primary ? " ★" : ""}
                                            </TableCell>
                                            <TableCell>
                                                {cp.role_display ??
                                                    ROLE_OPTIONS.find(
                                                        (r) =>
                                                            r.value === cp.role,
                                                    )?.label ??
                                                    cp.role}
                                            </TableCell>
                                            <TableCell>
                                                {cp.phone ?? "—"}
                                            </TableCell>
                                            <TableCell>
                                                {cp.email ?? "—"}
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
                                                                "partners.change_contactperson",
                                                            onClick: () =>
                                                                this.openEdit(
                                                                    cp,
                                                                ),
                                                        },
                                                        {
                                                            label: "Obriši",
                                                            icon: (
                                                                <DeleteIcon fontSize="small" />
                                                            ),
                                                            permission:
                                                                "partners.delete_contactperson",
                                                            color: "error",
                                                            onClick: () =>
                                                                this.confirmDelete(
                                                                    cp.id,
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
                            ? "Izmena kontakt-lica"
                            : "Novo kontakt-lice"}
                    </DialogTitle>
                    <DialogContent>
                        <TextField
                            margin="dense"
                            label="Ime i prezime"
                            fullWidth
                            required
                            value={formFullName}
                            onChange={(e) =>
                                this.setState({
                                    formFullName: e.target.value,
                                })
                            }
                        />
                        <FormControl margin="dense" fullWidth size="small">
                            <InputLabel>Uloga</InputLabel>
                            <Select
                                label="Uloga"
                                value={formRole}
                                onChange={(e) =>
                                    this.setState({
                                        formRole: e.target
                                            .value as ContactPersonRole,
                                    })
                                }
                            >
                                {ROLE_OPTIONS.map((r) => (
                                    <MenuItem key={r.value} value={r.value}>
                                        {r.label}
                                    </MenuItem>
                                ))}
                            </Select>
                        </FormControl>
                        <TextField
                            margin="dense"
                            label="Telefon"
                            fullWidth
                            value={formPhone}
                            onChange={(e) =>
                                this.setState({ formPhone: e.target.value })
                            }
                        />
                        <TextField
                            margin="dense"
                            label="Email"
                            fullWidth
                            type="email"
                            value={formEmail}
                            onChange={(e) =>
                                this.setState({ formEmail: e.target.value })
                            }
                        />
                        <FormControlLabel
                            control={
                                <Switch
                                    checked={formIsPrimary}
                                    onChange={(e) =>
                                        this.setState({
                                            formIsPrimary: e.target.checked,
                                        })
                                    }
                                />
                            }
                            label="Primarni kontakt"
                        />
                    </DialogContent>
                    <DialogActions>
                        <Button onClick={this.closeDialog} disabled={saving}>
                            Odustani
                        </Button>
                        <Button
                            variant="contained"
                            disabled={saving || !formFullName.trim()}
                            onClick={this.save}
                        >
                            {saving ? "Čuvam..." : "Sačuvaj"}
                        </Button>
                    </DialogActions>
                </Dialog>

                <ConfirmDialog
                    open={deleteId != null}
                    title="Obriši kontakt-lice"
                    message="Da li si siguran da želiš da obrišeš ovo kontakt-lice?"
                    loading={deleting}
                    onConfirm={this.executeDelete}
                    onClose={this.cancelDelete}
                />
            </>
        );
    }
}
