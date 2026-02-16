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
import { loadUsers } from "../store/authSlice";
import type { AuthUser } from "../types/auth";

interface StateProps {
    users: AuthUser[];
}

interface DispatchProps {
    loadUsers: () => void;
}

type Props = StateProps & DispatchProps;

interface State {}

class UsersListPage extends Component<Props, State> {
    componentDidMount(): void {
        this.props.loadUsers();
    }

    render() {
        const { users } = this.props;

        return (
            <Box sx={{ p: 4 }}>
                <Typography variant="h5" gutterBottom>
                    Korisnici
                </Typography>
                <Paper>
                    <Table>
                        <TableHead>
                            <TableRow>
                                <TableCell>Username</TableCell>
                                <TableCell>Ime</TableCell>
                                <TableCell>Prezime</TableCell>
                                <TableCell>Email</TableCell>
                                <TableCell>Aktivan</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {users.map((user) => (
                                <TableRow key={user.id}>
                                    <TableCell>{user.username}</TableCell>
                                    <TableCell>{user.firstName}</TableCell>
                                    <TableCell>{user.lastName}</TableCell>
                                    <TableCell>{user.email}</TableCell>
                                    <TableCell>
                                        {user.permissions.includes("auth.change_user")
                                            ? "Da"
                                            : "Ne"}
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
    users: state.auth.users,
});

const mapDispatchToProps: DispatchProps = {
    loadUsers,
};

export default connect(mapStateToProps, mapDispatchToProps)(UsersListPage);


