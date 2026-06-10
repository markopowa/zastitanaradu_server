import { Component } from "react";
import { connect } from "react-redux";
import { Navigate } from "react-router-dom";

import {
    Alert,
    Box,
    Button,
    Divider,
    List,
    ListItem,
    ListItemText,
    Paper,
    Typography,
} from "@mui/material";
import PlayArrowIcon from "@mui/icons-material/PlayArrow";
import StopIcon from "@mui/icons-material/Stop";
import OpenInNewIcon from "@mui/icons-material/OpenInNew";

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

    renderSectionRow = (section: TestFlowSectionMeta): React.ReactNode => {
        const { clickedSections, lastResults } = this.state;
        const clicked = clickedSections[section.id] === true;
        const result = lastResults[section.id];
        let secondary = section.hint;
        if (result === false) {
            secondary = "✗ Forma nije primila — proveri tab i otvorenu formu";
        }
        return (
            <ListItem
                key={section.id}
                sx={{
                    alignItems: "flex-start",
                    bgcolor: clicked ? "success.50" : undefined,
                }}
                secondaryAction={
                    <Box
                        sx={{
                            display: "flex",
                            flexDirection: "column",
                            gap: 0.5,
                            alignItems: "flex-end",
                        }}
                    >
                        <Button
                            size="small"
                            variant={clicked ? "contained" : "outlined"}
                            color={clicked ? "success" : "primary"}
                            onClick={() => this.handleFill(section.id)}
                        >
                            Popuni
                        </Button>
                        {section.route && (
                            <Button
                                size="small"
                                variant="text"
                                startIcon={<OpenInNewIcon fontSize="small" />}
                                onClick={() =>
                                    this.handleOpenRoute(section.route!)
                                }
                            >
                                {section.routeLabel ?? "Otvori"}
                            </Button>
                        )}
                    </Box>
                }
            >
                <ListItemText
                    primary={section.label}
                    secondary={secondary}
                    slotProps={{
                        secondary: { sx: { whiteSpace: "pre-wrap" } },
                    }}
                />
            </ListItem>
        );
    };

    render() {
        if (!this.props.isSuperuser) {
            return <Navigate to="/dashboard" replace />;
        }

        const { sessionActive, sessionId } = this.state;

        return (
            <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
                <Typography variant="h6">Integration tests</Typography>
                <Typography variant="body2" color="text.secondary">
                    Otvori formu u app tabu, pa klikni Popuni. Dugme postane
                    zeleno kad ga klikneš.
                </Typography>

                {!sessionActive ? (
                    <Paper sx={{ p: 2 }}>
                        <Button
                            variant="contained"
                            startIcon={<PlayArrowIcon />}
                            onClick={this.handleStartSession}
                        >
                            Pokreni test sesiju
                        </Button>
                    </Paper>
                ) : (
                    <Paper
                        sx={{
                            p: 2,
                            display: "flex",
                            flexDirection: "column",
                            gap: 2,
                        }}
                    >
                        <Alert severity="info">
                            Idi gde ti treba u app tabu, otvori formu, pa
                            Popuni ovde.
                        </Alert>
                        <Typography variant="body2">
                            Session: {sessionId}
                        </Typography>
                        <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap" }}>
                            <Button
                                variant="outlined"
                                startIcon={<OpenInNewIcon />}
                                onClick={this.handleOpenAppTab}
                            >
                                Otvori app tab
                            </Button>
                            <Button
                                variant="outlined"
                                color="error"
                                startIcon={<StopIcon />}
                                onClick={this.handleEndSession}
                            >
                                Završi sesiju
                            </Button>
                        </Box>
                    </Paper>
                )}

                {sessionActive &&
                    TEST_FLOW_PHASES.map((phase) => {
                        const sections = TEST_FLOW_SECTIONS.filter(
                            (s) => s.phaseId === phase.id,
                        );
                        if (sections.length === 0) return null;
                        return (
                            <Paper key={phase.id} sx={{ overflow: "hidden" }}>
                                <Box sx={{ px: 2, pt: 2, pb: 1 }}>
                                    <Typography variant="subtitle1">
                                        {phase.title}
                                    </Typography>
                                    {phase.description && (
                                        <Typography
                                            variant="body2"
                                            color="text.secondary"
                                        >
                                            {phase.description}
                                        </Typography>
                                    )}
                                </Box>
                                <Divider />
                                <List dense disablePadding>
                                    {sections.map((section) =>
                                        this.renderSectionRow(section),
                                    )}
                                </List>
                            </Paper>
                        );
                    })}
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
