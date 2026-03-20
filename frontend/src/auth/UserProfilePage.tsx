import { Component } from "react";
import type { ChangeEvent, SubmitEvent } from "react";
import { connect } from "react-redux";

import {
    Box,
    Paper,
    Typography,
    TextField,
    Button,
    Stack,
} from "@mui/material";
import LockIcon from "@mui/icons-material/Lock";
import PersonIcon from "@mui/icons-material/Person";

import { api } from "../api/client";
import { updateProfile } from "../store/authSlice";

import type { AppDispatch, RootState } from "../store";
import type {
    UserProfilePageDispatchProps,
    UserProfilePageProps,
    UserProfilePageState,
    UserProfilePageStateProps,
} from "../types/authPages";

class UserProfilePage extends Component<
    UserProfilePageProps,
    UserProfilePageState
> {
    state: UserProfilePageState = {
        username: "",
        firstName: "",
        lastName: "",
        profileSaving: false,
        profileMessage: null,
        currentPassword: "",
        newPassword: "",
        confirmPassword: "",
        loading: false,
        message: null,
    };

    static getDerivedStateFromProps(
        nextProps: UserProfilePageProps,
        prevState: UserProfilePageState,
    ): Partial<UserProfilePageState> | null {
        const u = nextProps.user;
        if (!u) return null;
        if (
            prevState.username === "" &&
            prevState.firstName === "" &&
            prevState.lastName === "" &&
            u.username
        ) {
            return {
                username: u.username,
                firstName: u.first_name ?? "",
                lastName: u.last_name ?? "",
            };
        }
        return null;
    }

    handleProfileChange =
        (
            field: keyof Pick<
                UserProfilePageState,
                "username" | "firstName" | "lastName"
            >,
        ) =>
        (e: ChangeEvent<HTMLInputElement>) => {
            this.setState((prev) => ({
                ...prev,
                [field]: e.target.value,
                profileMessage: null,
            }));
        };

    handleProfileSubmit = async (e: SubmitEvent<HTMLFormElement>) => {
        e.preventDefault();
        const { username, firstName, lastName } = this.state;
        if (!username?.trim()) {
            this.setState((prev) => ({
                ...prev,
                profileMessage: {
                    type: "error",
                    text: "Korisničko ime je obavezno.",
                },
            }));
            return;
        }
        this.setState((prev) => ({
            ...prev,
            profileSaving: true,
            profileMessage: null,
        }));
        try {
            await this.props.dispatchUpdateProfile({
                username: username.trim(),
                first_name: firstName.trim(),
                last_name: lastName.trim(),
            });
            this.setState((prev) => ({
                ...prev,
                profileMessage: {
                    type: "success",
                    text: "Profil je uspešno sačuvan.",
                },
            }));
        } catch (err) {
            const text =
                (typeof err === "string"
                    ? err
                    : (err as { message?: string })?.message) ??
                "Greška pri čuvanju profila.";
            this.setState((prev) => ({
                ...prev,
                profileMessage: { type: "error", text },
            }));
        } finally {
            this.setState((prev) => ({ ...prev, profileSaving: false }));
        }
    };

    handleChange =
        (
            field: keyof Pick<
                UserProfilePageState,
                "currentPassword" | "newPassword" | "confirmPassword"
            >,
        ) =>
        (e: ChangeEvent<HTMLInputElement>) => {
            this.setState((prev) => ({
                ...prev,
                [field]: e.target.value,
                message: null,
            }));
        };

    handleSubmit = async (e: SubmitEvent<HTMLFormElement>) => {
        e.preventDefault();
        const { currentPassword, newPassword, confirmPassword } = this.state;
        if (!newPassword || newPassword.length < 8) {
            this.setState((prev) => ({
                ...prev,
                message: {
                    type: "error",
                    text: "Nova lozinka mora imati najmanje 8 karaktera.",
                },
            }));
            return;
        }
        if (newPassword !== confirmPassword) {
            this.setState((prev) => ({
                ...prev,
                message: {
                    type: "error",
                    text: "Nova lozinka i potvrda se ne poklapaju.",
                },
            }));
            return;
        }
        this.setState((prev) => ({ ...prev, loading: true, message: null }));
        try {
            await api.post("/auth/change-password/", {
                current_password: currentPassword,
                new_password: newPassword,
            });
            this.setState((prev) => ({
                ...prev,
                currentPassword: "",
                newPassword: "",
                confirmPassword: "",
                message: {
                    type: "success",
                    text: "Lozinka je uspešno promenjena.",
                },
            }));
        } catch (err: unknown) {
            const detail =
                (err as { response?: { data?: { detail?: string } } })?.response
                    ?.data?.detail ?? "Greška pri promeni lozinke.";
            this.setState((prev) => ({
                ...prev,
                message: { type: "error", text: detail },
            }));
        } finally {
            this.setState((prev) => ({ ...prev, loading: false }));
        }
    };

    render() {
        const { user } = this.props;
        const {
            username,
            firstName,
            lastName,
            profileSaving,
            profileMessage,
            currentPassword,
            newPassword,
            confirmPassword,
            loading,
            message,
        } = this.state;

        if (!user) {
            return null;
        }

        return (
            <Box
                sx={{
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    width: "100%",
                }}
            >
                <Paper sx={{ p: 3, maxWidth: 600, mb: 3, width: "100%" }}>
                    <Typography
                        variant="h6"
                        gutterBottom
                        sx={{ display: "flex", alignItems: "center", gap: 1 }}
                    >
                        <PersonIcon /> Izmena profila
                    </Typography>
                    <Typography
                        variant="body2"
                        color="text.secondary"
                        sx={{ mb: 2 }}
                    >
                        Korisničko ime, ime i prezime možete slobodno menjati.
                        Email nije moguće menjati.
                    </Typography>
                    <Box component="form" onSubmit={this.handleProfileSubmit}>
                        <Stack spacing={2} sx={{ maxWidth: 400 }}>
                            <TextField
                                label="Korisničko ime"
                                value={username}
                                onChange={this.handleProfileChange("username")}
                                required
                                fullWidth
                                autoComplete="username"
                            />
                            <TextField
                                label="Ime"
                                value={firstName}
                                onChange={this.handleProfileChange("firstName")}
                                fullWidth
                                autoComplete="given-name"
                            />
                            <TextField
                                label="Prezime"
                                value={lastName}
                                onChange={this.handleProfileChange("lastName")}
                                fullWidth
                                autoComplete="family-name"
                            />
                            {profileMessage && (
                                <Typography
                                    variant="body2"
                                    sx={{
                                        color:
                                            profileMessage.type === "error"
                                                ? "error.main"
                                                : "success.main",
                                    }}
                                >
                                    {profileMessage.text}
                                </Typography>
                            )}
                            <Button
                                type="submit"
                                variant="contained"
                                disabled={profileSaving || !username.trim()}
                            >
                                {profileSaving
                                    ? "Čuvanje..."
                                    : "Sačuvaj profil"}
                            </Button>
                        </Stack>
                    </Box>
                    <Typography
                        variant="body2"
                        color="text.secondary"
                        sx={{ mt: 2 }}
                    >
                        Email
                    </Typography>
                    <Typography variant="body1" sx={{ mb: 2 }}>
                        {user.email || "-"}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                        Role
                    </Typography>
                    <Typography variant="body1">
                        {Array.isArray(user.roles)
                            ? user.roles.join(", ")
                            : "-"}
                    </Typography>
                </Paper>

                <Paper sx={{ p: 3, maxWidth: 600, width: "100%" }}>
                    <Typography
                        variant="h6"
                        gutterBottom
                        sx={{ display: "flex", alignItems: "center", gap: 1 }}
                    >
                        <LockIcon /> Promeni lozinku
                    </Typography>
                    <Typography
                        variant="body2"
                        color="text.secondary"
                        sx={{ mb: 2 }}
                    >
                        Unesite trenutnu lozinku i novu lozinku (min. 8
                        karaktera).
                    </Typography>
                    <Box component="form" onSubmit={this.handleSubmit}>
                        <Stack spacing={2} sx={{ maxWidth: 400 }}>
                            <TextField
                                label="Trenutna lozinka"
                                type="password"
                                value={currentPassword}
                                onChange={this.handleChange("currentPassword")}
                                required
                                fullWidth
                                autoComplete="current-password"
                            />
                            <TextField
                                label="Nova lozinka"
                                type="password"
                                value={newPassword}
                                onChange={this.handleChange("newPassword")}
                                required
                                fullWidth
                                autoComplete="new-password"
                                helperText="Minimum 8 karaktera"
                            />
                            <TextField
                                label="Potvrdi novu lozinku"
                                type="password"
                                value={confirmPassword}
                                onChange={this.handleChange("confirmPassword")}
                                required
                                fullWidth
                                autoComplete="new-password"
                            />
                            {message && (
                                <Typography
                                    variant="body2"
                                    sx={{
                                        color:
                                            message.type === "error"
                                                ? "error.main"
                                                : "success.main",
                                    }}
                                >
                                    {message.text}
                                </Typography>
                            )}
                            <Button
                                type="submit"
                                variant="contained"
                                disabled={
                                    loading ||
                                    !currentPassword ||
                                    !newPassword ||
                                    !confirmPassword
                                }
                            >
                                {loading ? "Čeka se..." : "Promeni lozinku"}
                            </Button>
                        </Stack>
                    </Box>
                </Paper>
            </Box>
        );
    }
}

const mapStateToProps = (state: RootState): UserProfilePageStateProps => ({
    user: state.auth.user,
});

const mapDispatchToProps = (
    dispatch: AppDispatch,
): UserProfilePageDispatchProps => ({
    dispatchUpdateProfile: (payload) =>
        dispatch(updateProfile(payload)).unwrap(),
});

export default connect(mapStateToProps, mapDispatchToProps)(UserProfilePage);
