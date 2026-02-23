import { Component } from "react";
import { connect } from "react-redux";
import { Box, Paper, Table, TableHead, TableRow, TableCell, TableBody } from "@mui/material";

import type { RootState, AppDispatch } from "../store";
import { fetchTrainingsDashboard, fetchEmployees } from "../store/trainingsSlice";
import type { TrainingAttendance, Employee } from "../types/trainings";
import { setLastPath } from "../store/locationSlice";

interface StateProps {
    items: TrainingAttendance[];
    employees: Employee[];
}

interface DispatchProps {
    fetchTrainingsDashboard: () => void;
    fetchEmployees: () => void;
    setLastPath: (path: string) => void;
}

const formatDateSr = (value?: string | null): string => {
    if (!value) return "—";
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return value;
    return d.toLocaleDateString("sr-RS");
};

type Props = StateProps & DispatchProps;

interface State {}

class TrainingsDashboardPage extends Component<Props, State> {
    componentDidMount(): void {
        this.props.fetchTrainingsDashboard();
        this.props.fetchEmployees();
        this.props.setLastPath("/trainings");
    }

    render() {
        const { items, employees } = this.props;
        const list = Array.isArray(items) ? items : [];
        const employeeName = (id: number) => {
            const e = employees.find((x) => x.id === id);
            return e ? `${e.first_name} ${e.last_name}`.trim() : String(id);
        };

        return (
            <Box sx={{ p: 4 }}>
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
                            {list.map((item) => (
                                <TableRow key={item.id}>
                                    <TableCell>{employeeName(item.employee)}</TableCell>
                                    <TableCell>{formatDateSr(item.valid_until)}</TableCell>
                                    <TableCell>{item.status ?? "—"}</TableCell>
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
    employees: state.trainings.employees,
});

const mapDispatchToProps = (dispatch: AppDispatch): DispatchProps => ({
    fetchTrainingsDashboard: () => dispatch(fetchTrainingsDashboard()),
    fetchEmployees: () => dispatch(fetchEmployees()),
    setLastPath: (path) => dispatch(setLastPath(path)),
});

export default connect(
    mapStateToProps,
    mapDispatchToProps,
)(TrainingsDashboardPage);


