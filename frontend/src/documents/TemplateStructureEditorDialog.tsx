import { useState, useEffect } from "react";
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
    Chip,
    Divider,
    Paper,
} from "@mui/material";
import { enqueueSnackbar } from "notistack";
import type { DocumentTemplate } from "../api/documents";
import {
    getDocumentTemplateStructure,
    saveDocumentTemplatePlaceholders,
    type DocxStructureBlock,
    type DocxStructureTable,
    type StructuralPlaceholder,
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

function elementIdFromRef(ph: StructuralPlaceholder): string {
    const ref = ph.docx_ref;
    if (ref.type === "table_cell") {
        return `t_${ref.table_index}_r_${ref.row_index}_c_${ref.cell_index}`;
    }
    return `p_${ref.block_index}`;
}

function refFromElementId(elementId: string): StructuralPlaceholder["docx_ref"] {
    if (elementId.startsWith("p_")) {
        return { type: "paragraph", block_index: parseInt(elementId.slice(2)) };
    }
    const parts = elementId.split("_");
    return {
        type: "table_cell",
        table_index: parseInt(parts[1]),
        row_index: parseInt(parts[3]),
        cell_index: parseInt(parts[5]),
    };
}

interface Props {
    open: boolean;
    template: DocumentTemplate;
    onClose: () => void;
    onSaved: (updated: DocumentTemplate) => void;
}

export default function TemplateStructureEditorDialog({ open, template, onClose, onSaved }: Props) {
    const [structure, setStructure] = useState<DocxStructureBlock[]>([]);
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [placeholders, setPlaceholders] = useState<StructuralPlaceholder[]>([]);

    const [menuAnchor, setMenuAnchor] = useState<Element | null>(null);
    const [selectedElementId, setSelectedElementId] = useState<string | null>(null);

    useEffect(() => {
        if (!open) return;
        setError(null);
        setLoading(true);

        const config = (template.generation_config ?? {}) as Record<string, unknown>;
        if (config.mode === "STRUCTURAL" && Array.isArray(config.placeholders)) {
            setPlaceholders(config.placeholders as StructuralPlaceholder[]);
        } else {
            setPlaceholders([]);
        }

        getDocumentTemplateStructure(template.id)
            .then(setStructure)
            .catch((e: unknown) => {
                const detail = (e as { response?: { data?: { detail?: string } } })
                    ?.response?.data?.detail;
                setError(detail ?? "Greška pri učitavanju strukture dokumenta.");
            })
            .finally(() => setLoading(false));
    }, [open, template.id]);

    const availableFields = fieldsForContext(template.context_type);

    const placeholderByElementId = new Map<string, StructuralPlaceholder>(
        placeholders.map((ph) => [elementIdFromRef(ph), ph]),
    );

    const handleElementClick = (event: React.MouseEvent, elementId: string) => {
        event.stopPropagation();
        setSelectedElementId(elementId);
        setMenuAnchor(event.currentTarget as Element);
    };

    const handleFieldSelect = (fieldKey: string) => {
        if (!selectedElementId) return;
        const newPh: StructuralPlaceholder = {
            id: `ph_${Date.now()}`,
            fieldKey,
            docx_ref: refFromElementId(selectedElementId),
        };
        setPlaceholders((prev) => [
            ...prev.filter((p) => elementIdFromRef(p) !== selectedElementId),
            newPh,
        ]);
        setMenuAnchor(null);
        setSelectedElementId(null);
    };

    const handleRemovePlaceholder = () => {
        if (!selectedElementId) return;
        setPlaceholders((prev) => prev.filter((p) => elementIdFromRef(p) !== selectedElementId));
        setMenuAnchor(null);
        setSelectedElementId(null);
    };

    const handleSave = async () => {
        setSaving(true);
        try {
            const updated = await saveDocumentTemplatePlaceholders(template.id, placeholders);
            onSaved(updated);
            enqueueSnackbar("Polja su sačuvana.", { variant: "success" });
            onClose();
        } catch {
            enqueueSnackbar("Greška pri čuvanju polja.", { variant: "error" });
        } finally {
            setSaving(false);
        }
    };

    const selectedExistingField = selectedElementId
        ? placeholderByElementId.get(selectedElementId)
        : undefined;

    const renderElementContent = (elementId: string, text: string) => {
        const ph = placeholderByElementId.get(elementId);
        const field = ph ? availableFields.find((f) => f.key === ph.fieldKey) : undefined;

        return (
            <>
                {field && (
                    <Chip
                        label={field.label}
                        size="small"
                        color="success"
                        sx={{ mb: 0.25, fontSize: 11, height: 20, display: "block", width: "fit-content" }}
                    />
                )}
                <span style={{ whiteSpace: "pre-wrap", fontFamily: "Arial, sans-serif", fontSize: 12 }}>
                    {text || ""}
                </span>
            </>
        );
    };

    const cellSx = (elementId: string) => {
        const hasPlaceholder = placeholderByElementId.has(elementId);
        return {
            cursor: "pointer",
            userSelect: "none" as const,
            verticalAlign: "top",
            backgroundColor: hasPlaceholder ? "rgba(46,125,50,0.08)" : "transparent",
            "&:hover": {
                backgroundColor: hasPlaceholder ? "rgba(46,125,50,0.16)" : "rgba(25,118,210,0.05)",
                outline: "2px dashed",
                outlineColor: hasPlaceholder ? "success.main" : "primary.main",
            },
            transition: "background-color 0.12s",
        };
    };

    const renderBlock = (block: DocxStructureBlock) => {
        if (block.type === "paragraph") {
            const isEmpty = !block.text.trim();
            if (isEmpty) {
                return <Box key={block.id} sx={{ height: 6 }} />;
            }
            return (
                <Box
                    key={block.id}
                    onClick={(e) => handleElementClick(e, block.id)}
                    sx={{
                        ...cellSx(block.id),
                        px: 1,
                        py: 0.5,
                        borderRadius: 0.5,
                        minHeight: 22,
                    }}
                >
                    {renderElementContent(block.id, block.text)}
                </Box>
            );
        }

        if (block.type === "table") {
            const tableBlock = block as DocxStructureTable;
            return (
                <Box key={block.id} sx={{ mb: 2, overflowX: "auto" }}>
                    <table style={{ borderCollapse: "collapse", width: "100%", tableLayout: "fixed" }}>
                        <tbody>
                            {tableBlock.rows.map((row) => (
                                <tr key={row.row_index}>
                                    {row.cells.map((cell) => {
                                        const isCont = cell.vmerge_continuation === true;
                                        const ph = !isCont ? placeholderByElementId.get(cell.id) : undefined;
                                        const field = ph ? availableFields.find((f) => f.key === ph.fieldKey) : undefined;
                                        return (
                                            <td
                                                key={cell.id}
                                                onClick={isCont ? undefined : (e) => handleElementClick(e as unknown as React.MouseEvent, cell.id)}
                                                style={{
                                                    border: "1px solid #777",
                                                    padding: "4px 6px",
                                                    verticalAlign: "top",
                                                    cursor: isCont ? "default" : "pointer",
                                                    backgroundColor: isCont
                                                        ? "rgba(0,0,0,0.04)"
                                                        : ph
                                                          ? "rgba(46,125,50,0.08)"
                                                          : "transparent",
                                                    whiteSpace: "pre-wrap",
                                                    fontFamily: "Arial, sans-serif",
                                                    fontSize: 12,
                                                    minHeight: 24,
                                                    wordBreak: "break-word",
                                                    color: isCont ? "#aaa" : "inherit",
                                                }}
                                                title={isCont ? "Spojena ćelija (nastavak)" : "Kliknite da dodelite polje"}
                                            >
                                                {field && (
                                                    <div style={{ marginBottom: 2 }}>
                                                        <span style={{
                                                            backgroundColor: "#2e7d32",
                                                            color: "#fff",
                                                            fontSize: 10,
                                                            padding: "1px 5px",
                                                            borderRadius: 3,
                                                            whiteSpace: "nowrap",
                                                        }}>
                                                            {field.label}
                                                        </span>
                                                    </div>
                                                )}
                                                {isCont ? "↑" : cell.text}
                                            </td>
                                        );
                                    })}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </Box>
            );
        }

        return null;
    };

    return (
        <Dialog open={open} onClose={onClose} maxWidth="xl" fullWidth>
            <DialogTitle>
                Uredi polja šablona — <strong>{template.name}</strong>
                <Typography variant="body2" color="text.secondary" component="span" sx={{ ml: 2 }}>
                    Kliknite na ćeliju ili paragraf da dodelite polje.
                </Typography>
            </DialogTitle>

            <DialogContent dividers sx={{ minHeight: 400 }}>
                {loading && (
                    <Box sx={{ display: "flex", justifyContent: "center", py: 6 }}>
                        <CircularProgress />
                    </Box>
                )}
                {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

                {!loading && !error && structure.length === 0 && (
                    <Alert severity="info">
                        Dokument je prazan ili format nije podržan (samo .docx).
                    </Alert>
                )}

                {!loading && !error && structure.length > 0 && (
                    <Box sx={{ display: "flex", gap: 3 }}>
                        <Box sx={{ flex: 1, minWidth: 0 }}>
                            <Paper variant="outlined" sx={{ p: 2 }}>
                                {structure.map(renderBlock)}
                            </Paper>
                        </Box>

                        {placeholders.length > 0 && (
                            <Box sx={{ width: 260, flexShrink: 0 }}>
                                <Typography variant="subtitle2" gutterBottom>
                                    Dodeljena polja ({placeholders.length})
                                </Typography>
                                <Box sx={{ display: "flex", flexDirection: "column", gap: 0.75 }}>
                                    {placeholders.map((ph) => {
                                        const field = availableFields.find((f) => f.key === ph.fieldKey);
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
                                                    fontSize: 12,
                                                }}
                                            >
                                                <Typography variant="caption" sx={{ flex: 1, mr: 1 }}>
                                                    {field?.label ?? ph.fieldKey}
                                                </Typography>
                                                <Button
                                                    size="small"
                                                    color="error"
                                                    sx={{ minWidth: 0, p: 0.25, fontSize: 11 }}
                                                    onClick={() => {
                                                        setPlaceholders((prev) =>
                                                            prev.filter((p) => p.id !== ph.id),
                                                        );
                                                    }}
                                                >
                                                    ✕
                                                </Button>
                                            </Box>
                                        );
                                    })}
                                </Box>
                            </Box>
                        )}
                    </Box>
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
                anchorEl={menuAnchor}
                onClose={() => { setMenuAnchor(null); setSelectedElementId(null); }}
            >
                {selectedExistingField && [
                    <MenuItem
                        key="remove"
                        onClick={handleRemovePlaceholder}
                        sx={{ color: "error.main", fontSize: 13 }}
                    >
                        Ukloni polje ({availableFields.find((f) => f.key === selectedExistingField.fieldKey)?.label ?? selectedExistingField.fieldKey})
                    </MenuItem>,
                    <Divider key="divider" />,
                ]}
                {availableFields.map((f) => (
                    <MenuItem
                        key={f.key}
                        onClick={() => handleFieldSelect(f.key)}
                        selected={selectedExistingField?.fieldKey === f.key}
                        sx={{ fontSize: 13 }}
                    >
                        {f.label}
                    </MenuItem>
                ))}
            </Menu>
        </Dialog>
    );
}
