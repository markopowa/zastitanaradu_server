import { Component } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  Box,
  Paper,
  Typography,
  CircularProgress,
  Alert,
  Button,
} from "@mui/material";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";

import { getEquipmentItem } from "../api/processes";
import type { EquipmentItem } from "../types/processes";
import { useDispatch } from "react-redux";
import type { AppDispatch } from "../store";
import { setLastPath } from "../store/locationSlice";

interface Props {
  id: string;
  navigate: (path: string) => void;
  setLastPath: (path: string) => void;
}

interface State {
  item: EquipmentItem | null;
  loading: boolean;
  error: string | null;
}

class EquipmentDetailPageInner extends Component<Props, State> {
  state: State = { item: null, loading: true, error: null };

  componentDidMount(): void {
    const id = Number(this.props.id);
    if (!Number.isFinite(id)) {
      this.setState({ loading: false, error: "Neispravan ID." });
      return;
    }
    this.props.setLastPath(`/equipment/${id}`);
    getEquipmentItem(id)
      .then((item) => this.setState({ item, loading: false, error: null }))
      .catch(() =>
        this.setState({ loading: false, error: "Greška pri učitavanju." }),
      );
  }

  componentDidUpdate(prevProps: Props): void {
    if (prevProps.id !== this.props.id) {
      const id = Number(this.props.id);
      if (!Number.isFinite(id)) {
        this.setState({ loading: false, error: "Neispravan ID.", item: null });
        return;
      }
      this.setState({ loading: true });
      getEquipmentItem(id)
        .then((item) => this.setState({ item, loading: false, error: null }))
        .catch(() =>
          this.setState({ loading: false, error: "Greška pri učitavanju." }),
        );
    }
  }

  render(): React.ReactNode {
    const { item, loading, error } = this.state;
    const { navigate } = this.props;

    if (loading) {
      return (
        <Box sx={{ display: "flex", justifyContent: "center", py: 4 }}>
          <CircularProgress />
        </Box>
      );
    }
    if (error || !item) {
      return (
        <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
          <Alert severity="error">{error ?? "Oprema nije pronađena."}</Alert>
          <Button
            startIcon={<ArrowBackIcon />}
            onClick={() => navigate("/equipment")}
          >
            Nazad
          </Button>
        </Box>
      );
    }

    return (
      <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
        <Button
          startIcon={<ArrowBackIcon />}
          onClick={() => navigate("/equipment")}
          sx={{ alignSelf: "flex-start" }}
        >
          Nazad
        </Button>
        <Paper sx={{ p: 3 }}>
          <Typography variant="h6" gutterBottom>
            {item.name}
          </Typography>
          <Box
            component="dl"
            sx={{ m: 0, "& dd": { ml: 2 }, "& dt": { fontWeight: 600, mt: 1 } }}
          >
            <dt>Kategorija</dt>
            <dd>{item.category ?? "—"}</dd>
            <dt>Inventarski broj</dt>
            <dd>{item.inventory_number ?? "—"}</dd>
            <dt>Lokacija</dt>
            <dd>{item.location ?? "—"}</dd>
            {item.notes && (
              <>
                <dt>Beleške</dt>
                <dd>{item.notes}</dd>
              </>
            )}
            <dt>Aktivna</dt>
            <dd>{item.is_active ? "Da" : "Ne"}</dd>
          </Box>
        </Paper>
      </Box>
    );
  }
}
export default function EquipmentDetailPage(): React.ReactElement {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const dispatch = useDispatch<AppDispatch>();

  const setLastPathProp = (path: string) => dispatch(setLastPath(path));

  return (
    <EquipmentDetailPageInner
      id={id ?? ""}
      navigate={navigate}
      setLastPath={setLastPathProp}
    />
  );
}
