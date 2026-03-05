import { Component, createRef, useState, type FC } from "react";
import { connect } from "react-redux";
import {
    Box,
    Paper,
    Table,
    TableHead,
    TableRow,
    TableCell,
    TableBody,
    IconButton,
    Button,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    TextField,
    FormControl,
    InputLabel,
    Select,
    MenuItem,
    Typography,
    InputAdornment,
} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import EditIcon from "@mui/icons-material/Edit";
import UploadFileIcon from "@mui/icons-material/UploadFile";
import DownloadIcon from "@mui/icons-material/Download";
import CalendarMonthIcon from "@mui/icons-material/CalendarMonth";
import { PermissionGate } from "../components/PermissionGate";
import { DateToString, StringToDate, formatDateTimeISO } from "../utils/date";
import type { RootState, AppDispatch } from "../store";
import {
    fetchDocuments,
    fetchDocumentCategories,
    createDocument,
    updateDocument,
} from "../store/documentsSlice";
import type { DocumentFile, DocumentCategory } from "../types/documents";
import { setLastPath } from "../store/locationSlice";

interface StateProps {
    documents: DocumentFile[];
    categories: DocumentCategory[];
    error?: string;
}

interface DispatchProps {
    fetchDocuments: () => void;
    fetchDocumentCategories: () => void;
    createDocument: (p: {
        category_id: number;
        title: string;
        file: File;
        valid_from?: string;
        valid_until?: string;
        version?: string;
        language?: string;
    }) => void;
    updateDocument: (p: {
        id: number;
        category_id?: number;
        title?: string;
        file?: File;
        valid_from?: string;
        valid_until?: string;
        version?: string;
        language?: string;
    }) => void;
    setLastPath: (path: string) => void;
}

type Props = StateProps & DispatchProps;

interface State {
    dialogOpen: boolean;
    editingDoc: DocumentFile | null;
    category_id: number | "";
    title: string;
    file: File | null;
    valid_from: string;
    valid_until: string;
    version: string;
    language: string;
}

interface DateTextFieldWithPickerProps {
    label: string;
    value: string;
    onChange: (value: string) => void;
}

const DateTextFieldWithPicker: FC<DateTextFieldWithPickerProps> = ({
    label,
    value,
    onChange,
}) => {
    const [open, setOpen] = useState(false);

    const parseDisplayDate = (v: string): Date | null => StringToDate(v);

    const [currentMonth, setCurrentMonth] = useState<Date>(() => {
        const parsed = value ? parseDisplayDate(value) : null;
        return parsed ?? new Date();
    });

    const selectedDate = value ? parseDisplayDate(value) : null;

    const handleOpen = (): void => {
        const parsed = value ? parseDisplayDate(value) : null;
        setCurrentMonth(parsed ?? new Date());
        setOpen(true);
    };

    const handleClose = (): void => setOpen(false);

    const handleMonthChange = (delta: number): void => {
        setCurrentMonth((prev) => {
            const year = prev.getFullYear();
            const month = prev.getMonth();
            return new Date(year, month + delta, 1);
        });
    };

    const handleSelectDay = (day: number): void => {
        const year = currentMonth.getFullYear();
        const month = currentMonth.getMonth() + 1;
        const d = new Date(year, month - 1, day);
        onChange(DateToString(d));
        setOpen(false);
    };

    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    const startOfMonth = new Date(year, month, 1);
    const dayOfWeek = (startOfMonth.getDay() + 6) % 7; // ponedeljak = 0
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    const weeks: (number | null)[][] = [];
    let currentDay = 1 - dayOfWeek;
    for (let w = 0; w < 6; w += 1) {
        const week: (number | null)[] = [];
        for (let d = 0; d < 7; d += 1) {
            if (currentDay < 1 || currentDay > daysInMonth) {
                week.push(null);
            } else {
                week.push(currentDay);
            }
            currentDay += 1;
        }
        weeks.push(week);
    }

    const selectedDay =
        selectedDate?.getDate() === undefined ? null : selectedDate.getDate();
    const selectedMonth =
        selectedDate?.getMonth() === undefined ? null : selectedDate.getMonth();
    const selectedYear =
        selectedDate?.getFullYear() === undefined
            ? null
            : selectedDate.getFullYear();

    const monthLabel = currentMonth.toLocaleDateString("sr-RS", {
        month: "long",
        year: "numeric",
    });

    const weekdayLabels = ["Po", "Ut", "Sr", "Če", "Pe", "Su", "Ne"];

    return (
        <>
            <TextField
                margin="dense"
                label={label}
                fullWidth
                value={value}
                onClick={handleOpen}
                InputLabelProps={{ shrink: true }}
                InputProps={{
                    readOnly: true,
                    endAdornment: (
                        <InputAdornment position="end">
                            <IconButton size="small" onClick={handleOpen}>
                                <CalendarMonthIcon fontSize="small" />
                            </IconButton>
                        </InputAdornment>
                    ),
                }}
            />
            <Dialog open={open} onClose={handleClose} maxWidth="xs" fullWidth>
                <DialogTitle
                    sx={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        pb: 1,
                    }}
                >
                    <IconButton
                        size="small"
                        onClick={() => handleMonthChange(-1)}
                    >
                        {"<"}
                    </IconButton>
                    <Typography variant="subtitle1" component="span">
                        {monthLabel}
                    </Typography>
                    <IconButton
                        size="small"
                        onClick={() => handleMonthChange(1)}
                    >
                        {">"}
                    </IconButton>
                </DialogTitle>
                <DialogContent>
                    <Box
                        sx={{
                            display: "grid",
                            gridTemplateColumns: "repeat(7, 1fr)",
                            mb: 1,
                        }}
                    >
                        {weekdayLabels.map((d) => (
                            <Typography
                                key={d}
                                variant="caption"
                                align="center"
                                sx={{ fontWeight: 600 }}
                            >
                                {d}
                            </Typography>
                        ))}
                    </Box>
                    <Box
                        sx={{
                            display: "grid",
                            gridTemplateColumns: "repeat(7, 1fr)",
                            rowGap: 0.5,
                        }}
                    >
                        {weeks.flat().map((day, idx) =>
                            day == null ? (
                                <Box key={idx} />
                            ) : (
                                <Button
                                    key={idx}
                                    size="small"
                                    variant={
                                        selectedDay === day &&
                                        selectedMonth === month &&
                                        selectedYear === year
                                            ? "contained"
                                            : "text"
                                    }
                                    onClick={() => handleSelectDay(day)}
                                    sx={{ minWidth: 0, p: 0.5 }}
                                >
                                    {day}
                                </Button>
                            ),
                        )}
                    </Box>
                </DialogContent>
                <DialogActions>
                    <Button onClick={handleClose}>Zatvori</Button>
                </DialogActions>
            </Dialog>
        </>
    );
};

class DocumentsListPage extends Component<Props, State> {
    fileInputRef = createRef<HTMLInputElement>();

    state: State = {
        dialogOpen: false,
        editingDoc: null,
        category_id: "",
        title: "",
        file: null,
        valid_from: "",
        valid_until: "",
        version: "",
        language: "",
    };

    componentDidMount(): void {
        this.props.fetchDocuments();
        this.props.fetchDocumentCategories();
        this.props.setLastPath("/documents");
    }

    openCreate = (): void => {
        this.setState({
            dialogOpen: true,
            editingDoc: null,
            category_id: this.props.categories[0]?.id ?? "",
            title: "",
            file: null,
            valid_from: "",
            valid_until: "",
            version: "",
            language: "",
        });
    };

    openEdit = (doc: DocumentFile): void => {
        this.setState({
            dialogOpen: true,
            editingDoc: doc,
            category_id:
                typeof doc.category === "object"
                    ? doc.category.id
                    : ((doc as { category_id?: number }).category_id ?? ""),
            title: doc.title,
            file: null,
            valid_from: doc.valid_from
                ? DateToString(new Date(doc.valid_from))
                : "",
            valid_until: doc.valid_until
                ? DateToString(new Date(doc.valid_until))
                : "",
            version: doc.version ?? "",
            language: doc.language ?? "",
        });
    };

    closeDialog = (): void => {
        this.setState({
            dialogOpen: false,
            editingDoc: null,
            category_id: "",
            title: "",
            file: null,
            valid_from: "",
            valid_until: "",
            version: "",
            language: "",
        });
    };

    handleSave = (): void => {
        const {
            editingDoc,
            category_id,
            title,
            file,
            valid_from,
            valid_until,
            version,
            language,
        } = this.state;
        if (!title.trim()) return;
        const catId = category_id === "" ? undefined : Number(category_id);
        const toIso = (val: string): string | undefined => {
            const d = StringToDate(val);
            if (!d) return undefined;
            const y = d.getFullYear();
            const m = (d.getMonth() + 1).toString().padStart(2, "0");
            const day = d.getDate().toString().padStart(2, "0");
            return `${y}-${m}-${day}`;
        };
        const validFromIso = toIso(valid_from);
        const validUntilIso = toIso(valid_until);
        if (editingDoc != null) {
            this.props.updateDocument({
                id: editingDoc.id,
                category_id: catId,
                title: title.trim(),
                file: file ?? undefined,
                valid_from: validFromIso,
                valid_until: validUntilIso,
                version: version || undefined,
                language: language || undefined,
            });
        } else {
            if (!file || catId == null) return;
            this.props.createDocument({
                category_id: catId,
                title: title.trim(),
                file,
                valid_from: validFromIso,
                valid_until: validUntilIso,
                version: version || undefined,
                language: language || undefined,
            });
        }
        this.closeDialog();
    };

    render() {
        const { documents, categories, error } = this.props;
        const list = Array.isArray(documents) ? documents : [];
        const {
            dialogOpen,
            editingDoc,
            category_id,
            title,
            file,
            valid_from,
            valid_until,
            version,
            language,
        } = this.state;
        const categoryList = Array.isArray(categories) ? categories : [];

        return (
            <Box>
                {error && (
                    <Typography color="error" sx={{ mb: 2 }}>
                        {error}
                    </Typography>
                )}
                <Box
                    sx={{ display: "flex", justifyContent: "flex-end", mb: 2 }}
                >
                    <PermissionGate permission="documents.add_documentfile">
                        <Button
                            variant="contained"
                            startIcon={<AddIcon />}
                            onClick={this.openCreate}
                        >
                            Dodaj dokument
                        </Button>
                    </PermissionGate>
                </Box>
                <Paper sx={{ overflowX: "auto" }}>
                    <Table sx={{ minWidth: 400 }}>
                        <TableHead>
                            <TableRow>
                                <TableCell>Naziv</TableCell>
                                <TableCell>Kategorija</TableCell>
                                <TableCell>Datum učitavanja</TableCell>
                                <TableCell align="right">Akcije</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {list.map((doc) => (
                                <TableRow key={doc.id}>
                                    <TableCell>{doc.title}</TableCell>
                                    <TableCell>
                                        {typeof doc.category === "object"
                                            ? (doc.category?.name ?? "—")
                                            : "—"}
                                    </TableCell>
                                    <TableCell>
                                        {formatDateTimeISO(doc.uploaded_at)}
                                    </TableCell>
                                    <TableCell align="right">
                                        <PermissionGate permission="documents.change_documentfile">
                                            <IconButton
                                                size="small"
                                                aria-label="izmeni"
                                                onClick={() =>
                                                    this.openEdit(doc)
                                                }
                                            >
                                                <EditIcon />
                                            </IconButton>
                                        </PermissionGate>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </Paper>

                <Dialog
                    open={dialogOpen}
                    onClose={this.closeDialog}
                    maxWidth="sm"
                    fullWidth
                >
                    <DialogTitle>
                        {editingDoc != null
                            ? "Izmena dokumenta"
                            : "Novi dokument"}
                    </DialogTitle>
                    <DialogContent>
                        <FormControl
                            fullWidth
                            margin="dense"
                            required={editingDoc == null}
                        >
                            <InputLabel>Kategorija</InputLabel>
                            <Select
                                value={category_id}
                                onChange={(e) =>
                                    this.setState({
                                        category_id: e.target.value as
                                            | number
                                            | "",
                                    })
                                }
                                label="Kategorija"
                            >
                                {categoryList.map((c) => (
                                    <MenuItem key={c.id} value={c.id}>
                                        {c.name}
                                    </MenuItem>
                                ))}
                            </Select>
                        </FormControl>
                        <TextField
                            margin="dense"
                            label="Naziv"
                            fullWidth
                            required
                            value={title}
                            onChange={(e) =>
                                this.setState({ title: e.target.value })
                            }
                        />
                        <Typography
                            variant="body2"
                            color="text.secondary"
                            sx={{ mt: 1.5, mb: 0.5 }}
                        >
                            Fajl dokumenta
                            {editingDoc == null && (
                                <Typography component="span" color="error">
                                    {" "}
                                    *
                                </Typography>
                            )}
                        </Typography>
                        {editingDoc != null && editingDoc.file && (
                            <Box sx={{ mb: 1.5 }}>
                                <Button
                                    component="a"
                                    href={editingDoc.file}
                                    download
                                    variant="outlined"
                                    size="small"
                                    startIcon={<DownloadIcon />}
                                >
                                    Preuzmi trenutni fajl
                                </Button>
                            </Box>
                        )}
                        <Box
                            onClick={() => this.fileInputRef.current?.click()}
                            onDragOver={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                            }}
                            onDrop={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                const f = e.dataTransfer.files?.[0];
                                if (f) this.setState({ file: f });
                            }}
                            sx={{
                                border: "2px dashed",
                                borderColor: file ? "primary.main" : "divider",
                                borderRadius: 2,
                                p: 2,
                                textAlign: "center",
                                cursor: "pointer",
                                bgcolor: file
                                    ? "action.hover"
                                    : "action.selected",
                                "&:hover": { bgcolor: "action.hover" },
                            }}
                        >
                            <input
                                ref={this.fileInputRef}
                                type="file"
                                accept=".pdf,.doc,.docx,application/pdf"
                                style={{ display: "none" }}
                                onChange={(e) => {
                                    const f = e.target.files?.[0];
                                    this.setState({ file: f ?? null });
                                }}
                            />
                            {file ? (
                                <Typography variant="body2">
                                    <UploadFileIcon
                                        sx={{
                                            verticalAlign: "middle",
                                            mr: 0.5,
                                        }}
                                    />
                                    {file.name} ({(file.size / 1024).toFixed(1)}{" "}
                                    KB)
                                </Typography>
                            ) : (
                                <Typography
                                    variant="body2"
                                    color="text.secondary"
                                >
                                    Klikni ili prevuci fajl ovde (PDF, DOC,
                                    DOCX)
                                </Typography>
                            )}
                            {editingDoc != null && (
                                <Typography
                                    variant="caption"
                                    display="block"
                                    color="text.secondary"
                                    sx={{ mt: 0.5 }}
                                >
                                    Ostavite prazno da ne menjate fajl
                                </Typography>
                            )}
                        </Box>
                        <DateTextFieldWithPicker
                            label="Važi od (datum)"
                            value={valid_from}
                            onChange={(newValue) =>
                                this.setState({ valid_from: newValue })
                            }
                        />
                        <DateTextFieldWithPicker
                            label="Važi do (datum)"
                            value={valid_until}
                            onChange={(newValue) =>
                                this.setState({ valid_until: newValue })
                            }
                        />
                        <TextField
                            margin="dense"
                            label="Verzija"
                            fullWidth
                            value={version}
                            onChange={(e) =>
                                this.setState({ version: e.target.value })
                            }
                        />
                        <TextField
                            margin="dense"
                            label="Jezik"
                            fullWidth
                            value={language}
                            onChange={(e) =>
                                this.setState({ language: e.target.value })
                            }
                        />
                    </DialogContent>
                    <DialogActions>
                        <Button onClick={this.closeDialog}>Odustani</Button>
                        <Button
                            onClick={this.handleSave}
                            variant="contained"
                            disabled={
                                !title.trim() ||
                                (editingDoc == null &&
                                    (category_id === "" || file == null))
                            }
                        >
                            {editingDoc != null ? "Sačuvaj" : "Dodaj"}
                        </Button>
                    </DialogActions>
                </Dialog>
            </Box>
        );
    }
}

const mapStateToProps = (state: RootState): StateProps => ({
    documents: state.documents.documents,
    categories: state.documents.categories,
    error: state.documents.error,
});

const mapDispatchToProps = (dispatch: AppDispatch): DispatchProps => ({
    fetchDocuments: () => dispatch(fetchDocuments()),
    fetchDocumentCategories: () => dispatch(fetchDocumentCategories()),
    createDocument: (p) => dispatch(createDocument(p)),
    updateDocument: (p) => dispatch(updateDocument(p)),
    setLastPath: (path) => dispatch(setLastPath(path)),
});

export default connect(mapStateToProps, mapDispatchToProps)(DocumentsListPage);
