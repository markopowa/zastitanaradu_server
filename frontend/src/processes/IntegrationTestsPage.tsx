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

import doc01 from "../testFlow/guides/01_uvod.md?raw";
import doc02 from "../testFlow/guides/02_podesavanje.md?raw";
import doc03 from "../testFlow/guides/03_unos_firme.md?raw";
import doc04 from "../testFlow/guides/04_firma_pregled.md?raw";
import doc05 from "../testFlow/guides/05_dokumenta.md?raw";
import doc06 from "../testFlow/guides/06_zaposleni_oprema.md?raw";
import doc07 from "../testFlow/guides/07_obaveze_aktivnosti.md?raw";
import doc08 from "../testFlow/guides/08_podsetnici_slanja.md?raw";
import doc09 from "../testFlow/guides/09_obrazac1.md?raw";
import doc10 from "../testFlow/guides/10_korisnici_uloge.md?raw";

import { TEST_FLOW_PHASES, TEST_FLOW_SECTIONS } from "../testFlow/sections";
import type { TestFlowSection, TestFlowSectionMeta } from "../testFlow/types";
import { setLastPath } from "../store/locationSlice";

import type { AppDispatch, RootState } from "../store";

const DOCS_BY_NUM: Record<string, string> = {
    "01": doc01,
    "02": doc02,
    "03": doc03,
    "04": doc04,
    "05": doc05,
    "06": doc06,
    "07": doc07,
    "08": doc08,
    "09": doc09,
    "10": doc10,
};

interface StateProps {
    isSuperuser: boolean;
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
    }

    componentWillUnmount(): void {
        this.unsubscribeResults?.();
    }

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
                    label={section.id}
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
                            Nema formi za popunjavanje — ručni/provera korak. Vidi
                            instructions/test/{phase.id}.md
                        </Typography>
                    </Box>
                ) : (
                    sections.map((section) => this.renderSectionRow(section))
                )}
            </Paper>
        );
    };

    render() {
        if (!this.props.isSuperuser) {
            return <Navigate to="/danas" replace />;
        }

        const { sessionActive } = this.state;
        const total = TEST_FLOW_SECTIONS.length;
        const done = this.clickedCount();
        const progress = total > 0 ? (done / total) * 100 : 0;

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
            </Box>
        );
    }
}

const mapStateToProps = (state: RootState): StateProps => ({
    isSuperuser: state.auth.user?.is_superuser === true,
});

const mapDispatchToProps = (dispatch: AppDispatch): DispatchProps => ({
    setLastPath: (path) => dispatch(setLastPath(path)),
});

export default connect(
    mapStateToProps,
    mapDispatchToProps,
)(IntegrationTestsPage);
