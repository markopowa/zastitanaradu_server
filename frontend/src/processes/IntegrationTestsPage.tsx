import { Component } from "react";
import { connect } from "react-redux";
import { Navigate } from "react-router-dom";

import {
    Alert,
    Box,
    Button,
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
import { TEST_FLOW_SECTIONS } from "../testFlow/sections";
import type { TestFlowSection } from "../testFlow/types";
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
            lastResults: {},
        });
    };

    handleEndSession = (): void => {
        endTestSession();
        this.setState({
            sessionActive: false,
            sessionId: null,
            lastResults: {},
        });
    };

    handleOpenAppTab = (): void => {
        const id = this.state.sessionId ?? getTestSessionId();
        if (!id) return;
        window.open(`${window.location.origin}/dashboard?testSession=${id}`);
    };

    handleFill = (section: TestFlowSection): void => {
        broadcastTestFill(section);
    };

    render() {
        if (!this.props.isSuperuser) {
            return <Navigate to="/dashboard" replace />;
        }

        const { sessionActive, sessionId, lastResults } = this.state;

        return (
            <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
                <Typography variant="h6">Integration tests</Typography>
                <Typography variant="body2" color="text.secondary">
                    Popunjava test forme iz instructions/test_flow.md u drugom
                    tabu. Ne šalje Save — samo polja.
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
                            Sesija aktivna. Otvori drugi tab sa istom sesijom,
                            idi na formu, pa klikni Popuni ovde.
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

                {sessionActive && (
                    <List dense component={Paper}>
                        {TEST_FLOW_SECTIONS.map((section) => {
                            const result = lastResults[section.id];
                            let secondary = section.hint;
                            if (result === true) {
                                secondary = "✓ Popunjeno";
                            } else if (result === false) {
                                secondary =
                                    "✗ Nije primljeno — proveri tab i formu";
                            }
                            return (
                                <ListItem
                                    key={section.id}
                                    secondaryAction={
                                        <Button
                                            size="small"
                                            variant="outlined"
                                            onClick={() =>
                                                this.handleFill(section.id)
                                            }
                                        >
                                            Popuni
                                        </Button>
                                    }
                                >
                                    <ListItemText
                                        primary={section.label}
                                        secondary={secondary}
                                    />
                                </ListItem>
                            );
                        })}
                    </List>
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
