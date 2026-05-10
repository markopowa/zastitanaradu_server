import { Box, Typography, Divider, Link, Grid, Paper } from "@mui/material";
import { Link as RouterLink } from "react-router-dom";
import SecurityIcon from "@mui/icons-material/Security";
import AssignmentIcon from "@mui/icons-material/Assignment";
import NotificationsActiveIcon from "@mui/icons-material/NotificationsActive";
import DescriptionIcon from "@mui/icons-material/Description";

const PRIMARY = "#4A6FA5";
const PRIMARY_DARK = "#2e4a75";
const BG = "#EAF3FC";

const FEATURES = [
    {
        icon: <SecurityIcon fontSize="large" sx={{ color: PRIMARY }} />,
        title: "Zaštita na radu",
        desc: "Praćenje svih obaveza iz oblasti bezbednosti i zdravlja na radu za svakog zaposlenog.",
    },
    {
        icon: <AssignmentIcon fontSize="large" sx={{ color: PRIMARY }} />,
        title: "Lekarski pregledi",
        desc: "Automatsko zakazivanje i generisanje uputa za prethodne i periodične preglede.",
    },
    {
        icon: <NotificationsActiveIcon fontSize="large" sx={{ color: PRIMARY }} />,
        title: "Automatski podsetnici",
        desc: "Sistem šalje obaveštenja pre isteka rokova kako nijedna obaveza ne bi bila propuštena.",
    },
    {
        icon: <DescriptionIcon fontSize="large" sx={{ color: PRIMARY }} />,
        title: "Dokumentacija",
        desc: "Generisanje i čuvanje sve potrebne dokumentacije na jednom mestu.",
    },
];

export default function AboutPage() {
    return (
        <Box sx={{ minHeight: "100vh", bgcolor: BG }}>

            {/* Header */}
            <Box
                sx={{
                    background: `linear-gradient(135deg, ${PRIMARY_DARK}, ${PRIMARY})`,
                    color: "white",
                    py: 2.5,
                    px: { xs: 3, md: 6 },
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                }}
            >
                <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
                    <img src="/favicon.svg" style={{ width: 38 }} alt="logo" />
                    <Typography variant="h6" fontWeight={700} letterSpacing={0.5}>
                        MAK Total Safety
                    </Typography>
                </Box>
                <Link
                    component={RouterLink}
                    to="/login"
                    sx={{
                        color: "white",
                        fontWeight: 500,
                        textDecoration: "none",
                        border: "1px solid rgba(255,255,255,0.5)",
                        borderRadius: 2,
                        px: 2,
                        py: 0.5,
                        "&:hover": { bgcolor: "rgba(255,255,255,0.12)" },
                    }}
                >
                    Prijava
                </Link>
            </Box>

            {/* Hero */}
            <Box
                sx={{
                    background: `linear-gradient(160deg, ${PRIMARY} 0%, ${PRIMARY_DARK} 100%)`,
                    color: "white",
                    py: { xs: 7, md: 10 },
                    px: { xs: 3, md: 6 },
                    textAlign: "center",
                }}
            >
                <Typography variant="h4" fontWeight={700} gutterBottom>
                    Softver za upravljanje obavezama zaštite na radu
                </Typography>
                <Typography
                    variant="h6"
                    sx={{ opacity: 0.88, maxWidth: 620, mx: "auto", fontWeight: 400, mt: 1 }}
                >
                    Digitalizujte evidenciju lekarskih pregleda, obuka i periodičnih
                    provera za vaše zaposlene i opremu.
                </Typography>
            </Box>

            {/* Features */}
            <Box sx={{ maxWidth: 960, mx: "auto", py: 8, px: { xs: 3, md: 4 } }}>
                <Typography variant="h5" fontWeight={600} gutterBottom textAlign="center" color={PRIMARY_DARK}>
                    Šta sistem omogućava
                </Typography>
                <Divider sx={{ mb: 5, borderColor: PRIMARY, opacity: 0.25 }} />
                <Grid container spacing={4}>
                    {FEATURES.map((f) => (
                        <Grid item xs={12} sm={6} key={f.title}>
                            <Paper
                                elevation={0}
                                sx={{
                                    p: 3,
                                    borderRadius: 3,
                                    bgcolor: "#F5F9FD",
                                    border: `1px solid rgba(74,111,165,0.15)`,
                                    display: "flex",
                                    gap: 2,
                                    height: "100%",
                                }}
                            >
                                <Box sx={{ mt: 0.5, flexShrink: 0 }}>{f.icon}</Box>
                                <Box>
                                    <Typography variant="subtitle1" fontWeight={600} color={PRIMARY_DARK}>
                                        {f.title}
                                    </Typography>
                                    <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                                        {f.desc}
                                    </Typography>
                                </Box>
                            </Paper>
                        </Grid>
                    ))}
                </Grid>
            </Box>

            {/* Company info */}
            <Box sx={{ bgcolor: "#F5F9FD", borderTop: `1px solid rgba(74,111,165,0.15)` }}>
                <Box sx={{ maxWidth: 960, mx: "auto", py: 6, px: { xs: 3, md: 4 } }}>
                    <Typography variant="h6" fontWeight={600} color={PRIMARY_DARK} gutterBottom>
                        O kompaniji
                    </Typography>
                    <Divider sx={{ mb: 3, borderColor: PRIMARY, opacity: 0.2 }} />
                    <Grid container spacing={3}>
                        {[
                            { label: "Naziv", value: "[Naziv firme]" },
                            { label: "PIB", value: "[PIB]" },
                            { label: "Matični broj", value: "[Matični broj]" },
                            { label: "Adresa", value: "[Adresa sedišta]" },
                            { label: "Email", value: "info@mak-total-safety.pznr.in.rs", isEmail: true },
                            { label: "Web", value: "mak-total-safety.pznr.in.rs" },
                        ].map((item) => (
                            <Grid item xs={12} sm={6} md={4} key={item.label}>
                                <Typography variant="caption" color="text.secondary" display="block">
                                    {item.label}
                                </Typography>
                                <Typography variant="body2" fontWeight={500} color={PRIMARY_DARK}>
                                    {item.isEmail ? (
                                        <a href={`mailto:${item.value}`} style={{ color: PRIMARY }}>
                                            {item.value}
                                        </a>
                                    ) : (
                                        item.value
                                    )}
                                </Typography>
                            </Grid>
                        ))}
                    </Grid>
                </Box>
            </Box>

            {/* Footer */}
            <Box
                sx={{
                    background: `linear-gradient(135deg, ${PRIMARY_DARK}, ${PRIMARY})`,
                    color: "rgba(255,255,255,0.8)",
                    py: 3,
                    px: { xs: 3, md: 6 },
                    textAlign: "center",
                }}
            >
                <Typography variant="body2">
                    © {new Date().getFullYear()} MAK Total Safety. Sva prava zadržana.
                </Typography>
            </Box>
        </Box>
    );
}
