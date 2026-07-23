import { Component } from "react";

import {
    Box,
    Button,
    Chip,
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableRow,
    TextField,
    Typography,
} from "@mui/material";
import ContentCopyIcon from "@mui/icons-material/ContentCopy";
import SendIcon from "@mui/icons-material/Send";
import AddLinkIcon from "@mui/icons-material/AddLink";
import { enqueueSnackbar } from "notistack";

import {
    approveIntakeSubmission,
    createIntakeLink,
    getIntakeLinks,
    getIntakeSubmissions,
    rejectIntakeSubmission,
    sendIntakeLink,
} from "../api/processes";
import { PermissionGate } from "./PermissionGate";
import { ConfirmDialog, SectionCard, TableStateRow } from "../design";
import { formatDateTimeDisplay } from "../utils/date";

import type {
    ClientIntakeLink,
    ClientIntakeSubmission,
} from "../types/processes";

const KIND_LABELS: Record<string, string> = {
    EMPLOYEE: "Zaposleni",
    EQUIPMENT: "Oprema",
};

const STATUS_COLORS: Record<
    string,
    "warning" | "success" | "error" | "default"
> = {
    PENDING: "warning",
    APPROVED: "success",
    REJECTED: "error",
};

const submissionSummary = (submission: ClientIntakeSubmission): string => {
    const data = submission.data ?? {};
    if (submission.kind === "EMPLOYEE") {
        const name = [data.first_name, data.last_name]
            .filter(Boolean)
            .join(" ")
            .trim();
        return name || "—";
    }
    return (data.name as string | undefined) || "—";
};

const extractErrorDetail = (
    err:
        | { message?: string }
        | { response?: { data?: { detail?: string } } },
    fallback: string,
): string =>
    (err as { response?: { data?: { detail?: string } } }).response?.data
        ?.detail ??
    (err as { message?: string }).message ??
    fallback;

interface ClientIntakePanelProps {
    clientCompanyId: number;
    clientCompanyEmail?: string;
    onSubmissionApproved?: () => void;
}

interface ClientIntakePanelState {
    link: ClientIntakeLink | null;
    linkLoading: boolean;
    linkError: boolean;
    creatingLink: boolean;
    sendDialogOpen: boolean;
    sendTo: string;
    sending: boolean;
    submissions: ClientIntakeSubmission[];
    subsLoading: boolean;
    subsError: boolean;
    confirmAction: { id: number; kind: "approve" | "reject" } | null;
    confirmLoading: boolean;
}

export class ClientIntakePanel extends Component<
    ClientIntakePanelProps,
    ClientIntakePanelState
> {
    state: ClientIntakePanelState = {
        link: null,
        linkLoading: true,
        linkError: false,
        creatingLink: false,
        sendDialogOpen: false,
        sendTo: "",
        sending: false,
        submissions: [],
        subsLoading: true,
        subsError: false,
        confirmAction: null,
        confirmLoading: false,
    };

    componentDidMount(): void {
        this.loadLink();
        this.loadSubmissions();
    }

    componentDidUpdate(prevProps: ClientIntakePanelProps): void {
        if (prevProps.clientCompanyId !== this.props.clientCompanyId) {
            this.loadLink();
            this.loadSubmissions();
        }
    }

    loadLink = (): void => {
        const { clientCompanyId } = this.props;
        this.setState({ linkLoading: true, linkError: false });
        getIntakeLinks({ client_company_id: clientCompanyId })
            .then((items) => {
                const active = items.find((l) => l.is_active) ?? null;
                this.setState({
                    link: active,
                    linkLoading: false,
                    linkError: false,
                });
            })
            .catch(() => {
                this.setState({ linkLoading: false, linkError: true });
                enqueueSnackbar("Greška pri učitavanju linka za upitnik.", {
                    variant: "error",
                });
            });
    };

    loadSubmissions = (): void => {
        const { clientCompanyId } = this.props;
        this.setState({ subsLoading: true, subsError: false });
        getIntakeSubmissions({ client_company_id: clientCompanyId })
            .then((submissions) =>
                this.setState({
                    submissions,
                    subsLoading: false,
                    subsError: false,
                }),
            )
            .catch(() => {
                this.setState({ subsLoading: false, subsError: true });
                enqueueSnackbar("Greška pri učitavanju prijava klijenta.", {
                    variant: "error",
                });
            });
    };

    createLink = (): void => {
        const { clientCompanyId } = this.props;
        this.setState({ creatingLink: true });
        createIntakeLink(clientCompanyId)
            .then((link) => {
                this.setState({ link, creatingLink: false });
                enqueueSnackbar("Link za upitnik je napravljen.", {
                    variant: "success",
                });
            })
            .catch((err) => {
                enqueueSnackbar(
                    extractErrorDetail(err, "Greška pri pravljenju linka."),
                    { variant: "error" },
                );
                this.setState({ creatingLink: false });
            });
    };

    copyLink = (): void => {
        const { link } = this.state;
        if (!link) return;
        navigator.clipboard
            .writeText(link.public_url)
            .then(() => {
                enqueueSnackbar("Link je kopiran.", { variant: "success" });
            })
            .catch(() => {
                enqueueSnackbar("Kopiranje linka nije uspelo.", {
                    variant: "error",
                });
            });
    };

    openSendDialog = (): void => {
        this.setState({
            sendDialogOpen: true,
            sendTo: this.props.clientCompanyEmail ?? "",
        });
    };

    closeSendDialog = (): void => {
        this.setState({ sendDialogOpen: false, sending: false });
    };

    sendLink = (): void => {
        const { link, sendTo } = this.state;
        if (!link) return;
        this.setState({ sending: true });
        sendIntakeLink(link.id, sendTo.trim() || undefined)
            .then((res) => {
                enqueueSnackbar(`Email poslat na ${res.to}.`, {
                    variant: "success",
                });
                this.setState({ sending: false, sendDialogOpen: false });
            })
            .catch((err) => {
                enqueueSnackbar(
                    extractErrorDetail(err, "Slanje emaila nije uspelo."),
                    { variant: "error" },
                );
                this.setState({ sending: false });
            });
    };

    requestApprove = (id: number): void => {
        this.setState({ confirmAction: { id, kind: "approve" } });
    };

    requestReject = (id: number): void => {
        this.setState({ confirmAction: { id, kind: "reject" } });
    };

    cancelConfirm = (): void => {
        this.setState({ confirmAction: null, confirmLoading: false });
    };

    executeConfirm = (): void => {
        const { confirmAction } = this.state;
        if (!confirmAction) return;
        this.setState({ confirmLoading: true });
        const request =
            confirmAction.kind === "approve"
                ? approveIntakeSubmission(confirmAction.id)
                : rejectIntakeSubmission(confirmAction.id);
        request
            .then((updated) => {
                this.setState((prev) => ({
                    submissions: prev.submissions.map((s) =>
                        s.id === updated.id ? updated : s,
                    ),
                    confirmAction: null,
                    confirmLoading: false,
                }));
                if (confirmAction.kind === "approve") {
                    if (this.props.onSubmissionApproved) {
                        this.props.onSubmissionApproved();
                        enqueueSnackbar("Prijava je odobrena.", {
                            variant: "success",
                        });
                    } else {
                        enqueueSnackbar(
                            "Odobreno — osvežite stranicu.",
                            { variant: "success" },
                        );
                    }
                } else {
                    enqueueSnackbar("Prijava je odbijena.", {
                        variant: "success",
                    });
                }
            })
            .catch((err) => {
                enqueueSnackbar(
                    extractErrorDetail(err, "Greška pri obradi prijave."),
                    { variant: "error" },
                );
                this.setState({ confirmLoading: false });
            });
    };

    render() {
        const {
            link,
            linkLoading,
            linkError,
            creatingLink,
            sendDialogOpen,
            sendTo,
            sending,
            submissions,
            subsLoading,
            subsError,
            confirmAction,
            confirmLoading,
        } = this.state;

        return (
            <>
                <SectionCard title="Upitnik klijentu">
                    <Box
                        sx={{
                            display: "flex",
                            flexDirection: "column",
                            gap: 1.5,
                        }}
                    >
                        {linkLoading ? (
                            <Typography variant="body2" color="text.secondary">
                                Učitavanje...
                            </Typography>
                        ) : linkError ? (
                            <Box>
                                <Typography variant="body2" color="error">
                                    Greška pri učitavanju linka.
                                </Typography>
                                <Button size="small" onClick={this.loadLink}>
                                    Pokušaj ponovo
                                </Button>
                            </Box>
                        ) : link ? (
                            <Box
                                sx={{
                                    display: "flex",
                                    flexWrap: "wrap",
                                    alignItems: "center",
                                    gap: 1,
                                }}
                            >
                                <TextField
                                    size="small"
                                    value={link.public_url}
                                    slotProps={{
                                        input: { readOnly: true },
                                    }}
                                    sx={{ flex: 1, minWidth: 260 }}
                                />
                                <Button
                                    size="small"
                                    variant="outlined"
                                    startIcon={<ContentCopyIcon />}
                                    onClick={this.copyLink}
                                >
                                    Kopiraj
                                </Button>
                                <PermissionGate permission="partners.change_clientintakelink">
                                    <Button
                                        size="small"
                                        variant="contained"
                                        startIcon={<SendIcon />}
                                        onClick={this.openSendDialog}
                                    >
                                        Pošalji mejlom
                                    </Button>
                                </PermissionGate>
                            </Box>
                        ) : (
                            <PermissionGate permission="partners.add_clientintakelink">
                                <Button
                                    size="small"
                                    variant="contained"
                                    startIcon={<AddLinkIcon />}
                                    disabled={creatingLink}
                                    onClick={this.createLink}
                                >
                                    {creatingLink
                                        ? "Pravim link..."
                                        : "Napravi link"}
                                </Button>
                            </PermissionGate>
                        )}
                    </Box>
                </SectionCard>

                <SectionCard title="Prijave klijenta" dense>
                    <Box sx={{ overflow: "auto" }}>
                        <Table size="small">
                            <TableHead>
                                <TableRow>
                                    <TableCell>Datum</TableCell>
                                    <TableCell>Vrsta</TableCell>
                                    <TableCell>Sažetak</TableCell>
                                    <TableCell>Status</TableCell>
                                    <TableCell align="right" />
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {subsLoading ? (
                                    <TableStateRow colSpan={5} state="loading" />
                                ) : subsError ? (
                                    <TableStateRow
                                        colSpan={5}
                                        state="error"
                                        onRetry={this.loadSubmissions}
                                    />
                                ) : submissions.length === 0 ? (
                                    <TableStateRow
                                        colSpan={5}
                                        state="empty"
                                        emptyMessage="Nema prijava klijenta."
                                    />
                                ) : (
                                    submissions.map((s) => (
                                        <TableRow key={s.id}>
                                            <TableCell>
                                                {formatDateTimeDisplay(
                                                    s.created_at,
                                                )}
                                            </TableCell>
                                            <TableCell>
                                                {s.kind_display ??
                                                    KIND_LABELS[s.kind] ??
                                                    s.kind}
                                            </TableCell>
                                            <TableCell>
                                                {submissionSummary(s)}
                                            </TableCell>
                                            <TableCell>
                                                <Chip
                                                    size="small"
                                                    label={
                                                        s.status_display ??
                                                        s.status
                                                    }
                                                    color={
                                                        STATUS_COLORS[
                                                            s.status
                                                        ] ?? "default"
                                                    }
                                                />
                                            </TableCell>
                                            <TableCell align="right">
                                                {s.status === "PENDING" && (
                                                    <Box
                                                        sx={{
                                                            display: "flex",
                                                            gap: 0.5,
                                                            justifyContent:
                                                                "flex-end",
                                                        }}
                                                    >
                                                        <PermissionGate permission="partners.change_clientintakesubmission">
                                                            <Button
                                                                size="small"
                                                                variant="outlined"
                                                                color="success"
                                                                onClick={() =>
                                                                    this.requestApprove(
                                                                        s.id,
                                                                    )
                                                                }
                                                            >
                                                                Odobri
                                                            </Button>
                                                        </PermissionGate>
                                                        <PermissionGate permission="partners.change_clientintakesubmission">
                                                            <Button
                                                                size="small"
                                                                variant="outlined"
                                                                color="error"
                                                                onClick={() =>
                                                                    this.requestReject(
                                                                        s.id,
                                                                    )
                                                                }
                                                            >
                                                                Odbij
                                                            </Button>
                                                        </PermissionGate>
                                                    </Box>
                                                )}
                                            </TableCell>
                                        </TableRow>
                                    ))
                                )}
                            </TableBody>
                        </Table>
                    </Box>
                </SectionCard>

                <Dialog
                    open={sendDialogOpen}
                    onClose={this.closeSendDialog}
                    maxWidth="sm"
                    fullWidth
                >
                    <DialogTitle>Pošalji upitnik mejlom</DialogTitle>
                    <DialogContent>
                        <TextField
                            margin="dense"
                            label="Email adresa"
                            fullWidth
                            type="email"
                            value={sendTo}
                            onChange={(e) =>
                                this.setState({ sendTo: e.target.value })
                            }
                        />
                    </DialogContent>
                    <DialogActions>
                        <Button
                            onClick={this.closeSendDialog}
                            disabled={sending}
                        >
                            Odustani
                        </Button>
                        <Button
                            variant="contained"
                            disabled={sending}
                            onClick={this.sendLink}
                        >
                            {sending ? "Šaljem..." : "Pošalji"}
                        </Button>
                    </DialogActions>
                </Dialog>

                <ConfirmDialog
                    open={confirmAction != null}
                    title={
                        confirmAction?.kind === "approve"
                            ? "Odobri prijavu"
                            : "Odbij prijavu"
                    }
                    message={
                        confirmAction?.kind === "approve"
                            ? "Da li si siguran da želiš da odobriš ovu prijavu?"
                            : "Da li si siguran da želiš da odbiješ ovu prijavu?"
                    }
                    confirmLabel={
                        confirmAction?.kind === "approve" ? "Odobri" : "Odbij"
                    }
                    confirmColor={
                        confirmAction?.kind === "approve" ? "primary" : "error"
                    }
                    loading={confirmLoading}
                    onConfirm={this.executeConfirm}
                    onClose={this.cancelConfirm}
                />
            </>
        );
    }
}
