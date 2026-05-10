import { Box, Typography, Divider, Link, Grid } from "@mui/material";
import { Link as RouterLink } from "react-router-dom";
import SecurityIcon from "@mui/icons-material/Security";
import AssignmentIcon from "@mui/icons-material/Assignment";
import NotificationsActiveIcon from "@mui/icons-material/NotificationsActive";
import DescriptionIcon from "@mui/icons-material/Description";

const FEATURES = [
    {
        icon: <SecurityIcon fontSize="large" color="primary" />,
        title: "Zaštita na radu",
        desc: "Praćenje svih obaveza iz oblasti bezbednosti i zdravlja na radu za svakog zaposlenog.",
    },
    {
        icon: <AssignmentIcon fontSize="large" color="primary" />,
        title: "Lekarski pregledi",
        desc: "Automatsko zakazivanje i generisanje uputa za prethodne i periodične preglede.",
    },
    {
        icon: <NotificationsActiveIcon fontSize="large" color="primary" />,
        title: "Automatski podsetnici",
        desc: "Sistem šalje obaveštenja pre isteka rokova kako nijedna obaveza ne bi bila propuštena.",
    },
    {
        icon: <DescriptionIcon fontSize="large" color="primary" />,
        title: "Dokumentacija",
        desc: "Generisanje i čuvanje sve potrebne dokumentacije na jednom mestu.",
    },
];

export default function AboutPage() {
    return (
        <Box sx={{ minHeight: "100vh", bgcolor: "background.default" }}>
            {/* Header */}
            <Box
                sx={{
                    bgcolor: "primary.main",
                    color: "white",
                    py: 3,
                    px: 4,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                }}
            >
                <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
                    <img src="/favicon.svg" style={{ width: 40 }} alt="logo" />
                    <Typography variant="h6" fontWeight={700}>
                        MAK Total Safety
                    </Typography>
                </Box>
                <Link
                    component={RouterLink}
                    to="/login"
                    sx={{ color: "white", fontWeight: 500 }}
                >
                    Prijava
                </Link>
            </Box>

            {/* Hero */}
            <Box
                sx={{
                    bgcolor: "primary.dark",
                    color: "white",
                    py: 8,
                    px: 4,
                    textAlign: "center",
                }}
            >
                <Typography variant="h4" fontWeight={700} gutterBottom>
                    Softver za upravljanje obavezama zaštite na radu
                </Typography>
                <Typography variant="h6" sx={{ opacity: 0.85, maxWidth: 600, mx: "auto" }}>
                    Digitalizujte evidenciju lekarskih pregleda, obuka i periodičnih
                    provera za vaše zaposlene i opremu.
                </Typography>
            </Box>

            {/* Features */}
            <Box sx={{ maxWidth: 960, mx: "auto", py: 8, px: 4 }}>
                <Typography variant="h5" fontWeight={600} gutterBottom textAlign="center">
                    Šta sistem omogućava
                </Typography>
                <Divider sx={{ mb: 5 }} />
                <Grid container spacing={4}>
                    {FEATURES.map((f) => (
                        <Grid item xs={12} sm={6} key={f.title}>
                            <Box sx={{ display: "flex", gap: 2 }}>
                                <Box sx={{ mt: 0.5 }}>{f.icon}</Box>
                                <Box>
                                    <Typography variant="subtitle1" fontWeight={600}>
                                        {f.title}
                                    </Typography>
                                    <Typography variant="body2" color="text.secondary">
                                        {f.desc}
                                    </Typography>
                                </Box>
                            </Box>
                        </Grid>
                    ))}
                </Grid>
            </Box>

            {/* Footer */}
            <Divider />
            <Box sx={{ py: 4, px: 4, textAlign: "center" }}>
                <Typography variant="body2" color="text.secondary">
                    MAK Total Safety &mdash;{" "}
                    <a href="mailto:info@mak-total-safety.pznr.in.rs">
                        info@mak-total-safety.pznr.in.rs
                    </a>
                </Typography>
            </Box>
        </Box>
    );
}
