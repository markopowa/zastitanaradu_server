import { Component } from "react";
import {
  Box,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Typography,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  CircularProgress,
  Alert,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControlLabel,
  Switch,
} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";

import {
  getProcessTemplates,
  getProcessTypes,
  createProcessTemplate,
  updateProcessTemplate,
  deleteProcessTemplate,
} from "../api/processes";
import type { ProcessTemplate, ProcessType } from "../types/processes";
import { setLastPath } from "../store/locationSlice";
import { connect } from "react-redux";
import type { AppDispatch, RootState } from "../store";
import { PermissionGate } from "../components/PermissionGate";
import {
  ScrollableTablePaper,
  tableCellEllipsis,
} from "../components/ScrollableTablePaper";
import {
  getDocumentTemplates as getDocumentTemplatesApi,
  type DocumentTemplate as DocTemplate,
} from "../api/documents";

interface DispatchProps {
  setLastPath?: (path: string) => void;
}
type Props = DispatchProps;

type TriggerValue = "ON_SCHEDULED" | "ON_COMPLETED" | "ON_EXPIRED" | "";
type EmailToKindValue =
  | "CLIENT_MAIN_EMAIL"
  | "EMPLOYEE_EMAIL"
  | "INTERNAL_ROLE"
  | "CUSTOM"
  | "";

const TRIGGER_OPTIONS: { value: TriggerValue; label: string }[] = [
  { value: "ON_SCHEDULED", label: "Prilikom zakazivanja" },
  { value: "ON_COMPLETED", label: "Prilikom završetka" },
  { value: "ON_EXPIRED", label: "Kada istekne rok" },
];

const EMAIL_TO_OPTIONS: { value: EmailToKindValue; label: string }[] = [
  { value: "CLIENT_MAIN_EMAIL", label: "Glavni email klijenta" },
  { value: "EMPLOYEE_EMAIL", label: "Email zaposlenog" },
  { value: "INTERNAL_ROLE", label: "Interna uloga (npr. HS služba)" },
  { value: "CUSTOM", label: "Prilagođena adresa" },
];

interface State {
  items: ProcessTemplate[];
  types: ProcessType[];
  docTemplates: DocTemplate[];
  process_type_id: string;
  loading: boolean;
  error: string | null;
  dialogOpen: boolean;
  deleteConfirmId: number | null;
  editingId: number | null;
  form_process_type_id: string;
  form_trigger: TriggerValue;
  form_document_template_id: string;
  form_generate_document: boolean;
  form_send_email: boolean;
  form_email_to_kind: EmailToKindValue;
  form_email_subject_template: string;
  form_email_body_template: string;
  form_custom_email_recipient: string;
}

class ProcessTemplatesListPageInner extends Component<Props, State> {
  state: State = {
    items: [],
    types: [],
    docTemplates: [],
    process_type_id: "",
    loading: true,
    error: null,
    dialogOpen: false,
    deleteConfirmId: null,
    editingId: null,
    form_process_type_id: "",
    form_trigger: "",
    form_document_template_id: "",
    form_generate_document: false,
    form_send_email: false,
    form_email_to_kind: "",
    form_email_subject_template: "",
    form_email_body_template: "",
    form_custom_email_recipient: "",
  };

  load = (): void => {
    this.setState({ loading: true, error: null });
    const { process_type_id } = this.state;
    const params = process_type_id
      ? { process_type_id: Number(process_type_id) }
      : undefined;
    Promise.all([
      getProcessTemplates(params),
      getProcessTypes(),
      getDocumentTemplatesApi(),
    ])
      .then(([items, types, docTemplates]) => {
        this.setState({
          items: Array.isArray(items) ? items : [],
          types: Array.isArray(types) ? types : [],
          docTemplates: Array.isArray(docTemplates) ? docTemplates : [],
          loading: false,
          error: null,
        });
      })
      .catch(() =>
        this.setState({ loading: false, error: "Greška pri učitavanju." }),
      );
  };

  componentDidMount(): void {
    this.props.setLastPath?.("/processes/templates");
    getProcessTypes().then((types) =>
      this.setState({ types: Array.isArray(types) ? types : [] }, () =>
        this.load(),
      ),
    );
  }

  openCreate = (): void => {
    const { process_type_id, types } = this.state;
    const defaultTypeId =
      process_type_id || (types.length > 0 ? String(types[0].id) : "");
    this.setState({
      dialogOpen: true,
      editingId: null,
      form_process_type_id: defaultTypeId,
      form_trigger: "ON_SCHEDULED",
      form_document_template_id: "",
      form_generate_document: false,
      form_send_email: false,
      form_email_to_kind: "",
      form_email_subject_template: "",
      form_email_body_template: "",
      form_custom_email_recipient: "",
    });
  };

  openEdit = (row: ProcessTemplate): void => {
    this.setState({
      dialogOpen: true,
      editingId: row.id,
      form_process_type_id: String(row.process_type),
      form_trigger: row.trigger as TriggerValue,
      form_document_template_id: row.document_template
        ? String(row.document_template)
        : "",
      form_generate_document: row.generate_document,
      form_send_email: row.send_email,
      form_email_to_kind: (row.email_to_kind ?? "") as EmailToKindValue,
      form_email_subject_template: row.email_subject_template ?? "",
      form_email_body_template: row.email_body_template ?? "",
      form_custom_email_recipient: row.custom_email_recipient ?? "",
    });
  };

  closeDialog = (): void => {
    this.setState({
      dialogOpen: false,
      editingId: null,
      form_process_type_id: "",
      form_trigger: "",
      form_document_template_id: "",
      form_generate_document: false,
      form_send_email: false,
      form_email_to_kind: "",
      form_email_subject_template: "",
      form_email_body_template: "",
      form_custom_email_recipient: "",
    });
  };

  handleSave = (): void => {
    const {
      editingId,
      form_process_type_id,
      form_trigger,
      form_document_template_id,
      form_generate_document,
      form_send_email,
      form_email_to_kind,
      form_email_subject_template,
      form_email_body_template,
      form_custom_email_recipient,
    } = this.state;

    if (!form_process_type_id || !form_trigger) return;

    const payload: Partial<ProcessTemplate> = {
      process_type: Number(form_process_type_id),
      trigger: form_trigger,
      document_template: form_document_template_id
        ? Number(form_document_template_id)
        : null,
      generate_document: form_generate_document,
      send_email: form_send_email,
      email_to_kind: form_send_email ? form_email_to_kind || undefined : "",
      email_subject_template: form_send_email
        ? form_email_subject_template || ""
        : "",
      email_body_template: form_send_email
        ? form_email_body_template || ""
        : "",
      custom_email_recipient:
        form_send_email && form_email_to_kind === "CUSTOM"
          ? form_custom_email_recipient || ""
          : "",
    };

    const op =
      editingId != null
        ? updateProcessTemplate(editingId, payload)
        : createProcessTemplate(payload);

    op.then(() => {
      this.closeDialog();
      this.load();
    });
  };

  confirmDelete = (id: number): void => {
    this.setState({ deleteConfirmId: id });
  };

  cancelDelete = (): void => {
    this.setState({ deleteConfirmId: null });
  };

  doDelete = (): void => {
    const { deleteConfirmId } = this.state;
    if (deleteConfirmId == null) return;
    deleteProcessTemplate(deleteConfirmId).then(() => {
      this.setState({ deleteConfirmId: null });
      this.load();
    });
  };

  render(): React.ReactNode {
    const {
      items,
      types,
      docTemplates,
      process_type_id,
      loading,
      error,
      dialogOpen,
      deleteConfirmId,
      editingId,
      form_process_type_id,
      form_trigger,
      form_document_template_id,
      form_generate_document,
      form_send_email,
      form_email_to_kind,
      form_email_subject_template,
      form_email_body_template,
      form_custom_email_recipient,
    } = this.state;

    const selectedType =
      types.find((t) => String(t.id) === form_process_type_id) ?? null;

    return (
      <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
        <Typography variant="h6">Šabloni procesa</Typography>
        <Box
          sx={{
            display: "flex",
            flexWrap: "wrap",
            gap: 2,
            alignItems: "center",
          }}
        >
          <FormControl size="small" sx={{ minWidth: 260 }}>
            <InputLabel>Vrsta obaveze</InputLabel>
            <Select
              value={process_type_id}
              label="Vrsta obaveze"
              onChange={(e) =>
                this.setState(
                  { process_type_id: e.target.value as string },
                  () => this.load(),
                )
              }
            >
              <MenuItem value="">Sve vrste</MenuItem>
              {types.map((t) => (
                <MenuItem key={t.id} value={String(t.id)}>
                  {t.name}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          <Box sx={{ flex: 1 }} />
          <PermissionGate permission="processes.add_processtemplate">
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={this.openCreate}
            >
              Dodaj šablon
            </Button>
          </PermissionGate>
        </Box>
        {error && <Alert severity="error">{error}</Alert>}
        {loading ? (
          <Box sx={{ display: "flex", justifyContent: "center", py: 4 }}>
            <CircularProgress />
          </Box>
        ) : (
          <ScrollableTablePaper>
            <Table size="small" sx={{ width: "100%", tableLayout: "fixed" }}>
              <TableHead>
                <TableRow>
                  <TableCell sx={tableCellEllipsis}>Vrsta obaveze</TableCell>
                  <TableCell sx={tableCellEllipsis}>Trigger</TableCell>
                  <TableCell sx={tableCellEllipsis}>Šablon dokumenta</TableCell>
                  <TableCell sx={tableCellEllipsis}>Dokument</TableCell>
                  <TableCell sx={tableCellEllipsis}>Mejl</TableCell>
                  <TableCell align="right" sx={tableCellEllipsis}>Akcije</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {items.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} align="center">
                      Nema šablona.
                    </TableCell>
                  </TableRow>
                ) : (
                  items.map((row) => (
                    <TableRow key={row.id}>
                      <TableCell sx={tableCellEllipsis}>{row.process_type_name}</TableCell>
                      <TableCell sx={tableCellEllipsis}>{row.trigger}</TableCell>
                      <TableCell sx={tableCellEllipsis}>
                        {row.document_template
                          ? (docTemplates.find(
                              (d) => d.id === row.document_template,
                            )?.name ?? row.document_template)
                          : "—"}
                      </TableCell>
                      <TableCell>
                        {row.generate_document ? "Da" : "Ne"}
                      </TableCell>
                      <TableCell>{row.send_email ? "Da" : "Ne"}</TableCell>
                      <TableCell align="right">
                        <PermissionGate permission="processes.change_processtemplate">
                          <Button
                            size="small"
                            startIcon={<EditIcon />}
                            onClick={() => this.openEdit(row)}
                            sx={{ mr: 1 }}
                          >
                            Izmeni
                          </Button>
                        </PermissionGate>
                        <PermissionGate permission="processes.delete_processtemplate">
                          <Button
                            size="small"
                            color="error"
                            startIcon={<DeleteIcon />}
                            onClick={() => this.confirmDelete(row.id)}
                          >
                            Obriši
                          </Button>
                        </PermissionGate>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </ScrollableTablePaper>
        )}

        <Dialog
          open={dialogOpen}
          onClose={this.closeDialog}
          maxWidth="md"
          fullWidth
        >
          <DialogTitle>
            {editingId != null
              ? "Izmena šablona procesa"
              : "Novi šablon procesa"}
          </DialogTitle>
          <DialogContent>
            <FormControl fullWidth margin="dense">
              <InputLabel>Vrsta obaveze</InputLabel>
              <Select
                value={form_process_type_id}
                label="Vrsta obaveze"
                onChange={(e) =>
                  this.setState({
                    form_process_type_id: e.target.value as string,
                  })
                }
                required
              >
                {types.map((t) => (
                  <MenuItem key={t.id} value={String(t.id)}>
                    {t.name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            {selectedType && (
              <Typography
                variant="body2"
                color="text.secondary"
                sx={{ mt: 0.5 }}
              >
                Subjekt:{" "}
                {selectedType.subject_kind === "EMPLOYEE"
                  ? "Zaposleni"
                  : selectedType.subject_kind === "EQUIPMENT"
                    ? "Oprema"
                    : "Firma"}
              </Typography>
            )}

            <FormControl fullWidth margin="dense">
              <InputLabel>Trigger</InputLabel>
              <Select
                value={form_trigger}
                label="Trigger"
                onChange={(e) =>
                  this.setState({
                    form_trigger: e.target.value as TriggerValue,
                  })
                }
                required
              >
                {TRIGGER_OPTIONS.map((opt) => (
                  <MenuItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            <FormControl fullWidth margin="dense">
              <InputLabel>Šablon dokumenta</InputLabel>
              <Select
                value={form_document_template_id}
                label="Šablon dokumenta"
                onChange={(e) =>
                  this.setState({
                    form_document_template_id: e.target.value as string,
                  })
                }
              >
                <MenuItem value="">—</MenuItem>
                {docTemplates.map((d) => (
                  <MenuItem key={d.id} value={String(d.id)}>
                    {d.name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            <FormControlLabel
              control={
                <Switch
                  checked={form_generate_document}
                  onChange={(e) =>
                    this.setState({
                      form_generate_document: e.target.checked,
                    })
                  }
                />
              }
              label="Generiši dokument"
              sx={{ mt: 1 }}
            />

            <FormControlLabel
              control={
                <Switch
                  checked={form_send_email}
                  onChange={(e) =>
                    this.setState({
                      form_send_email: e.target.checked,
                    })
                  }
                />
              }
              label="Pošalji mejl"
            />

            {form_send_email && (
              <>
                <FormControl fullWidth margin="dense">
                  <InputLabel>Primalac</InputLabel>
                  <Select
                    value={form_email_to_kind}
                    label="Primalac"
                    onChange={(e) =>
                      this.setState({
                        form_email_to_kind: e.target.value as EmailToKindValue,
                      })
                    }
                    required
                  >
                    {EMAIL_TO_OPTIONS.map((opt) => (
                      <MenuItem key={opt.value} value={opt.value}>
                        {opt.label}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>

                {form_email_to_kind === "CUSTOM" && (
                  <TextField
                    margin="dense"
                    label="Prilagođeni email"
                    fullWidth
                    type="email"
                    value={form_custom_email_recipient}
                    onChange={(e) =>
                      this.setState({
                        form_custom_email_recipient: e.target.value,
                      })
                    }
                  />
                )}

                <TextField
                  margin="dense"
                  label="Subject mejla (šablon)"
                  fullWidth
                  value={form_email_subject_template}
                  onChange={(e) =>
                    this.setState({
                      form_email_subject_template: e.target.value,
                    })
                  }
                />
                <TextField
                  margin="dense"
                  label="Telo mejla (Jinja2 / tekst)"
                  fullWidth
                  multiline
                  minRows={4}
                  value={form_email_body_template}
                  onChange={(e) =>
                    this.setState({
                      form_email_body_template: e.target.value,
                    })
                  }
                />
              </>
            )}
          </DialogContent>
          <DialogActions>
            <Button onClick={this.closeDialog}>Odustani</Button>
            <Button
              onClick={this.handleSave}
              variant="contained"
              disabled={!form_process_type_id || !form_trigger}
            >
              Sačuvaj
            </Button>
          </DialogActions>
        </Dialog>

        <Dialog open={deleteConfirmId != null} onClose={this.cancelDelete}>
          <DialogTitle>Obriši šablon procesa?</DialogTitle>
          <DialogActions>
            <Button onClick={this.cancelDelete}>Ne</Button>
            <Button onClick={this.doDelete} color="error" variant="contained">
              Da, obriši
            </Button>
          </DialogActions>
        </Dialog>
      </Box>
    );
  }
}

const Connected = connect<
  null,
  DispatchProps,
  Record<string, never>,
  RootState
>(null, (dispatch: AppDispatch) => ({
  setLastPath: (path: string) => dispatch(setLastPath(path)),
}))(ProcessTemplatesListPageInner);

export default function ProcessTemplatesListPage(): React.ReactElement {
  return <Connected />;
}
