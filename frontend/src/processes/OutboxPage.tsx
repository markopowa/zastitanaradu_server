import { Component } from "react";
import { connect } from "react-redux";

import {
    Box,
    Button,
    Chip,
    CircularProgress,
    Dialog,
    DialogContent,
    DialogTitle,
    Divider,
    FormControl,
    IconButton,
    InputLabel,
    MenuItem,
    Paper,
    Select,
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableRow,
    Typography,
    useMediaQuery,
    useTheme,
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import ReplayIcon from "@mui/icons-material/Replay";
import VisibilityIcon from "@mui/icons-material/Visibility";

import { getOutbox, retryOutboxRow, previewOutboxRow } from "../api/processes";
import { ensureClientCompanies } from "../store/processesSlice";
import { setLastPath } from "../store/locationSlice";
import { formatDateDisplay, formatDateTimeDisplay } from "../utils/date";
import { outboxStatusMeta } from "../utils/status";
import { TableStateRow, EmptyState } from "../design";
import DateTextFieldWithPicker from "../components/DateTextFieldWithPicker";
import { displayDateToIso } from "../utils/date";
import { withNavigation } from "../hocs/withNavigation";

import type { AppDispatch, RootState } from "../store";
import type {
    NotificationOutbox,
    NotificationOutboxPreview,
    ClientCompany,
} from "../types/processes";
import type { OutboxParams } from "../api/processes";

const STATUS_OPTIONS = [
    { value: "", label: "Svi statusi" },
    { value: "PENDING", label: "Na čekanju" },
    { value: "SENT", label: "Poslato" },
    { value: "FAILED", label: "Neuspešno" },
    { value: "CANCELLED", label: "Otkazano" },
];

interface StateProps {
    clientCompanies: ClientCompany[];
}

interface DispatchProps {
    setLastPath: (path: string) => void;
    ensureClientCompanies: () => void;
}

type Props = StateProps & DispatchProps;

interface State {
    rows: NotificationOutbox[];
    loading: boolean;
    error: string | null;
    filterStatus: string;
    filterCompanyId: string;
    filterDateFrom: string;
    filterDateTo: string;
    retryingId: number | null;
    previewId: number | null;
    previewData: NotificationOutboxPreview | null;
    previewLoading: boolean;
}

class OutboxPageInner extends Component<Props, State> {
    state: State = {
        rows: [],
        loading: false,
        error: null,
        filterStatus: "",
        filterCompanyId: "",
        filterDateFrom: "",
        filterDateTo: "",
        retryingId: null,
        previewId: null,
        previewData: null,
        previewLoading: false,
    };

    componentDidMount(): void {
        this.props.setLastPath("/processes/outbox");
        this.props.ensureClientCompanies();
        void this.load();
    }

    load = (): Promise<void> => {
        const { filterStatus, filterCompanyId, filterDateFrom, filterDateTo } =
            this.state;
        const params: OutboxParams = {};
        if (filterStatus) params.status = filterStatus;
        if (filterCompanyId) params.client_company_id = Number(filterCompanyId);
        const from = displayDateToIso(filterDateFrom);
        if (from) params.date_from = from;
        const to = displayDateToIso(filterDateTo);
        if (to) params.date_to = to;

        this.setState({ loading: true, error: null });
        return getOutbox(params)
            .then((rows) => {
                this.setState({ rows, loading: false });
            })
            .catch(() => {
                this.setState({
                    loading: false,
                    error: "Greška pri učitavanju slanja.",
                });
            });
    };

    handleRetry = (id: number): void => {
        this.setState({ retryingId: id });
        retryOutboxRow(id)
            .then(() => {
                void this.load().then(() =>
                    this.setState({ retryingId: null }),
                );
            })
            .catch(() => {
                this.setState({ retryingId: null });
            });
    };

    handlePreview = (id: number): void => {
        this.setState({
            previewId: id,
            previewData: null,
            previewLoading: true,
        });
        previewOutboxRow(id)
            .then((data) => {
                this.setState({ previewData: data, previewLoading: false });
            })
            .catch(() => {
                this.setState({ previewLoading: false });
            });
    };

    handleClosePreview = (): void => {
        this.setState({
            previewId: null,
            previewData: null,
            previewLoading: false,
        });
    };

    render() {
        const {
            rows,
            loading,
            error,
            filterStatus,
            filterCompanyId,
            filterDateFrom,
            filterDateTo,
            retryingId,
            previewId,
            previewData,
            previewLoading,
        } = this.state;
        const { clientCompanies } = this.props;

        return (
            <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
                <Typography variant="h6">Slanja</Typography>

                <Paper sx={{ p: 2 }}>
                    <Box
                        sx={{
                            display: "grid",
                            gridTemplateColumns: {
                                xs: "1fr",
                                sm: "1fr 1fr",
                                md: "repeat(4, 1fr)",
                            },
                            gap: 2,
                        }}
                    >
                        <FormControl size="small" fullWidth>
                            <InputLabel>Status</InputLabel>
                            <Select
                                value={filterStatus}
                                label="Status"
                                onChange={(e) =>
                                    this.setState(
                                        { filterStatus: e.target.value },
                                        () => void this.load(),
                                    )
                                }
                            >
                                {STATUS_OPTIONS.map((opt) => (
                                    <MenuItem
                                        key={opt.value || "all"}
                                        value={opt.value}
                                    >
                                        {opt.label}
                                    </MenuItem>
                                ))}
                            </Select>
                        </FormControl>

                        <FormControl size="small" fullWidth>
                            <InputLabel>Firma</InputLabel>
                            <Select
                                value={filterCompanyId}
                                label="Firma"
                                onChange={(e) =>
                                    this.setState(
                                        { filterCompanyId: e.target.value },
                                        () => void this.load(),
                                    )
                                }
                            >
                                <MenuItem value="">Sve firme</MenuItem>
                                {clientCompanies.map((c) => (
                                    <MenuItem key={c.id} value={String(c.id)}>
                                        {c.name}
                                    </MenuItem>
                                ))}
                            </Select>
                        </FormControl>

                        <DateTextFieldWithPicker
                            label="Od (dd.mm.yyyy)"
                            value={filterDateFrom}
                            allowPast
                            onChange={(v) =>
                                this.setState(
                                    { filterDateFrom: v },
                                    () => void this.load(),
                                )
                            }
                        />
                        <DateTextFieldWithPicker
                            label="Do (dd.mm.yyyy)"
                            value={filterDateTo}
                            allowPast
                            onChange={(v) =>
                                this.setState(
                                    { filterDateTo: v },
                                    () => void this.load(),
                                )
                            }
                        />
                    </Box>
                </Paper>

                {error && (
                    <Box sx={{ color: "error.main" }}>
                        <Typography variant="body2">{error}</Typography>
                    </Box>
                )}

                <Paper
                    sx={{
                        overflow: "auto",
                        display: { xs: "none", sm: "block" },
                    }}
                >
                    <Table size="small">
                        <TableHead>
                            <TableRow>
                                <TableCell>Zakazano</TableCell>
                                <TableCell>Firma</TableCell>
                                <TableCell>Vrsta</TableCell>
                                <TableCell>Primaoci</TableCell>
                                <TableCell>Status</TableCell>
                                <TableCell align="right" />
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {loading ? (
                                <TableStateRow colSpan={6} state="loading" />
                            ) : rows.length === 0 ? (
                                <TableStateRow
                                    colSpan={6}
                                    state="empty"
                                    emptyMessage="Nema slanja za izabrane filtere."
                                />
                            ) : (
                                rows.map((row) => {
                                    const meta = outboxStatusMeta(row.status);
                                    return (
                                        <TableRow key={row.id} hover>
                                            <TableCell
                                                sx={{ whiteSpace: "nowrap" }}
                                            >
                                                {row.scheduled_send_on
                                                    ? formatDateDisplay(
                                                          row.scheduled_send_on,
                                                      )
                                                    : "—"}
                                                {row.sent_at && (
                                                    <Typography
                                                        variant="caption"
                                                        display="block"
                                                        color="text.secondary"
                                                    >
                                                        Poslato:{" "}
                                                        {formatDateTimeDisplay(
                                                            row.sent_at,
                                                        )}
                                                    </Typography>
                                                )}
                                            </TableCell>
                                            <TableCell>
                                                {row.company_name || "—"}
                                            </TableCell>
                                            <TableCell>
                                                {row.process_type_name || "—"}
                                            </TableCell>
                                            <TableCell>
                                                <Typography
                                                    variant="body2"
                                                    sx={{
                                                        maxWidth: 200,
                                                        overflow: "hidden",
                                                        textOverflow:
                                                            "ellipsis",
                                                        whiteSpace: "nowrap",
                                                    }}
                                                >
                                                    {(row.recipients_display
                                                        ?.length
                                                        ? row.recipients_display
                                                        : row.recipients
                                                    ).join(", ") || "—"}
                                                </Typography>
                                            </TableCell>
                                            <TableCell>
                                                <Chip
                                                    label={meta.label}
                                                    color={meta.color}
                                                    size="small"
                                                    variant="outlined"
                                                />
                                            </TableCell>
                                            <TableCell align="right">
                                                <Box
                                                    sx={{
                                                        display: "flex",
                                                        gap: 0.5,
                                                        justifyContent:
                                                            "flex-end",
                                                    }}
                                                >
                                                    <Button
                                                        size="small"
                                                        startIcon={
                                                            <VisibilityIcon />
                                                        }
                                                        onClick={() =>
                                                            this.handlePreview(
                                                                row.id,
                                                            )
                                                        }
                                                    >
                                                        Pregled
                                                    </Button>
                                                    {row.status ===
                                                        "FAILED" && (
                                                        <Button
                                                            size="small"
                                                            startIcon={
                                                                <ReplayIcon />
                                                            }
                                                            disabled={
                                                                retryingId ===
                                                                row.id
                                                            }
                                                            onClick={() =>
                                                                this.handleRetry(
                                                                    row.id,
                                                                )
                                                            }
                                                        >
                                                            Ponovi
                                                        </Button>
                                                    )}
                                                </Box>
                                            </TableCell>
                                        </TableRow>
                                    );
                                })
                            )}
                        </TableBody>
                    </Table>
                </Paper>

                <Box
                    sx={{
                        display: { xs: "flex", sm: "none" },
                        flexDirection: "column",
                        gap: 1.5,
                    }}
                >
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
                    ) : rows.length === 0 ? (
                        <EmptyState message="Nema slanja za izabrane filtere." />
                    ) : (
                        rows.map((row) => {
                            const meta = outboxStatusMeta(row.status);
                            return (
                                <Paper key={row.id} sx={{ p: 2 }}>
                                    <Box
                                        sx={{
                                            display: "flex",
                                            flexWrap: "wrap",
                                            gap: 0.5,
                                            mb: 1,
                                        }}
                                    >
                                        <Typography
                                            variant="body2"
                                            fontWeight={600}
                                        >
                                            {row.company_name || "—"}
                                        </Typography>
                                        <Typography
                                            variant="body2"
                                            color="text.secondary"
                                        >
                                            · {row.process_type_name}
                                        </Typography>
                                    </Box>
                                    <Box
                                        sx={{
                                            display: "flex",
                                            flexWrap: "wrap",
                                            gap: 0.5,
                                            mb: 1,
                                        }}
                                    >
                                        <Chip
                                            label={meta.label}
                                            color={meta.color}
                                            size="small"
                                            variant="outlined"
                                        />
                                        {row.scheduled_send_on && (
                                            <Chip
                                                label={formatDateDisplay(
                                                    row.scheduled_send_on,
                                                )}
                                                size="small"
                                                variant="outlined"
                                            />
                                        )}
                                    </Box>
                                    {(() => {
                                        const rcpts = row.recipients_display
                                            ?.length
                                            ? row.recipients_display
                                            : row.recipients;
                                        return rcpts.length > 0 ? (
                                            <Typography
                                                variant="caption"
                                                color="text.secondary"
                                                display="block"
                                            >
                                                {rcpts.join(", ")}
                                            </Typography>
                                        ) : null;
                                    })()}
                                    {row.last_error && (
                                        <Typography
                                            variant="caption"
                                            color="error"
                                            display="block"
                                            sx={{ mt: 0.5 }}
                                        >
                                            {row.last_error}
                                        </Typography>
                                    )}
                                    <Box
                                        sx={{ display: "flex", gap: 1, mt: 1 }}
                                    >
                                        <Button
                                            size="small"
                                            startIcon={<VisibilityIcon />}
                                            onClick={() =>
                                                this.handlePreview(row.id)
                                            }
                                        >
                                            Pregled
                                        </Button>
                                        {row.status === "FAILED" && (
                                            <Button
                                                size="small"
                                                startIcon={<ReplayIcon />}
                                                disabled={retryingId === row.id}
                                                onClick={() =>
                                                    this.handleRetry(row.id)
                                                }
                                            >
                                                Ponovi
                                            </Button>
                                        )}
                                    </Box>
                                </Paper>
                            );
                        })
                    )}
                </Box>

                <OutboxPreviewDialog
                    open={previewId != null}
                    loading={previewLoading}
                    preview={previewData}
                    onClose={this.handleClosePreview}
                />
            </Box>
        );
    }
}

interface OutboxPreviewDialogProps {
    open: boolean;
    loading: boolean;
    preview: NotificationOutboxPreview | null;
    onClose: () => void;
}

function OutboxPreviewDialog({
    open,
    loading,
    preview,
    onClose,
}: OutboxPreviewDialogProps) {
    const theme = useTheme();
    const fullScreen = useMediaQuery(theme.breakpoints.down("sm"));

    return (
        <Dialog
            open={open}
            onClose={onClose}
            fullScreen={fullScreen}
            maxWidth="md"
            fullWidth
        >
            <DialogTitle
                sx={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                }}
            >
                Pregled slanja
                <IconButton onClick={onClose} size="small">
                    <CloseIcon />
                </IconButton>
            </DialogTitle>
            <DialogContent dividers>
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
                ) : preview ? (
                    <Box
                        sx={{
                            display: "flex",
                            flexDirection: "column",
                            gap: 2,
                        }}
                    >
                        <Box>
                            <Typography
                                variant="caption"
                                color="text.secondary"
                            >
                                Primaoci
                            </Typography>
                            <Typography variant="body2">
                                {preview.recipients.join(", ") || "—"}
                            </Typography>
                        </Box>
                        <Divider />
                        <Box>
                            <Typography
                                variant="caption"
                                color="text.secondary"
                            >
                                Naslov
                            </Typography>
                            <Typography variant="body2" fontWeight={500}>
                                {preview.rendered_subject || "—"}
                            </Typography>
                        </Box>
                        <Divider />
                        <Box>
                            <Typography
                                variant="caption"
                                color="text.secondary"
                            >
                                Sadržaj
                            </Typography>
                            <Box
                                sx={{
                                    mt: 1,
                                    p: 2,
                                    bgcolor: "action.hover",
                                    borderRadius: 1,
                                    whiteSpace: "pre-wrap",
                                    fontFamily: "inherit",
                                    fontSize: "0.875rem",
                                }}
                            >
                                {preview.rendered_body || "—"}
                            </Box>
                        </Box>
                    </Box>
                ) : (
                    <EmptyState message="Pregled nije dostupan." />
                )}
            </DialogContent>
        </Dialog>
    );
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

const Connected = connect(mapStateToProps, mapDispatchToProps)(OutboxPageInner);

export default withNavigation(Connected);
