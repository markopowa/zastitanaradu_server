import { Component } from "react";
import type { ChangeEvent, SubmitEvent } from "react";
import { connect } from "react-redux";
import { Navigate } from "react-router-dom";

import { TextField, Button, Box, Typography, Paper, Link } from "@mui/material";
import { Link as RouterLink } from "react-router-dom";

import { login } from "../store/authSlice";

import type { RootState } from "../store";
import type {
    LoginPageDispatchProps,
    LoginPageProps,
    LoginPageState,
    LoginPageStateProps,
} from "../types/authPages";

class LoginPage extends Component<LoginPageProps, LoginPageState> {
    state: LoginPageState = {
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
                    <Typography
                        variant="h5"
                        component="h1"
                        gutterBottom
                        style={{ display: "flex" }}
                    >
                        Prijava{" "}
                        <img
                            src="favicon.svg"
                            style={{ width: 32 }}
                            alt="icon"
                        />
                    </Typography>
                    <Box component="form" onSubmit={this.handleSubmit}>
                        <TextField
                            fullWidth
                            margin="normal"
                            label="Korisničko ime"
                            value={this.state.username}
                            onChange={(e: ChangeEvent<HTMLInputElement>) =>
                                this.setState((prev) => ({
                                    ...prev,
                                    username: e.target.value,
                                }))
                            }
                        />
                        <TextField
                            fullWidth
                            margin="normal"
                            type="password"
                            label="Lozinka"
                            value={this.state.password}
                            onChange={(e: ChangeEvent<HTMLInputElement>) =>
                                this.setState((prev) => ({
                                    ...prev,
                                    password: e.target.value,
                                }))
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
                    <Typography
                        variant="body2"
                        sx={{ mt: 2, textAlign: "center" }}
                    >
                        <Link component={RouterLink} to="/about">
                            O aplikaciji
                        </Link>
                    </Typography>
                </Paper>
            </Box>
        );
    }
}

const mapStateToProps = (state: RootState): LoginPageStateProps => ({
    loading: state.auth.loading,
    error: state.auth.error,
    isAuthenticated: state.auth.isAuthenticated,
});

const mapDispatchToProps: LoginPageDispatchProps = {
    onLogin: (username: string, password: string) =>
        login({ username, password }),
};

export default connect(mapStateToProps, mapDispatchToProps)(LoginPage);
