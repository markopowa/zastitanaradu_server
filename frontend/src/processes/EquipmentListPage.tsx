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
    FormControl,
    InputLabel,
    Select,
    MenuItem,
    CircularProgress,
    Alert,
    IconButton,
    Button,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    TextField,
} from "@mui/material";
import BuildIcon from "@mui/icons-material/Build";
import ChevronRightIcon from "@mui/icons-material/ChevronRight";
import AddIcon from "@mui/icons-material/Add";
import { enqueueSnackbar } from "notistack";

import { PermissionGate } from "../components/PermissionGate";
import { withNavigation } from "../hocs/withNavigation";
import { getProcessTypes } from "../api/processes";
import {
    addEquipmentItem,
    ensureClientCompanies,
    fetchEquipmentList,
} from "../store/processesSlice";
import { setLastPath } from "../store/locationSlice";
import { setupTestFill } from "../testFlow/registerTestFill";
import { TEST_FLOW } from "../testFlow/fixture";
import { idByCode, idByName } from "../testFlow/helpers";

import type { AppDispatch, RootState } from "../store";
import type { EquipmentItem } from "../types/processes";
import type {
    EquipmentListPageDispatchProps,
    EquipmentListPageProps,
    EquipmentListPageState,
} from "../types/processPages";

class EquipmentListPageInner extends Component<
    EquipmentListPageProps,
    EquipmentListPageState
> {
    private testFillCleanup: (() => void) | null = null;

    state: EquipmentListPageState = {
        client_company_id: "",
        dialogOpen: false,
        name: "",
        category: "",
        inventory_number: "",
        location: "",
        notes: "",
        new_client_company_id: "",
        service_process_type: "",
        equipmentProcessTypes: [],
    };

    load = (): void => {
        this.props.loadEquipment(this.state.client_company_id);
    };

    componentDidMount(): void {
        this.props.setLastPath("/equipment");
        this.props.ensureClientCompanies();
        this.load();
        this.testFillCleanup = setupTestFill(
            "EQ1",
            () => {
                const eq = TEST_FLOW.equipment;
                const types = this.state.equipmentProcessTypes;
                if (types.length === 0) {
                    this.loadEquipmentProcessTypes();
                    return false;
                }
                const serviceTypeId =
                    idByCode(types, eq.service_process_type_code) ||
                    idByName(types, eq.service_process_type_name);
                const companies = this.props.clientCompanies;
                const companyId =
                    this.state.client_company_id ||
                    (companies[0] ? String(companies[0].id) : "");
                if (!companyId || !serviceTypeId) return false;
                this.setState((prev) => ({
                    ...prev,
                    dialogOpen: true,
                    name: eq.name,
                    category: eq.category,
                    inventory_number: eq.inventory_number,
                    location: eq.location,
                    notes: "",
                    new_client_company_id: companyId,
                    service_process_type: serviceTypeId,
                }));
                return true;
            },
            () => true,
        );
        this.loadEquipmentProcessTypes();
    }

    componentWillUnmount(): void {
        this.testFillCleanup?.();
    }

    loadEquipmentProcessTypes = (): void => {
        getProcessTypes()
            .then((types) =>
                this.setState((prev) => ({
                    ...prev,
                    equipmentProcessTypes: types.filter(
                        (t) => t.subject_kind === "EQUIPMENT",
                    ),
                })),
            )
            .catch(() => undefined);
    };

    openCreate = (): void => {
        this.setState((prev) => ({
            dialogOpen: true,
            name: "",
            category: "",
            inventory_number: "",
            location: "",
            notes: "",
            new_client_company_id: prev.client_company_id,
            service_process_type: "",
        }));
        if (this.state.equipmentProcessTypes.length === 0) {
            this.loadEquipmentProcessTypes();
        }
    };

    closeDialog = (): void => {
        this.setState((prev) => ({ ...prev, dialogOpen: false }));
    };

    handleSave = (): void => {
        const {
            name,
            category,
            inventory_number,
            location,
            notes,
            new_client_company_id,
            service_process_type,
        } = this.state;
        if (!name.trim() || !new_client_company_id) return;
        const payload: Partial<EquipmentItem> = {
            name: name.trim(),
            category: category.trim() || undefined,
            inventory_number: inventory_number.trim() || undefined,
            location: location.trim() || undefined,
            notes: notes.trim() || undefined,
            service_process_type: service_process_type
                ? Number(service_process_type)
                : null,
            client_company: Number(new_client_company_id),
            is_active: true,
        };
        void this.props
            .addEquipment(payload)
            .unwrap()
            .then(() => {
                this.setState((prev) => ({ ...prev, dialogOpen: false }));
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
                        "Greška pri čuvanju opreme.";
                    enqueueSnackbar(msg, { variant: "error" });
                },
            );
    };

    render() {
        const {
            clientCompanies: clients,
            equipmentItems: items,
            equipmentLoading: loading,
            equipmentError: error,
        } = this.props;
        const {
            client_company_id,
            dialogOpen,
            name,
            category,
            inventory_number,
            location,
            notes,
            new_client_company_id,
            service_process_type,
            equipmentProcessTypes,
        } = this.state;
        const { navigate } = this.props;

        return (
            <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
                <Typography
                    variant="h6"
                    sx={{ display: "flex", alignItems: "center", gap: 1 }}
                >
                    <BuildIcon /> Oprema
                </Typography>
                <Box
                    sx={{
                        display: "flex",
                        flexWrap: "wrap",
                        gap: 2,
                        alignItems: "center",
                    }}
                >
                    <FormControl size="small" sx={{ minWidth: 220 }}>
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
                    <Box sx={{ flex: 1 }} />
                    <PermissionGate permission="partners.add_equipmentitem">
                        <Button
                            variant="contained"
                            startIcon={<AddIcon />}
                            onClick={this.openCreate}
                        >
                            Dodaj opremu
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
                                    <TableCell>Kategorija</TableCell>
                                    <TableCell>Inventarski broj</TableCell>
                                    <TableCell>Lokacija</TableCell>
                                    <TableCell align="right" />
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {items.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={5} align="center">
                                            Nema opreme.
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    items.map((row) => (
                                        <TableRow
                                            key={row.id}
                                            hover
                                            sx={{ cursor: "pointer" }}
                                            onClick={() =>
                                                navigate(`/equipment/${row.id}`)
                                            }
                                        >
                                            <TableCell>{row.name}</TableCell>
                                            <TableCell>
                                                {row.category ?? "—"}
                                            </TableCell>
                                            <TableCell>
                                                {row.inventory_number ?? "—"}
                                            </TableCell>
                                            <TableCell>
                                                {row.location ?? "—"}
                                            </TableCell>
                                            <TableCell align="right">
                                                <IconButton size="small">
                                                    <ChevronRightIcon />
                                                </IconButton>
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
                    maxWidth="sm"
                    fullWidth
                >
                    <DialogTitle>Nova oprema</DialogTitle>
                    <DialogContent>
                        <FormControl fullWidth margin="dense">
                            <InputLabel>Firma</InputLabel>
                            <Select
                                value={new_client_company_id}
                                label="Firma"
                                onChange={(e) =>
                                    this.setState((prev) => ({
                                        ...prev,
                                        new_client_company_id: e.target
                                            .value as string,
                                    }))
                                }
                                required
                            >
                                {clients.map((c) => (
                                    <MenuItem key={c.id} value={String(c.id)}>
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
                            label="Kategorija"
                            fullWidth
                            value={category}
                            onChange={(e) =>
                                this.setState((prev) => ({
                                    ...prev,
                                    category: e.target.value,
                                }))
                            }
                        />
                        <TextField
                            margin="dense"
                            label="Inventarski broj"
                            fullWidth
                            value={inventory_number}
                            onChange={(e) =>
                                this.setState((prev) => ({
                                    ...prev,
                                    inventory_number: e.target.value,
                                }))
                            }
                        />
                        <TextField
                            margin="dense"
                            label="Lokacija"
                            fullWidth
                            value={location}
                            onChange={(e) =>
                                this.setState((prev) => ({
                                    ...prev,
                                    location: e.target.value,
                                }))
                            }
                        />
                        <TextField
                            margin="dense"
                            label="Beleške"
                            fullWidth
                            multiline
                            minRows={2}
                            value={notes}
                            onChange={(e) =>
                                this.setState((prev) => ({
                                    ...prev,
                                    notes: e.target.value,
                                }))
                            }
                        />
                        <FormControl fullWidth margin="dense">
                            <InputLabel id="eq-list-service-pt-label">
                                Vrsta obaveze servisa/pregleda
                            </InputLabel>
                            <Select
                                labelId="eq-list-service-pt-label"
                                label="Vrsta obaveze servisa/pregleda"
                                value={service_process_type}
                                onChange={(e) =>
                                    this.setState((prev) => ({
                                        ...prev,
                                        service_process_type: e.target
                                            .value as string,
                                    }))
                                }
                            >
                                <MenuItem value="">
                                    <em>— bez obaveze —</em>
                                </MenuItem>
                                {equipmentProcessTypes.map((pt) => (
                                    <MenuItem key={pt.id} value={String(pt.id)}>
                                        {pt.name}
                                    </MenuItem>
                                ))}
                            </Select>
                        </FormControl>
                    </DialogContent>
                    <DialogActions>
                        <Button onClick={this.closeDialog}>Odustani</Button>
                        <Button
                            onClick={this.handleSave}
                            variant="contained"
                            disabled={!name.trim() || !new_client_company_id}
                        >
                            Sačuvaj
                        </Button>
                    </DialogActions>
                </Dialog>
            </Box>
        );
    }
}
const mapStateToProps = (state: RootState) => ({
    clientCompanies: state.processes.clientCompanies,
    equipmentItems: state.processes.equipmentItems,
    equipmentLoading: state.processes.equipmentStatus === "loading",
    equipmentError:
        state.processes.equipmentStatus === "failed"
            ? (state.processes.equipmentError ?? "Greška")
            : null,
});

const mapDispatchToProps = (
    dispatch: AppDispatch,
): EquipmentListPageDispatchProps => ({
    setLastPath: (path: string) => dispatch(setLastPath(path)),
    ensureClientCompanies: () => {
        void dispatch(ensureClientCompanies());
    },
    loadEquipment: (clientCompanyId: string) => {
        void dispatch(fetchEquipmentList(clientCompanyId));
    },
    addEquipment: (payload: Partial<EquipmentItem>) =>
        dispatch(addEquipmentItem(payload)),
});

const Connected = connect(
    mapStateToProps,
    mapDispatchToProps,
)(EquipmentListPageInner);
const EquipmentListPageWithNavigation = withNavigation(Connected);
export default EquipmentListPageWithNavigation;
