import { useState } from "react";
import {
    Box,
    Button,
    CircularProgress,
    Link,
    Paper,
    Stack,
    Typography,
} from "@mui/material";
import UploadFileIcon from "@mui/icons-material/UploadFile";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import VisibilityIcon from "@mui/icons-material/Visibility";
import { enqueueSnackbar } from "notistack";

import { PermissionGate } from "./PermissionGate";
import { clearJobRoleTemplate, uploadJobRoleTemplate } from "../api/processes";
import type { JobRole, JobRoleTemplateKey } from "../types/processes";

interface Props {
    jobRoles: JobRole[];
    onRoleUpdated: (role: JobRole) => void;
}

interface SlotDef {
    key: JobRoleTemplateKey;
    label: string;
    value: string | null;
}

const ACCEPT = ".doc,.docx,.pdf";

export function JobRoleTemplatesPanel({ jobRoles, onRoleUpdated }: Props) {
    const [busy, setBusy] = useState<Set<string>>(new Set());

    const mark = (id: string, on: boolean): void => {
        setBusy((prev) => {
            const next = new Set(prev);
            if (on) next.add(id);
            else next.delete(id);
            return next;
        });
    };

    const handleUpload = async (
        role: JobRole,
        key: JobRoleTemplateKey,
        file: File,
    ): Promise<void> => {
        const id = `${role.id}:${key}`;
        mark(id, true);
        try {
            const updated = await uploadJobRoleTemplate(role.id, key, file);
            onRoleUpdated(updated);
            enqueueSnackbar("Šablon otpremljen.", { variant: "success" });
        } catch {
            enqueueSnackbar("Otpremanje šablona nije uspelo.", {
                variant: "error",
            });
        } finally {
            mark(id, false);
        }
    };

    const handleClear = async (
        role: JobRole,
        key: JobRoleTemplateKey,
    ): Promise<void> => {
        const id = `${role.id}:${key}`;
        mark(id, true);
        try {
            const updated = await clearJobRoleTemplate(role.id, key);
            onRoleUpdated(updated);
            enqueueSnackbar("Šablon uklonjen.", { variant: "success" });
        } catch {
            enqueueSnackbar("Uklanjanje šablona nije uspelo.", {
                variant: "error",
            });
        } finally {
            mark(id, false);
        }
    };

    if (jobRoles.length === 0) {
        return (
            <Typography variant="body2" color="text.secondary">
                Dodajte radna mesta da biste im priložili blanko šablone.
            </Typography>
        );
    }

    return (
        <Stack spacing={2}>
            <Typography variant="body2" color="text.secondary">
                Blanko obrazac 6 i revers LZO se čuvaju po radnom mestu. Pri
                obuci i zaduženju opreme se preuzmu, popune i otpremi popunjen
                primerak.
            </Typography>
            {jobRoles.map((role) => {
                const slots: SlotDef[] = [
                    {
                        key: "obrazac6",
                        label: "Blanko obrazac 6",
                        value: role.obrazac6_template,
                    },
                    {
                        key: "lzo-revers",
                        label: "Blanko revers LZO",
                        value: role.lzo_revers_template,
                    },
                    {
                        key: "potvrda-clan5",
                        label: "Blanko potvrda po članu 5",
                        value: role.potvrda_clan5_template,
                    },
                ];
                return (
                    <Paper key={role.id} variant="outlined" sx={{ p: 2 }}>
                        <Typography
                            variant="subtitle2"
                            sx={{ fontWeight: 600, mb: 1.5 }}
                        >
                            {role.name}
                        </Typography>
                        <Stack
                            direction={{ xs: "column", sm: "row" }}
                            spacing={2}
                        >
                            {slots.map((slot) => {
                                const id = `${role.id}:${slot.key}`;
                                const isBusy = busy.has(id);
                                return (
                                    <Box key={slot.key} sx={{ flex: 1 }}>
                                        <Typography
                                            variant="caption"
                                            color="text.secondary"
                                            sx={{ display: "block", mb: 0.5 }}
                                        >
                                            {slot.label}
                                        </Typography>
                                        <Stack
                                            direction="row"
                                            spacing={1}
                                            alignItems="center"
                                            flexWrap="wrap"
                                        >
                                            {isBusy && (
                                                <CircularProgress size={18} />
                                            )}
                                            {!isBusy && slot.value && (
                                                <>
                                                    <Link
                                                        href={slot.value}
                                                        target="_blank"
                                                        rel="noopener"
                                                        sx={{
                                                            display:
                                                                "inline-flex",
                                                            alignItems:
                                                                "center",
                                                            gap: 0.5,
                                                        }}
                                                    >
                                                        <VisibilityIcon fontSize="small" />
                                                        Pregled
                                                    </Link>
                                                    <PermissionGate permission="partners.change_jobrole">
                                                        <Button
                                                            size="small"
                                                            color="error"
                                                            startIcon={
                                                                <DeleteOutlineIcon fontSize="small" />
                                                            }
                                                            onClick={() =>
                                                                void handleClear(
                                                                    role,
                                                                    slot.key,
                                                                )
                                                            }
                                                        >
                                                            Ukloni
                                                        </Button>
                                                    </PermissionGate>
                                                </>
                                            )}
                                            {!isBusy && !slot.value && (
                                                <PermissionGate permission="partners.change_jobrole">
                                                    <Button
                                                        size="small"
                                                        variant="outlined"
                                                        component="label"
                                                        startIcon={
                                                            <UploadFileIcon fontSize="small" />
                                                        }
                                                    >
                                                        Otpremi
                                                        <input
                                                            type="file"
                                                            hidden
                                                            accept={ACCEPT}
                                                            onChange={(e) => {
                                                                const f =
                                                                    e.target
                                                                        .files?.[0];
                                                                e.target.value =
                                                                    "";
                                                                if (f)
                                                                    void handleUpload(
                                                                        role,
                                                                        slot.key,
                                                                        f,
                                                                    );
                                                            }}
                                                        />
                                                    </Button>
                                                </PermissionGate>
                                            )}
                                        </Stack>
                                    </Box>
                                );
                            })}
                        </Stack>
                    </Paper>
                );
            })}
        </Stack>
    );
}
