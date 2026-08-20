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
    Switch,
    FormControlLabel,
} from "@mui/material";
import DeleteIcon from "@mui/icons-material/Delete";
import { enqueueSnackbar } from "notistack";
import type {
    DocumentTemplate,
    DocumentTemplatePlaceholderTag,
    VisualPlaceholder,
} from "../api/documents";
import {
    documentTemplatePagesStreamUrl,
    getDocumentTemplatePlaceholderTags,
    getTemplateFieldDefinitions,
    previewTemplate,
    saveVisualPlaceholders,
} from "../api/documents";
import { ConfirmDialog } from "../design";

interface TemplateField {
    key: string;
    label: string;
}

type FieldGroups = {
    EMPLOYEE: TemplateField[];
    EQUIPMENT: TemplateField[];
    CLIENT_COMPANY: TemplateField[];
    PROCESS: TemplateField[];
};

const EMPLOYEE_FIELDS: TemplateField[] = [
    { key: "employee.full_name", label: "Ime i prezime zaposlenog" },
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
    {
        key: "client.risk_assessment_act_name",
        label: "Naziv Akta o proceni rizika",
    },
    {
        key: "client.risk_assessment_act_date",
        label: "Datum donošenja Akta o proceni rizika",
    },
];

const FIXED_TEXT_KEY = "__fixed_text__";

const PROCESS_FIELDS: TemplateField[] = [
    { key: "scheduled_for", label: "Datum zakazivanja" },
    { key: "performed_at", label: "Datum izvođenja" },
    { key: "valid_until", label: "Važi do" },
    { key: "process_type_name", label: "Vrsta obaveze" },
    { key: "instruction_number", label: "Broj uputa" },
    { key: "last_exam_date", label: "Datum prethodnog pregleda" },
    { key: "year_of_birth", label: "Godina rođenja" },
    { key: "date_of_birth", label: "Datum rođenja" },
];

const FIXED_TEXT_FIELD: TemplateField = {
    key: FIXED_TEXT_KEY,
    label: "Unos teksta",
};

const FALLBACK_GROUPS: FieldGroups = {
    EMPLOYEE: EMPLOYEE_FIELDS,
    EQUIPMENT: EQUIPMENT_FIELDS,
    CLIENT_COMPANY: CLIENT_FIELDS,
    PROCESS: PROCESS_FIELDS,
};

function fieldsForContext(
    context: DocumentTemplate["context_type"],
    groups: FieldGroups,
): TemplateField[] {
    const base = [FIXED_TEXT_FIELD, ...groups.PROCESS];
    if (context === "EMPLOYEE")
        return [...groups.EMPLOYEE, ...groups.CLIENT_COMPANY, ...base];
    if (context === "EQUIPMENT")
        return [...groups.EQUIPMENT, ...groups.CLIENT_COMPANY, ...base];
    if (context === "CLIENT_COMPANY")
        return [...groups.CLIENT_COMPANY, ...base];
    return [
        ...groups.EMPLOYEE,
        ...groups.EQUIPMENT,
        ...groups.CLIENT_COMPANY,
        ...base,
    ];
}

const MARKER_W = 12;
const MARKER_H = 2.2;

const ALL_KNOWN_FIELDS: TemplateField[] = [
    FIXED_TEXT_FIELD,
    ...EMPLOYEE_FIELDS,
    ...EQUIPMENT_FIELDS,
    ...CLIENT_FIELDS,
    ...PROCESS_FIELDS,
];

function labelForKey(key: string, available: TemplateField[]): string {
    return (
        available.find((f) => f.key === key)?.label ??
        ALL_KNOWN_FIELDS.find((f) => f.key === key)?.label ??
        key
    );
}

const COMPACT_MARKER_LABELS: Record<string, string> = {
    "employee.first_name": "Ime",
    "employee.last_name": "Prezime",
    "employee.father_name": "Ime oca",
    "employee.national_id": "JMBG",
    "employee.date_of_birth": "Datum rođenja",
    "employee.place_of_birth": "Mesto rođenja",
    "employee.occupation": "Zanimanje",
    "employee.high_risk_position_name": "Radno mesto",
    "client.name": "Naziv firme",
    "client.registration_number": "Matični broj",
    "client.address": "Adresa firme",
    "client.activity_code": "Šifra delatnosti",
    "client.risk_assessment_act_name": "Akt o proceni rizika",
    "client.risk_assessment_act_date": "Datum akta",
    scheduled_for: "Datum zakazivanja",
    instruction_number: "Broj uputa",
    date_of_birth: "Datum rođenja",
    last_exam_date: "Datum prethodnog pregleda",
};

function compactMarkerLabel(key: string, fullLabel: string): string {
    if (key === FIXED_TEXT_KEY) return fullLabel || "Unos teksta";
    const short = COMPACT_MARKER_LABELS[key];
    return short ? `[${short}]` : fullLabel;
}

function withPlaceholderIds(
    placeholders: VisualPlaceholder[],
): VisualPlaceholder[] {
    return placeholders.map((ph, index) => ({
        ...ph,
        id: ph.id?.trim() || `ph_${index}_${ph.fieldKey ?? "field"}`,
    }));
}

function widthForLabel(label: string): number {
    const perChar = 0.95;
    return Math.min(92, Math.max(6, label.length * perChar + 1.5));
}

const GRID_STEP_OPTIONS = [0.5, 1, 2, 5];

interface Props {
    open: boolean;
    template: DocumentTemplate;
    onClose: () => void;
    onSaved: (updated: DocumentTemplate) => void;
    // Overrides that let this dialog edit a firm blank's own placement JSON
    // (JobRole.obrazac6_fields / lzo_revers_fields, TrainingType.potvrda_fields)
    // instead of a DocumentTemplate's generation_config. When provided, the
    // dialog streams pages from `streamUrl` and reads/writes fields through
    // `loadFields`/`saveFields` rather than the documents/ endpoints.
    streamUrl?: string;
    loadFields?: () => Promise<{
        placeholders: VisualPlaceholder[];
        master_placeholders?: VisualPlaceholder[];
    }>;
    saveFields?: (placeholders: VisualPlaceholder[]) => Promise<unknown>;
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
    generating: boolean;
    saving: boolean;
    error: string | null;
    placeholders: VisualPlaceholder[];
    documentTags: DocumentTemplatePlaceholderTag[];
    menuAnchor: MenuAnchor | null;
    editingPhId: string | null;
    dragState: DragSnapshot | null;
    fieldSearch: string;
    fieldGroups: FieldGroups | null;
    snapEnabled: boolean;
    gridStep: number;
    previewOpen: boolean;
    previewUrl: string | null;
    previewError: string | null;
    previewLoading: boolean;
    fieldCatalogLoadFailed: boolean;
    confirmRemovePhId: string | null;
}

export default class TemplateStructureEditorDialog extends Component<
    Props,
    State
> {
    private pageRefs: (HTMLDivElement | null)[] = [];

    private activeDrag: DragSnapshot | null = null;

    private suppressNextPageClick = false;

    private dragMoved = false;

    private pagesStream: EventSource | null = null;

    state: State = {
        pageUrls: [],
        loading: false,
        generating: false,
        saving: false,
        error: null,
        placeholders: [],
        documentTags: [],
        menuAnchor: null,
        editingPhId: null,
        dragState: null,
        fieldSearch: "",
        fieldGroups: null,
        snapEnabled: true,
        gridStep: 1,
        previewOpen: false,
        previewUrl: null,
        previewError: null,
        previewLoading: false,
        fieldCatalogLoadFailed: false,
        confirmRemovePhId: null,
    };

    componentDidMount(): void {
        this.loadFieldDefinitions();
        if (this.props.open) {
            this.loadEditorData();
        }
    }

    private loadFieldDefinitions = (): void => {
        getTemplateFieldDefinitions()
            .then((defs) => {
                if (!defs.length) return;
                const groups: FieldGroups = {
                    EMPLOYEE: [],
                    EQUIPMENT: [],
                    CLIENT_COMPANY: [],
                    PROCESS: [],
                };
                for (const d of defs) {
                    groups[d.category]?.push({ key: d.key, label: d.label });
                }
                this.setState((prev) => ({ ...prev, fieldGroups: groups }));
            })
            .catch(() =>
                this.setState((prev) => ({
                    ...prev,
                    fieldCatalogLoadFailed: true,
                })),
            );
    };

    componentDidUpdate(prevProps: Props): void {
        const { open, template } = this.props;
        const opened = !prevProps.open && open;
        const urlChanged =
            this.resolveStreamUrl(prevProps) !== this.resolveStreamUrl(this.props);
        const configChanged =
            !this.props.loadFields &&
            prevProps.template.generation_config !== template.generation_config;
        if (open && (opened || urlChanged || configChanged)) {
            this.loadEditorData();
        }
    }

    private resolveStreamUrl = (props: Props): string =>
        props.streamUrl ?? documentTemplatePagesStreamUrl(props.template.id);

    componentWillUnmount(): void {
        if (this.activeDrag) {
            window.removeEventListener("mousemove", this.dragMoveHandler);
            window.removeEventListener("mouseup", this.dragUpHandler);
        }
        if (this.state.previewUrl) {
            URL.revokeObjectURL(this.state.previewUrl);
        }
        this.closePagesStream();
    }

    private closePagesStream = (): void => {
        if (this.pagesStream) {
            this.pagesStream.close();
            this.pagesStream = null;
        }
    };

    private snapPct = (value: number): number => {
        const { snapEnabled, gridStep } = this.state;
        if (!snapEnabled || gridStep <= 0) return value;
        return Math.round(value / gridStep) * gridStep;
    };

    private isVisualPlacementMode = (): boolean => true;

    private generationMode = (): string => {
        const mode = (
            this.props.template.generation_config as
                | { mode?: string }
                | null
                | undefined
        )?.mode;
        return mode || "VISUAL";
    };

    private isAutoFillTemplate = (): boolean => {
        if (this.props.loadFields) return false;
        const mode = this.generationMode();
        return mode === "DOCX_PLACEHOLDER" || mode === "DOCX_CELL_MAP";
    };

    private loadEditorData = (): void => {
        const { template, loadFields } = this.props;

        this.closePagesStream();
        this.setState((prev) => ({
            ...prev,
            error: null,
            loading: true,
            generating: false,
            pageUrls: [],
            placeholders: [],
            documentTags: [],
        }));

        if (loadFields) {
            loadFields()
                .then(({ placeholders, master_placeholders }) => {
                    const initial = withPlaceholderIds(
                        placeholders.length > 0
                            ? placeholders
                            : (master_placeholders ?? []),
                    );
                    this.setState((prev) => ({
                        ...prev,
                        placeholders: initial,
                    }));
                })
                .catch(() =>
                    this.setState((prev) => ({
                        ...prev,
                        error: "Greška pri učitavanju polja.",
                        loading: false,
                    })),
                );
        } else {
            const config = (template.generation_config ?? {}) as Record<
                string,
                unknown
            >;
            const initialPlaceholders = withPlaceholderIds(
                Array.isArray(config.placeholders)
                    ? (config.placeholders as VisualPlaceholder[])
                    : [],
            );
            this.setState((prev) => ({
                ...prev,
                placeholders: initialPlaceholders,
            }));
            if (this.isAutoFillTemplate()) {
                getDocumentTemplatePlaceholderTags(template.id)
                    .then((tags) => {
                        this.setState((prev) => ({
                            ...prev,
                            documentTags: tags,
                        }));
                    })
                    .catch(() => undefined);
            }
        }

        this.openPagesStream(this.resolveStreamUrl(this.props));
    };

    // Subscribe to the backend SSE stream. The server pushes a `done` event with
    // the page URLs the moment rendering finishes — no client-side polling. If
    // the connection drops mid-generation, EventSource reconnects on its own.
    private openPagesStream = (url: string): void => {
        const isStale = (): boolean =>
            !this.props.open || this.resolveStreamUrl(this.props) !== url;

        const stream = new EventSource(url, { withCredentials: true });
        this.pagesStream = stream;
        this.setState((prev) => ({
            ...prev,
            loading: true,
            generating: true,
        }));

        stream.addEventListener("done", (ev: Event) => {
            if (isStale()) return;
            let pages: string[] = [];
            try {
                pages =
                    (JSON.parse((ev as MessageEvent).data) as {
                        pages?: string[];
                    }).pages ?? [];
            } catch {
                pages = [];
            }
            const cb = Date.now();
            const busted = pages.map(
                (u) => u + (u.includes("?") ? "&" : "?") + "cb=" + cb,
            );
            this.setState((prev) => ({
                ...prev,
                pageUrls: busted,
                loading: false,
                generating: false,
            }));
            this.closePagesStream();
        });

        stream.addEventListener("failed", (ev: Event) => {
            if (isStale()) return;
            let detail = "Greška pri učitavanju stranica dokumenta.";
            try {
                detail =
                    (JSON.parse((ev as MessageEvent).data) as {
                        detail?: string;
                    }).detail ?? detail;
            } catch {
                /* keep default */
            }
            this.setState((prev) => ({
                ...prev,
                loading: false,
                generating: false,
                error: detail,
            }));
            this.closePagesStream();
        });

        // Native connection error: the browser auto-reconnects (readyState
        // CONNECTING), so keep the "generating" state and let it retry.
        stream.onerror = (): void => {
            if (isStale()) {
                this.closePagesStream();
                return;
            }
            this.setState((prev) => ({
                ...prev,
                loading: true,
                generating: true,
            }));
        };
    };

    private dragMoveHandler = (e: Event): void => {
        const d = this.activeDrag;
        if (!d) return;
        const me = e as MouseEvent;
        const dx = me.clientX - d.startMouseX;
        const dy = me.clientY - d.startMouseY;
        if (Math.abs(dx) > 2 || Math.abs(dy) > 2) {
            this.dragMoved = true;
        }
        const dxPct = (dx / d.containerWidth) * 100;
        const dyPct = (dy / d.containerHeight) * 100;
        const newX = this.snapPct(
            Math.max(0, Math.min(100 - MARKER_W, d.startXPct + dxPct)),
        );
        const newY = this.snapPct(
            Math.max(0, Math.min(100 - MARKER_H, d.startYPct + dyPct)),
        );
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
        const moved = this.dragMoved;
        this.dragMoved = false;
        if (moved) {
            this.suppressNextPageClick = true;
            window.setTimeout(() => {
                this.suppressNextPageClick = false;
            }, 0);
        }
        this.setState((prev) => ({ ...prev, dragState: null }));
    };

    private handlePageClick = (
        e: ReactMouseEvent<HTMLDivElement>,
        pageIndex: number,
    ): void => {
        if (!this.isVisualPlacementMode()) return;
        if (this.state.dragState) return;
        if (this.suppressNextPageClick) {
            this.suppressNextPageClick = false;
            return;
        }
        const container = this.pageRefs[pageIndex];
        if (!container) return;
        const rect = container.getBoundingClientRect();
        const xPct = ((e.clientX - rect.left) / rect.width) * 100;
        const yPct = ((e.clientY - rect.top) / rect.height) * 100;

        this.setState((prev) => ({
            ...prev,
            editingPhId: null,
            fieldSearch: "",
            menuAnchor: { el: e.currentTarget, page: pageIndex, xPct, yPct },
        }));
    };

    private handleMarkerClick = (e: ReactMouseEvent, phId: string): void => {
        e.stopPropagation();
        if (this.state.dragState) return;
        if (this.suppressNextPageClick) {
            this.suppressNextPageClick = false;
            return;
        }
        this.setState((prev) => ({
            ...prev,
            editingPhId: phId,
            fieldSearch: "",
            menuAnchor: {
                el: e.currentTarget as Element,
                page: -1,
                xPct: 0,
                yPct: 0,
            },
        }));
    };

    private handleFieldSelect = (fieldKey: string): void => {
        const avail = fieldsForContext(
            this.props.template.context_type,
            this.state.fieldGroups ?? FALLBACK_GROUPS,
        );
        const newWidth =
            fieldKey === FIXED_TEXT_KEY
                ? MARKER_W
                : widthForLabel(labelForKey(fieldKey, avail));
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
                    widthPct: newWidth,
                    heightPct: MARKER_H,
                    fontSize: 10,
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

    private requestRemovePlaceholder = (phId: string): void => {
        this.setState((prev) => ({
            ...prev,
            confirmRemovePhId: phId,
            menuAnchor: null,
            editingPhId: null,
        }));
    };

    private confirmRemovePlaceholder = (): void => {
        const { confirmRemovePhId } = this.state;
        if (!confirmRemovePhId) return;
        this.setState((prev) => ({
            placeholders: prev.placeholders.filter(
                (p) => p.id !== confirmRemovePhId,
            ),
            confirmRemovePhId: null,
            editingPhId:
                prev.editingPhId === confirmRemovePhId
                    ? null
                    : prev.editingPhId,
        }));
    };

    private handlePreview = async (): Promise<void> => {
        const err = this.validatePlaceholders();
        if (err) {
            enqueueSnackbar(err, { variant: "error" });
            return;
        }
        const { template } = this.props;
        const { placeholders, previewUrl } = this.state;
        if (previewUrl) {
            URL.revokeObjectURL(previewUrl);
        }
        this.setState({
            previewLoading: true,
            previewError: null,
            previewOpen: true,
            previewUrl: null,
        });
        try {
            const blob = await previewTemplate(template.id, placeholders);
            const url = URL.createObjectURL(blob);
            this.setState({ previewUrl: url, previewLoading: false });
        } catch {
            this.setState({
                previewError: "Greška pri generisanju pregleda.",
                previewLoading: false,
            });
        }
    };

    private closePreview = (): void => {
        const { previewUrl } = this.state;
        if (previewUrl) {
            URL.revokeObjectURL(previewUrl);
        }
        this.setState({
            previewOpen: false,
            previewUrl: null,
            previewError: null,
            previewLoading: false,
        });
    };

    private handleMarkerMouseDown = (
        e: ReactMouseEvent,
        ph: VisualPlaceholder,
    ): void => {
        e.stopPropagation();
        e.preventDefault();
        this.dragMoved = false;
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
        const { template, onSaved, onClose, saveFields } = this.props;
        const { placeholders } = this.state;
        this.setState((prev) => ({ ...prev, saving: true }));
        try {
            if (saveFields) {
                await saveFields(placeholders);
                onSaved(template);
            } else {
                const updated = await saveVisualPlaceholders(
                    template.id,
                    placeholders,
                    template.generation_config as
                        | Record<string, unknown>
                        | null
                        | undefined,
                );
                onSaved(updated);
            }
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
            generating,
            saving,
            error,
            placeholders,
            documentTags,
            menuAnchor,
            editingPhId,
            dragState,
            fieldSearch,
            snapEnabled,
            gridStep,
            previewOpen,
            previewUrl,
            previewError,
            previewLoading,
            fieldCatalogLoadFailed,
            confirmRemovePhId,
        } = this.state;

        const availableFields = fieldsForContext(
            template.context_type,
            this.state.fieldGroups ?? FALLBACK_GROUPS,
        );
        const editingPh = editingPhId
            ? placeholders.find((p) => p.id === editingPhId)
            : undefined;
        const searchNorm = fieldSearch.trim().toLowerCase();
        const filteredFields = searchNorm
            ? availableFields.filter((f) =>
                  f.label.toLowerCase().includes(searchNorm),
              )
            : availableFields;

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
                        {this.isAutoFillTemplate()
                            ? "Kliknite da dodate / pomerite polje. Automatsko popunjavanje ostaje preko oznaka u Wordu."
                            : "Kliknite na dokument da postavite polje."}
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
                                flexDirection: "column",
                                gap: 2,
                                justifyContent: "center",
                                alignItems: "center",
                                flex: 1,
                                py: 6,
                            }}
                        >
                            <CircularProgress />
                            {generating && (
                                <Typography
                                    variant="body2"
                                    color="text.secondary"
                                    align="center"
                                >
                                    Generisanje stranica dokumenta… za veće
                                    dokumente ovo može potrajati nekoliko minuta.
                                </Typography>
                            )}
                        </Box>
                    )}
                    {error && (
                        <Alert severity="error" sx={{ mb: 2, width: "100%" }}>
                            {error}
                        </Alert>
                    )}
                    {fieldCatalogLoadFailed && (
                        <Alert severity="info" sx={{ mb: 2, width: "100%" }}>
                            Katalog polja nije učitan — koriste se podrazumevana
                            polja.
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
                                                const fullLabel =
                                                    ph.fieldKey ===
                                                    FIXED_TEXT_KEY
                                                        ? ph.fixedText ||
                                                          "Unos teksta"
                                                        : labelForKey(
                                                              ph.fieldKey,
                                                              availableFields,
                                                          );
                                                const markerLabel =
                                                    compactMarkerLabel(
                                                        ph.fieldKey,
                                                        fullLabel,
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
                                                            containerType:
                                                                "size",
                                                            overflow: "hidden",
                                                            backgroundColor:
                                                                dragState?.phId ===
                                                                ph.id
                                                                    ? "rgba(102,187,106,0.6)"
                                                                    : "rgba(102,187,106,0.42)",
                                                            border: "1px solid #2e7d32",
                                                            borderRadius: "3px",
                                                            display: "flex",
                                                            alignItems:
                                                                "center",
                                                            cursor:
                                                                dragState?.phId ===
                                                                ph.id
                                                                    ? "grabbing"
                                                                    : "grab",
                                                            "&:hover": {
                                                                backgroundColor:
                                                                    "rgba(102,187,106,0.6)",
                                                            },
                                                            transition:
                                                                "background-color 0.1s",
                                                            zIndex:
                                                                dragState?.phId ===
                                                                ph.id
                                                                    ? 100
                                                                    : 10,
                                                        }}
                                                        title={fullLabel}
                                                    >
                                                        <Typography
                                                            sx={{
                                                                fontSize:
                                                                    "clamp(8px, 85cqh, 14px)",
                                                                fontWeight: 600,
                                                                color: "#1b5e20",
                                                                lineHeight: 1,
                                                                whiteSpace:
                                                                    "nowrap",
                                                                overflow:
                                                                    "hidden",
                                                                textOverflow:
                                                                    "ellipsis",
                                                                width: "100%",
                                                                pointerEvents:
                                                                    "none",
                                                            }}
                                                        >
                                                            {markerLabel}
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
                                {documentTags.length > 0 && (
                                    <Box sx={{ mb: 2 }}>
                                        <Typography
                                            variant="caption"
                                            color="text.secondary"
                                            sx={{ display: "block", mb: 0.75 }}
                                        >
                                            Oznake u Word fajlu (
                                            {documentTags.length})
                                        </Typography>
                                        <Box
                                            sx={{
                                                display: "flex",
                                                flexDirection: "column",
                                                gap: 0.5,
                                                maxHeight: 140,
                                                overflow: "auto",
                                            }}
                                        >
                                            {documentTags.map((tag) => (
                                                <Typography
                                                    key={tag.key}
                                                    variant="caption"
                                                    noWrap
                                                    title={`{{ ${tag.key} }}`}
                                                >
                                                    {tag.label}
                                                </Typography>
                                            ))}
                                        </Box>
                                    </Box>
                                )}
                                <FormControlLabel
                                    control={
                                        <Switch
                                            size="small"
                                            checked={snapEnabled}
                                            onChange={(e) =>
                                                this.setState((prev) => ({
                                                    ...prev,
                                                    snapEnabled:
                                                        e.target.checked,
                                                }))
                                            }
                                        />
                                    }
                                    label="Poravnanje"
                                    sx={{ mb: 1, ml: 0 }}
                                />
                                <FormControl
                                    fullWidth
                                    size="small"
                                    sx={{ mb: 2 }}
                                    disabled={!snapEnabled}
                                >
                                    <InputLabel>Korak mreže (%)</InputLabel>
                                    <Select
                                        value={gridStep}
                                        label="Korak mreže (%)"
                                        onChange={(e) =>
                                            this.setState((prev) => ({
                                                ...prev,
                                                gridStep: Number(
                                                    e.target.value,
                                                ),
                                            }))
                                        }
                                    >
                                        {GRID_STEP_OPTIONS.map((s) => (
                                            <MenuItem key={s} value={s}>
                                                {s}
                                            </MenuItem>
                                        ))}
                                    </Select>
                                </FormControl>
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
                                                sx={{ mb: 1.5 }}
                                            />
                                        )}
                                        <TextField
                                            fullWidth
                                            size="small"
                                            type="number"
                                            label="Veličina fonta"
                                            value={editingPh.fontSize ?? 10}
                                            slotProps={{
                                                htmlInput: {
                                                    min: 6,
                                                    max: 48,
                                                    step: 1,
                                                },
                                            }}
                                            onChange={(e) => {
                                                const id = editingPh.id;
                                                const v = Number(
                                                    e.target.value,
                                                );
                                                if (Number.isNaN(v)) return;
                                                this.setState((prev) => ({
                                                    placeholders:
                                                        prev.placeholders.map(
                                                            (p) =>
                                                                p.id === id
                                                                    ? {
                                                                          ...p,
                                                                          fontSize:
                                                                              v,
                                                                      }
                                                                    : p,
                                                        ),
                                                }));
                                            }}
                                        />
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
                                                            : labelForKey(
                                                                  ph.fieldKey,
                                                                  availableFields,
                                                              )}
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
                                                        this.requestRemovePlaceholder(
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
                    {!this.props.saveFields && (
                        <Button
                            onClick={() => void this.handlePreview()}
                            disabled={saving || loading || previewLoading}
                        >
                            Pregled rezultata
                        </Button>
                    )}
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
                            fieldSearch: "",
                        }))
                    }
                    slotProps={{
                        paper: { sx: { maxHeight: 400, width: 280 } },
                    }}
                >
                    <Box
                        sx={{
                            px: 1,
                            py: 0.5,
                            position: "sticky",
                            top: 0,
                            bgcolor: "background.paper",
                            zIndex: 1,
                        }}
                        onKeyDown={(e) => e.stopPropagation()}
                    >
                        <TextField
                            size="small"
                            fullWidth
                            autoFocus
                            placeholder="Pretraži polja…"
                            value={fieldSearch}
                            onChange={(e) =>
                                this.setState((prev) => ({
                                    ...prev,
                                    fieldSearch: e.target.value,
                                }))
                            }
                        />
                    </Box>
                    {editingPh && [
                        <MenuItem
                            key="remove"
                            onClick={() =>
                                this.requestRemovePlaceholder(editingPh.id)
                            }
                            sx={{ color: "error.main", fontSize: 13 }}
                        >
                            Ukloni polje
                        </MenuItem>,
                        <Divider key="divider" />,
                    ]}
                    {filteredFields.length === 0 && (
                        <MenuItem
                            disabled
                            sx={{ fontSize: 13, fontStyle: "italic" }}
                        >
                            Nema rezultata
                        </MenuItem>
                    )}
                    {filteredFields.map((f) => (
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

                <Dialog
                    open={previewOpen}
                    onClose={this.closePreview}
                    maxWidth="lg"
                    fullWidth
                >
                    <DialogTitle>Pregled rezultata</DialogTitle>
                    <DialogContent dividers>
                        {previewLoading && (
                            <Box
                                sx={{
                                    display: "flex",
                                    justifyContent: "center",
                                    py: 6,
                                }}
                            >
                                <CircularProgress />
                            </Box>
                        )}
                        {previewError && (
                            <Alert severity="error">{previewError}</Alert>
                        )}
                        {!previewLoading && previewUrl && (
                            <Box sx={{ height: "70vh" }}>
                                <iframe
                                    src={previewUrl}
                                    title="Pregled PDF"
                                    style={{
                                        width: "100%",
                                        height: "100%",
                                        border: "none",
                                    }}
                                />
                            </Box>
                        )}
                    </DialogContent>
                    <DialogActions>
                        <Button onClick={this.closePreview}>Zatvori</Button>
                    </DialogActions>
                </Dialog>

                <ConfirmDialog
                    open={confirmRemovePhId != null}
                    title="Ukloni polje?"
                    message="Da li sigurno želiš da ukloniš ovo polje?"
                    confirmLabel="Ukloni"
                    onConfirm={this.confirmRemovePlaceholder}
                    onClose={() =>
                        this.setState((prev) => ({
                            ...prev,
                            confirmRemovePhId: null,
                        }))
                    }
                />
            </Dialog>
        );
    }
}
