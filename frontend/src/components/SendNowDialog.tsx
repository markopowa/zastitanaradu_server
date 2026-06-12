import {
    Button,
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
    FormControl,
    InputLabel,
    MenuItem,
    Select,
    useMediaQuery,
    useTheme,
} from "@mui/material";

import type { ProcessType } from "../types/processes";

export interface SendNowDialogProps {
    open: boolean;
    employeeName: string;
    processTypes: ProcessType[];
    processTypeId: string;
    sending: boolean;
    onChangeProcessType: (id: string) => void;
    onClose: () => void;
    onSend: () => void;
}

export function SendNowDialog({
    open,
    employeeName,
    processTypes,
    processTypeId,
    sending,
    onChangeProcessType,
    onClose,
    onSend,
}: SendNowDialogProps) {
    const theme = useTheme();
    const fullScreen = useMediaQuery(theme.breakpoints.down("sm"));

    return (
        <Dialog
            open={open}
            onClose={onClose}
            maxWidth="sm"
            fullWidth
            fullScreen={fullScreen}
        >
            <DialogTitle>Pošalji na pregled — {employeeName}</DialogTitle>
            <DialogContent>
                <FormControl fullWidth margin="dense">
                    <InputLabel>Vrsta pregleda</InputLabel>
                    <Select
                        value={processTypeId}
                        label="Vrsta pregleda"
                        onChange={(e) => onChangeProcessType(e.target.value)}
                    >
                        {processTypes.map((t) => (
                            <MenuItem key={t.id} value={String(t.id)}>
                                {t.name}
                            </MenuItem>
                        ))}
                    </Select>
                </FormControl>
            </DialogContent>
            <DialogActions>
                <Button onClick={onClose} disabled={sending}>
                    Odustani
                </Button>
                <Button
                    onClick={onSend}
                    variant="contained"
                    disabled={sending || !processTypeId}
                >
                    {sending ? "Šaljem..." : "Pošalji"}
                </Button>
            </DialogActions>
        </Dialog>
    );
}
