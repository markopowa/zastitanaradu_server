import { useState, useEffect, useRef, useCallback } from "react";
import {
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Button,
    Box,
    Typography,
    CircularProgress,
    Alert,
    Menu,
    MenuItem,
    Divider,
    IconButton,
} from "@mui/material";
import DeleteIcon from "@mui/icons-material/Delete";
import { enqueueSnackbar } from "notistack";
import type { DocumentTemplate, VisualPlaceholder } from "../api/documents";
import {
    getDocumentTemplatePages,
    saveVisualPlaceholders,
} from "../api/documents";

interface TemplateField {
    key: string;
    label: string;
}

const EMPLOYEE_FIELDS: TemplateField[] = [
    { key: "employee.first_name", label: "Ime zaposlenog" },
    { key: "employee.last_name", label: "Prezime zaposlenog" },
    { key: "employee.org_unit", label: "Organizaciona jedinica" },
    { key: "employee.position", label: "Pozicija" },
    { key: "employee.email", label: "Email zaposlenog" },
    { key: "employee.father_name", label: "Ime oca" },
    { key: "employee.jmbg", label: "JMBG" },
    { key: "employee.date_of_birth", label: "Datum rođenja" },
    { key: "employee.place_of_birth", label: "Mesto rođenja" },
    { key: "employee.occupation", label: "Zanimanje" },
    { key: "employee.high_risk_position_name", label: "Radno mesto sa povećanim rizikom" },
];

const EQUIPMENT_FIELDS: TemplateField[] = [
    { key: "equipment.name", label: "Naziv opreme/mašine" },
    { key: "equipment.category", label: "Kategorija opreme" },
    { key: "equipment.inventory_number", label: "Inventarski broj" },
    { key: "equipment.location", label: "Lokacija opreme" },
];

const CLIENT_FIELDS: TemplateField[] = [
    { key: "client.name", label: "Naziv firme" },
    { key: "client.pib", label: "PIB" },
    { key: "client.address", label: "Adresa firme" },
    { key: "client.phone", label: "Telefon firme" },
    { key: "client.email", label: "Email firme" },
    { key: "client.website", label: "Web sajt firme" },
    { key: "client.registration_number", label: "Matični broj" },
];

const PROCESS_FIELDS: TemplateField[] = [
    { key: "scheduled_for", label: "Datum zakazivanja" },
    { key: "performed_at", label: "Datum izvođenja" },
    { key: "valid_until", label: "Važi do" },
    { key: "process_type_name", label: "Vrsta procesa" },
];

function fieldsForContext(context: DocumentTemplate["context_type"]): TemplateField[] {
    const base = PROCESS_FIELDS;
    if (context === "EMPLOYEE") return [...EMPLOYEE_FIELDS, ...CLIENT_FIELDS, ...base];
    if (context === "EQUIPMENT") return [...EQUIPMENT_FIELDS, ...CLIENT_FIELDS, ...base];
    if (context === "CLIENT_COMPANY") return [...CLIENT_FIELDS, ...base];
    return [...EMPLOYEE_FIELDS, ...EQUIPMENT_FIELDS, ...CLIENT_FIELDS, ...base];
}

const MARKER_W = 12;
const MARKER_H = 2.2;

interface Props {
    open: boolean;
    template: DocumentTemplate;
    onClose: () => void;
    onSaved: (updated: DocumentTemplate) => void;
}

export default function TemplateStructureEditorDialog({ open, template, onClose, onSaved }: Props) {
    const [pageUrls, setPageUrls] = useState<string[]>([]);
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [placeholders, setPlaceholders] = useState<VisualPlaceholder[]>([]);

    const [menuAnchor, setMenuAnchor] = useState<{ el: Element; page: number; xPct: number; yPct: number } | null>(null);
    const [editingPhId, setEditingPhId] = useState<string | null>(null);

    const [dragState, setDragState] = useState<{
        phId: string;
        startMouseX: number;
        startMouseY: number;
        startXPct: number;
        startYPct: number;
        containerWidth: number;
        containerHeight: number;
    } | null>(null);

    const pageRefs = useRef<(HTMLDivElement | null)[]>([]);

    useEffect(() => {
        if (!open) return;
        setError(null);
        setLoading(true);
        setPageUrls([]);

        const config = (template.generation_config ?? {}) as Record<string, unknown>;
        if (config.mode === "VISUAL" && Array.isArray(config.placeholders)) {
            setPlaceholders(config.placeholders as VisualPlaceholder[]);
        } else {
            setPlaceholders([]);
        }

        getDocumentTemplatePages(template.id)
            .then(setPageUrls)
            .catch((e: unknown) => {
                const detail = (e as { response?: { data?: { detail?: string } } })
                    ?.response?.data?.detail;
                setError(detail ?? "Greška pri učitavanju stranica dokumenta.");
            })
            .finally(() => setLoading(false));
    }, [open, template.id, template.generation_config]);

    const availableFields = fieldsForContext(template.context_type);

    const handlePageClick = useCallback((e: React.MouseEvent<HTMLDivElement>, pageIndex: number) => {
        if (dragState) return;
        const container = pageRefs.current[pageIndex];
        if (!container) return;
        const rect = container.getBoundingClientRect();
        const xPct = ((e.clientX - rect.left) / rect.width) * 100;
        const yPct = ((e.clientY - rect.top) / rect.height) * 100;

        setEditingPhId(null);
        setMenuAnchor({ el: e.currentTarget, page: pageIndex, xPct, yPct });
    }, [dragState]);

    const handleMarkerClick = useCallback((e: React.MouseEvent, phId: string) => {
        e.stopPropagation();
        if (dragState) return;
        setEditingPhId(phId);
        setMenuAnchor({ el: e.currentTarget as Element, page: -1, xPct: 0, yPct: 0 });
    }, [dragState]);

    const handleFieldSelect = useCallback((fieldKey: string) => {
        if (editingPhId) {
            setPlaceholders(prev => prev.map(p =>
                p.id === editingPhId ? { ...p, fieldKey } : p
            ));
        } else if (menuAnchor) {
            const newPh: VisualPlaceholder = {
                id: `ph_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
                fieldKey,
                page: menuAnchor.page,
                xPct: menuAnchor.xPct,
                yPct: menuAnchor.yPct,
                widthPct: MARKER_W,
                heightPct: MARKER_H,
            };
            setPlaceholders(prev => [...prev, newPh]);
        }
        setMenuAnchor(null);
        setEditingPhId(null);
    }, [editingPhId, menuAnchor]);

    const handleRemovePlaceholder = useCallback((phId: string) => {
        setPlaceholders(prev => prev.filter(p => p.id !== phId));
        setMenuAnchor(null);
        setEditingPhId(null);
    }, []);

    const handleMarkerMouseDown = useCallback((e: React.MouseEvent, ph: VisualPlaceholder) => {
        e.stopPropagation();
        e.preventDefault();
        const container = pageRefs.current[ph.page];
        if (!container) return;
        const rect = container.getBoundingClientRect();
        setDragState({
            phId: ph.id,
            startMouseX: e.clientX,
            startMouseY: e.clientY,
            startXPct: ph.xPct,
            startYPct: ph.yPct,
            containerWidth: rect.width,
            containerHeight: rect.height,
        });
    }, []);

    useEffect(() => {
        if (!dragState) return;
        const onMove = (e: MouseEvent) => {
            const dx = e.clientX - dragState.startMouseX;
            const dy = e.clientY - dragState.startMouseY;
            const dxPct = (dx / dragState.containerWidth) * 100;
            const dyPct = (dy / dragState.containerHeight) * 100;
            const newX = Math.max(0, Math.min(100 - MARKER_W, dragState.startXPct + dxPct));
            const newY = Math.max(0, Math.min(100 - MARKER_H, dragState.startYPct + dyPct));
            setPlaceholders(prev => prev.map(p =>
                p.id === dragState.phId ? { ...p, xPct: newX, yPct: newY } : p
            ));
        };
        const onUp = () => setDragState(null);
        window.addEventListener("mousemove", onMove);
        window.addEventListener("mouseup", onUp);
        return () => {
            window.removeEventListener("mousemove", onMove);
            window.removeEventListener("mouseup", onUp);
        };
    }, [dragState]);

    const handleSave = async () => {
        setSaving(true);
        try {
            const updated = await saveVisualPlaceholders(template.id, placeholders);
            onSaved(updated);
            enqueueSnackbar("Polja su sačuvana.", { variant: "success" });
            onClose();
        } catch {
            enqueueSnackbar("Greška pri čuvanju polja.", { variant: "error" });
        } finally {
            setSaving(false);
        }
    };

    const editingPh = editingPhId ? placeholders.find(p => p.id === editingPhId) : undefined;

    return (
        <Dialog open={open} onClose={onClose} maxWidth="xl" fullWidth>
            <DialogTitle>
                Uredi polja šablona — <strong>{template.name}</strong>
                <Typography variant="body2" color="text.secondary" component="span" sx={{ ml: 2 }}>
                    Kliknite na dokument da postavite polje.
                </Typography>
            </DialogTitle>

            <DialogContent dividers sx={{ minHeight: 400, display: "flex", gap: 2 }}>
                {loading && (
                    <Box sx={{ display: "flex", justifyContent: "center", alignItems: "center", flex: 1, py: 6 }}>
                        <CircularProgress />
                    </Box>
                )}
                {error && <Alert severity="error" sx={{ mb: 2, width: "100%" }}>{error}</Alert>}

                {!loading && !error && pageUrls.length === 0 && (
                    <Alert severity="info" sx={{ width: "100%" }}>
                        Dokument nema stranica ili format nije podržan.
                    </Alert>
                )}

                {!loading && !error && pageUrls.length > 0 && (
                    <>
                        <Box sx={{
                            flex: 1,
                            minWidth: 0,
                            overflow: "auto",
                            display: "flex",
                            flexDirection: "column",
                            alignItems: "center",
                            gap: 2,
                            py: 1,
                        }}>
                            {pageUrls.map((url, pageIdx) => (
                                <Box
                                    key={pageIdx}
                                    ref={(el: HTMLDivElement | null) => { pageRefs.current[pageIdx] = el; }}
                                    onClick={(e) => handlePageClick(e, pageIdx)}
                                    sx={{
                                        position: "relative",
                                        cursor: "crosshair",
                                        boxShadow: 3,
                                        lineHeight: 0,
                                        userSelect: "none",
                                        maxWidth: "100%",
                                    }}
                                >
                                    <img
                                        src={url}
                                        alt={`Stranica ${pageIdx + 1}`}
                                        draggable={false}
                                        style={{
                                            display: "block",
                                            maxWidth: "100%",
                                            height: "auto",
                                        }}
                                    />
                                    {placeholders
                                        .filter(ph => ph.page === pageIdx)
                                        .map(ph => {
                                            const field = availableFields.find(f => f.key === ph.fieldKey);
                                            return (
                                                <Box
                                                    key={ph.id}
                                                    onMouseDown={(e) => handleMarkerMouseDown(e, ph)}
                                                    onClick={(e) => handleMarkerClick(e, ph.id)}
                                                    sx={{
                                                        position: "absolute",
                                                        left: `${ph.xPct}%`,
                                                        top: `${ph.yPct}%`,
                                                        width: `${ph.widthPct}%`,
                                                        height: `${ph.heightPct}%`,
                                                        minHeight: 18,
                                                        backgroundColor: "rgba(46,125,50,0.18)",
                                                        border: "2px solid rgba(46,125,50,0.7)",
                                                        borderRadius: "3px",
                                                        display: "flex",
                                                        alignItems: "center",
                                                        px: "4px",
                                                        cursor: dragState?.phId === ph.id ? "grabbing" : "grab",
                                                        "&:hover": {
                                                            backgroundColor: "rgba(46,125,50,0.3)",
                                                            borderColor: "rgba(46,125,50,1)",
                                                        },
                                                        transition: "background-color 0.1s",
                                                        zIndex: dragState?.phId === ph.id ? 100 : 10,
                                                    }}
                                                >
                                                    <Typography
                                                        sx={{
                                                            fontSize: 10,
                                                            fontWeight: 600,
                                                            color: "#1b5e20",
                                                            lineHeight: 1.2,
                                                            whiteSpace: "nowrap",
                                                            overflow: "hidden",
                                                            textOverflow: "ellipsis",
                                                            pointerEvents: "none",
                                                        }}
                                                    >
                                                        {field?.label ?? ph.fieldKey}
                                                    </Typography>
                                                </Box>
                                            );
                                        })}
                                    {pageUrls.length > 1 && (
                                        <Typography
                                            sx={{
                                                position: "absolute",
                                                bottom: 4,
                                                right: 8,
                                                fontSize: 11,
                                                color: "rgba(0,0,0,0.4)",
                                                pointerEvents: "none",
                                                userSelect: "none",
                                            }}
                                        >
                                            {pageIdx + 1} / {pageUrls.length}
                                        </Typography>
                                    )}
                                </Box>
                            ))}
                        </Box>

                        <Box sx={{
                            width: 260,
                            flexShrink: 0,
                            overflow: "auto",
                            borderLeft: "1px solid",
                            borderColor: "divider",
                            pl: 2,
                        }}>
                            <Typography variant="subtitle2" gutterBottom>
                                Polja ({placeholders.length})
                            </Typography>
                            {placeholders.length === 0 && (
                                <Typography variant="caption" color="text.secondary">
                                    Kliknite na dokument da dodate polje.
                                </Typography>
                            )}
                            <Box sx={{ display: "flex", flexDirection: "column", gap: 0.75 }}>
                                {placeholders.map(ph => {
                                    const field = availableFields.find(f => f.key === ph.fieldKey);
                                    return (
                                        <Box
                                            key={ph.id}
                                            sx={{
                                                display: "flex",
                                                alignItems: "center",
                                                justifyContent: "space-between",
                                                border: "1px solid",
                                                borderColor: "divider",
                                                borderRadius: 1,
                                                px: 1,
                                                py: 0.5,
                                            }}
                                        >
                                            <Box sx={{ flex: 1, minWidth: 0 }}>
                                                <Typography variant="caption" sx={{ display: "block", fontWeight: 600 }}>
                                                    {field?.label ?? ph.fieldKey}
                                                </Typography>
                                                <Typography variant="caption" color="text.secondary" sx={{ fontSize: 10 }}>
                                                    str. {ph.page + 1}
                                                </Typography>
                                            </Box>
                                            <IconButton
                                                size="small"
                                                color="error"
                                                onClick={() => handleRemovePlaceholder(ph.id)}
                                            >
                                                <DeleteIcon sx={{ fontSize: 16 }} />
                                            </IconButton>
                                        </Box>
                                    );
                                })}
                            </Box>
                        </Box>
                    </>
                )}
            </DialogContent>

            <DialogActions>
                <Button onClick={onClose} disabled={saving}>
                    Odustani
                </Button>
                <Button
                    onClick={handleSave}
                    variant="contained"
                    disabled={saving || loading}
                >
                    {saving ? "Čuvanje..." : "Sačuvaj polja"}
                </Button>
            </DialogActions>

            <Menu
                open={Boolean(menuAnchor)}
                anchorEl={menuAnchor?.el ?? null}
                onClose={() => { setMenuAnchor(null); setEditingPhId(null); }}
                slotProps={{ paper: { sx: { maxHeight: 400 } } }}
            >
                {editingPh && [
                    <MenuItem
                        key="remove"
                        onClick={() => handleRemovePlaceholder(editingPh.id)}
                        sx={{ color: "error.main", fontSize: 13 }}
                    >
                        Ukloni polje
                    </MenuItem>,
                    <Divider key="divider" />,
                ]}
                {availableFields.map(f => (
                    <MenuItem
                        key={f.key}
                        onClick={() => handleFieldSelect(f.key)}
                        selected={editingPh?.fieldKey === f.key}
                        sx={{ fontSize: 13 }}
                    >
                        {f.label}
                    </MenuItem>
                ))}
            </Menu>
        </Dialog>
    );
}
