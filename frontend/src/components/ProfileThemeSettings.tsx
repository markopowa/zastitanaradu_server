import { Box, ToggleButton, ToggleButtonGroup, Typography } from "@mui/material";
import DarkModeOutlinedIcon from "@mui/icons-material/DarkModeOutlined";
import LightModeOutlinedIcon from "@mui/icons-material/LightModeOutlined";

import { useThemeMode } from "../contexts/ThemeModeContext";
import type { PaletteMode } from "../themePreference";

export function ProfileThemeSettings() {
    const { mode, setMode } = useThemeMode();

    const handleMode = (
        _: unknown,
        value: PaletteMode | null,
    ): void => {
        if (value != null) setMode(value);
    };

    return (
        <Box>
            <Typography variant="h6" gutterBottom>
                Tema prikaza
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                Izbor se pamti u ovom pregledaču (localStorage).
            </Typography>
            <ToggleButtonGroup
                exclusive
                value={mode}
                onChange={handleMode}
                aria-label="tema"
                color="primary"
            >
                <ToggleButton value="light" aria-label="svetla tema">
                    <LightModeOutlinedIcon sx={{ mr: 1 }} fontSize="small" />
                    Svetla
                </ToggleButton>
                <ToggleButton value="dark" aria-label="tamna tema">
                    <DarkModeOutlinedIcon sx={{ mr: 1 }} fontSize="small" />
                    Tamna
                </ToggleButton>
            </ToggleButtonGroup>
        </Box>
    );
}
