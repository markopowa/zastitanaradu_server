import { useEffect, useState } from "react";
import {
    Accordion,
    AccordionDetails,
    AccordionSummary,
    Box,
    Chip,
    CircularProgress,
    IconButton,
    MenuItem,
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

import { PermissionGate } from "./PermissionGate";
import {
    createJobRoleHazard,
    deleteJobRoleHazard,
    getHazards,
    getJobRoleHazards,
    getKinneyScaleOptions,
    updateJobRoleHazard,
} from "../api/riskAssessment";
import type {
    Hazard,
    JobRoleHazard,
    KinneyFactor,
    KinneyScaleOption,
} from "../api/riskAssessment";
import type { JobRole } from "../types/processes";

interface Props {
    jobRoles: JobRole[];
}

type ScaleMap = Record<KinneyFactor, KinneyScaleOption[]>;

const CATEGORY_COLORS: Record<
    string,
    "success" | "info" | "warning" | "error" | "default"
> = {
    PRIHVATLJIV: "success",
    MOGUCI: "info",
    ZNACAJAN: "warning",
    VISOK: "error",
    VRLO_VISOK: "error",
};

function categoryChip(row: JobRoleHazard) {
    return (
        <Chip
            size="small"
            label={`${row.rizik} (${row.risk_category_label})`}
            color={CATEGORY_COLORS[row.risk_category] ?? "default"}
        />
    );
}

export function WorkplaceRiskAssessmentPanel({ jobRoles }: Props) {
    const [hazards, setHazards] = useState<Hazard[]>([]);
    const [scale, setScale] = useState<ScaleMap>({ V: [], I: [], P: [] });
    const [rowsByRole, setRowsByRole] = useState<
        Record<number, JobRoleHazard[]>
    >({});
    const [expanded, setExpanded] = useState<number | null>(null);
    const [loadingRole, setLoadingRole] = useState<number | null>(null);
    const [draft, setDraft] = useState<{
        hazard: string;
        v: string;
        i: string;
        p: string;
        mere: string;
    }>({ hazard: "", v: "", i: "", p: "", mere: "" });

    useEffect(() => {
        void (async () => {
            try {
                const [hz, opts] = await Promise.all([
                    getHazards(true),
                    getKinneyScaleOptions(),
                ]);
                setHazards(hz);
                const map: ScaleMap = { V: [], I: [], P: [] };
                for (const o of opts) map[o.factor].push(o);
                setScale(map);
            } catch {
                enqueueSnackbar("Greška pri učitavanju kataloga rizika.", {
                    variant: "error",
                });
            }
        })();
    }, []);

    const loadRole = async (roleId: number) => {
        setLoadingRole(roleId);
        try {
            const rows = await getJobRoleHazards(roleId);
            setRowsByRole((prev) => ({ ...prev, [roleId]: rows }));
        } catch {
            enqueueSnackbar("Greška pri učitavanju procene.", {
                variant: "error",
            });
        } finally {
            setLoadingRole(null);
        }
    };

    const handleExpand = (roleId: number) => (_: unknown, isOpen: boolean) => {
        setExpanded(isOpen ? roleId : null);
        setDraft({ hazard: "", v: "", i: "", p: "", mere: "" });
        if (isOpen && rowsByRole[roleId] === undefined) void loadRole(roleId);
    };

    const patchRow = async (
        roleId: number,
        row: JobRoleHazard,
        payload: Partial<JobRoleHazard>,
    ) => {
        try {
            const updated = await updateJobRoleHazard(row.id, payload);
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
        if (!draft.hazard || !draft.v || !draft.i || !draft.p) {
            enqueueSnackbar("Izaberi opasnost i sve tri vrednosti (V, I, P).", {
                variant: "warning",
            });
            return;
        }
        try {
            const created = await createJobRoleHazard({
                job_role: roleId,
                hazard: Number(draft.hazard),
                verovatnoca: Number(draft.v),
                izlozenost: Number(draft.i),
                posledica: Number(draft.p),
                mere: draft.mere,
            });
            setRowsByRole((prev) => ({
                ...prev,
                [roleId]: [...(prev[roleId] ?? []), created],
            }));
            setDraft({ hazard: "", v: "", i: "", p: "", mere: "" });
        } catch {
            enqueueSnackbar(
                "Greška pri dodavanju (možda je ta opasnost već uneta).",
                { variant: "error" },
            );
        }
    };

    const removeRow = async (roleId: number, row: JobRoleHazard) => {
        try {
            await deleteJobRoleHazard(row.id);
            setRowsByRole((prev) => ({
                ...prev,
                [roleId]: (prev[roleId] ?? []).filter((r) => r.id !== row.id),
            }));
        } catch {
            enqueueSnackbar("Greška pri brisanju.", { variant: "error" });
        }
    };

    const factorSelect = (
        factor: KinneyFactor,
        value: string,
        onChange: (v: string) => void,
    ) => (
        <TextField
            select
            size="small"
            fullWidth
            value={value}
            onChange={(e) => onChange(e.target.value)}
            SelectProps={{ renderValue: (v) => (v ? String(v) : "") }}
        >
            <MenuItem value="">(prazno)</MenuItem>
            {scale[factor].map((o) => (
                <MenuItem key={o.id} value={String(o.value)}>
                    {o.value} ({o.label})
                </MenuItem>
            ))}
        </TextField>
    );

    if (jobRoles.length === 0) {
        return (
            <Typography variant="body2" color="text.secondary">
                Nema radnih mesta. Dodaj radno mesto pa unesi procenu rizika.
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
                        onChange={handleExpand(role.id)}
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
                                <Box sx={{ overflowX: "hidden" }}>
                                    <Table
                                        size="small"
                                        sx={{
                                            width: "100%",
                                            tableLayout: "fixed",
                                        }}
                                    >
                                        <TableHead>
                                            <TableRow>
                                                <TableCell sx={{ width: "22%" }}>
                                                    Opasnost / štetnost
                                                </TableCell>
                                                <TableCell sx={{ width: "8%" }}>
                                                    V
                                                </TableCell>
                                                <TableCell sx={{ width: "8%" }}>
                                                    I
                                                </TableCell>
                                                <TableCell sx={{ width: "8%" }}>
                                                    P
                                                </TableCell>
                                                <TableCell sx={{ width: "15%" }}>
                                                    Rizik
                                                </TableCell>
                                                <TableCell sx={{ width: "31%" }}>
                                                    Mere
                                                </TableCell>
                                                <TableCell sx={{ width: "8%" }} />
                                            </TableRow>
                                        </TableHead>
                                        <TableBody>
                                            {rows.map((row) => (
                                                <TableRow key={row.id}>
                                                    <TableCell>
                                                        {row.hazard_label}
                                                    </TableCell>
                                                    <TableCell>
                                                        {factorSelect(
                                                            "V",
                                                            String(
                                                                row.verovatnoca,
                                                            ),
                                                            (v) =>
                                                                void patchRow(
                                                                    role.id,
                                                                    row,
                                                                    {
                                                                        verovatnoca:
                                                                            Number(
                                                                                v,
                                                                            ),
                                                                    },
                                                                ),
                                                        )}
                                                    </TableCell>
                                                    <TableCell>
                                                        {factorSelect(
                                                            "I",
                                                            String(
                                                                row.izlozenost,
                                                            ),
                                                            (v) =>
                                                                void patchRow(
                                                                    role.id,
                                                                    row,
                                                                    {
                                                                        izlozenost:
                                                                            Number(
                                                                                v,
                                                                            ),
                                                                    },
                                                                ),
                                                        )}
                                                    </TableCell>
                                                    <TableCell>
                                                        {factorSelect(
                                                            "P",
                                                            String(
                                                                row.posledica,
                                                            ),
                                                            (v) =>
                                                                void patchRow(
                                                                    role.id,
                                                                    row,
                                                                    {
                                                                        posledica:
                                                                            Number(
                                                                                v,
                                                                            ),
                                                                    },
                                                                ),
                                                        )}
                                                    </TableCell>
                                                    <TableCell>
                                                        {categoryChip(row)}
                                                    </TableCell>
                                                    <TableCell>
                                                        <TextField
                                                            size="small"
                                                            fullWidth
                                                            defaultValue={
                                                                row.mere
                                                            }
                                                            onBlur={(e) => {
                                                                if (
                                                                    e.target
                                                                        .value !==
                                                                    row.mere
                                                                )
                                                                    void patchRow(
                                                                        role.id,
                                                                        row,
                                                                        {
                                                                            mere: e
                                                                                .target
                                                                                .value,
                                                                        },
                                                                    );
                                                            }}
                                                            multiline
                                                        />
                                                    </TableCell>
                                                    <TableCell>
                                                        <PermissionGate permission="partners.delete_jobrolehazard">
                                                            <IconButton
                                                                size="small"
                                                                color="error"
                                                                onClick={() =>
                                                                    void removeRow(
                                                                        role.id,
                                                                        row,
                                                                    )
                                                                }
                                                            >
                                                                <DeleteOutlineIcon fontSize="small" />
                                                            </IconButton>
                                                        </PermissionGate>
                                                    </TableCell>
                                                </TableRow>
                                            ))}
                                            <PermissionGate permission="partners.add_jobrolehazard">
                                                <TableRow>
                                                    <TableCell>
                                                        <TextField
                                                            select
                                                            size="small"
                                                            fullWidth
                                                            value={draft.hazard}
                                                            onChange={(e) =>
                                                                setDraft((d) => ({
                                                                    ...d,
                                                                    hazard: e
                                                                        .target
                                                                        .value,
                                                                }))
                                                            }
                                                            SelectProps={{
                                                                displayEmpty:
                                                                    true,
                                                                renderValue: (
                                                                    v,
                                                                ) =>
                                                                    v
                                                                        ? (hazards.find(
                                                                              (
                                                                                  h,
                                                                              ) =>
                                                                                  String(
                                                                                      h.id,
                                                                                  ) ===
                                                                                  v,
                                                                          )
                                                                              ?.label ??
                                                                          "")
                                                                        : "Izaberi",
                                                            }}
                                                        >
                                                            {hazards.map((h) => (
                                                                <MenuItem
                                                                    key={h.id}
                                                                    value={String(
                                                                        h.id,
                                                                    )}
                                                                >
                                                                    {h.label} (
                                                                    {
                                                                        h.kind_display
                                                                    }
                                                                    )
                                                                </MenuItem>
                                                            ))}
                                                        </TextField>
                                                    </TableCell>
                                                    <TableCell>
                                                        {factorSelect(
                                                            "V",
                                                            draft.v,
                                                            (v) =>
                                                                setDraft((d) => ({
                                                                    ...d,
                                                                    v,
                                                                })),
                                                        )}
                                                    </TableCell>
                                                    <TableCell>
                                                        {factorSelect(
                                                            "I",
                                                            draft.i,
                                                            (v) =>
                                                                setDraft((d) => ({
                                                                    ...d,
                                                                    i: v,
                                                                })),
                                                        )}
                                                    </TableCell>
                                                    <TableCell>
                                                        {factorSelect(
                                                            "P",
                                                            draft.p,
                                                            (v) =>
                                                                setDraft((d) => ({
                                                                    ...d,
                                                                    p: v,
                                                                })),
                                                        )}
                                                    </TableCell>
                                                    <TableCell />
                                                    <TableCell>
                                                        <TextField
                                                            size="small"
                                                            fullWidth
                                                            placeholder="Mere"
                                                            value={draft.mere}
                                                            onChange={(e) =>
                                                                setDraft((d) => ({
                                                                    ...d,
                                                                    mere: e
                                                                        .target
                                                                        .value,
                                                                }))
                                                            }
                                                        />
                                                    </TableCell>
                                                    <TableCell>
                                                        <IconButton
                                                            size="small"
                                                            color="primary"
                                                            onClick={() =>
                                                                void addRow(
                                                                    role.id,
                                                                )
                                                            }
                                                        >
                                                            <AddIcon fontSize="small" />
                                                        </IconButton>
                                                    </TableCell>
                                                </TableRow>
                                            </PermissionGate>
                                        </TableBody>
                                    </Table>
                                </Box>
                            )}
                        </AccordionDetails>
                    </Accordion>
                );
            })}
        </Box>
    );
}
