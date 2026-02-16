import { Component } from "react";
import { connect } from "react-redux";
import {
    Box,
    Paper,
    Typography,
    Table,
    TableHead,
    TableRow,
    TableCell,
    TableBody,
} from "@mui/material";

import type { RootState } from "../store";
import { fetchTrainingSessions } from "../store/trainingsSlice";
import type { TrainingSession } from "../types/trainings";

interface StateProps {
    sessions: TrainingSession[];
}

interface DispatchProps {
    fetchTrainingSessions: () => void;
}

type Props = StateProps & DispatchProps;

interface State {}

class TrainingSessionsListPage extends Component<Props, State> {
    componentDidMount(): void {
        this.props.fetchTrainingSessions();
    }

    render() {
        const { sessions } = this.props;

        return (
            <Box sx={{ p: 4 }}>
                <Typography variant="h5" gutterBottom>
                    Termini obuka
                </Typography>
                <Paper>
                    <Table>
                        <TableHead>
                            <TableRow>
                                <TableCell>Datum</TableCell>
                                <TableCell>Lokacija</TableCell>
                                <TableCell>Instruktor</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {sessions.map((session) => (
                                <TableRow key={session.id}>
                                    <TableCell>{session.sessionDate}</TableCell>
                                    <TableCell>{session.location}</TableCell>
                                    <TableCell>{session.instructor}</TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </Paper>
            </Box>
        );
    }
}

const mapStateToProps = (state: RootState): StateProps => ({
    sessions: state.trainings.sessions,
});

const mapDispatchToProps: DispatchProps = {
    fetchTrainingSessions,
};

export default connect(
    mapStateToProps,
    mapDispatchToProps,
)(TrainingSessionsListPage);


