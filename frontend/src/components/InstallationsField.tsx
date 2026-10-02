import type { FC } from "react";
import {
    Checkbox,
    FormControl,
    FormControlLabel,
    FormGroup,
    FormLabel,
    Typography,
} from "@mui/material";

export const INSTALLATION_OPTIONS: { value: string; label: string }[] = [
    { value: "HYDRANT_NETWORK", label: "Hidrantska mreža" },
    { value: "FIRE_ALARM_SYSTEM", label: "Sistem za detekciju požara" },
    { value: "LIGHTNING_PROTECTION", label: "Gromobranska zaštita" },
    { value: "STABLE_EXTINGUISHING_SYSTEM", label: "Stabilni sistem za gašenje" },
    { value: "FIRE_EXTINGUISHERS", label: "Aparati za gašenje požara" },
];

interface InstallationsFieldProps {
    value: string[] | null;
    onChange: (value: string[] | null) => void;
}

const InstallationsField: FC<InstallationsFieldProps> = ({
    value,
    onChange,
}) => {
    const selected = value ?? [];
    const noneSelected = value !== null && value.length === 0;

    return (
        <FormControl component="fieldset" margin="dense">
            <FormLabel component="legend">Instalacije</FormLabel>
            <FormGroup>
                {INSTALLATION_OPTIONS.map((inst) => (
                    <FormControlLabel
                        key={inst.value}
                        control={
                            <Checkbox
                                size="small"
                                checked={selected.includes(inst.value)}
                                onChange={(e) => {
                                    const next = e.target.checked
                                        ? [...selected, inst.value]
                                        : selected.filter(
                                              (v) => v !== inst.value,
                                          );
                                    onChange(next.length > 0 ? next : null);
                                }}
                            />
                        }
                        label={inst.label}
                    />
                ))}
                <FormControlLabel
                    control={
                        <Checkbox
                            size="small"
                            checked={noneSelected}
                            onChange={(e) =>
                                onChange(e.target.checked ? [] : null)
                            }
                        />
                    }
                    label="Firma nema nijednu od ovih instalacija"
                />
            </FormGroup>
            {value === null ? (
                <Typography variant="caption" color="warning.main">
                    Dok ne označiš instalacije, Plan obaveza ne zna koje
                    preglede firma mora da ima.
                </Typography>
            ) : null}
        </FormControl>
    );
};

export default InstallationsField;
