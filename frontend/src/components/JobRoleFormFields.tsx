import {
    FormControl,
    InputLabel,
    MenuItem,
    Select,
    TextField,
} from "@mui/material";

import type { RiskLevel } from "../types/processes";

export interface JobRoleFormValues {
    name: string;
    riskLevelId: string;
    description: string;
}

export interface JobRoleFormFieldsProps {
    values: JobRoleFormValues;
    riskLevels: RiskLevel[];
    onChange: (values: JobRoleFormValues) => void;
    disabled?: boolean;
    requireRiskLevel?: boolean;
}

export function jobRoleFormIsValid(
    values: JobRoleFormValues,
    requireRiskLevel = false,
): boolean {
    if (!values.name.trim()) return false;
    if (requireRiskLevel && !values.riskLevelId) return false;
    return true;
}

export function JobRoleFormFields({
    values,
    riskLevels,
    onChange,
    disabled = false,
    requireRiskLevel = false,
}: JobRoleFormFieldsProps) {
    const { name, riskLevelId, description } = values;

    return (
        <>
            <TextField
                margin="dense"
                label="Naziv radnog mesta"
                fullWidth
                required
                disabled={disabled}
                value={name}
                onChange={(e) => onChange({ ...values, name: e.target.value })}
            />
            <FormControl
                margin="dense"
                fullWidth
                size="small"
                required={requireRiskLevel}
            >
                <InputLabel>Nivo rizika</InputLabel>
                <Select
                    label="Nivo rizika"
                    value={riskLevelId}
                    disabled={disabled}
                    onChange={(e) =>
                        onChange({
                            ...values,
                            riskLevelId: String(e.target.value),
                        })
                    }
                >
                    {!requireRiskLevel && (
                        <MenuItem value="">
                            <em>—</em>
                        </MenuItem>
                    )}
                    {riskLevels.map((rl) => (
                        <MenuItem key={rl.id} value={String(rl.id)}>
                            {rl.label} (R={rl.score})
                        </MenuItem>
                    ))}
                </Select>
            </FormControl>
            <TextField
                margin="dense"
                label="Opis"
                fullWidth
                multiline
                minRows={2}
                disabled={disabled}
                value={description}
                onChange={(e) =>
                    onChange({ ...values, description: e.target.value })
                }
            />
        </>
    );
}
