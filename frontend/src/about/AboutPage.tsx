import { Box, Paper, Typography, Divider, Link } from "@mui/material";
import { Link as RouterLink } from "react-router-dom";

export default function AboutPage() {
    return (
        <Box
            sx={{
                minHeight: "100vh",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                bgcolor: "background.default",
                p: 2,
            }}
        >
            <Paper elevation={3} sx={{ p: 4, maxWidth: 600, width: "100%" }}>
                <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 2 }}>
                    <img src="/favicon.svg" style={{ width: 36 }} alt="logo" />
                    <Typography variant="h5" component="h1">
                        MAK Total Safety
                    </Typography>
                </Box>
                <Divider sx={{ mb: 2 }} />
                <Typography variant="body1" gutterBottom>
                    Platforma za upravljanje obavezama iz oblasti zaštite na radu i
                    protivpožarne zaštite.
                </Typography>
                <Typography variant="body1" gutterBottom sx={{ mt: 1 }}>
                    Sistem omogućava praćenje lekarskih pregleda zaposlenih, obuka,
                    pregleda opreme i ostalih periodičnih obaveza — sa automatskim
                    podsetnicima i generisanjem dokumentacije.
                </Typography>
                <Divider sx={{ my: 2 }} />
                <Typography variant="body2" color="text.secondary">
                    Kontakt:{" "}
                    <a href="mailto:info@mak-total-safety.pznr.in.rs">
                        info@mak-total-safety.pznr.in.rs
                    </a>
                </Typography>
                <Typography variant="body2" sx={{ mt: 2 }}>
                    <Link component={RouterLink} to="/login">
                        Prijava
                    </Link>
                </Typography>
            </Paper>
        </Box>
    );
}
