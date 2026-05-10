import { Box, Typography, Divider, Link, Grid, Paper } from "@mui/material";
import { Link as RouterLink } from "react-router-dom";
import GavelIcon from "@mui/icons-material/Gavel";
import BusinessIcon from "@mui/icons-material/Business";
import AssessmentIcon from "@mui/icons-material/Assessment";
import MedicalServicesIcon from "@mui/icons-material/MedicalServices";
import SchoolIcon from "@mui/icons-material/School";
import BadgeIcon from "@mui/icons-material/Badge";
import VerifiedUserIcon from "@mui/icons-material/VerifiedUser";
import BuildIcon from "@mui/icons-material/Build";
import ScienceIcon from "@mui/icons-material/Science";
import AirIcon from "@mui/icons-material/Air";
import HealthAndSafetyIcon from "@mui/icons-material/HealthAndSafety";
import DescriptionIcon from "@mui/icons-material/Description";
import GroupsIcon from "@mui/icons-material/Groups";
import SecurityIcon from "@mui/icons-material/Security";

const PRIMARY = "#4A6FA5";
const PRIMARY_DARK = "#2e4a75";
const BG = "#EAF3FC";

export default function AboutPage() {
    return (
        <Box sx={{ minHeight: "100vh", bgcolor: BG }}>
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

            <Box sx={{ borderTop: `1px solid rgba(74,111,165,0.15)` }}>
                <Box sx={{ maxWidth: 960, mx: "auto", py: 7, px: { xs: 3, md: 4 } }}>
                    <Typography variant="h5" fontWeight={600} textAlign="center" color={PRIMARY_DARK} gutterBottom>
                        Oblasti koje pokrivamo
                    </Typography>
                    <Divider sx={{ mb: 5, borderColor: PRIMARY, opacity: 0.25 }} />
                    <Grid container spacing={2}>
                        {[
                            { icon: <GavelIcon sx={{ color: PRIMARY }} />, label: "Prava, obaveze i odgovornosti u oblasti bezbednosti i zdravlja na radu" },
                            { icon: <BusinessIcon sx={{ color: PRIMARY }} />, label: "Organizovanje poslova za bezbednost i zdravlje na radu" },
                            { icon: <AssessmentIcon sx={{ color: PRIMARY }} />, label: "Procena rizika" },
                            { icon: <MedicalServicesIcon sx={{ color: PRIMARY }} />, label: "Lekarski pregledi zaposlenih" },
                            { icon: <SchoolIcon sx={{ color: PRIMARY }} />, label: "Obuka zaposlenih za bezbedan i zdrav rad" },
                            { icon: <BadgeIcon sx={{ color: PRIMARY }} />, label: "Dozvole za rad" },
                            { icon: <VerifiedUserIcon sx={{ color: PRIMARY }} />, label: "Lična zaštitna oprema" },
                            { icon: <BuildIcon sx={{ color: PRIMARY }} />, label: "Pregledi i provera opreme za rad" },
                            { icon: <ScienceIcon sx={{ color: PRIMARY }} />, label: "Opasne hemijske materije i druge" },
                            { icon: <AirIcon sx={{ color: PRIMARY }} />, label: "Ispitivanje uslova radne sredine" },
                            { icon: <HealthAndSafetyIcon sx={{ color: PRIMARY }} />, label: "Organizovanje prve pomoći" },
                            { icon: <DescriptionIcon sx={{ color: PRIMARY }} />, label: "Evidencija, saradnja i izveštavanje" },
                            { icon: <GroupsIcon sx={{ color: PRIMARY }} />, label: "Predstavnici zaposlenih za bezbednost i zdravlje na radu i odbor za BZR" },
                            { icon: <SecurityIcon sx={{ color: PRIMARY }} />, label: "Osiguranje od povrede na radu i profesionalnih bolesti" },
                        ].map((oblast) => (
                            <Grid item xs={12} sm={6} md={4} key={oblast.label}>
                                <Paper
                                    elevation={0}
                                    sx={{
                                        p: 2.5,
                                        borderRadius: 2,
                                        bgcolor: "#F5F9FD",
                                        border: `1px solid rgba(74,111,165,0.15)`,
                                        height: "100%",
                                        display: "flex",
                                        alignItems: "flex-start",
                                        gap: 1.5,
                                    }}
                                >
                                    <Box sx={{ mt: 0.3, flexShrink: 0 }}>{oblast.icon}</Box>
                                    <Typography variant="body2" color={PRIMARY_DARK} fontWeight={500}>
                                        {oblast.label}
                                    </Typography>
                                </Paper>
                            </Grid>
                        ))}
                    </Grid>
                </Box>
            </Box>

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
