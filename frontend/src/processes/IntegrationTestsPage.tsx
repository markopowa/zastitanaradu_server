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
import { TEST_FLOW_PHASES, TEST_FLOW_SECTIONS } from "../testFlow/sections";
import type { TestFlowSection, TestFlowSectionMeta } from "../testFlow/types";
import { setLastPath } from "../store/locationSlice";

import type { AppDispatch, RootState } from "../store";

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
        window.open(`${window.location.origin}/dashboard?testSession=${id}`);
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
        if (sections.length === 0) return null;

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
                    sx={{
                        px: 2,
                        py: 1.25,
                        bgcolor: "grey.50",
                        borderBottom: "1px solid",
                        borderColor: "divider",
                        display: "flex",
                        alignItems: "baseline",
                        justifyContent: "space-between",
                        gap: 1,
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
                    {this.state.sessionActive && (
                        <Typography variant="caption" color="text.secondary">
                            {clickedInPhase}/{sections.length}
                        </Typography>
                    )}
                </Box>
                {sections.map((section) => this.renderSectionRow(section))}
            </Paper>
        );
    };

    render() {
        if (!this.props.isSuperuser) {
            return <Navigate to="/dashboard" replace />;
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
                <Box>
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
                )}

                {sessionActive &&
                    TEST_FLOW_PHASES.map((phase) => this.renderPhase(phase))}
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
