import { Component, type ReactNode } from "react";
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

import doc01 from "../testFlow/guides/01_wizard.md?raw";
import doc02 from "../testFlow/guides/02_pregled.md?raw";
import doc03 from "../testFlow/guides/03_licna_karta.md?raw";
import doc04 from "../testFlow/guides/04_dokumentacija.md?raw";
import doc05 from "../testFlow/guides/05_radna_mesta.md?raw";
import doc06 from "../testFlow/guides/06_zaposleni.md?raw";
import doc07 from "../testFlow/guides/07_obaveze.md?raw";
import doc08 from "../testFlow/guides/08_danas_slanja.md?raw";
import doc09 from "../testFlow/guides/09_korisnici.md?raw";

import { TEST_FLOW_PHASES, TEST_FLOW_SECTIONS } from "../testFlow/sections";
import {
    isFillSection,
    type TestFlowRowId,
    type TestFlowSection,
    type TestFlowSectionMeta,
} from "../testFlow/types";
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
    "08": doc08,
    "09": doc09,
};

function nodeText(node: ReactNode): string {
    if (node == null || typeof node === "boolean") return "";
    if (typeof node === "string" || typeof node === "number") {
        return String(node);
    }
    if (Array.isArray(node)) {
        return node.map(nodeText).join("");
    }
    if (typeof node === "object" && "props" in node) {
        return nodeText(
            (node as { props: { children?: ReactNode } }).props.children,
        );
    }
    return "";
}

function rowMatchesGuideText(rowId: TestFlowRowId, text: string): boolean {
    if (text.includes(rowId)) return true;
    const label = TEST_FLOW_SECTIONS.find((s) => s.id === rowId)?.label;
    if (label && text.includes(label)) return true;
    return false;
}

interface StateProps {
    isStaff: boolean;
}

interface DispatchProps {
    setLastPath: (path: string) => void;
}

interface State {
    sessionActive: boolean;
    sessionId: string | null;
    doneRows: Partial<Record<TestFlowRowId, boolean>>;
    lastResults: Partial<Record<TestFlowSection, boolean>>;
    activeNum: string;
    focusedRowId: TestFlowRowId | null;
    cleanupPreview: IntegrationTestCompanyRow[];
    cleanupConfirmOpen: boolean;
    cleanupLoading: boolean;
}

class IntegrationTestsPage extends Component<
    StateProps & DispatchProps,
    State
> {
    private unsubscribeResults: (() => void) | null = null;
    private guideScrollRef: HTMLDivElement | null = null;

    state: State = {
        sessionActive: isTestSessionActive(),
        sessionId: getTestSessionId(),
        doneRows: {},
        lastResults: {},
        activeNum: "01",
        focusedRowId: null,
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
                    doneRows:
                        handled === true
                            ? { ...prev.doneRows, [section]: true }
                            : prev.doneRows,
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
            doneRows: {},
            lastResults: {},
            focusedRowId: null,
        });
    };

    handleEndSession = (): void => {
        endTestSession();
        this.setState({
            sessionActive: false,
            sessionId: null,
            doneRows: {},
            lastResults: {},
            focusedRowId: null,
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

    markDone = (rowId: TestFlowRowId): void => {
        this.setState((prev) => ({
            doneRows: { ...prev.doneRows, [rowId]: true },
            focusedRowId: rowId,
        }));
        this.scrollGuideToRow(rowId);
    };

    handleFill = (section: TestFlowSection): void => {
        this.markDone(section);
        broadcastTestFill(section);
    };

    handleCheck = (rowId: TestFlowRowId): void => {
        this.markDone(rowId);
    };

    handleFocusRow = (row: TestFlowSectionMeta): void => {
        const num = row.phaseId.slice(0, 2);
        this.setState({ activeNum: num, focusedRowId: row.id });
        this.scrollGuideToRow(row.id);
    };

    scrollGuideToRow = (rowId: TestFlowRowId): void => {
        requestAnimationFrame(() => {
            const root = this.guideScrollRef;
            if (!root) return;
            const el = root.querySelector(`[data-guide-row="${rowId}"]`);
            if (el instanceof HTMLElement) {
                el.scrollIntoView({ block: "nearest", behavior: "smooth" });
            }
        });
    };

    doneCount = (): number => {
        return Object.values(this.state.doneRows).filter(Boolean).length;
    };

    guideComponents = () => {
        const { doneRows, focusedRowId } = this.state;
        const doneIds = (
            Object.keys(doneRows) as TestFlowRowId[]
        ).filter((id) => doneRows[id]);

        const wrapBlock = (
            Tag: "li" | "p" | "blockquote",
            children: ReactNode,
        ) => {
            const text = nodeText(children);
            const matchedIds = doneIds.filter((id) =>
                rowMatchesGuideText(id, text),
            );
            const done = matchedIds.length > 0;
            const focused =
                focusedRowId != null &&
                rowMatchesGuideText(focusedRowId, text);
            const dataRow =
                matchedIds[0] ??
                (focused && focusedRowId != null ? focusedRowId : undefined);
            return (
                <Tag
                    data-guide-row={dataRow}
                    style={{
                        backgroundColor: done
                            ? "rgba(46, 125, 50, 0.14)"
                            : focused
                              ? "rgba(25, 118, 210, 0.1)"
                              : undefined,
                        borderLeft: done
                            ? "3px solid #2e7d32"
                            : focused
                              ? "3px solid #1976d2"
                              : undefined,
                        paddingLeft: done || focused ? 8 : undefined,
                        borderRadius: 4,
                        transition: "background-color 0.2s",
                    }}
                >
                    {children}
                </Tag>
            );
        };

        return {
            li: ({ children }: { children?: ReactNode }) =>
                wrapBlock("li", children),
            p: ({ children }: { children?: ReactNode }) =>
                wrapBlock("p", children),
            blockquote: ({ children }: { children?: ReactNode }) =>
                wrapBlock("blockquote", children),
        };
    };

    renderSectionRow = (section: TestFlowSectionMeta): React.ReactNode => {
        const { doneRows, lastResults, focusedRowId } = this.state;
        const done = doneRows[section.id] === true;
        const failed =
            isFillSection(section.id) && lastResults[section.id] === false;
        const focused = focusedRowId === section.id;

        return (
            <Box
                key={section.id}
                onClick={() => this.handleFocusRow(section)}
                sx={{
                    display: "flex",
                    flexDirection: "column",
                    gap: 0.75,
                    py: 1.25,
                    px: 2,
                    borderTop: "1px solid",
                    borderColor: "divider",
                    bgcolor: done
                        ? "success.50"
                        : focused
                          ? "action.selected"
                          : undefined,
                    cursor: "pointer",
                    "&:hover": {
                        bgcolor: done ? "success.50" : "action.hover",
                    },
                }}
            >
                <Box
                    sx={{
                        display: "flex",
                        alignItems: "flex-start",
                        gap: 1.5,
                    }}
                >
                <Chip
                    label={
                        section.badge ??
                        (section.kind === "fill"
                            ? section.id
                            : section.label)
                    }
                    size="small"
                    variant={done ? "filled" : "outlined"}
                    color={done ? "success" : "default"}
                    sx={{
                        minWidth: section.kind === "fill" ? 52 : undefined,
                        maxWidth: section.kind === "check" ? 160 : undefined,
                        fontWeight: 600,
                        fontSize: "0.7rem",
                        mt: 0.25,
                    }}
                />
                    <Box sx={{ flex: 1, minWidth: 0 }}>
                        <Typography variant="body2" fontWeight={600}>
                            {section.label}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                            {section.hint}
                        </Typography>
                        {failed && (
                            <Typography
                                variant="caption"
                                color="error"
                                display="block"
                            >
                                Forma nije primila podatke — otvori formu u app
                                tabu pa Popuni ponovo.
                            </Typography>
                        )}
                        <Typography
                            variant="body2"
                            sx={{
                                mt: 0.75,
                                color: "text.primary",
                                lineHeight: 1.45,
                                whiteSpace: "pre-wrap",
                            }}
                        >
                            {section.say}
                        </Typography>
                    </Box>
                    <Stack
                        direction="row"
                        spacing={0.5}
                        flexShrink={0}
                        onClick={(e) => e.stopPropagation()}
                    >
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
                        {section.kind === "fill" && isFillSection(section.id) ? (
                            <Button
                                size="small"
                                variant={done ? "contained" : "outlined"}
                                color={done ? "success" : "primary"}
                                disableElevation
                                startIcon={done ? <CheckIcon /> : undefined}
                                onClick={() => {
                                    if (isFillSection(section.id)) {
                                        this.handleFill(section.id);
                                    }
                                }}
                                sx={{ minWidth: 88 }}
                            >
                                Popuni
                            </Button>
                        ) : (
                            <Button
                                size="small"
                                variant={done ? "contained" : "outlined"}
                                color={done ? "success" : "primary"}
                                disableElevation
                                startIcon={done ? <CheckIcon /> : undefined}
                                onClick={() => this.handleCheck(section.id)}
                                sx={{ minWidth: 88 }}
                            >
                                Gotovo
                            </Button>
                        )}
                    </Stack>
                </Box>
            </Box>
        );
    };

    renderPhase = (
        phase: (typeof TEST_FLOW_PHASES)[number],
    ): React.ReactNode => {
        const sections = TEST_FLOW_SECTIONS.filter(
            (s) => s.phaseId === phase.id,
        );
        const doneInPhase = sections.filter(
            (s) => this.state.doneRows[s.id],
        ).length;

        const groups: { name: string; rows: TestFlowSectionMeta[] }[] = [];
        for (const row of sections) {
            const last = groups[groups.length - 1];
            if (last && last.name === row.uiGroup) {
                last.rows.push(row);
            } else {
                groups.push({ name: row.uiGroup, rows: [row] });
            }
        }

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
                            {doneInPhase}/{sections.length}
                        </Typography>
                    )}
                </Box>
                {groups.map((group) => (
                    <Box key={group.name}>
                        <Typography
                            variant="caption"
                            sx={{
                                display: "block",
                                px: 2,
                                pt: 1.25,
                                pb: 0.5,
                                fontWeight: 700,
                                color: "text.secondary",
                                textTransform: "uppercase",
                                letterSpacing: 0.4,
                            }}
                        >
                            {group.name}
                        </Typography>
                        {group.rows.map((section) =>
                            this.renderSectionRow(section),
                        )}
                    </Box>
                ))}
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
        const done = this.doneCount();
        const progress = total > 0 ? (done / total) * 100 : 0;
        const cleanupNames = cleanupPreview.map((c) => c.name).join(", ");

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
                        Red: čarobnjak → tabovi firme → Danas/Slanja →
                        korisnici. Skripta u redu objašnjava sve. Zeleno =
                        prošlo. Tabovi: Plan obaveza / Aktivne obaveze.
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
                                flex: { md: "0 0 480px" },
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
                                        {done}/{total} prošlo
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
                                ref={(el: HTMLDivElement | null) => {
                                    this.guideScrollRef = el;
                                }}
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
                                <ReactMarkdown
                                    remarkPlugins={[remarkGfm]}
                                    components={this.guideComponents()}
                                >
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
