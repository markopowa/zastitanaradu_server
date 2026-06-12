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
    List,
    ListItem,
    ListItemText,
    Paper,
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
        } = this.state;

        if (loading) {
            return (
                <Box sx={{ display: "flex", justifyContent: "center", py: 6 }}>
                    <CircularProgress />
                </Box>
            );
        }

        return (
            <Box sx={{ display: "flex", flexDirection: "column", gap: 3 }}>
                <Typography variant="h6">Danas</Typography>
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
                        {overdue.length > 0 && (
                            <Chip
                                label={overdue.length}
                                color="error"
                                size="small"
                                sx={{ ml: "auto" }}
                            />
                        )}
                    </Box>
                    <Divider />
                    {overdue.length === 0 ? (
                        <EmptyState message="Nema zakaslelih aktivnosti." />
                    ) : (
                        <List disablePadding>
                            {overdue.map((row, idx) => (
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
                        {soon.length > 0 && (
                            <Chip
                                label={soon.length}
                                color="warning"
                                size="small"
                                sx={{ ml: "auto" }}
                            />
                        )}
                    </Box>
                    <Divider />
                    {soon.length === 0 ? (
                        <EmptyState message="Nema predstojecih rokova u narednih 14 dana." />
                    ) : (
                        <List disablePadding>
                            {soon.map((row, idx) => (
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
                        {failedOutbox.length > 0 && (
                            <Chip
                                label={failedOutbox.length}
                                color="error"
                                size="small"
                                sx={{ ml: "auto" }}
                            />
                        )}
                    </Box>
                    <Divider />
                    {failedOutbox.length === 0 ? (
                        <EmptyState message="Nema neuspelih slanja." />
                    ) : (
                        <List disablePadding>
                            {failedOutbox.map((row, idx) => {
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
                        {pendingOutbox.length > 0 && (
                            <Chip
                                label={pendingOutbox.length}
                                color="primary"
                                size="small"
                                sx={{ ml: "auto" }}
                            />
                        )}
                    </Box>
                    <Divider />
                    {pendingOutbox.length === 0 ? (
                        <EmptyState message="Nema zakazanih slanja u narednih 7 dana." />
                    ) : (
                        <List disablePadding>
                            {pendingOutbox.map((row, idx) => (
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
                                                        const rcpts =
                                                            row.recipients_display
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
