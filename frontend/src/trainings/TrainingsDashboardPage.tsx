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
import { fetchTrainingsDashboard } from "../store/trainingsSlice";
import type { TrainingAttendance } from "../types/trainings";

interface StateProps {
    items: TrainingAttendance[];
}

interface DispatchProps {
    fetchTrainingsDashboard: () => void;
}

type Props = StateProps & DispatchProps;

interface State {}

class TrainingsDashboardPage extends Component<Props, State> {
    componentDidMount(): void {
        this.props.fetchTrainingsDashboard();
    }

    render() {
        const { items } = this.props;

        return (
            <Box sx={{ p: 4 }}>
                <Typography variant="h5" gutterBottom>
                    Rokovi obuka
                </Typography>
                <Paper>
                    <Table>
                        <TableHead>
                            <TableRow>
                                <TableCell>Zaposleni</TableCell>
                                <TableCell>Važi do</TableCell>
                                <TableCell>Status</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {items.map((item) => (
                                <TableRow key={item.id}>
                                    <TableCell>{item.employeeId}</TableCell>
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
    items: state.trainings.dashboardItems,
});

const mapDispatchToProps: DispatchProps = {
    fetchTrainingsDashboard,
};

export default connect(
    mapStateToProps,
    mapDispatchToProps,
)(TrainingsDashboardPage);


