import { Component, type ReactElement } from "react";
import { useParams } from "react-router-dom";
import { connect } from "react-redux";
import {
    Box,
    Paper,
    Typography,
    CircularProgress,
    Alert,
    Button,
} from "@mui/material";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";

import { getEmployee } from "../api/processes";
import { withNavigation } from "../hocs/withNavigation";
import { setLastPath } from "../store/locationSlice";
import { formatDateDisplay } from "../utils/date";

import type {
    ClientCompanyEmployeesDetailPageProps,
    ClientCompanyEmployeesDetailPageState,
} from "../types/processPages";

class ClientCompanyEmployeesDetailPageInner extends Component<
    ClientCompanyEmployeesDetailPageProps,
    ClientCompanyEmployeesDetailPageState
> {
    state: ClientCompanyEmployeesDetailPageState = {
        item: null,
        loading: true,
        error: null,
    };

    loadById = (id: number): void => {
        getEmployee(id)
            .then((item) =>
                this.setState((prev) => ({
                    ...prev,
                    item,
                    loading: false,
                    error: null,
                })),
            )
            .catch(() =>
                this.setState((prev) => ({
                    ...prev,
                    loading: false,
                    error: "Greška pri učitavanju.",
                })),
            );
    };

    private applyRouteId(mode: "mount" | "update"): void {
        const id = Number(this.props.id);
        if (!Number.isFinite(id)) {
            if (mode === "update") {
                this.setState((prev) => ({
                    ...prev,
                    loading: false,
                    error: "Neispravan ID.",
                    item: null,
                }));
            } else {
                this.setState((prev) => ({
                    ...prev,
                    loading: false,
                    error: "Neispravan ID.",
                }));
            }
            return;
        }
        if (mode === "mount") {
            this.props.setLastPath(`/client-companies-employees/${id}`);
        } else {
            this.setState((prev) => ({ ...prev, loading: true }));
        }
        this.loadById(id);
    }

    componentDidMount(): void {
        this.applyRouteId("mount");
    }

    componentDidUpdate(prevProps: ClientCompanyEmployeesDetailPageProps): void {
        if (prevProps.id !== this.props.id) {
            this.applyRouteId("update");
        }
    }

    render() {
        const { item, loading, error } = this.state;
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
                        {error ?? "Oprema nije pronađena."}
                    </Alert>
                    <Button
                        startIcon={<ArrowBackIcon />}
                        onClick={() => navigate("/client-companies-employees")}
                    >
                        Nazad
                    </Button>
                </Box>
            );
        }

        return (
            <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
                <Button
                    startIcon={<ArrowBackIcon />}
                    onClick={() => navigate("/client-companies-employees")}
                    sx={{ alignSelf: "flex-start" }}
                >
                    Nazad
                </Button>
                <Paper sx={{ p: 3 }}>
                    <Typography variant="h6" gutterBottom>
                        {item.first_name} {item.last_name}
                    </Typography>
                    <Box
                        component="dl"
                        sx={{
                            m: 0,
                            "& dd": { ml: 2 },
                            "& dt": { fontWeight: 600, mt: 1 },
                        }}
                    >
                        <dt>Ime</dt>
                        <dd>{item.first_name ?? "—"}</dd>
                        <dt>Prezime</dt>
                        <dd>{item.last_name ?? "—"}</dd>
                        <dt>Ime oca</dt>
                        <dd>{item.father_name ?? "—"}</dd>
                        <dt>JMBG</dt>
                        <dd>{item.jmbg ?? "—"}</dd>
                        <dt>Datum rođenja</dt>
                        <dd>{formatDateDisplay(item.date_of_birth)}</dd>
                        <dt>Mesto rođenja</dt>
                        <dd>{item.place_of_birth ?? "—"}</dd>
                        <dt>Firma</dt>
                        <dd>{item.client_company_name ?? "—"}</dd>
                        <dt>Email</dt>
                        <dd>{item.email ?? "—"}</dd>
                        <dt>Organizaciona jedinica</dt>
                        <dd>{item.org_unit ?? "—"}</dd>
                        <dt>Pozicija</dt>
                        <dd>{item.position ?? "—"}</dd>
                        <dt>Zanimanje</dt>
                        <dd>{item.occupation ?? "—"}</dd>
                        <dt>Naziv radnog mesta sa povećanim rizikom</dt>
                        <dd>{item.high_risk_position_name ?? "—"}</dd>
                    </Box>
                </Paper>
            </Box>
        );
    }
}

const mapDispatchToProps = {
    setLastPath,
};

const Connected = connect(
    null,
    mapDispatchToProps,
)(ClientCompanyEmployeesDetailPageInner);
const ClientCompanyEmployeesDetailWithNavigation = withNavigation(Connected);

export default function ClientCompanyEmployeesDetailPage(): ReactElement {
    const { id } = useParams<{ id: string }>();
    return <ClientCompanyEmployeesDetailWithNavigation id={id ?? ""} />;
}
