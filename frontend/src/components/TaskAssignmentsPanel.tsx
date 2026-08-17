import { useCallback, useEffect, useState } from "react";
import {
    Box,
    Button,
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
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import { enqueueSnackbar } from "notistack";

import { api } from "../api/client";
import {
    createTaskAssignment,
    deleteTaskAssignment,
    getTaskAssignments,
    updateTaskAssignment,
} from "../api/processes";
import { PermissionGate } from "./PermissionGate";
import DateTextFieldWithPicker from "./DateTextFieldWithPicker";
import type { TaskAssignment } from "../types/processes";
import { displayDateToIso, formatDateDisplay } from "../utils/date";

interface AuthUser {
    id: number;
    username: string;
}

const STATUS_LABELS: Record<TaskAssignment["status"], string> = {
    TODO: "Za uraditi",
    IN_PROGRESS: "U toku",
    DONE: "Završeno",
};

interface Props {
    processRunId: number;
}

export function TaskAssignmentsPanel({ processRunId }: Props) {
    const [rows, setRows] = useState<TaskAssignment[]>([]);
    const [users, setUsers] = useState<AuthUser[]>([]);
    const [title, setTitle] = useState("");
    const [assignedTo, setAssignedTo] = useState("");
    const [dueDate, setDueDate] = useState("");
    const [description, setDescription] = useState("");

    const load = useCallback(async () => {
        const [tasks, userResp] = await Promise.all([
            getTaskAssignments(processRunId),
            api.get<AuthUser[] | { results?: AuthUser[] }>("/auth/users/"),
        ]);
        setRows(tasks);
        const userData = userResp.data;
        setUsers(Array.isArray(userData) ? userData : (userData?.results ?? []));
    }, [processRunId]);

    useEffect(() => {
        void load().catch(() => {
            enqueueSnackbar("Greška pri učitavanju zadataka.", {
                variant: "error",
            });
        });
    }, [load]);

    const handleAdd = async () => {
        if (!title.trim() || !assignedTo) {
            enqueueSnackbar("Unesi naslov i izvršioca.", { variant: "warning" });
            return;
        }
        try {
            await createTaskAssignment({
                process_run: processRunId,
                assigned_to: Number(assignedTo),
                title: title.trim(),
                description: description.trim() || undefined,
                due_date: dueDate.trim()
                    ? displayDateToIso(dueDate) ?? undefined
                    : undefined,
            });
            setTitle("");
            setAssignedTo("");
            setDueDate("");
            setDescription("");
            await load();
        } catch {
            enqueueSnackbar("Greška pri dodavanju zadatka.", { variant: "error" });
        }
    };

    const handleStatusChange = async (
        row: TaskAssignment,
        status: TaskAssignment["status"],
    ) => {
        try {
            await updateTaskAssignment(row.id, { status });
            await load();
        } catch {
            enqueueSnackbar("Greška pri izmeni statusa.", { variant: "error" });
        }
    };

    const handleDelete = async (id: number) => {
        try {
            await deleteTaskAssignment(id);
            await load();
        } catch {
            enqueueSnackbar("Greška pri brisanju zadatka.", { variant: "error" });
        }
    };

    return (
        <Box>
            {rows.length === 0 ? (
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                    Nema dodeljenih zadataka.
                </Typography>
            ) : (
                <Table size="small" sx={{ mb: 2 }}>
                    <TableHead>
                        <TableRow>
                            <TableCell>Naslov</TableCell>
                            <TableCell>Izvršilac</TableCell>
                            <TableCell>Rok</TableCell>
                            <TableCell>Status</TableCell>
                            <TableCell width={48} />
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {rows.map((row) => (
                            <TableRow key={row.id}>
                                <TableCell>{row.title}</TableCell>
                                <TableCell>
                                    {row.assigned_to_username ?? row.assigned_to}
                                </TableCell>
                                <TableCell>
                                    {formatDateDisplay(row.due_date)}
                                </TableCell>
                                <TableCell>
                                    <TextField
                                        select
                                        size="small"
                                        value={row.status}
                                        onChange={(e) =>
                                            void handleStatusChange(
                                                row,
                                                e.target
                                                    .value as TaskAssignment["status"],
                                            )
                                        }
                                    >
                                        {(
                                            Object.keys(
                                                STATUS_LABELS,
                                            ) as TaskAssignment["status"][]
                                        ).map((s) => (
                                            <MenuItem key={s} value={s}>
                                                {STATUS_LABELS[s]}
                                            </MenuItem>
                                        ))}
                                    </TextField>
                                </TableCell>
                                <TableCell>
                                    <PermissionGate permission="processes.delete_taskassignment">
                                        <IconButton
                                            size="small"
                                            color="error"
                                            onClick={() => void handleDelete(row.id)}
                                        >
                                            <DeleteOutlineIcon fontSize="small" />
                                        </IconButton>
                                    </PermissionGate>
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            )}
            <PermissionGate permission="processes.add_taskassignment">
                <Box
                    sx={{
                        display: "grid",
                        gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr" },
                        gap: 1,
                    }}
                >
                    <TextField
                        size="small"
                        label="Naslov zadatka"
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                    />
                    <TextField
                        select
                        size="small"
                        label="Izvršilac"
                        value={assignedTo}
                        onChange={(e) => setAssignedTo(e.target.value)}
                    >
                        <MenuItem value="">(izaberi)</MenuItem>
                        {users.map((u) => (
                            <MenuItem key={u.id} value={String(u.id)}>
                                {u.username}
                            </MenuItem>
                        ))}
                    </TextField>
                    <DateTextFieldWithPicker
                        label="Rok (dd.mm.yyyy)"
                        value={dueDate}
                        allowPast
                        onChange={setDueDate}
                    />
                    <TextField
                        size="small"
                        label="Opis"
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                    />
                </Box>
                <Button
                    variant="contained"
                    disableElevation
                    sx={{ mt: 1.5, borderRadius: 2, textTransform: "none" }}
                    onClick={() => void handleAdd()}
                >
                    Dodaj zadatak
                </Button>
            </PermissionGate>
        </Box>
    );
}
