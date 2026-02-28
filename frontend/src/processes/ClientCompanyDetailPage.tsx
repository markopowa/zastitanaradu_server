import { Component } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
    Box,
    Paper,
    Typography,
    CircularProgress,
    Alert,
    Button,
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableRow,
} from "@mui/material";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";

import {
    getClientCompany,
    getEmployees,
    getEquipment,
    getProcessBindings,
    getProcessRuns,
} from "../api/processes";
import type {
    ClientCompany,
    ProcessBinding,
    ProcessRun,
} from "../types/processes";
import type { EquipmentItem } from "../types/processes";
import { useDispatch } from "react-redux";
import type { AppDispatch } from "../store";
import { setLastPath } from "../store/locationSlice";

const formatDate = (v?: string | null) =>
    v ? new Date(v).toLocaleDateString("sr-RS") : "—";

interface Props {
    id: string;
    navigate: (path: string) => void;
    setLastPath: (path: string) => void;
}

interface State {
    item: ClientCompany | null;
    employees: {
        id: number;
        first_name: string;
        last_name: string;
        email?: string;
    }[];
    equipment: EquipmentItem[];
    bindings: ProcessBinding[];
    runs: ProcessRun[];
    loading: boolean;
    error: string | null;
}

class ClientCompanyDetailPageInner extends Component<Props, State> {
    state: State = {
        item: null,
        employees: [],
        equipment: [],
        bindings: [],
        runs: [],
        loading: true,
        error: null,
    };

    loadExtra = (id: number): void => {
        Promise.all([
            getEmployees({ client_company_id: id }),
            getEquipment({ client_company_id: id }),
            getProcessBindings({ client_company_id: id }),
            getProcessRuns({ client_company_id: id }),
        ]).then(([employees, equipment, bindings, runs]) => {
            this.setState({
                employees: Array.isArray(employees) ? employees : [],
                equipment: Array.isArray(equipment) ? equipment : [],
                bindings: Array.isArray(bindings) ? bindings : [],
                runs: Array.isArray(runs) ? runs : [],
            });
        });
    };

    componentDidMount(): void {
        const id = Number(this.props.id);
        if (!Number.isFinite(id)) {
            this.setState({ loading: false, error: "Neispravan ID." });
            return;
        }
        this.props.setLastPath(`/client-companies/${id}`);
        getClientCompany(id)
            .then((item) => {
                this.setState({ item, loading: false, error: null });
                this.loadExtra(id);
            })
            .catch(() =>
                this.setState({
                    loading: false,
                    error: "Greška pri učitavanju.",
                }),
            );
    }

    componentDidUpdate(prevProps: Props): void {
        if (prevProps.id !== this.props.id) {
            const id = Number(this.props.id);
            if (!Number.isFinite(id)) {
                this.setState({
                    loading: false,
                    error: "Neispravan ID.",
                    item: null,
                });
                return;
            }
            this.setState({ loading: true });
            getClientCompany(id)
                .then((item) => {
                    this.setState({ item, loading: false, error: null });
                    this.loadExtra(id);
                })
                .catch(() =>
                    this.setState({
                        loading: false,
                        error: "Greška pri učitavanju.",
                    }),
                );
        }
    }

    render(): React.ReactNode {
        const { item, employees, equipment, bindings, runs, loading, error } =
            this.state;
        const { navigate } = this.props;

        if (loading) {
            return (
                <Box sx={{ display: "flex", justifyContent: "center", py: 4 }}>
                    <CircularProgress />
                </Box>
            );
        }
        if (error || !item) {
            return (
                <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
                    <Alert severity="error">
                        {error ?? "Klijent nije pronađen."}
                    </Alert>
                    <Button
                        startIcon={<ArrowBackIcon />}
                        onClick={() => navigate("/client-companies")}
                    >
                        Nazad na listu
                    </Button>
                </Box>
            );
        }

        return (
            <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
                <Button
                    startIcon={<ArrowBackIcon />}
                    onClick={() => navigate("/client-companies")}
                    sx={{ alignSelf: "flex-start" }}
                >
                    Nazad na listu
                </Button>
                <Paper sx={{ p: 3 }}>
                    <Typography variant="h6" gutterBottom>
                        {item.name}
                    </Typography>
                    <Box
                        component="dl"
                        sx={{
                            m: 0,
                            "& dd": { ml: 2 },
                            "& dt": { fontWeight: 600, mt: 1 },
                        }}
                    >
                        <dt>PIB</dt>
                        <dd>{item.pib}</dd>
                        {item.registration_number && (
                            <>
                                <dt>Matični broj</dt>
                                <dd>{item.registration_number}</dd>
                            </>
                        )}
                        {item.address && (
                            <>
                                <dt>Adresa</dt>
                                <dd>{item.address}</dd>
                            </>
                        )}
                        {item.email && (
                            <>
                                <dt>Email</dt>
                                <dd>{item.email}</dd>
                            </>
                        )}
                        {item.phone && (
                            <>
                                <dt>Telefon</dt>
                                <dd>{item.phone}</dd>
                            </>
                        )}
                        {item.website && (
                            <>
                                <dt>Web</dt>
                                <dd>{item.website}</dd>
                            </>
                        )}
                        {item.notes && (
                            <>
                                <dt>Beleške</dt>
                                <dd>{item.notes}</dd>
                            </>
                        )}
                    </Box>
                </Paper>

                <Typography variant="subtitle1" fontWeight={600} sx={{ mt: 2 }}>
                    Zaposleni
                </Typography>
                <Paper sx={{ overflow: "auto" }}>
                    <Table size="small">
                        <TableHead>
                            <TableRow>
                                <TableCell>Ime</TableCell>
                                <TableCell>Prezime</TableCell>
                                <TableCell>Email</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {employees.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={3} align="center">
                                        Nema zaposlenih.
                                    </TableCell>
                                </TableRow>
                            ) : (
                                employees.map((e) => (
                                    <TableRow key={e.id}>
                                        <TableCell>{e.first_name}</TableCell>
                                        <TableCell>{e.last_name}</TableCell>
                                        <TableCell>{e.email ?? "—"}</TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </Paper>

                <Typography variant="subtitle1" fontWeight={600} sx={{ mt: 2 }}>
                    Oprema
                </Typography>
                <Paper sx={{ overflow: "auto" }}>
                    <Table size="small">
                        <TableHead>
                            <TableRow>
                                <TableCell>Naziv</TableCell>
                                <TableCell>Kategorija</TableCell>
                                <TableCell>Inventarski broj</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {equipment.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={3} align="center">
                                        Nema opreme.
                                    </TableCell>
                                </TableRow>
                            ) : (
                                equipment.map((eq) => (
                                    <TableRow key={eq.id}>
                                        <TableCell>{eq.name}</TableCell>
                                        <TableCell>
                                            {eq.category ?? "—"}
                                        </TableCell>
                                        <TableCell>
                                            {eq.inventory_number ?? "—"}
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </Paper>

                <Typography variant="subtitle1" fontWeight={600} sx={{ mt: 2 }}>
                    Aktivni rasporedi
                </Typography>
                <Paper sx={{ overflow: "auto" }}>
                    <Table size="small">
                        <TableHead>
                            <TableRow>
                                <TableCell>Vrsta obaveze</TableCell>
                                <TableCell>Subjekt</TableCell>
                                <TableCell>Sledeći termin</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {bindings.filter((b) => b.is_active).length ===
                            0 ? (
                                <TableRow>
                                    <TableCell colSpan={3} align="center">
                                        Nema aktivnih rasporeda.
                                    </TableCell>
                                </TableRow>
                            ) : (
                                bindings
                                    .filter((b) => b.is_active)
                                    .map((b) => (
                                        <TableRow key={b.id}>
                                            <TableCell>
                                                {b.process_type_name}
                                            </TableCell>
                                            <TableCell>
                                                {b.employee
                                                    ? `Zaposleni #${b.employee}`
                                                    : b.equipment_item
                                                      ? `Oprema #${b.equipment_item}`
                                                      : "Firma"}
                                            </TableCell>
                                            <TableCell>
                                                {formatDate(b.next_run_at)}
                                            </TableCell>
                                        </TableRow>
                                    ))
                            )}
                        </TableBody>
                    </Table>
                </Paper>

                <Typography variant="subtitle1" fontWeight={600} sx={{ mt: 2 }}>
                    Istorija izvršenja (run-ovi)
                </Typography>
                <Paper sx={{ overflow: "auto" }}>
                    <Table size="small">
                        <TableHead>
                            <TableRow>
                                <TableCell>Tip</TableCell>
                                <TableCell>Subjekt</TableCell>
                                <TableCell>Važi do</TableCell>
                                <TableCell>Status</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {runs.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={4} align="center">
                                        Nema zapisa.
                                    </TableCell>
                                </TableRow>
                            ) : (
                                runs.slice(0, 20).map((r) => (
                                    <TableRow key={r.id}>
                                        <TableCell>
                                            {r.process_type_name}
                                        </TableCell>
                                        <TableCell>
                                            {r.subject_snapshot?.name ?? "—"}
                                        </TableCell>
                                        <TableCell>
                                            {formatDate(r.valid_until)}
                                        </TableCell>
                                        <TableCell>{r.status}</TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </Paper>
            </Box>
        );
    }
}
export default function ClientCompanyDetailPage(): React.ReactElement {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const dispatch = useDispatch<AppDispatch>();

    const setLastPathProp = (path: string) => dispatch(setLastPath(path));

    return (
        <ClientCompanyDetailPageInner
            id={id ?? ""}
            navigate={navigate}
            setLastPath={setLastPathProp}
        />
    );
}
