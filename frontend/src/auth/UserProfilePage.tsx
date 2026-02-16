import { Component } from "react";
import { connect } from "react-redux";
import { Box, Paper, Typography } from "@mui/material";

import type { RootState } from "../store";
import type { AuthUser } from "../types/auth";

interface StateProps {
    user?: AuthUser;
}

type Props = StateProps;

class UserProfilePage extends Component<Props> {
    render() {
        const { user } = this.props;
        if (!user) {
            return null;
        }

        return (
            <Box sx={{ p: 4 }}>
                <Paper sx={{ p: 3, maxWidth: 600 }}>
                    <Typography variant="h5" gutterBottom>
                        Profil korisnika
                    </Typography>
                    <Typography>Username: {user.username}</Typography>
                    <Typography>
                        Ime i prezime: {user.firstName} {user.lastName}
                    </Typography>
                    <Typography>Email: {user.email}</Typography>
                    <Typography>
                        Role: {user.roles && user.roles.length ? user.roles.join(", ") : "-"}
                    </Typography>
                </Paper>
            </Box>
        );
    }
}

const mapStateToProps = (state: RootState): StateProps => ({
    user: state.auth.user,
});

export default connect(mapStateToProps)(UserProfilePage);


