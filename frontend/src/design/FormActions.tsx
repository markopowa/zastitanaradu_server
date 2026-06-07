import { Box, Button } from "@mui/material";

import { PermissionGate } from "../components/PermissionGate";
import { BUTTON_LABELS } from "./labels";
import type { FormActionsProps } from "../types/design";

export function FormActions({
    onCancel,
    onSave,
    saving = false,
    saveLabel = BUTTON_LABELS.save,
    cancelLabel = BUTTON_LABELS.cancel,
    disabled = false,
    savePermission,
}: FormActionsProps) {
    const saveButton = (
        <Button
            variant="contained"
            type={onSave == null ? "submit" : "button"}
            onClick={onSave}
            disabled={disabled || saving}
        >
            {saving ? BUTTON_LABELS.saving : saveLabel}
        </Button>
    );

    return (
        <Box
            sx={{
                display: "flex",
                justifyContent: "space-between",
                gap: 2,
                px: 3,
                py: 2,
            }}
        >
            <Button variant="text" onClick={onCancel}>
                {cancelLabel}
            </Button>
            {savePermission != null ? (
                <PermissionGate permission={savePermission}>
                    {saveButton}
                </PermissionGate>
            ) : (
                saveButton
            )}
        </Box>
    );
}
