import { useRef } from "react";
import { Box, Chip, TextField, Typography } from "@mui/material";
import type { TextFieldProps } from "@mui/material";

export interface TemplateVariable {
    key: string;
    label: string;
}

interface TemplateTextFieldProps extends Omit<
    TextFieldProps,
    "onChange" | "value"
> {
    value: string;
    onChange: (value: string) => void;
    variables: TemplateVariable[];
}

export default function TemplateTextField({
    value,
    onChange,
    variables,
    ...textFieldProps
}: TemplateTextFieldProps) {
    const inputRef = useRef<HTMLTextAreaElement | HTMLInputElement | null>(
        null,
    );

    const insertVariable = (key: string) => {
        const el = inputRef.current;
        const snippet = `{{ ${key} }}`;
        if (!el) {
            onChange(value + snippet);
            return;
        }
        const start = el.selectionStart ?? value.length;
        const end = el.selectionEnd ?? value.length;
        const next = value.slice(0, start) + snippet + value.slice(end);
        onChange(next);
        const cursor = start + snippet.length;
        requestAnimationFrame(() => {
            el.focus();
            el.setSelectionRange(cursor, cursor);
        });
    };

    return (
        <Box>
            <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.5, mb: 0.5 }}>
                <Typography
                    variant="caption"
                    color="text.secondary"
                    sx={{ alignSelf: "center", mr: 0.5 }}
                >
                    Ubaci:
                </Typography>
                {variables.map((v) => (
                    <Chip
                        key={v.key}
                        label={v.label}
                        size="small"
                        variant="outlined"
                        onClick={() => insertVariable(v.key)}
                        sx={{
                            cursor: "pointer",
                            fontFamily: "monospace",
                            fontSize: "0.7rem",
                        }}
                    />
                ))}
            </Box>
            <TextField
                {...textFieldProps}
                value={value}
                onChange={(e) => onChange(e.target.value)}
                inputRef={inputRef}
            />
        </Box>
    );
}
