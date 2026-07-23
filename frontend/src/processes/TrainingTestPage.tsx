import { Component, type ReactElement } from "react";
import { useParams } from "react-router-dom";
import { connect } from "react-redux";

import {
    Box,
    Button,
    Card,
    CardContent,
    FormControl,
    FormControlLabel,
    Radio,
    RadioGroup,
    Stack,
    Typography,
} from "@mui/material";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import HighlightOffIcon from "@mui/icons-material/HighlightOff";
import QuizIcon from "@mui/icons-material/Quiz";
import { enqueueSnackbar } from "notistack";

import {
    getEmployee,
    getTestQuestions,
    submitTestAttempt,
} from "../api/processes";
import { EmptyState, ErrorState, LoadingState } from "../design";
import { withNavigation } from "../hocs/withNavigation";
import { setBreadcrumbs, setLastPath } from "../store/locationSlice";

import type { AppDispatch } from "../store";
import type {
    TrainingTestPageDispatchProps,
    TrainingTestPageProps,
    TrainingTestPageState,
} from "../types/processPages";

class TrainingTestPageInner extends Component<
    TrainingTestPageProps,
    TrainingTestPageState
> {
    state: TrainingTestPageState = {
        employee: null,
        questions: [],
        answers: {},
        loading: true,
        error: null,
        submitting: false,
        result: null,
    };

    componentDidMount(): void {
        const { employeeId } = this.props;
        this.props.setLastPath(`/testing/${employeeId}`);
        this.load();
    }

    componentWillUnmount(): void {
        this.props.setBreadcrumbs([]);
    }

    load = (): void => {
        const id = Number(this.props.employeeId);
        if (!Number.isFinite(id)) {
            this.setState({ loading: false, error: "Neispravan ID." });
            return;
        }
        this.setState({ loading: true, error: null });
        getEmployee(id)
            .then((employee) => {
                this.props.setBreadcrumbs([
                    { label: "Zaposleni", path: "/client-companies-employees" },
                    {
                        label: `${employee.first_name} ${employee.last_name}`,
                        path: `/client-companies-employees/${employee.id}`,
                    },
                    { label: "Test obuke" },
                ]);
                return getTestQuestions(employee.client_company).then(
                    (questions) => {
                        this.setState({
                            employee,
                            questions,
                            answers: {},
                            loading: false,
                        });
                    },
                );
            })
            .catch(() => {
                this.setState({
                    loading: false,
                    error: "Greška pri učitavanju testa.",
                });
            });
    };

    setAnswer = (questionId: number, key: string): void => {
        this.setState((prev) => ({
            answers: { ...prev.answers, [questionId]: key },
        }));
    };

    allAnswered = (): boolean => {
        const { questions, answers } = this.state;
        return (
            questions.length > 0 &&
            questions.every((q) => answers[q.id] != null)
        );
    };

    handleSubmit = (): void => {
        const { employee, answers } = this.state;
        if (!employee) return;
        this.setState({ submitting: true });
        const payload = {
            employee: employee.id,
            answers: Object.fromEntries(Object.entries(answers)),
        };
        submitTestAttempt(payload)
            .then((result) => {
                this.setState({ submitting: false, result });
            })
            .catch((err: { response?: { data?: { detail?: string } } }) => {
                this.setState({ submitting: false });
                enqueueSnackbar(
                    err.response?.data?.detail ?? "Greška pri predaji testa.",
                    { variant: "error" },
                );
            });
    };

    handleRetry = (): void => {
        this.setState({ answers: {}, result: null });
    };

    render() {
        const { employee, questions, answers, loading, error, submitting } =
            this.state;
        const { result } = this.state;
        const { navigate } = this.props;

        if (loading) {
            return <LoadingState label="Učitavanje testa…" />;
        }
        if (error || !employee) {
            return (
                <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
                    <ErrorState message={error ?? "Zaposleni nije pronađen."} />
                    <Button
                        startIcon={<ArrowBackIcon />}
                        onClick={() => navigate("/client-companies-employees")}
                    >
                        Nazad
                    </Button>
                </Box>
            );
        }

        const employeeName = `${employee.first_name} ${employee.last_name}`.trim();

        if (result) {
            return (
                <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
                    <Card>
                        <CardContent>
                            <Stack
                                spacing={2}
                                alignItems="center"
                                sx={{ py: 3, textAlign: "center" }}
                            >
                                {result.passed ? (
                                    <CheckCircleIcon
                                        color="success"
                                        sx={{ fontSize: 56 }}
                                    />
                                ) : (
                                    <HighlightOffIcon
                                        color="error"
                                        sx={{ fontSize: 56 }}
                                    />
                                )}
                                <Typography variant="h5">
                                    {result.score_pct}%
                                </Typography>
                                {result.passed ? (
                                    <Typography>
                                        Test položen — obuka je zabeležena,
                                        Obrazac 6 se generiše automatski.
                                    </Typography>
                                ) : (
                                    <Typography>
                                        Test nije položen (potrebno 75%).
                                        Pokušajte ponovo.
                                    </Typography>
                                )}
                                <Stack direction="row" spacing={2}>
                                    {!result.passed && (
                                        <Button
                                            variant="contained"
                                            onClick={this.handleRetry}
                                        >
                                            Pokušaj ponovo
                                        </Button>
                                    )}
                                    <Button
                                        variant={
                                            result.passed
                                                ? "contained"
                                                : "outlined"
                                        }
                                        onClick={() =>
                                            navigate(
                                                `/client-companies-employees/${employee.id}`,
                                            )
                                        }
                                    >
                                        Nazad na zaposlenog
                                    </Button>
                                </Stack>
                            </Stack>
                        </CardContent>
                    </Card>
                </Box>
            );
        }

        return (
            <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
                <Button
                    startIcon={<ArrowBackIcon />}
                    onClick={() =>
                        navigate(`/client-companies-employees/${employee.id}`)
                    }
                    sx={{ alignSelf: "flex-start" }}
                >
                    Nazad
                </Button>
                <Typography variant="h5" sx={{ display: "flex", gap: 1, alignItems: "center" }}>
                    <QuizIcon /> Test obuke — {employeeName}
                </Typography>
                {questions.length === 0 ? (
                    <EmptyState
                        icon={<QuizIcon sx={{ fontSize: 48 }} />}
                        message="Nema pitanja u bazi — pokrenite seed_default_test ili dodajte pitanja."
                    />
                ) : (
                    <>
                        <Stack spacing={2}>
                            {questions.map((q, index) => (
                                <Card key={q.id}>
                                    <CardContent>
                                        <Typography
                                            variant="subtitle1"
                                            sx={{ mb: 1 }}
                                        >
                                            {index + 1}. {q.text}
                                        </Typography>
                                        <FormControl>
                                            <RadioGroup
                                                value={answers[q.id] ?? ""}
                                                onChange={(e) =>
                                                    this.setAnswer(
                                                        q.id,
                                                        e.target.value,
                                                    )
                                                }
                                            >
                                                {q.choices.map((choice) => (
                                                    <FormControlLabel
                                                        key={choice.key}
                                                        value={choice.key}
                                                        control={<Radio />}
                                                        label={choice.text}
                                                    />
                                                ))}
                                            </RadioGroup>
                                        </FormControl>
                                    </CardContent>
                                </Card>
                            ))}
                        </Stack>
                        <Button
                            variant="contained"
                            disabled={!this.allAnswered() || submitting}
                            onClick={this.handleSubmit}
                            sx={{ alignSelf: "flex-start" }}
                        >
                            {submitting ? "Predajem..." : "Predaj test"}
                        </Button>
                    </>
                )}
            </Box>
        );
    }
}

const mapDispatchToProps = (
    dispatch: AppDispatch,
): TrainingTestPageDispatchProps => ({
    setLastPath: (path: string) => dispatch(setLastPath(path)),
    setBreadcrumbs: (items) => dispatch(setBreadcrumbs(items)),
});

const Connected = connect(
    null,
    mapDispatchToProps,
)(TrainingTestPageInner);
const TrainingTestPageWithNavigation = withNavigation(Connected);

export default function TrainingTestPage(): ReactElement {
    const { employeeId } = useParams<{ employeeId: string }>();
    return (
        <TrainingTestPageWithNavigation employeeId={employeeId ?? ""} />
    );
}
