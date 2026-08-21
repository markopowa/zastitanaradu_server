import { Component } from "react";
import { connect } from "react-redux";
import { Navigate } from "react-router-dom";

import {
    Box,
    Button,
    Chip,
    IconButton,
    LinearProgress,
    Paper,
    Stack,
    Tooltip,
    Typography,
} from "@mui/material";
import PlayArrowIcon from "@mui/icons-material/PlayArrow";
import StopIcon from "@mui/icons-material/Stop";
import OpenInNewIcon from "@mui/icons-material/OpenInNew";
import CheckIcon from "@mui/icons-material/Check";
import DeleteSweepIcon from "@mui/icons-material/DeleteSweep";
import { enqueueSnackbar } from "notistack";

import {
    broadcastTestFill,
    endTestSession,
    getTestSessionId,
    isTestSessionActive,
    startTestSession,
    subscribeTestFillResults,
} from "../testFlow/channel";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

import doc01 from "../testFlow/guides/01_unos_firme.md?raw";
import doc02 from "../testFlow/guides/02_dokumentacija_firme.md?raw";
import doc03 from "../testFlow/guides/03_zaposleni.md?raw";
import doc04 from "../testFlow/guides/04_lekarski.md?raw";
import doc05 from "../testFlow/guides/05_oprema_nalazi.md?raw";
import doc06 from "../testFlow/guides/06_podsetnici_slanja.md?raw";
import doc07 from "../testFlow/guides/07_korisnici.md?raw";

import { TEST_FLOW_PHASES, TEST_FLOW_SECTIONS } from "../testFlow/sections";
import type { TestFlowSection, TestFlowSectionMeta } from "../testFlow/types";
import { setLastPath } from "../store/locationSlice";
import {
    previewIntegrationTestCleanup,
    runIntegrationTestCleanup,
} from "../api/processes";
import { ConfirmDialog } from "../design";

import type { AppDispatch, RootState } from "../store";
import type { IntegrationTestCompanyRow } from "../api/processes";

const DOCS_BY_NUM: Record<string, string> = {
    "01": doc01,
    "02": doc02,
    "03": doc03,
    "04": doc04,
    "05": doc05,
    "06": doc06,
    "07": doc07,
};

interface StateProps {
    isStaff: boolean;
}

interface DispatchProps {
    setLastPath: (path: string) => void;
}

interface State {
    sessionActive: boolean;
    sessionId: string | null;
    clickedSections: Partial<Record<TestFlowSection, boolean>>;
    lastResults: Partial<Record<TestFlowSection, boolean>>;
    activeNum: string;
    cleanupPreview: IntegrationTestCompanyRow[];
    cleanupConfirmOpen: boolean;
    cleanupLoading: boolean;
}

class IntegrationTestsPage extends Component<
    StateProps & DispatchProps,
    State
> {
    private unsubscribeResults: (() => void) | null = null;

    state: State = {
        sessionActive: isTestSessionActive(),
        sessionId: getTestSessionId(),
        clickedSections: {},
        lastResults: {},
        activeNum: "01",
        cleanupPreview: [],
        cleanupConfirmOpen: false,
        cleanupLoading: false,
    };

    componentDidMount(): void {
        this.props.setLastPath("/integration-tests");
        this.unsubscribeResults = subscribeTestFillResults(
            (section, handled) => {
                this.setState((prev) => ({
                    lastResults: { ...prev.lastResults, [section]: handled },
                }));
            },
        );
        this.refreshCleanupPreview();
    }

    componentWillUnmount(): void {
        this.unsubscribeResults?.();
    }

    refreshCleanupPreview = (): void => {
        previewIntegrationTestCleanup()
            .then((data) => {
                this.setState((prev) => ({
                    ...prev,
                    cleanupPreview: data.companies,
                }));
            })
            .catch(() => {
                this.setState((prev) => ({ ...prev, cleanupPreview: [] }));
            });
    };

    handleOpenCleanupConfirm = (): void => {
        this.setState((prev) => ({ ...prev, cleanupLoading: true }));
        previewIntegrationTestCleanup()
            .then((data) => {
                this.setState((prev) => ({
                    ...prev,
                    cleanupPreview: data.companies,
                    cleanupConfirmOpen: data.companies.length > 0,
                    cleanupLoading: false,
                }));
                if (data.companies.length === 0) {
                    enqueueSnackbar("Nema test firmi za brisanje.", {
                        variant: "info",
                    });
                }
            })
            .catch(() => {
                this.setState((prev) => ({ ...prev, cleanupLoading: false }));
                enqueueSnackbar("Greška pri učitavanju liste test firmi.", {
                    variant: "error",
                });
            });
    };

    handleConfirmCleanup = (): void => {
        this.setState((prev) => ({ ...prev, cleanupLoading: true }));
        runIntegrationTestCleanup()
            .then((result) => {
                const n = result.companies.length;
                this.setState((prev) => ({
                    ...prev,
                    cleanupLoading: false,
                    cleanupConfirmOpen: false,
                    cleanupPreview: [],
                }));
                enqueueSnackbar(
                    n === 0
                        ? "Nema šta da se obriše."
                        : `Obrisano ${n} test firmi (i vezani podaci).`,
                    { variant: "success" },
                );
            })
            .catch(() => {
                this.setState((prev) => ({ ...prev, cleanupLoading: false }));
                enqueueSnackbar("Brisanje nije uspelo.", { variant: "error" });
            });
    };

    handleStartSession = (): void => {
        const id = crypto.randomUUID();
        startTestSession(id);
        this.setState({
            sessionActive: true,
            sessionId: id,
            clickedSections: {},
            lastResults: {},
        });
    };

    handleEndSession = (): void => {
        endTestSession();
        this.setState({
            sessionActive: false,
            sessionId: null,
            clickedSections: {},
            lastResults: {},
        });
    };

    handleOpenAppTab = (): void => {
        const id = this.state.sessionId ?? getTestSessionId();
        if (!id) return;
        window.open(`${window.location.origin}/danas?testSession=${id}`);
    };

    handleOpenRoute = (route: string): void => {
        const id = this.state.sessionId ?? getTestSessionId();
        const qs = id ? `?testSession=${id}` : "";
        window.open(`${window.location.origin}${route}${qs}`);
    };

    handleFill = (section: TestFlowSection): void => {
        this.setState((prev) => ({
            clickedSections: { ...prev.clickedSections, [section]: true },
        }));
        broadcastTestFill(section);
    };

    clickedCount = (): number => {
        return Object.keys(this.state.clickedSections).length;
    };

    renderSectionRow = (section: TestFlowSectionMeta): React.ReactNode => {
        const { clickedSections, lastResults } = this.state;
        const clicked = clickedSections[section.id] === true;
        const failed = lastResults[section.id] === false;

        return (
            <Box
                key={section.id}
                sx={{
                    display: "flex",
                    alignItems: "center",
                    gap: 1.5,
                    py: 1,
                    px: 2,
                    borderTop: "1px solid",
                    borderColor: "divider",
                    bgcolor: clicked ? "success.50" : undefined,
                    "&:hover": {
                        bgcolor: clicked ? "success.50" : "action.hover",
                    },
                }}
            >
                <Chip
                    label={section.badge ?? section.id}
                    size="small"
                    variant={clicked ? "filled" : "outlined"}
                    color={clicked ? "success" : "default"}
                    sx={{ minWidth: 44, fontWeight: 600, fontSize: "0.7rem" }}
                />
                <Tooltip
                    title={section.hint}
                    placement="top-start"
                    enterDelay={400}
                >
                    <Box sx={{ flex: 1, minWidth: 0 }}>
                        <Typography variant="body2" fontWeight={500} noWrap>
                            {section.label}
                        </Typography>
                        {failed && (
                            <Typography variant="caption" color="error">
                                Forma nije primila podatke
                            </Typography>
                        )}
                    </Box>
                </Tooltip>
                <Stack direction="row" spacing={0.5} flexShrink={0}>
                    {section.route && (
                        <Tooltip
                            title={section.routeLabel ?? "Otvori stranicu"}
                        >
                            <IconButton
                                size="small"
                                onClick={() =>
                                    this.handleOpenRoute(section.route!)
                                }
                            >
                                <OpenInNewIcon fontSize="small" />
                            </IconButton>
                        </Tooltip>
                    )}
                    <Button
                        size="small"
                        variant={clicked ? "contained" : "outlined"}
                        color={clicked ? "success" : "primary"}
                        disableElevation
                        startIcon={clicked ? <CheckIcon /> : undefined}
                        onClick={() => this.handleFill(section.id)}
                        sx={{ minWidth: 88 }}
                    >
                        Popuni
                    </Button>
                </Stack>
            </Box>
        );
    };

    renderPhase = (
        phase: (typeof TEST_FLOW_PHASES)[number],
    ): React.ReactNode => {
        const sections = TEST_FLOW_SECTIONS.filter(
            (s) => s.phaseId === phase.id,
        );

        const clickedInPhase = sections.filter(
            (s) => this.state.clickedSections[s.id],
        ).length;

        return (
            <Paper
                key={phase.id}
                variant="outlined"
                sx={{ overflow: "hidden" }}
            >
                <Box
                    onClick={() =>
                        this.setState({ activeNum: phase.id.slice(0, 2) })
                    }
                    sx={{
                        px: 2,
                        py: 1.25,
                        bgcolor:
                            this.state.activeNum === phase.id.slice(0, 2)
                                ? "action.selected"
                                : "action.hover",
                        borderBottom: "1px solid",
                        borderColor: "divider",
                        display: "flex",
                        alignItems: "baseline",
                        justifyContent: "space-between",
                        gap: 1,
                        cursor: "pointer",
                    }}
                >
                    <Box>
                        <Typography variant="subtitle2">
                            {phase.title}
                        </Typography>
                        {phase.description && (
                            <Typography
                                variant="caption"
                                color="text.secondary"
                            >
                                {phase.description}
                            </Typography>
                        )}
                    </Box>
                    {this.state.sessionActive && sections.length > 0 && (
                        <Typography variant="caption" color="text.secondary">
                            {clickedInPhase}/{sections.length}
                        </Typography>
                    )}
                </Box>
                {sections.length === 0 ? (
                    <Box sx={{ px: 2, py: 1.5 }}>
                        <Typography variant="caption" color="text.secondary">
                            Ručni/provera korak — uputstvo je u doc-u desno.
                        </Typography>
                    </Box>
                ) : (
                    sections.map((section) => this.renderSectionRow(section))
                )}
            </Paper>
        );
    };

    render() {
        if (!this.props.isStaff) {
            return <Navigate to="/danas" replace />;
        }

        const {
            sessionActive,
            cleanupPreview,
            cleanupConfirmOpen,
            cleanupLoading,
        } = this.state;
        const total = TEST_FLOW_SECTIONS.length;
        const done = this.clickedCount();
        const progress = total > 0 ? (done / total) * 100 : 0;
        const cleanupNames = cleanupPreview
            .map((c) => c.name)
            .join(", ");

        return (
            <Box
                sx={{
                    display: "flex",
                    flexDirection: "column",
                    gap: 2,
                    width: "100%",
                }}
            >
                <Box sx={{ flexShrink: 0 }}>
                    <Typography variant="h6" gutterBottom>
                        Integration tests
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                        Otvori formu u app tabu → Popuni. Zeleno = kliknuto.
                    </Typography>
                    <Stack
                        direction="row"
                        spacing={1}
                        alignItems="center"
                        sx={{ mt: 1.5 }}
                        flexWrap="wrap"
                        useFlexGap
                    >
                        <Button
                            variant="outlined"
                            color="error"
                            size="small"
                            startIcon={<DeleteSweepIcon />}
                            disabled={cleanupLoading}
                            onClick={this.handleOpenCleanupConfirm}
                        >
                            Očisti test firme
                            {cleanupPreview.length > 0
                                ? ` (${cleanupPreview.length})`
                                : ""}
                        </Button>
                        <Typography variant="caption" color="text.secondary">
                            Briše UKRAS TEST / VERIFY_TMP / Integration test —
                            ne katalog, ne prave klijente.
                        </Typography>
                    </Stack>
                </Box>

                {!sessionActive ? (
                    <Paper variant="outlined" sx={{ p: 2 }}>
                        <Button
                            variant="contained"
                            startIcon={<PlayArrowIcon />}
                            onClick={this.handleStartSession}
                        >
                            Pokreni sesiju
                        </Button>
                    </Paper>
                ) : (
                    <Box
                        sx={{
                            display: "flex",
                            flexDirection: { xs: "column", md: "row" },
                            gap: 2,
                            alignItems: "flex-start",
                        }}
                    >
                        <Box
                            sx={{
                                width: "100%",
                                flex: { md: "0 0 400px" },
                                display: "flex",
                                flexDirection: "column",
                                gap: 2,
                            }}
                        >
                            <Paper variant="outlined" sx={{ p: 2 }}>
                                <Stack
                                    direction="row"
                                    spacing={1}
                                    flexWrap="wrap"
                                    alignItems="center"
                                    sx={{ mb: 1.5 }}
                                >
                                    <Button
                                        size="small"
                                        variant="contained"
                                        startIcon={<OpenInNewIcon />}
                                        onClick={this.handleOpenAppTab}
                                    >
                                        App tab
                                    </Button>
                                    <Button
                                        size="small"
                                        variant="outlined"
                                        color="error"
                                        startIcon={<StopIcon />}
                                        onClick={this.handleEndSession}
                                    >
                                        Završi
                                    </Button>
                                    <Typography
                                        variant="caption"
                                        color="text.secondary"
                                        sx={{ ml: "auto !important" }}
                                    >
                                        {done}/{total} kliknuto
                                    </Typography>
                                </Stack>
                                <LinearProgress
                                    variant="determinate"
                                    value={progress}
                                    color="success"
                                    sx={{ height: 6, borderRadius: 1 }}
                                />
                            </Paper>
                            {TEST_FLOW_PHASES.map((phase) =>
                                this.renderPhase(phase),
                            )}
                        </Box>
                        <Paper
                            variant="outlined"
                            sx={{
                                width: "100%",
                                flex: { md: 1 },
                                position: { md: "sticky" },
                                top: { md: 8 },
                                alignSelf: { md: "flex-start" },
                            }}
                        >
                            <Box
                                sx={{
                                    p: 3,
                                    maxHeight: { md: "calc(100vh - 96px)" },
                                    overflow: { md: "auto" },
                                    "& > *:first-of-type": { mt: 0 },
                                    "& > *:last-child": { mb: 0 },
                                    "& h1": { fontSize: "1.3rem", mt: 0 },
                                    "& h2": { fontSize: "1.1rem" },
                                    "& h3": { fontSize: "1rem" },
                                    "& code": {
                                        bgcolor: "action.hover",
                                        px: 0.5,
                                        borderRadius: 0.5,
                                    },
                                    "& pre": {
                                        bgcolor: "action.hover",
                                        p: 1,
                                        borderRadius: 1,
                                        overflow: "auto",
                                    },
                                    "& table": { borderCollapse: "collapse" },
                                    "& th, & td": {
                                        border: "1px solid",
                                        borderColor: "divider",
                                        px: 1,
                                        py: 0.5,
                                    },
                                }}
                            >
                                <ReactMarkdown remarkPlugins={[remarkGfm]}>
                                    {DOCS_BY_NUM[this.state.activeNum] ||
                                        "Nema doca za ovu temu."}
                                </ReactMarkdown>
                            </Box>
                        </Paper>
                    </Box>
                )}
                <ConfirmDialog
                    open={cleanupConfirmOpen}
                    title="Očisti test firme?"
                    message={
                        cleanupPreview.length === 0
                            ? "Nema test firmi."
                            : `Obrisati ${cleanupPreview.length} firmi i sav vezani sadržaj (zaposleni, oprema, akti, aktivnosti)?\n\n${cleanupNames}`
                    }
                    confirmLabel="Obriši"
                    loading={cleanupLoading}
                    onConfirm={this.handleConfirmCleanup}
                    onClose={() =>
                        this.setState((prev) => ({
                            ...prev,
                            cleanupConfirmOpen: false,
                        }))
                    }
                />
            </Box>
        );
    }
}

const mapStateToProps = (state: RootState): StateProps => ({
    isStaff: state.auth.user?.is_staff === true,
});

const mapDispatchToProps = (dispatch: AppDispatch): DispatchProps => ({
    setLastPath: (path) => dispatch(setLastPath(path)),
});

export default connect(
    mapStateToProps,
    mapDispatchToProps,
)(IntegrationTestsPage);
