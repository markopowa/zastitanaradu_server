import { Button, CircularProgress, Tooltip } from "@mui/material";
import type { ButtonProps } from "@mui/material";

export interface AppButtonProps extends Omit<ButtonProps, "children"> {
    label: string;
    tooltip?: string;
    loading?: boolean;
    loadingLabel?: string;
}

export function AppButton({
    label,
    tooltip,
    loading = false,
    loadingLabel,
    disabled,
    startIcon,
    ...rest
}: AppButtonProps) {
    const button = (
        <Button
            {...rest}
            disabled={disabled || loading}
            startIcon={
                loading ? (
                    <CircularProgress size={16} color="inherit" />
                ) : (
                    startIcon
                )
            }
        >
            {loading ? (loadingLabel ?? label) : label}
        </Button>
    );
    if (!tooltip) return button;
    return (
        <Tooltip title={tooltip}>
            <span>{button}</span>
        </Tooltip>
    );
}
