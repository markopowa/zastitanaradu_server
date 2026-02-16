import { Component } from "react";
import type { ChangeEvent, SubmitEvent } from "react";

import { TextField, Button, Box, Typography, Paper } from "@mui/material";
import { connect } from "react-redux";

import { login } from "../store/authSlice";
import type { RootState } from "../store";

interface StateProps {
    loading: boolean;
    error?: string;
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
        const { loading, error } = this.props;

        return (
            <Box
                sx={{
                    minHeight: "100vh",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    backgroundColor: "#f5f5f5",
                }}
            >
                <Paper elevation={3} sx={{ p: 4, width: 400 }}>
                    <Typography variant="h5" component="h1" gutterBottom>
                        Prijava
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
});

const mapDispatchToProps: DispatchProps = {
    onLogin: (username: string, password: string) => login({ username, password }),
};

export default connect(mapStateToProps, mapDispatchToProps)(LoginPage);


