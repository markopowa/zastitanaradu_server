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
import { fetchTrainingPrograms } from "../store/trainingsSlice";
import type { TrainingProgram } from "../types/trainings";

interface StateProps {
    programs: TrainingProgram[];
}

interface DispatchProps {
    fetchTrainingPrograms: () => void;
}

type Props = StateProps & DispatchProps;

interface State {}

class TrainingProgramsListPage extends Component<Props, State> {
    componentDidMount(): void {
        this.props.fetchTrainingPrograms();
    }

    render() {
        const { programs } = this.props;

        return (
            <Box sx={{ p: 4 }}>
                <Typography variant="h5" gutterBottom>
                    Programi obuka
                </Typography>
                <Paper>
                    <Table>
                        <TableHead>
                            <TableRow>
                                <TableCell>Naziv</TableCell>
                                <TableCell>Tip obuke</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {programs.map((program) => (
                                <TableRow key={program.id}>
                                    <TableCell>{program.title}</TableCell>
                                    <TableCell>{program.trainingTypeId}</TableCell>
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
    programs: state.trainings.programs,
});

const mapDispatchToProps: DispatchProps = {
    fetchTrainingPrograms,
};

export default connect(
    mapStateToProps,
    mapDispatchToProps,
)(TrainingProgramsListPage);


