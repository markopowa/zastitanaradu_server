import {
    Button,
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
} from "@mui/material";

import { BUTTON_LABELS } from "./labels";
import type { ConfirmDialogProps } from "../types/design";

export function ConfirmDialog({
    open,
    title,
    message,
    confirmLabel = BUTTON_LABELS.delete,
    cancelLabel = BUTTON_LABELS.cancel,
    confirmColor = "error",
    loading = false,
    onConfirm,
    onClose,
}: ConfirmDialogProps) {
    return (
        <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth>
            <DialogTitle>{title}</DialogTitle>
            <DialogContent>{message}</DialogContent>
            <DialogActions>
                <Button variant="text" onClick={onClose} disabled={loading}>
                    {cancelLabel}
                </Button>
                <Button
                    variant="contained"
                    color={confirmColor}
                    disabled={loading}
                    onClick={onConfirm}
                >
                    {loading ? BUTTON_LABELS.deleting : confirmLabel}
                </Button>
            </DialogActions>
        </Dialog>
    );
}
