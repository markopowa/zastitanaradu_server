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
import PersonIcon from "@mui/icons-material/Person";
import LockIcon from "@mui/icons-material/Lock";

import { ChangePasswordDialog } from "../components/ChangePasswordDialog";
import { ProfileThemeSettings } from "../components/ProfileThemeSettings";
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
        passwordDialogOpen: false,
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

    render() {
        const { user } = this.props;
        const {
            username,
            firstName,
            lastName,
            profileSaving,
            profileMessage,
            passwordDialogOpen,
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

                <Paper sx={{ p: 3, maxWidth: 600, mb: 3, width: "100%" }}>
                    <Typography
                        variant="h6"
                        gutterBottom
                        sx={{ display: "flex", alignItems: "center", gap: 1 }}
                    >
                        <LockIcon /> Lozinka
                    </Typography>
                    <Typography
                        variant="body2"
                        color="text.secondary"
                        sx={{ mb: 2 }}
                    >
                        Za promenu lozinke potrebna je trenutna lozinka.
                    </Typography>
                    <Button
                        variant="outlined"
                        onClick={() =>
                            this.setState((prev) => ({
                                ...prev,
                                passwordDialogOpen: true,
                            }))
                        }
                    >
                        Promeni lozinku
                    </Button>
                </Paper>

                <Paper sx={{ p: 3, maxWidth: 600, mb: 3, width: "100%" }}>
                    <ProfileThemeSettings />
                </Paper>

                <ChangePasswordDialog
                    open={passwordDialogOpen}
                    onClose={() =>
                        this.setState((prev) => ({
                            ...prev,
                            passwordDialogOpen: false,
                        }))
                    }
                />
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
