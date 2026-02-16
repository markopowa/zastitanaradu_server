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
import { fetchTrainingAttendance } from "../store/trainingsSlice";
import type { TrainingAttendance } from "../types/trainings";

interface StateProps {
    items: TrainingAttendance[];
}

interface DispatchProps {
    fetchTrainingAttendance: () => void;
}

type Props = StateProps & DispatchProps;

interface State {}

class TrainingAttendanceListPage extends Component<Props, State> {
    componentDidMount(): void {
        this.props.fetchTrainingAttendance();
    }

    render() {
        const { items } = this.props;

        return (
            <Box sx={{ p: 4 }}>
                <Typography variant="h5" gutterBottom>
                    Prisustvo na obukama
                </Typography>
                <Paper>
                    <Table>
                        <TableHead>
                            <TableRow>
                                <TableCell>Zaposleni</TableCell>
                                <TableCell>Termin</TableCell>
                                <TableCell>Važi do</TableCell>
                                <TableCell>Status</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {items.map((item) => (
                                <TableRow key={item.id}>
                                    <TableCell>{item.employeeId}</TableCell>
                                    <TableCell>
                                        {item.trainingSessionId}
                                    </TableCell>
                                    <TableCell>{item.validUntil}</TableCell>
                                    <TableCell>{item.status}</TableCell>
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
    items: state.trainings.attendance,
});

const mapDispatchToProps: DispatchProps = {
    fetchTrainingAttendance,
};

export default connect(
    mapStateToProps,
    mapDispatchToProps,
)(TrainingAttendanceListPage);


