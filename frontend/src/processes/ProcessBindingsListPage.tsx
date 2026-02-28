import { Component } from "react";
import {
    Box,
    Paper,
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableRow,
    Typography,
    Button,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    FormControl,
    InputLabel,
    Select,
    MenuItem,
    TextField,
    CircularProgress,
    Alert,
} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";

import {
    getProcessBindings,
    getProcessTypes,
    getClientCompanies,
    getEmployees,
    getEquipment,
    createProcessBinding,
} from "../api/processes";
import type {
    ProcessBinding,
    ProcessType,
    ClientCompany,
    EquipmentItem,
} from "../types/processes";
import { setLastPath } from "../store/locationSlice";
import { connect } from "react-redux";
import type { AppDispatch, RootState } from "../store";

interface DispatchProps {
    setLastPath?: (path: string) => void;
}
type Props = DispatchProps;

interface State {
    items: ProcessBinding[];
    types: ProcessType[];
    clients: ClientCompany[];
    employees: { id: number; first_name: string; last_name: string }[];
    equipment: EquipmentItem[];
    client_company_id: string;
    process_type_id: string;
    dialogOpen: boolean;
    new_subject_kind: string;
    new_employee: string;
    new_equipment: string;
    new_client_company: string;
    new_process_type: string;
    new_period: string;
    new_next_run_at: string;
    loading: boolean;
    error: string | null;
}

class ProcessBindingsListPageInner extends Component<Props, State> {
    state: State = {
        items: [],
        types: [],
        clients: [],
        employees: [],
        equipment: [],
        client_company_id: "",
        process_type_id: "",
        dialogOpen: false,
        new_subject_kind: "EMPLOYEE",
        new_employee: "",
        new_equipment: "",
        new_client_company: "",
        new_process_type: "",
        new_period: "",
        new_next_run_at: "",
        loading: true,
        error: null,
    };

    load = (): void => {
        this.setState({ loading: true, error: null });
        const { client_company_id, process_type_id } = this.state;
        const params: Parameters<typeof getProcessBindings>[0] = {};
        if (client_company_id)
            params.client_company_id = Number(client_company_id);
        if (process_type_id) params.process_type_id = Number(process_type_id);
        getProcessBindings(params)
            .then((items) =>
                this.setState({
                    items: Array.isArray(items) ? items : [],
                    loading: false,
                    error: null,
                }),
            )
            .catch(() =>
                this.setState({
                    loading: false,
                    error: "Greška pri učitavanju.",
                }),
            );
    };

    componentDidMount(): void {
        this.props.setLastPath?.("/processes/bindings");
        Promise.all([getProcessTypes(), getClientCompanies()]).then(
            ([types, clients]) => {
                this.setState(
                    {
                        types: Array.isArray(types) ? types : [],
                        clients: Array.isArray(clients) ? clients : [],
                    },
                    () => this.load(),
                );
            },
        );
    }

    openAdd = (): void => {
        this.setState({
            dialogOpen: true,
            new_subject_kind: "EMPLOYEE",
            new_employee: "",
            new_equipment: "",
            new_client_company: "",
            new_process_type: this.state.types[0]
                ? String(this.state.types[0].id)
                : "",
            new_period: "",
            new_next_run_at: "",
        });
        getEmployees().then((e) => this.setState({ employees: e }));
        getEquipment().then((eq) => this.setState({ equipment: eq }));
    };

    closeDialog = (): void => {
        this.setState({ dialogOpen: false });
    };

    handleCreate = (): void => {
        const {
            new_subject_kind,
            new_employee,
            new_equipment,
            new_client_company,
            new_process_type,
            new_period,
            new_next_run_at,
        } = this.state;
        if (!new_process_type) return;
        const payload: Partial<ProcessBinding> = {
            process_type: Number(new_process_type),
            subject_kind: new_subject_kind as
                | "EMPLOYEE"
                | "EQUIPMENT"
                | "CLIENT_COMPANY",
            custom_period_months: new_period ? Number(new_period) : undefined,
            next_run_at: new_next_run_at || undefined,
            is_active: true,
        };
        if (new_subject_kind === "EMPLOYEE" && new_employee)
            payload.employee = Number(new_employee);
        else if (new_subject_kind === "EQUIPMENT" && new_equipment)
            payload.equipment_item = Number(new_equipment);
        else if (new_subject_kind === "CLIENT_COMPANY" && new_client_company)
            payload.client_company = Number(new_client_company);
        else return;
        createProcessBinding(payload).then(() => {
            this.closeDialog();
            this.load();
        });
    };

    render(): React.ReactNode {
        const {
            items,
            types,
            clients,
            client_company_id,
            process_type_id,
            dialogOpen,
            new_subject_kind,
            new_employee,
            new_equipment,
            new_client_company,
            new_process_type,
            new_period,
            new_next_run_at,
            employees,
            equipment,
            loading,
            error,
        } = this.state;

        const subjectLabel = (b: ProcessBinding) => {
            if (b.employee) return `Zaposleni #${b.employee}`;
            if (b.equipment_item) return `Oprema #${b.equipment_item}`;
            if (b.client_company)
                return (
                    clients.find((c) => c.id === b.client_company)?.name ??
                    `Firma #${b.client_company}`
                );
            return "—";
        };

        return (
            <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
                <Typography variant="h6">Rasporedi obaveza</Typography>
                <Box sx={{ display: "flex", flexWrap: "wrap", gap: 2 }}>
                    <FormControl size="small" sx={{ minWidth: 200 }}>
                        <InputLabel>Klijent</InputLabel>
                        <Select
                            value={client_company_id}
                            label="Klijent"
                            onChange={(e) =>
                                this.setState(
                                    {
                                        client_company_id: e.target
                                            .value as string,
                                    },
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
                    <FormControl size="small" sx={{ minWidth: 200 }}>
                        <InputLabel>Vrsta obaveze</InputLabel>
                        <Select
                            value={process_type_id}
                            label="Vrsta obaveze"
                            onChange={(e) =>
                                this.setState(
                                    {
                                        process_type_id: e.target
                                            .value as string,
                                    },
                                    () => this.load(),
                                )
                            }
                        >
                            <MenuItem value="">Svi</MenuItem>
                            {types.map((t) => (
                                <MenuItem key={t.id} value={String(t.id)}>
                                    {t.name}
                                </MenuItem>
                            ))}
                        </Select>
                    </FormControl>
                    <Button
                        variant="contained"
                        startIcon={<AddIcon />}
                        onClick={this.openAdd}
                    >
                        Dodaj raspored
                    </Button>
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
                                    <TableCell>Vrsta obaveze</TableCell>
                                    <TableCell>Subjekt</TableCell>
                                    <TableCell>Sledeći termin</TableCell>
                                    <TableCell>Aktivan</TableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {items.map((row) => (
                                    <TableRow key={row.id}>
                                        <TableCell>
                                            {row.process_type_name}
                                        </TableCell>
                                        <TableCell>
                                            {subjectLabel(row)}
                                        </TableCell>
                                        <TableCell>
                                            {row.next_run_at ?? "—"}
                                        </TableCell>
                                        <TableCell>
                                            {row.is_active ? "Da" : "Ne"}
                                        </TableCell>
                                    </TableRow>
                                ))}
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
                    <DialogTitle>Dodaj raspored</DialogTitle>
                    <DialogContent>
                        <FormControl fullWidth margin="dense">
                            <InputLabel>Vrsta obaveze</InputLabel>
                            <Select
                                value={new_process_type}
                                label="Vrsta obaveze"
                                onChange={(e) =>
                                    this.setState({
                                        new_process_type: e.target.value,
                                    })
                                }
                            >
                                {types.map((t) => (
                                    <MenuItem key={t.id} value={String(t.id)}>
                                        {t.name}
                                    </MenuItem>
                                ))}
                            </Select>
                        </FormControl>
                        <FormControl fullWidth margin="dense">
                            <InputLabel>Subjekt</InputLabel>
                            <Select
                                value={new_subject_kind}
                                label="Subjekt"
                                onChange={(e) =>
                                    this.setState({
                                        new_subject_kind: e.target.value,
                                    })
                                }
                            >
                                <MenuItem value="EMPLOYEE">Zaposleni</MenuItem>
                                <MenuItem value="EQUIPMENT">Oprema</MenuItem>
                                <MenuItem value="CLIENT_COMPANY">
                                    Firma
                                </MenuItem>
                            </Select>
                        </FormControl>
                        {new_subject_kind === "EMPLOYEE" && (
                            <FormControl fullWidth margin="dense">
                                <InputLabel>Zaposleni</InputLabel>
                                <Select
                                    value={new_employee}
                                    label="Zaposleni"
                                    onChange={(e) =>
                                        this.setState({
                                            new_employee: e.target.value,
                                        })
                                    }
                                >
                                    {employees.map((e) => (
                                        <MenuItem
                                            key={e.id}
                                            value={String(e.id)}
                                        >
                                            {e.first_name} {e.last_name}
                                        </MenuItem>
                                    ))}
                                </Select>
                            </FormControl>
                        )}
                        {new_subject_kind === "EQUIPMENT" && (
                            <FormControl fullWidth margin="dense">
                                <InputLabel>Oprema</InputLabel>
                                <Select
                                    value={new_equipment}
                                    label="Oprema"
                                    onChange={(e) =>
                                        this.setState({
                                            new_equipment: e.target.value,
                                        })
                                    }
                                >
                                    {equipment.map((e) => (
                                        <MenuItem
                                            key={e.id}
                                            value={String(e.id)}
                                        >
                                            {e.name}
                                        </MenuItem>
                                    ))}
                                </Select>
                            </FormControl>
                        )}
                        {new_subject_kind === "CLIENT_COMPANY" && (
                            <FormControl fullWidth margin="dense">
                                <InputLabel>Klijent</InputLabel>
                                <Select
                                    value={new_client_company}
                                    label="Klijent"
                                    onChange={(e) =>
                                        this.setState({
                                            new_client_company: e.target.value,
                                        })
                                    }
                                >
                                    {clients.map((c) => (
                                        <MenuItem
                                            key={c.id}
                                            value={String(c.id)}
                                        >
                                            {c.name}
                                        </MenuItem>
                                    ))}
                                </Select>
                            </FormControl>
                        )}
                        <TextField
                            margin="dense"
                            label="Period (meseci)"
                            type="number"
                            fullWidth
                            value={new_period}
                            onChange={(e) =>
                                this.setState({ new_period: e.target.value })
                            }
                        />
                        <TextField
                            margin="dense"
                            label="Sledeći termin (YYYY-MM-DD)"
                            fullWidth
                            value={new_next_run_at}
                            onChange={(e) =>
                                this.setState({
                                    new_next_run_at: e.target.value,
                                })
                            }
                            placeholder="YYYY-MM-DD"
                            inputProps={{
                                inputMode: "numeric",
                                pattern: "\\d{4}-\\d{2}-\\d{2}",
                            }}
                        />
                    </DialogContent>
                    <DialogActions>
                        <Button onClick={this.closeDialog}>Odustani</Button>
                        <Button
                            onClick={this.handleCreate}
                            variant="contained"
                            disabled={
                                !new_process_type ||
                                (new_subject_kind === "EMPLOYEE" &&
                                    !new_employee) ||
                                (new_subject_kind === "EQUIPMENT" &&
                                    !new_equipment) ||
                                (new_subject_kind === "CLIENT_COMPANY" &&
                                    !new_client_company)
                            }
                        >
                            Dodaj
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
}))(ProcessBindingsListPageInner);

export default function ProcessBindingsListPage(): React.ReactElement {
    return <Connected />;
}
