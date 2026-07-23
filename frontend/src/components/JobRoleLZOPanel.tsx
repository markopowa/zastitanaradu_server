import { useState } from "react";
import {
    Accordion,
    AccordionDetails,
    AccordionSummary,
    Box,
    Button,
    CircularProgress,
    IconButton,
    Stack,
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableRow,
    TextField,
    Typography,
} from "@mui/material";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import AddIcon from "@mui/icons-material/Add";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import { enqueueSnackbar } from "notistack";

import {
    applyRoleLzoTemplate,
    createJobRoleLZO,
    deleteJobRoleLZO,
    getJobRoleLZO,
    getRoleLzoTemplate,
    updateJobRoleLZO,
} from "../api/riskAssessment";
import type { JobRoleLZO } from "../api/riskAssessment";
import type { JobRole } from "../types/processes";

interface Props {
    jobRoles: JobRole[];
}

type Draft = { name: string; standard: string; interval: string };

const EMPTY_DRAFT: Draft = { name: "", standard: "", interval: "" };

export function JobRoleLZOPanel({ jobRoles }: Props) {
    const [rowsByRole, setRowsByRole] = useState<Record<number, JobRoleLZO[]>>(
        {},
    );
    const [expanded, setExpanded] = useState<number | null>(null);
    const [loadingRole, setLoadingRole] = useState<number | null>(null);
    const [draft, setDraft] = useState<Draft>(EMPTY_DRAFT);
    const [templateCount, setTemplateCount] = useState<Record<number, number>>(
        {},
    );
    const [applying, setApplying] = useState<number | null>(null);

    const loadRole = async (role: JobRole) => {
        setLoadingRole(role.id);
        try {
            const [rows, template] = await Promise.all([
                getJobRoleLZO(role.id),
                getRoleLzoTemplate(role.name).catch(() => []),
            ]);
            setRowsByRole((prev) => ({ ...prev, [role.id]: rows }));
            setTemplateCount((prev) => ({
                ...prev,
                [role.id]: template.length,
            }));
        } catch {
            enqueueSnackbar("Greška pri učitavanju LZO.", { variant: "error" });
        } finally {
            setLoadingRole(null);
        }
    };

    const applyTemplate = async (role: JobRole) => {
        setApplying(role.id);
        try {
            const result = await applyRoleLzoTemplate(role.id);
            setRowsByRole((prev) => ({ ...prev, [role.id]: result.items }));
            enqueueSnackbar(
                `Dodato ${result.created} stavki iz tipske LZO.`,
                { variant: "success" },
            );
        } catch {
            enqueueSnackbar("Greška pri primeni tipske LZO.", {
                variant: "error",
            });
        } finally {
            setApplying(null);
        }
    };

    const handleExpand =
        (role: JobRole) => (_: unknown, isOpen: boolean) => {
            setExpanded(isOpen ? role.id : null);
            setDraft(EMPTY_DRAFT);
            if (isOpen && rowsByRole[role.id] === undefined) void loadRole(role);
        };

    const patchRow = async (
        roleId: number,
        row: JobRoleLZO,
        payload: Partial<JobRoleLZO>,
    ) => {
        try {
            const updated = await updateJobRoleLZO(row.id, payload);
            setRowsByRole((prev) => ({
                ...prev,
                [roleId]: (prev[roleId] ?? []).map((r) =>
                    r.id === row.id ? updated : r,
                ),
            }));
        } catch {
            enqueueSnackbar("Greška pri izmeni.", { variant: "error" });
        }
    };

    const addRow = async (roleId: number) => {
        if (!draft.name.trim()) {
            enqueueSnackbar("Unesi naziv lične zaštitne opreme.", {
                variant: "warning",
            });
            return;
        }
        try {
            const created = await createJobRoleLZO({
                job_role: roleId,
                name: draft.name.trim(),
                standard: draft.standard.trim(),
                interval_months: draft.interval
                    ? Number(draft.interval)
                    : null,
            });
            setRowsByRole((prev) => ({
                ...prev,
                [roleId]: [...(prev[roleId] ?? []), created],
            }));
            setDraft(EMPTY_DRAFT);
        } catch {
            enqueueSnackbar("Greška pri dodavanju.", { variant: "error" });
        }
    };

    const removeRow = async (roleId: number, row: JobRoleLZO) => {
        try {
            await deleteJobRoleLZO(row.id);
            setRowsByRole((prev) => ({
                ...prev,
                [roleId]: (prev[roleId] ?? []).filter((r) => r.id !== row.id),
            }));
        } catch {
            enqueueSnackbar("Greška pri brisanju.", { variant: "error" });
        }
    };

    if (jobRoles.length === 0) {
        return (
            <Typography variant="body2" color="text.secondary">
                Nema radnih mesta. Dodaj radno mesto pa unesi ličnu zaštitnu
                opremu.
            </Typography>
        );
    }

    return (
        <Box>
            {jobRoles.map((role) => {
                const rows = rowsByRole[role.id] ?? [];
                return (
                    <Accordion
                        key={role.id}
                        expanded={expanded === role.id}
                        onChange={handleExpand(role)}
                    >
                        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                            <Typography sx={{ fontWeight: 500 }}>
                                {role.name}
                            </Typography>
                        </AccordionSummary>
                        <AccordionDetails>
                            {loadingRole === role.id ? (
                                <CircularProgress size={20} />
                            ) : (
                                <Box sx={{ overflow: "auto" }}>
                                    {rows.length === 0 &&
                                        (templateCount[role.id] ?? 0) > 0 && (
                                            <Box sx={{ mb: 1 }}>
                                                <Button
                                                    size="small"
                                                    variant="outlined"
                                                    disabled={
                                                        applying === role.id
                                                    }
                                                    onClick={() =>
                                                        void applyTemplate(role)
                                                    }
                                                >
                                                    Primeni tipsku LZO (
                                                    {templateCount[role.id]}{" "}
                                                    stavki)
                                                </Button>
                                            </Box>
                                        )}
                                    <Table size="small">
                                        <TableHead>
                                            <TableRow>
                                                <TableCell>
                                                    Naziv lične zaštitne opreme
                                                </TableCell>
                                                <TableCell>Standard</TableCell>
                                                <TableCell>
                                                    Rok upotrebe (meseci)
                                                </TableCell>
                                                <TableCell />
                                            </TableRow>
                                        </TableHead>
                                        <TableBody>
                                            {rows.map((row) => (
                                                <TableRow key={row.id}>
                                                    <TableCell>
                                                        <TextField
                                                            size="small"
                                                            fullWidth
                                                            defaultValue={
                                                                row.name
                                                            }
                                                            onBlur={(e) => {
                                                                const v =
                                                                    e.target.value.trim();
                                                                if (
                                                                    v &&
                                                                    v !==
                                                                        row.name
                                                                )
                                                                    void patchRow(
                                                                        role.id,
                                                                        row,
                                                                        {
                                                                            name: v,
                                                                        },
                                                                    );
                                                            }}
                                                        />
                                                    </TableCell>
                                                    <TableCell>
                                                        <TextField
                                                            size="small"
                                                            fullWidth
                                                            defaultValue={
                                                                row.standard
                                                            }
                                                            onBlur={(e) => {
                                                                const v =
                                                                    e.target.value.trim();
                                                                if (
                                                                    v !==
                                                                    row.standard
                                                                )
                                                                    void patchRow(
                                                                        role.id,
                                                                        row,
                                                                        {
                                                                            standard:
                                                                                v,
                                                                        },
                                                                    );
                                                            }}
                                                        />
                                                    </TableCell>
                                                    <TableCell>
                                                        <TextField
                                                            size="small"
                                                            type="number"
                                                            sx={{
                                                                minWidth: 90,
                                                            }}
                                                            defaultValue={
                                                                row.interval_months ??
                                                                ""
                                                            }
                                                            onBlur={(e) => {
                                                                const raw =
                                                                    e.target.value.trim();
                                                                const v = raw
                                                                    ? Number(
                                                                          raw,
                                                                      )
                                                                    : null;
                                                                if (
                                                                    v !==
                                                                    row.interval_months
                                                                )
                                                                    void patchRow(
                                                                        role.id,
                                                                        row,
                                                                        {
                                                                            interval_months:
                                                                                v,
                                                                        },
                                                                    );
                                                            }}
                                                        />
                                                    </TableCell>
                                                    <TableCell align="right">
                                                        <IconButton
                                                            size="small"
                                                            onClick={() =>
                                                                void removeRow(
                                                                    role.id,
                                                                    row,
                                                                )
                                                            }
                                                        >
                                                            <DeleteOutlineIcon fontSize="small" />
                                                        </IconButton>
                                                    </TableCell>
                                                </TableRow>
                                            ))}
                                            <TableRow>
                                                <TableCell>
                                                    <TextField
                                                        size="small"
                                                        fullWidth
                                                        placeholder="npr. Zaštitne rukavice"
                                                        value={draft.name}
                                                        onChange={(e) =>
                                                            setDraft((d) => ({
                                                                ...d,
                                                                name: e.target
                                                                    .value,
                                                            }))
                                                        }
                                                    />
                                                </TableCell>
                                                <TableCell>
                                                    <TextField
                                                        size="small"
                                                        fullWidth
                                                        placeholder="npr. SRPS EN 388"
                                                        value={draft.standard}
                                                        onChange={(e) =>
                                                            setDraft((d) => ({
                                                                ...d,
                                                                standard:
                                                                    e.target
                                                                        .value,
                                                            }))
                                                        }
                                                    />
                                                </TableCell>
                                                <TableCell>
                                                    <TextField
                                                        size="small"
                                                        type="number"
                                                        sx={{ minWidth: 90 }}
                                                        value={draft.interval}
                                                        onChange={(e) =>
                                                            setDraft((d) => ({
                                                                ...d,
                                                                interval:
                                                                    e.target
                                                                        .value,
                                                            }))
                                                        }
                                                    />
                                                </TableCell>
                                                <TableCell align="right">
                                                    <IconButton
                                                        size="small"
                                                        color="primary"
                                                        onClick={() =>
                                                            void addRow(role.id)
                                                        }
                                                    >
                                                        <AddIcon fontSize="small" />
                                                    </IconButton>
                                                </TableCell>
                                            </TableRow>
                                        </TableBody>
                                    </Table>
                                    <Stack
                                        direction="row"
                                        justifyContent="flex-end"
                                        sx={{ mt: 1 }}
                                    >
                                        <Button
                                            size="small"
                                            startIcon={<AddIcon />}
                                            onClick={() => void addRow(role.id)}
                                        >
                                            Dodaj LZO
                                        </Button>
                                    </Stack>
                                </Box>
                            )}
                        </AccordionDetails>
                    </Accordion>
                );
            })}
        </Box>
    );
}
