import { Component } from "react";
import { connect } from "react-redux";

import {
    Box,
    Button,
    FormControl,
    InputLabel,
    MenuItem,
    Paper,
    Select,
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableRow,
    TextField,
    Typography,
} from "@mui/material";
import OpenInNewIcon from "@mui/icons-material/OpenInNew";

import { getUpcomingDeadlines } from "../api/processes";
import { ensureClientCompanies } from "../store/processesSlice";
import { setLastPath } from "../store/locationSlice";
import { formatDateDisplay } from "../utils/date";
import { withNavigation } from "../hocs/withNavigation";
import { ErrorState, StatusBadge, TableStateRow } from "../design";

import type { AppDispatch, RootState } from "../store";
import type { ClientCompany, UpcomingDeadline } from "../types/processes";

const EXPIRING_SOON_DAYS = 7;

interface StateProps {
    clientCompanies: ClientCompany[];
}

interface DispatchProps {
    setLastPath: (path: string) => void;
    ensureClientCompanies: () => void;
}

interface NavProps {
    navigate: (path: string) => void;
}

type Props = StateProps & DispatchProps & NavProps;

interface State {
    client_company_id: string;
    within_days: string;
    items: UpcomingDeadline[];
    loading: boolean;
    error: string | null;
}

class UpcomingDeadlinesPageInner extends Component<Props, State> {
    state: State = {
        client_company_id: "",
        within_days: "30",
        items: [],
        loading: false,
        error: null,
    };

    load = (): void => {
        const { client_company_id, within_days } = this.state;
        const params: { client_company_id?: number; within_days?: number } =
            {};
        if (client_company_id) {
            params.client_company_id = Number(client_company_id);
        }
        const days = Number(within_days);
        if (!Number.isNaN(days) && days >= 1 && days <= 365) {
            params.within_days = days;
        }
        this.setState({ loading: true, error: null });
        getUpcomingDeadlines(params)
            .then((items) => {
                this.setState({ items, loading: false });
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
                        "Greška pri učitavanju rokova.";
                    this.setState({ loading: false, error: msg });
                },
            );
    };

    componentDidMount(): void {
        this.props.setLastPath("/processes/upcoming");
        this.props.ensureClientCompanies();
        this.load();
    }

    openDetail = (runId: number): void => {
        this.props.navigate(`/processes/runs/${runId}`);
    };

    formatDaysUntil = (row: UpcomingDeadline): string => {
        if (row.days_until_deadline == null) return "—";
        if (row.is_overdue) {
            const overdueDays = Math.abs(row.days_until_deadline);
            return overdueDays === 1 ? "1 dan kasni" : `${overdueDays} dana kasni`;
        }
        if (row.days_until_deadline === 0) return "Danas";
        if (row.days_until_deadline === 1) return "1 dan";
        return `${row.days_until_deadline} dana`;
    };

    render() {
        const { clientCompanies: clients } = this.props;
        const { client_company_id, within_days, items, loading, error } =
            this.state;

        return (
            <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
                <Typography variant="h6">Predstojeći rokovi</Typography>
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
                    <TextField
                        size="small"
                        label="U narednih dana"
                        type="number"
                        value={within_days}
                        slotProps={{ htmlInput: { min: 1, max: 365 } }}
                        sx={{ width: 160 }}
                        onChange={(e) =>
                            this.setState({ within_days: e.target.value })
                        }
                        onBlur={() => this.load()}
                        onKeyDown={(e) => {
                            if (e.key === "Enter") this.load();
                        }}
                    />
                </Box>
                {error ? (
                    <ErrorState message={error} onRetry={this.load} />
                ) : null}
                {loading ? (
                    <Paper sx={{ overflow: "auto" }}>
                        <Table size="small">
                            <TableBody>
                                <TableStateRow colSpan={8} state="loading" />
                            </TableBody>
                        </Table>
                    </Paper>
                ) : (
                    <Paper sx={{ overflow: "auto" }}>
                        <Table size="small">
                            <TableHead>
                                <TableRow>
                                    <TableCell>Subjekt</TableCell>
                                    <TableCell>Tip</TableCell>
                                    <TableCell>Klijent</TableCell>
                                    <TableCell>Zakazano</TableCell>
                                    <TableCell>Važi do</TableCell>
                                    <TableCell>Rok</TableCell>
                                    <TableCell>Status</TableCell>
                                    <TableCell align="right" />
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {items.length === 0 ? (
                                    <TableStateRow
                                        colSpan={8}
                                        state="empty"
                                        emptyMessage="Nema rokova u izabranom periodu."
                                    />
                                ) : (
                                    items.map((row) => {
                                        const isExpiringSoon =
                                            !row.is_overdue &&
                                            row.days_until_deadline != null &&
                                            row.days_until_deadline <=
                                                EXPIRING_SOON_DAYS;
                                        return (
                                            <TableRow
                                                key={row.run_id}
                                                hover
                                                sx={{ cursor: "pointer" }}
                                                onClick={() =>
                                                    this.openDetail(row.run_id)
                                                }
                                            >
                                                <TableCell>
                                                    {row.subject_name || "—"}
                                                </TableCell>
                                                <TableCell>
                                                    {row.process_type_name}
                                                </TableCell>
                                                <TableCell>
                                                    {row.client_company_name ||
                                                        "—"}
                                                </TableCell>
                                                <TableCell>
                                                    {formatDateDisplay(
                                                        row.scheduled_for,
                                                    )}
                                                </TableCell>
                                                <TableCell>
                                                    {formatDateDisplay(
                                                        row.valid_until,
                                                    )}
                                                </TableCell>
                                                <TableCell>
                                                    {this.formatDaysUntil(row)}
                                                </TableCell>
                                                <TableCell>
                                                    <StatusBadge
                                                        status={row.status}
                                                        isOverdue={
                                                            row.is_overdue
                                                        }
                                                        isExpiringSoon={
                                                            isExpiringSoon
                                                        }
                                                    />
                                                </TableCell>
                                                <TableCell
                                                    align="right"
                                                    onClick={(e) =>
                                                        e.stopPropagation()
                                                    }
                                                >
                                                    <Button
                                                        size="small"
                                                        startIcon={
                                                            <OpenInNewIcon />
                                                        }
                                                        onClick={() =>
                                                            this.openDetail(
                                                                row.run_id,
                                                            )
                                                        }
                                                    >
                                                        Detalji
                                                    </Button>
                                                </TableCell>
                                            </TableRow>
                                        );
                                    })
                                )}
                            </TableBody>
                        </Table>
                    </Paper>
                )}
            </Box>
        );
    }
}

const mapStateToProps = (state: RootState): StateProps => ({
    clientCompanies: state.processes.clientCompanies,
});

const mapDispatchToProps = (dispatch: AppDispatch): DispatchProps => ({
    setLastPath: (path: string) => dispatch(setLastPath(path)),
    ensureClientCompanies: () => {
        void dispatch(ensureClientCompanies());
    },
});

const Connected = connect(
    mapStateToProps,
    mapDispatchToProps,
)(UpcomingDeadlinesPageInner);

export default withNavigation(Connected);
