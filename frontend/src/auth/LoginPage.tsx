import { Component } from "react";
import type { ChangeEvent, SubmitEvent } from "react";

import { TextField, Button, Box, Typography, Paper } from "@mui/material";
import { connect } from "react-redux";
import { Navigate } from "react-router-dom";

import { login } from "../store/authSlice";
import type { RootState } from "../store";

interface StateProps {
    loading: boolean;
    error?: string;
    isAuthenticated: boolean;
}

interface DispatchProps {
    onLogin: (username: string, password: string) => void;
}

type Props = StateProps & DispatchProps;

interface State {
    username: string;
    password: string;
}

class LoginPage extends Component<Props, State> {
    state: State = {
        username: "",
        password: "",
    };

    handleSubmit = (event: SubmitEvent<HTMLFormElement>): void => {
        event.preventDefault();
        const { username, password } = this.state;
        this.props.onLogin(username, password);
    };

    render() {
        const { loading, error, isAuthenticated } = this.props;

        if (isAuthenticated) {
            return <Navigate to="/" replace />;
        }

        return (
            <Box
                sx={{
                    minHeight: "100vh",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    bgcolor: "background.default",
                }}
            >
                <Paper elevation={3} sx={{ p: 4, width: 400 }}>
                    <Typography variant="h5" component="h1" gutterBottom style={{ display: "flex" }}>
                        Prijava <img src="favicon.svg" style={{ width: 32 }} alt="icon" />
                    </Typography>
                    <Box component="form" onSubmit={this.handleSubmit}>
                        <TextField
                            fullWidth
                            margin="normal"
                            label="Korisničko ime"
                            value={this.state.username}
                            onChange={(e: ChangeEvent<HTMLInputElement>) =>
                                this.setState({ username: e.target.value })
                            }
                        />
                        <TextField
                            fullWidth
                            margin="normal"
                            type="password"
                            label="Lozinka"
                            value={this.state.password}
                            onChange={(e: ChangeEvent<HTMLInputElement>) =>
                                this.setState({ password: e.target.value })
                            }
                        />
                        {error && (
                            <Typography
                                color="error"
                                variant="body2"
                                sx={{ mt: 1 }}
                            >
                                {error}
                            </Typography>
                        )}
                        <Button
                            type="submit"
                            fullWidth
                            variant="contained"
                            color="primary"
                            sx={{ mt: 2 }}
                            disabled={loading}
                        >
                            {loading ? "Prijava..." : "Prijava"}
                        </Button>
                    </Box>
                </Paper>
            </Box>
        );
    }
}

const mapStateToProps = (state: RootState): StateProps => ({
    loading: state.auth.loading,
    error: state.auth.error,
    isAuthenticated: state.auth.isAuthenticated,
});

const mapDispatchToProps: DispatchProps = {
    onLogin: (username: string, password: string) => login({ username, password }),
};

export default connect(mapStateToProps, mapDispatchToProps)(LoginPage);


