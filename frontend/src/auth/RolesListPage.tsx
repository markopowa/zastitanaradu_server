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
import { loadRoles } from "../store/authSlice";
import type { Role } from "../types/auth";

interface StateProps {
    roles: Role[];
}

interface DispatchProps {
    loadRoles: () => void;
}

type Props = StateProps & DispatchProps;

interface State {}

class RolesListPage extends Component<Props, State> {
    componentDidMount(): void {
        this.props.loadRoles();
    }

    render() {
        const { roles } = this.props;

        return (
            <Box sx={{ p: 4 }}>
                <Typography variant="h5" gutterBottom>
                    Role
                </Typography>
                <Paper>
                    <Table>
                        <TableHead>
                            <TableRow>
                                <TableCell>Naziv</TableCell>
                                <TableCell>Permissions</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {roles.map((role) => (
                                <TableRow key={role.id}>
                                    <TableCell>{role.name}</TableCell>
                                    <TableCell>
                                        {role.permissions.join(", ")}
                                    </TableCell>
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
    roles: state.auth.roles,
});

const mapDispatchToProps: DispatchProps = {
    loadRoles,
};

export default connect(mapStateToProps, mapDispatchToProps)(RolesListPage);


