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
    CircularProgress,
    Alert,
    IconButton,
    Button,
} from "@mui/material";
import BusinessIcon from "@mui/icons-material/Business";
import ChevronRightIcon from "@mui/icons-material/ChevronRight";
import AddIcon from "@mui/icons-material/Add";

import { PermissionGate } from "../components/PermissionGate";
import { withNavigation } from "../hocs/withNavigation";
import { ensureClientCompanies } from "../store/processesSlice";
import { setBreadcrumbs, setLastPath } from "../store/locationSlice";

import type { AppDispatch, RootState } from "../store";
import type {
    ClientCompaniesListPageDispatchProps,
    ClientCompaniesListPageProps,
    ClientCompaniesListPageState,
    ClientCompaniesListPageStateProps,
} from "../types/processPages";

class ClientCompaniesListPage extends Component<
    ClientCompaniesListPageProps,
    ClientCompaniesListPageState
> {
    state: ClientCompaniesListPageState = {};

    componentDidMount(): void {
        this.props.setLastPath("/client-companies");
        this.props.setBreadcrumbs([{ label: "Firme" }]);
        this.props.ensureClientCompanies();
    }

    componentWillUnmount(): void {
        this.props.setBreadcrumbs([]);
    }

    render() {
        const {
            clientCompanies: items,
            listLoading: loading,
            listError: error,
        } = this.props;
        const { navigate } = this.props;

        return (
            <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
                <Typography
                    variant="h6"
                    sx={{ display: "flex", alignItems: "center", gap: 1 }}
                >
                    <BusinessIcon /> Firme
                </Typography>

                <Box sx={{ display: "flex", justifyContent: "flex-end" }}>
                    <PermissionGate permission="partners.add_clientcompany">
                        <Button
                            variant="contained"
                            startIcon={<AddIcon />}
                            onClick={() => navigate("/client-companies/new")}
                        >
                            Dodaj firmu
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
                                    <TableCell>PIB</TableCell>
                                    <TableCell>Email</TableCell>
                                    <TableCell>Telefon</TableCell>
                                    <TableCell align="right" />
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {items.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={5} align="center">
                                            Nema firmi.
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    items.map((row) => (
                                        <TableRow
                                            key={row.id}
                                            hover
                                            sx={{ cursor: "pointer" }}
                                            onClick={() =>
                                                navigate(
                                                    `/client-companies/${row.id}`,
                                                )
                                            }
                                        >
                                            <TableCell>{row.name}</TableCell>
                                            <TableCell>{row.tax_id}</TableCell>
                                            <TableCell>
                                                {row.email ?? "—"}
                                            </TableCell>
                                            <TableCell>
                                                {row.phone ?? "—"}
                                            </TableCell>
                                            <TableCell align="right">
                                                <IconButton
                                                    size="small"
                                                    aria-label="Detalj"
                                                >
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
            </Box>
        );
    }
}

const mapStateToProps = (
    state: RootState,
): ClientCompaniesListPageStateProps => ({
    clientCompanies: state.processes.clientCompanies,
    listLoading: state.processes.clientCompaniesStatus === "loading",
    listError:
        state.processes.clientCompaniesStatus === "failed"
            ? (state.processes.clientCompaniesError ?? "Greška")
            : null,
});

const mapDispatchToProps = (
    dispatch: AppDispatch,
): ClientCompaniesListPageDispatchProps => ({
    setLastPath: (path: string) => dispatch(setLastPath(path)),
    setBreadcrumbs: (items) => dispatch(setBreadcrumbs(items)),
    ensureClientCompanies: () => {
        void dispatch(ensureClientCompanies());
    },
});

const Connected = connect(
    mapStateToProps,
    mapDispatchToProps,
)(ClientCompaniesListPage);
const ClientCompaniesListPageWithNavigation = withNavigation(Connected);
export default ClientCompaniesListPageWithNavigation;
