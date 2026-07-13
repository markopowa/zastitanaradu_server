import { Component } from "react";
import { connect } from "react-redux";
import { Link } from "react-router-dom";

import {
    Alert,
    Box,
    Button,
    Chip,
    CircularProgress,
    Divider,
    FormControl,
    InputLabel,
    List,
    ListItem,
    ListItemText,
    MenuItem,
    Paper,
    Select,
    Typography,
} from "@mui/material";
import ErrorOutlineIcon from "@mui/icons-material/ErrorOutline";
import EventIcon from "@mui/icons-material/Event";
import MailOutlineIcon from "@mui/icons-material/MailOutline";
import ScheduleSendIcon from "@mui/icons-material/ScheduleSend";
import ReplayIcon from "@mui/icons-material/Replay";

import {
    getUpcomingDeadlines,
    getOutbox,
    retryOutboxRow,
} from "../api/processes";
import { setLastPath } from "../store/locationSlice";
import { formatDateDisplay } from "../utils/date";
import { outboxStatusMeta } from "../utils/status";
import { EmptyState } from "../design";

import type { AppDispatch } from "../store";
import type { UpcomingDeadline, NotificationOutbox } from "../types/processes";
import type { OutboxParams } from "../api/processes";

const SOON_DAYS = 14;
const OUTBOX_DAYS = 7;

function isoDateNowPlus(days: number): string {
    const d = new Date();
    d.setDate(d.getDate() + days);
    return d.toISOString().slice(0, 10);
}

function isoDateToday(): string {
    return new Date().toISOString().slice(0, 10);
}

interface DispatchProps {
    setLastPath: (path: string) => void;
}

type Props = DispatchProps;

interface State {
    overdue: UpcomingDeadline[];
    soon: UpcomingDeadline[];
    failedOutbox: NotificationOutbox[];
    pendingOutbox: NotificationOutbox[];
    loading: boolean;
    error: string | null;
    retryingId: number | null;
    companyFilter: string;
}

class DanasPageInner extends Component<Props, State> {
    state: State = {
        overdue: [],
        soon: [],
        failedOutbox: [],
        pendingOutbox: [],
        loading: true,
        error: null,
        retryingId: null,
        companyFilter: "",
    };

    componentDidMount(): void {
        this.props.setLastPath("/danas");
        void this.loadAll();
    }

    loadAll = async (): Promise<void> => {
        this.setState({ loading: true, error: null });
        try {
            const today = isoDateToday();
            const soonEnd = isoDateNowPlus(SOON_DAYS);
            const outboxEnd = isoDateNowPlus(OUTBOX_DAYS);

            const [deadlines, failed, pending] = await Promise.all([
                getUpcomingDeadlines({ within_days: SOON_DAYS }),
                getOutbox({ status: "FAILED" } as OutboxParams),
                getOutbox({
                    status: "PENDING",
                    date_from: today,
                    date_to: outboxEnd,
                } as OutboxParams),
            ]);

            const soonEnd8601 = soonEnd;
            const overdue = deadlines.filter((d) => d.is_overdue);
            const soon = deadlines.filter(
                (d) =>
                    !d.is_overdue &&
                    d.valid_until != null &&
                    d.valid_until <= soonEnd8601,
            );

            this.setState({
                overdue,
                soon,
                failedOutbox: failed,
                pendingOutbox: pending,
                loading: false,
            });
        } catch {
            this.setState({
                loading: false,
                error: "Greška pri učitavanju podataka.",
            });
        }
    };

    handleRetry = (id: number): void => {
        this.setState({ retryingId: id });
        retryOutboxRow(id)
            .then(() => {
                void this.loadAll().then(() => {
                    this.setState({ retryingId: null });
                });
            })
            .catch(() => {
                this.setState({ retryingId: null });
            });
    };

    formatDaysLate = (row: UpcomingDeadline): string => {
        if (row.days_until_deadline == null) return "";
        const n = Math.abs(row.days_until_deadline);
        return n === 1 ? "1 dan kasni" : `${n} dana kasni`;
    };

    formatDaysUntil = (row: UpcomingDeadline): string => {
        if (row.days_until_deadline == null) return "—";
        if (row.days_until_deadline === 0) return "Danas";
        if (row.days_until_deadline === 1) return "1 dan";
        return `${row.days_until_deadline} dana`;
    };

    render() {
        const {
            overdue,
            soon,
            failedOutbox,
            pendingOutbox,
            loading,
            error,
            retryingId,
            companyFilter,
        } = this.state;

        if (loading) {
            return (
                <Box sx={{ display: "flex", justifyContent: "center", py: 6 }}>
                    <CircularProgress />
                </Box>
            );
        }

        const companyNames = Array.from(
            new Set(
                [
                    ...overdue.map((r) => r.client_company_name),
                    ...soon.map((r) => r.client_company_name),
                    ...failedOutbox.map((r) => r.company_name),
                    ...pendingOutbox.map((r) => r.company_name),
                ].filter((name): name is string => Boolean(name)),
            ),
        ).sort((a, b) => a.localeCompare(b));

        const overdueFiltered = companyFilter
            ? overdue.filter((r) => r.client_company_name === companyFilter)
            : overdue;
        const soonFiltered = companyFilter
            ? soon.filter((r) => r.client_company_name === companyFilter)
            : soon;
        const failedOutboxFiltered = companyFilter
            ? failedOutbox.filter((r) => r.company_name === companyFilter)
            : failedOutbox;
        const pendingOutboxFiltered = companyFilter
            ? pendingOutbox.filter((r) => r.company_name === companyFilter)
            : pendingOutbox;

        return (
            <Box sx={{ display: "flex", flexDirection: "column", gap: 3 }}>
                <Box
                    sx={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        flexWrap: "wrap",
                        gap: 2,
                    }}
                >
                    <Typography variant="h6">Danas</Typography>
                    <FormControl size="small" sx={{ minWidth: 220 }}>
                        <InputLabel>Firma</InputLabel>
                        <Select
                            value={companyFilter}
                            label="Firma"
                            onChange={(e) =>
                                this.setState({
                                    companyFilter: e.target.value as string,
                                })
                            }
                        >
                            <MenuItem value="">Sve firme</MenuItem>
                            {companyNames.map((name) => (
                                <MenuItem key={name} value={name}>
                                    {name}
                                </MenuItem>
                            ))}
                        </Select>
                    </FormControl>
                </Box>
                {error && <Alert severity="error">{error}</Alert>}

                <Paper>
                    <Box
                        sx={{
                            p: 2,
                            pb: 1,
                            display: "flex",
                            alignItems: "center",
                            gap: 1,
                        }}
                    >
                        <ErrorOutlineIcon color="error" fontSize="small" />
                        <Typography
                            variant="subtitle1"
                            fontWeight={600}
                            color="error.main"
                        >
                            Kasni
                        </Typography>
                        {overdueFiltered.length > 0 && (
                            <Chip
                                label={overdueFiltered.length}
                                color="error"
                                size="small"
                                sx={{ ml: "auto" }}
                            />
                        )}
                    </Box>
                    <Divider />
                    {overdueFiltered.length === 0 ? (
                        <EmptyState message="Nema zakaslelih aktivnosti." />
                    ) : (
                        <List disablePadding>
                            {overdueFiltered.map((row, idx) => (
                                <Box key={row.run_id}>
                                    {idx > 0 && <Divider component="li" />}
                                    <ListItem
                                        component={Link}
                                        to={`/processes/runs/${row.run_id}`}
                                        sx={{
                                            textDecoration: "none",
                                            color: "inherit",
                                            "&:hover": {
                                                bgcolor: "action.hover",
                                            },
                                            flexWrap: "wrap",
                                            gap: 0.5,
                                        }}
                                    >
                                        <ListItemText
                                            primary={
                                                <Box
                                                    sx={{
                                                        display: "flex",
                                                        flexWrap: "wrap",
                                                        gap: 1,
                                                        alignItems: "center",
                                                    }}
                                                >
                                                    <Typography
                                                        variant="body2"
                                                        fontWeight={500}
                                                    >
                                                        {row.subject_name ||
                                                            "—"}
                                                    </Typography>
                                                    <Typography
                                                        variant="body2"
                                                        color="text.secondary"
                                                    >
                                                        {row.process_type_name}
                                                    </Typography>
                                                    {row.client_company_name && (
                                                        <Typography
                                                            variant="body2"
                                                            color="text.secondary"
                                                        >
                                                            ·{" "}
                                                            {
                                                                row.client_company_name
                                                            }
                                                        </Typography>
                                                    )}
                                                </Box>
                                            }
                                            secondary={
                                                <Chip
                                                    label={this.formatDaysLate(
                                                        row,
                                                    )}
                                                    color="error"
                                                    size="small"
                                                    sx={{ mt: 0.5 }}
                                                />
                                            }
                                        />
                                    </ListItem>
                                </Box>
                            ))}
                        </List>
                    )}
                </Paper>

                <Paper>
                    <Box
                        sx={{
                            p: 2,
                            pb: 1,
                            display: "flex",
                            alignItems: "center",
                            gap: 1,
                        }}
                    >
                        <EventIcon color="warning" fontSize="small" />
                        <Typography variant="subtitle1" fontWeight={600}>
                            Stiže uskoro
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                            (narednih {SOON_DAYS} dana)
                        </Typography>
                        {soonFiltered.length > 0 && (
                            <Chip
                                label={soonFiltered.length}
                                color="warning"
                                size="small"
                                sx={{ ml: "auto" }}
                            />
                        )}
                    </Box>
                    <Divider />
                    {soonFiltered.length === 0 ? (
                        <EmptyState message="Nema predstojecih rokova u narednih 14 dana." />
                    ) : (
                        <List disablePadding>
                            {soonFiltered.map((row, idx) => (
                                <Box key={row.run_id}>
                                    {idx > 0 && <Divider component="li" />}
                                    <ListItem
                                        component={Link}
                                        to={`/processes/runs/${row.run_id}`}
                                        sx={{
                                            textDecoration: "none",
                                            color: "inherit",
                                            "&:hover": {
                                                bgcolor: "action.hover",
                                            },
                                            flexWrap: "wrap",
                                        }}
                                    >
                                        <ListItemText
                                            primary={
                                                <Box
                                                    sx={{
                                                        display: "flex",
                                                        flexWrap: "wrap",
                                                        gap: 1,
                                                        alignItems: "center",
                                                    }}
                                                >
                                                    <Typography
                                                        variant="body2"
                                                        fontWeight={500}
                                                    >
                                                        {row.subject_name ||
                                                            "—"}
                                                    </Typography>
                                                    <Typography
                                                        variant="body2"
                                                        color="text.secondary"
                                                    >
                                                        {row.process_type_name}
                                                    </Typography>
                                                    {row.client_company_name && (
                                                        <Typography
                                                            variant="body2"
                                                            color="text.secondary"
                                                        >
                                                            ·{" "}
                                                            {
                                                                row.client_company_name
                                                            }
                                                        </Typography>
                                                    )}
                                                </Box>
                                            }
                                            secondary={
                                                <Box
                                                    component="span"
                                                    sx={{
                                                        display: "flex",
                                                        flexWrap: "wrap",
                                                        gap: 0.5,
                                                        mt: 0.5,
                                                    }}
                                                >
                                                    <Chip
                                                        label={`Važi do: ${formatDateDisplay(row.valid_until)}`}
                                                        size="small"
                                                        variant="outlined"
                                                    />
                                                    <Chip
                                                        label={this.formatDaysUntil(
                                                            row,
                                                        )}
                                                        color="warning"
                                                        size="small"
                                                    />
                                                </Box>
                                            }
                                        />
                                    </ListItem>
                                </Box>
                            ))}
                        </List>
                    )}
                </Paper>

                <Paper>
                    <Box
                        sx={{
                            p: 2,
                            pb: 1,
                            display: "flex",
                            alignItems: "center",
                            gap: 1,
                        }}
                    >
                        <MailOutlineIcon color="error" fontSize="small" />
                        <Typography
                            variant="subtitle1"
                            fontWeight={600}
                            color="error.main"
                        >
                            Neuspela slanja
                        </Typography>
                        {failedOutboxFiltered.length > 0 && (
                            <Chip
                                label={failedOutboxFiltered.length}
                                color="error"
                                size="small"
                                sx={{ ml: "auto" }}
                            />
                        )}
                    </Box>
                    <Divider />
                    {failedOutboxFiltered.length === 0 ? (
                        <EmptyState message="Nema neuspelih slanja." />
                    ) : (
                        <List disablePadding>
                            {failedOutboxFiltered.map((row, idx) => {
                                const meta = outboxStatusMeta(row.status);
                                return (
                                    <Box key={row.id}>
                                        {idx > 0 && <Divider component="li" />}
                                        <ListItem
                                            sx={{ flexWrap: "wrap", gap: 1 }}
                                            secondaryAction={
                                                <Button
                                                    size="small"
                                                    startIcon={<ReplayIcon />}
                                                    disabled={
                                                        retryingId === row.id
                                                    }
                                                    onClick={() =>
                                                        this.handleRetry(row.id)
                                                    }
                                                >
                                                    Ponovi
                                                </Button>
                                            }
                                        >
                                            <ListItemText
                                                primary={
                                                    <Box
                                                        sx={{
                                                            display: "flex",
                                                            flexWrap: "wrap",
                                                            gap: 1,
                                                            alignItems:
                                                                "center",
                                                            pr: {
                                                                xs: 0,
                                                                sm: 10,
                                                            },
                                                        }}
                                                    >
                                                        <Typography
                                                            variant="body2"
                                                            fontWeight={500}
                                                        >
                                                            {row.company_name ||
                                                                "—"}
                                                        </Typography>
                                                        <Typography
                                                            variant="body2"
                                                            color="text.secondary"
                                                        >
                                                            {
                                                                row.process_type_name
                                                            }
                                                        </Typography>
                                                        <Chip
                                                            label={meta.label}
                                                            color={meta.color}
                                                            size="small"
                                                            variant="outlined"
                                                        />
                                                    </Box>
                                                }
                                                secondary={
                                                    row.last_error ? (
                                                        <Typography
                                                            variant="caption"
                                                            color="error"
                                                            component="span"
                                                        >
                                                            {row.last_error}
                                                        </Typography>
                                                    ) : undefined
                                                }
                                            />
                                        </ListItem>
                                    </Box>
                                );
                            })}
                        </List>
                    )}
                </Paper>

                <Paper>
                    <Box
                        sx={{
                            p: 2,
                            pb: 1,
                            display: "flex",
                            alignItems: "center",
                            gap: 1,
                        }}
                    >
                        <ScheduleSendIcon color="primary" fontSize="small" />
                        <Typography variant="subtitle1" fontWeight={600}>
                            Slanja narednih 7 dana
                        </Typography>
                        {pendingOutboxFiltered.length > 0 && (
                            <Chip
                                label={pendingOutboxFiltered.length}
                                color="primary"
                                size="small"
                                sx={{ ml: "auto" }}
                            />
                        )}
                    </Box>
                    <Divider />
                    {pendingOutboxFiltered.length === 0 ? (
                        <EmptyState message="Nema zakazanih slanja u narednih 7 dana." />
                    ) : (
                        <List disablePadding>
                            {pendingOutboxFiltered.map((row, idx) => (
                                <Box key={row.id}>
                                    {idx > 0 && <Divider component="li" />}
                                    <ListItem sx={{ flexWrap: "wrap" }}>
                                        <ListItemText
                                            primary={
                                                <Box
                                                    sx={{
                                                        display: "flex",
                                                        flexWrap: "wrap",
                                                        gap: 1,
                                                        alignItems: "center",
                                                    }}
                                                >
                                                    <Typography
                                                        variant="body2"
                                                        fontWeight={500}
                                                    >
                                                        {row.company_name ||
                                                            "—"}
                                                    </Typography>
                                                    <Typography
                                                        variant="body2"
                                                        color="text.secondary"
                                                    >
                                                        {row.process_type_name}
                                                    </Typography>
                                                </Box>
                                            }
                                            secondary={
                                                <Box
                                                    component="span"
                                                    sx={{
                                                        display: "flex",
                                                        flexWrap: "wrap",
                                                        gap: 0.5,
                                                        mt: 0.5,
                                                    }}
                                                >
                                                    {row.scheduled_send_on && (
                                                        <Chip
                                                            label={`Slanje: ${formatDateDisplay(row.scheduled_send_on)}`}
                                                            size="small"
                                                            variant="outlined"
                                                        />
                                                    )}
                                                    {(() => {
                                                        const rcpts = row
                                                            .recipients_display
                                                            ?.length
                                                            ? row.recipients_display
                                                            : row.recipients;
                                                        return rcpts.length >
                                                            0 ? (
                                                            <Chip
                                                                label={rcpts.join(
                                                                    ", ",
                                                                )}
                                                                size="small"
                                                                variant="outlined"
                                                            />
                                                        ) : null;
                                                    })()}
                                                    {row.rendered_subject && (
                                                        <Typography
                                                            variant="caption"
                                                            color="text.secondary"
                                                            component="span"
                                                        >
                                                            {
                                                                row.rendered_subject
                                                            }
                                                        </Typography>
                                                    )}
                                                </Box>
                                            }
                                        />
                                    </ListItem>
                                </Box>
                            ))}
                        </List>
                    )}
                </Paper>
            </Box>
        );
    }
}

const mapDispatchToProps = (dispatch: AppDispatch): DispatchProps => ({
    setLastPath: (path: string) => dispatch(setLastPath(path)),
});

export default connect(null, mapDispatchToProps)(DanasPageInner);
