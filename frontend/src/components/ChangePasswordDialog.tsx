import { useRef, useState, type FormEvent } from "react";
import {
    Box,
    Button,
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
    Stack,
    TextField,
    Typography,
} from "@mui/material";
import { enqueueSnackbar } from "notistack";

import { api } from "../api/client";

type Props = {
    open: boolean;
    onClose: () => void;
};

export function ChangePasswordDialog({ open, onClose }: Props) {
    const formRef = useRef<HTMLFormElement>(null);
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState<{
        type: "success" | "error";
        text: string;
    } | null>(null);

    const reset = (): void => {
        setMessage(null);
        setLoading(false);
    };

    const handleClose = (): void => {
        formRef.current?.reset();
        reset();
        onClose();
    };

    const handleSubmit = async (e: FormEvent<HTMLFormElement>): Promise<void> => {
        e.preventDefault();
        const form = e.currentTarget;
        const fd = new FormData(form);
        const currentPassword = String(fd.get("current_password") ?? "");
        const newPassword = String(fd.get("new_password") ?? "");
        const confirmPassword = String(fd.get("confirm_password") ?? "");

        if (!currentPassword) {
            setMessage({
                type: "error",
                text: "Unesite trenutnu lozinku.",
            });
            return;
        }
        if (!newPassword || newPassword.length < 8) {
            setMessage({
                type: "error",
                text: "Nova lozinka mora imati najmanje 8 karaktera.",
            });
            return;
        }
        if (newPassword !== confirmPassword) {
            setMessage({
                type: "error",
                text: "Nova lozinka i potvrda se ne poklapaju.",
            });
            return;
        }
        setLoading(true);
        setMessage(null);
        try {
            await api.post("/auth/change-password/", {
                current_password: currentPassword,
                new_password: newPassword,
            });
            enqueueSnackbar("Lozinka je uspešno promenjena.", {
                variant: "success",
            });
            form.reset();
            reset();
            onClose();
        } catch (err: unknown) {
            const detail =
                (err as { response?: { data?: { detail?: string } } })?.response
                    ?.data?.detail ?? "Greška pri promeni lozinke.";
            setMessage({ type: "error", text: detail });
        } finally {
            setLoading(false);
        }
    };

    return (
        <Dialog open={open} onClose={handleClose} fullWidth maxWidth="sm">
            <DialogTitle>Promeni lozinku</DialogTitle>
            <Box
                ref={formRef}
                component="form"
                onSubmit={handleSubmit}
                noValidate
            >
                <DialogContent>
                    <Stack spacing={2}>
                        <TextField
                            name="current_password"
                            label="Trenutna lozinka"
                            type="password"
                            defaultValue=""
                            onChange={() => setMessage(null)}
                            required
                            fullWidth
                            autoComplete="current-password"
                        />
                        <TextField
                            name="new_password"
                            label="Nova lozinka"
                            type="password"
                            defaultValue=""
                            onChange={() => setMessage(null)}
                            required
                            fullWidth
                            autoComplete="new-password"
                            helperText="Minimum 8 karaktera"
                        />
                        <TextField
                            name="confirm_password"
                            label="Potvrdi novu lozinku"
                            type="password"
                            defaultValue=""
                            onChange={() => setMessage(null)}
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
                    </Stack>
                </DialogContent>
                <DialogActions sx={{ px: 3, pb: 2 }}>
                    <Button onClick={handleClose} disabled={loading}>
                        Otkaži
                    </Button>
                    <Button type="submit" variant="contained" disabled={loading}>
                        {loading ? "Čeka se..." : "Sačuvaj"}
                    </Button>
                </DialogActions>
            </Box>
        </Dialog>
    );
}
