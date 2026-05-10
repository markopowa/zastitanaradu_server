import { Component, type MouseEvent as ReactMouseEvent } from "react";
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
    FormControl,
    InputLabel,
    Select,
    TextField,
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
    { key: "employee.national_id", label: "JMBG" },
    { key: "employee.date_of_birth", label: "Datum rođenja" },
    { key: "employee.place_of_birth", label: "Mesto rođenja" },
    { key: "employee.occupation", label: "Zanimanje" },
    {
        key: "employee.high_risk_position_name",
        label: "Radno mesto sa povećanim rizikom",
    },
];

const EQUIPMENT_FIELDS: TemplateField[] = [
    { key: "equipment.name", label: "Naziv opreme/mašine" },
    { key: "equipment.category", label: "Kategorija opreme" },
    { key: "equipment.inventory_number", label: "Inventarski broj" },
    { key: "equipment.location", label: "Lokacija opreme" },
];

const CLIENT_FIELDS: TemplateField[] = [
    { key: "client.name", label: "Naziv firme" },
    { key: "client.tax_id", label: "PIB" },
    { key: "client.address", label: "Adresa firme" },
    { key: "client.phone", label: "Telefon firme" },
    { key: "client.email", label: "Email firme" },
    { key: "client.website", label: "Web sajt firme" },
    { key: "client.registration_number", label: "Matični broj" },
    { key: "client.activity_code", label: "Šifra delatnosti" },
];

const FIXED_TEXT_KEY = "__fixed_text__";

const PROCESS_FIELDS: TemplateField[] = [
    { key: "scheduled_for", label: "Datum zakazivanja" },
    { key: "performed_at", label: "Datum izvođenja" },
    { key: "valid_until", label: "Važi do" },
    { key: "process_type_name", label: "Vrsta procesa" },
    { key: "instruction_number", label: "Broj uputa" },
    { key: "last_exam_date", label: "Datum prethodnog pregleda" },
    { key: "year_of_birth", label: "Godina rođenja" },
];

const FIXED_TEXT_FIELD: TemplateField = {
    key: FIXED_TEXT_KEY,
    label: "Unos teksta",
};

function fieldsForContext(
    context: DocumentTemplate["context_type"],
): TemplateField[] {
    const base = [FIXED_TEXT_FIELD, ...PROCESS_FIELDS];
    if (context === "EMPLOYEE")
        return [...EMPLOYEE_FIELDS, ...CLIENT_FIELDS, ...base];
    if (context === "EQUIPMENT")
        return [...EQUIPMENT_FIELDS, ...CLIENT_FIELDS, ...base];
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

type MenuAnchor = { el: Element; page: number; xPct: number; yPct: number };

type DragSnapshot = {
    phId: string;
    startMouseX: number;
    startMouseY: number;
    startXPct: number;
    startYPct: number;
    containerWidth: number;
    containerHeight: number;
};

interface State {
    pageUrls: string[];
    loading: boolean;
    saving: boolean;
    error: string | null;
    placeholders: VisualPlaceholder[];
    menuAnchor: MenuAnchor | null;
    editingPhId: string | null;
    dragState: DragSnapshot | null;
}

export default class TemplateStructureEditorDialog extends Component<
    Props,
    State
> {
    private pageRefs: (HTMLDivElement | null)[] = [];

    private activeDrag: DragSnapshot | null = null;

    state: State = {
        pageUrls: [],
        loading: false,
        saving: false,
        error: null,
        placeholders: [],
        menuAnchor: null,
        editingPhId: null,
        dragState: null,
    };

    componentDidMount(): void {
        if (this.props.open) {
            this.loadEditorData();
        }
    }

    componentDidUpdate(prevProps: Props): void {
        const { open, template } = this.props;
        const opened = !prevProps.open && open;
        const idChanged = prevProps.template.id !== template.id;
        const configChanged =
            prevProps.template.generation_config !== template.generation_config;
        if (open && (opened || idChanged || configChanged)) {
            this.loadEditorData();
        }
    }

    componentWillUnmount(): void {
        if (this.activeDrag) {
            window.removeEventListener("mousemove", this.dragMoveHandler);
            window.removeEventListener("mouseup", this.dragUpHandler);
        }
    }

    private loadEditorData = (): void => {
        const { template } = this.props;
        const config = (template.generation_config ?? {}) as Record<
            string,
            unknown
        >;
        const initialPlaceholders: VisualPlaceholder[] =
            config.mode === "VISUAL" && Array.isArray(config.placeholders)
                ? (config.placeholders as VisualPlaceholder[])
                : [];

        this.setState((prev) => ({
            ...prev,
            error: null,
            loading: true,
            pageUrls: [],
            placeholders: initialPlaceholders,
        }));

        getDocumentTemplatePages(template.id)
            .then((pageUrls) =>
                this.setState((prev) => ({ ...prev, pageUrls })),
            )
            .catch((e: unknown) => {
                const detail = (
                    e as { response?: { data?: { detail?: string } } }
                )?.response?.data?.detail;
                this.setState((prev) => ({
                    ...prev,
                    error:
                        detail ?? "Greška pri učitavanju stranica dokumenta.",
                }));
            })
            .finally(() =>
                this.setState((prev) => ({ ...prev, loading: false })),
            );
    };

    private dragMoveHandler = (e: Event): void => {
        const d = this.activeDrag;
        if (!d) return;
        const me = e as MouseEvent;
        const dx = me.clientX - d.startMouseX;
        const dy = me.clientY - d.startMouseY;
        const dxPct = (dx / d.containerWidth) * 100;
        const dyPct = (dy / d.containerHeight) * 100;
        const newX = Math.max(0, Math.min(100 - MARKER_W, d.startXPct + dxPct));
        const newY = Math.max(0, Math.min(100 - MARKER_H, d.startYPct + dyPct));
        this.setState((prev) => ({
            placeholders: prev.placeholders.map((p) =>
                p.id === d.phId ? { ...p, xPct: newX, yPct: newY } : p,
            ),
        }));
    };

    private dragUpHandler = (): void => {
        window.removeEventListener("mousemove", this.dragMoveHandler);
        window.removeEventListener("mouseup", this.dragUpHandler);
        this.activeDrag = null;
        this.setState((prev) => ({ ...prev, dragState: null }));
    };

    private handlePageClick = (
        e: ReactMouseEvent<HTMLDivElement>,
        pageIndex: number,
    ): void => {
        if (this.state.dragState) return;
        const container = this.pageRefs[pageIndex];
        if (!container) return;
        const rect = container.getBoundingClientRect();
        const xPct = ((e.clientX - rect.left) / rect.width) * 100;
        const yPct = ((e.clientY - rect.top) / rect.height) * 100;

        this.setState((prev) => ({
            ...prev,
            editingPhId: null,
            menuAnchor: { el: e.currentTarget, page: pageIndex, xPct, yPct },
        }));
    };

    private handleMarkerClick = (e: ReactMouseEvent, phId: string): void => {
        e.stopPropagation();
        if (this.state.dragState) return;
        this.setState((prev) => ({
            ...prev,
            editingPhId: phId,
            menuAnchor: {
                el: e.currentTarget as Element,
                page: -1,
                xPct: 0,
                yPct: 0,
            },
        }));
    };

    private handleFieldSelect = (fieldKey: string): void => {
        this.setState((prev) => {
            if (prev.editingPhId) {
                return {
                    ...prev,
                    placeholders: prev.placeholders.map((p) =>
                        p.id === prev.editingPhId
                            ? {
                                  ...p,
                                  fieldKey,
                                  ...(fieldKey === FIXED_TEXT_KEY
                                      ? { fixedText: p.fixedText ?? "" }
                                      : {}),
                              }
                            : p,
                    ),
                    menuAnchor: null,
                    editingPhId: null,
                };
            }
            if (prev.menuAnchor) {
                const newPh: VisualPlaceholder = {
                    id: `ph_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
                    fieldKey,
                    page: prev.menuAnchor.page,
                    xPct: prev.menuAnchor.xPct,
                    yPct: prev.menuAnchor.yPct,
                    widthPct: MARKER_W,
                    heightPct: MARKER_H,
                    ...(fieldKey === FIXED_TEXT_KEY ? { fixedText: "" } : {}),
                };
                return {
                    ...prev,
                    placeholders: [...prev.placeholders, newPh],
                    menuAnchor: null,
                    editingPhId: null,
                };
            }
            return { ...prev, menuAnchor: null, editingPhId: null };
        });
    };

    private handleRemovePlaceholder = (phId: string): void => {
        this.setState((prev) => ({
            placeholders: prev.placeholders.filter((p) => p.id !== phId),
            menuAnchor: null,
            editingPhId: null,
        }));
    };

    private handleMarkerMouseDown = (
        e: ReactMouseEvent,
        ph: VisualPlaceholder,
    ): void => {
        e.stopPropagation();
        e.preventDefault();
        const container = this.pageRefs[ph.page];
        if (!container) return;
        const rect = container.getBoundingClientRect();
        const snapshot: DragSnapshot = {
            phId: ph.id,
            startMouseX: e.clientX,
            startMouseY: e.clientY,
            startXPct: ph.xPct,
            startYPct: ph.yPct,
            containerWidth: rect.width,
            containerHeight: rect.height,
        };
        this.activeDrag = snapshot;
        this.setState(
            (prev) => ({ ...prev, dragState: snapshot }),
            () => {
                window.addEventListener("mousemove", this.dragMoveHandler);
                window.addEventListener("mouseup", this.dragUpHandler);
            },
        );
    };

    private validatePlaceholders(): string | null {
        const { pageUrls, placeholders } = this.state;
        const numPages = pageUrls.length;
        for (let i = 0; i < placeholders.length; i++) {
            const p = placeholders[i];
            if (!p.id?.trim()) return `Polje ${i + 1}: nedostaje id.`;
            if (p.fieldKey !== FIXED_TEXT_KEY && !p.fieldKey?.trim()) {
                return `Polje ${i + 1}: izaberite polje ili Unos teksta.`;
            }
            if (p.fieldKey === FIXED_TEXT_KEY && !(p.fixedText ?? "").trim()) {
                return `Polje ${i + 1}: unesite fiksni tekst.`;
            }
            if (
                typeof p.page !== "number" ||
                p.page < 0 ||
                p.page >= numPages
            ) {
                return `Polje ${i + 1}: stranica mora biti 0–${numPages - 1}.`;
            }
            const n = (v: number) => typeof v !== "number" || v < 0 || v > 100;
            if (n(p.xPct) || n(p.yPct) || n(p.widthPct) || n(p.heightPct)) {
                return `Polje ${i + 1}: koordinate i dimenzije moraju biti 0–100.`;
            }
        }
        return null;
    }

    private handleSave = async (): Promise<void> => {
        const err = this.validatePlaceholders();
        if (err) {
            enqueueSnackbar(err, { variant: "error" });
            return;
        }
        const { template, onSaved, onClose } = this.props;
        const { placeholders } = this.state;
        this.setState((prev) => ({ ...prev, saving: true }));
        try {
            const updated = await saveVisualPlaceholders(
                template.id,
                placeholders,
            );
            onSaved(updated);
            enqueueSnackbar("Polja su sačuvana.", { variant: "success" });
            onClose();
        } catch {
            enqueueSnackbar("Greška pri čuvanju polja.", { variant: "error" });
        } finally {
            this.setState((prev) => ({ ...prev, saving: false }));
        }
    };

    render() {
        const { open, template, onClose } = this.props;
        const {
            pageUrls,
            loading,
            saving,
            error,
            placeholders,
            menuAnchor,
            editingPhId,
            dragState,
        } = this.state;

        const availableFields = fieldsForContext(template.context_type);
        const editingPh = editingPhId
            ? placeholders.find((p) => p.id === editingPhId)
            : undefined;

        return (
            <Dialog open={open} onClose={onClose} maxWidth="xl" fullWidth>
                <DialogTitle>
                    Uredi polja šablona — <strong>{template.name}</strong>
                    <Typography
                        variant="body2"
                        color="text.secondary"
                        component="span"
                        sx={{ ml: 2 }}
                    >
                        Kliknite na dokument da postavite polje.
                    </Typography>
                    <Typography
                        variant="caption"
                        display="block"
                        color="text.secondary"
                        sx={{ mt: 0.5 }}
                    >
                        Ako zamenite fajl šablona, ponovo mapirajte polja
                        (koordinate više neće odgovarati).
                    </Typography>
                </DialogTitle>

                <DialogContent
                    dividers
                    sx={{ minHeight: 400, display: "flex", gap: 2 }}
                >
                    {loading && (
                        <Box
                            sx={{
                                display: "flex",
                                justifyContent: "center",
                                alignItems: "center",
                                flex: 1,
                                py: 6,
                            }}
                        >
                            <CircularProgress />
                        </Box>
                    )}
                    {error && (
                        <Alert severity="error" sx={{ mb: 2, width: "100%" }}>
                            {error}
                        </Alert>
                    )}

                    {!loading && !error && pageUrls.length === 0 && (
                        <Alert severity="info" sx={{ width: "100%" }}>
                            Dokument nema stranica ili format nije podržan.
                        </Alert>
                    )}

                    {!loading && !error && pageUrls.length > 0 && (
                        <>
                            <Box
                                sx={{
                                    flex: 1,
                                    minWidth: 0,
                                    overflow: "auto",
                                    display: "flex",
                                    flexDirection: "column",
                                    alignItems: "center",
                                    gap: 2,
                                    py: 1,
                                }}
                            >
                                {pageUrls.map((url, pageIdx) => (
                                    <Box
                                        key={pageIdx}
                                        ref={(el: HTMLDivElement | null) => {
                                            this.pageRefs[pageIdx] = el;
                                        }}
                                        onClick={(e) =>
                                            this.handlePageClick(e, pageIdx)
                                        }
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
                                            .filter((ph) => ph.page === pageIdx)
                                            .map((ph) => {
                                                const field =
                                                    availableFields.find(
                                                        (f) =>
                                                            f.key ===
                                                            ph.fieldKey,
                                                    );
                                                return (
                                                    <Box
                                                        key={ph.id}
                                                        onMouseDown={(e) =>
                                                            this.handleMarkerMouseDown(
                                                                e,
                                                                ph,
                                                            )
                                                        }
                                                        onClick={(e) =>
                                                            this.handleMarkerClick(
                                                                e,
                                                                ph.id,
                                                            )
                                                        }
                                                        sx={{
                                                            position:
                                                                "absolute",
                                                            left: `${ph.xPct}%`,
                                                            top: `${ph.yPct}%`,
                                                            width: `${ph.widthPct}%`,
                                                            height: `${ph.heightPct}%`,
                                                            minHeight: 18,
                                                            backgroundColor:
                                                                "rgba(46,125,50,0.18)",
                                                            border: "2px solid rgba(46,125,50,0.7)",
                                                            borderRadius: "3px",
                                                            display: "flex",
                                                            alignItems:
                                                                "center",
                                                            px: "4px",
                                                            cursor:
                                                                dragState?.phId ===
                                                                ph.id
                                                                    ? "grabbing"
                                                                    : "grab",
                                                            "&:hover": {
                                                                backgroundColor:
                                                                    "rgba(46,125,50,0.3)",
                                                                borderColor:
                                                                    "rgba(46,125,50,1)",
                                                            },
                                                            transition:
                                                                "background-color 0.1s",
                                                            zIndex:
                                                                dragState?.phId ===
                                                                ph.id
                                                                    ? 100
                                                                    : 10,
                                                        }}
                                                    >
                                                        <Typography
                                                            sx={{
                                                                fontSize: 10,
                                                                fontWeight: 600,
                                                                color: "#1b5e20",
                                                                lineHeight: 1.2,
                                                                whiteSpace:
                                                                    "nowrap",
                                                                overflow:
                                                                    "hidden",
                                                                textOverflow:
                                                                    "ellipsis",
                                                                pointerEvents:
                                                                    "none",
                                                            }}
                                                        >
                                                            {ph.fieldKey ===
                                                            FIXED_TEXT_KEY
                                                                ? ph.fixedText ||
                                                                  "Unos teksta"
                                                                : (field?.label ??
                                                                  ph.fieldKey)}
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
                                                {pageIdx + 1} /{" "}
                                                {pageUrls.length}
                                            </Typography>
                                        )}
                                    </Box>
                                ))}
                            </Box>

                            <Box
                                sx={{
                                    width: 260,
                                    flexShrink: 0,
                                    overflow: "auto",
                                    borderLeft: "1px solid",
                                    borderColor: "divider",
                                    pl: 2,
                                }}
                            >
                                <Typography variant="subtitle2" gutterBottom>
                                    Polja ({placeholders.length})
                                </Typography>
                                {editingPh && (
                                    <Box
                                        sx={{
                                            mb: 2,
                                            p: 1.5,
                                            bgcolor: "action.hover",
                                            borderRadius: 1,
                                        }}
                                    >
                                        <FormControl
                                            fullWidth
                                            size="small"
                                            sx={{
                                                mb:
                                                    editingPh.fieldKey ===
                                                    FIXED_TEXT_KEY
                                                        ? 1.5
                                                        : 0,
                                            }}
                                        >
                                            <InputLabel>Polje</InputLabel>
                                            <Select
                                                value={editingPh.fieldKey}
                                                label="Polje"
                                                onChange={(e) =>
                                                    this.handleFieldSelect(
                                                        e.target.value,
                                                    )
                                                }
                                            >
                                                {availableFields.map((f) => (
                                                    <MenuItem
                                                        key={f.key}
                                                        value={f.key}
                                                    >
                                                        {f.label}
                                                    </MenuItem>
                                                ))}
                                            </Select>
                                        </FormControl>
                                        {editingPh.fieldKey ===
                                            FIXED_TEXT_KEY && (
                                            <TextField
                                                fullWidth
                                                size="small"
                                                label="Tekst"
                                                value={
                                                    editingPh.fixedText ?? ""
                                                }
                                                onChange={(e) => {
                                                    const id = editingPh.id;
                                                    const v = e.target.value;
                                                    this.setState((prev) => ({
                                                        placeholders:
                                                            prev.placeholders.map(
                                                                (p) =>
                                                                    p.id === id
                                                                        ? {
                                                                              ...p,
                                                                              fixedText:
                                                                                  v,
                                                                          }
                                                                        : p,
                                                            ),
                                                    }));
                                                }}
                                                placeholder="Unesite fiksni tekst..."
                                            />
                                        )}
                                    </Box>
                                )}
                                {placeholders.length === 0 && (
                                    <Typography
                                        variant="caption"
                                        color="text.secondary"
                                    >
                                        Kliknite na dokument da dodate polje.
                                    </Typography>
                                )}
                                <Box
                                    sx={{
                                        display: "flex",
                                        flexDirection: "column",
                                        gap: 0.75,
                                    }}
                                >
                                    {placeholders.map((ph) => {
                                        const field = availableFields.find(
                                            (f) => f.key === ph.fieldKey,
                                        );
                                        return (
                                            <Box
                                                key={ph.id}
                                                sx={{
                                                    display: "flex",
                                                    alignItems: "center",
                                                    justifyContent:
                                                        "space-between",
                                                    border: "1px solid",
                                                    borderColor: "divider",
                                                    borderRadius: 1,
                                                    px: 1,
                                                    py: 0.5,
                                                }}
                                            >
                                                <Box
                                                    sx={{
                                                        flex: 1,
                                                        minWidth: 0,
                                                        cursor: "pointer",
                                                    }}
                                                    onClick={() =>
                                                        this.setState(
                                                            (prev) => ({
                                                                editingPhId:
                                                                    prev.editingPhId ===
                                                                    ph.id
                                                                        ? null
                                                                        : ph.id,
                                                            }),
                                                        )
                                                    }
                                                >
                                                    <Typography
                                                        variant="caption"
                                                        sx={{
                                                            display: "block",
                                                            fontWeight: 600,
                                                        }}
                                                    >
                                                        {ph.fieldKey ===
                                                        FIXED_TEXT_KEY
                                                            ? ph.fixedText
                                                                ? `Unos teksta: ${ph.fixedText}`
                                                                : "Unos teksta"
                                                            : (field?.label ??
                                                              ph.fieldKey)}
                                                    </Typography>
                                                    <Typography
                                                        variant="caption"
                                                        color="text.secondary"
                                                        sx={{ fontSize: 10 }}
                                                    >
                                                        str. {ph.page + 1}
                                                    </Typography>
                                                </Box>
                                                <IconButton
                                                    size="small"
                                                    color="error"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        this.handleRemovePlaceholder(
                                                            ph.id,
                                                        );
                                                    }}
                                                >
                                                    <DeleteIcon
                                                        sx={{ fontSize: 16 }}
                                                    />
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
                        onClick={() => void this.handleSave()}
                        variant="contained"
                        disabled={saving || loading}
                    >
                        {saving ? "Čuvanje..." : "Sačuvaj polja"}
                    </Button>
                </DialogActions>

                <Menu
                    open={Boolean(menuAnchor)}
                    anchorEl={menuAnchor?.el ?? null}
                    onClose={() =>
                        this.setState((prev) => ({
                            ...prev,
                            menuAnchor: null,
                            editingPhId: null,
                        }))
                    }
                    slotProps={{ paper: { sx: { maxHeight: 400 } } }}
                >
                    {editingPh && [
                        <MenuItem
                            key="remove"
                            onClick={() =>
                                this.handleRemovePlaceholder(editingPh.id)
                            }
                            sx={{ color: "error.main", fontSize: 13 }}
                        >
                            Ukloni polje
                        </MenuItem>,
                        <Divider key="divider" />,
                    ]}
                    {availableFields.map((f) => (
                        <MenuItem
                            key={f.key}
                            onClick={() => this.handleFieldSelect(f.key)}
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
}
