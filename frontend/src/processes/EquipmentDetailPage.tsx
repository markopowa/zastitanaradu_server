import { Component, type ReactElement } from "react";
import { useParams } from "react-router-dom";
import { connect } from "react-redux";

import {
    Box,
    Paper,
    Typography,
    CircularProgress,
    Button,
} from "@mui/material";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";

import {
    getEquipmentItem,
    getProcessBindings,
    getProcessRuns,
} from "../api/processes";
import { EntityProcessBindingsPanel } from "../components/EntityProcessBindingsPanel";
import { ErrorState } from "../design";
import { withNavigation } from "../hocs/withNavigation";
import { setLastPath } from "../store/locationSlice";

import type {
    EquipmentDetailPageProps,
    EquipmentDetailPageState,
} from "../types/processPages";

class EquipmentDetailPageInner extends Component<
    EquipmentDetailPageProps,
    EquipmentDetailPageState
> {
    state: EquipmentDetailPageState = {
        item: null,
        bindings: [],
        runs: [],
        loading: true,
        error: null,
    };

    loadProcessData = (id: number): void => {
        Promise.all([
            getProcessBindings({ equipment_item_id: id }),
            getProcessRuns({ equipment_item_id: id }),
        ])
            .then(([bindings, runs]) => {
                this.setState((prev) => ({ ...prev, bindings, runs }));
            })
            .catch(() => {
                this.setState((prev) => ({
                    ...prev,
                    error: "Greška pri učitavanju obaveza.",
                }));
            });
    };

    private applyRouteId(mode: "mount" | "update"): void {
        const id = Number(this.props.id);
        if (!Number.isFinite(id)) {
            if (mode === "update") {
                this.setState((prev) => ({
                    ...prev,
                    loading: false,
                    error: "Neispravan ID.",
                    item: null,
                }));
            } else {
                this.setState((prev) => ({
                    ...prev,
                    loading: false,
                    error: "Neispravan ID.",
                }));
            }
            return;
        }
        if (mode === "mount") {
            this.props.setLastPath(`/equipment/${id}`);
        } else {
            this.setState((prev) => ({ ...prev, loading: true }));
        }
        getEquipmentItem(id)
            .then((item) => {
                this.setState((prev) => ({
                    ...prev,
                    item,
                    loading: false,
                    error: null,
                }));
                this.loadProcessData(id);
            })
            .catch(() =>
                this.setState((prev) => ({
                    ...prev,
                    loading: false,
                    error: "Greška pri učitavanju.",
                })),
            );
    }

    componentDidMount(): void {
        this.applyRouteId("mount");
    }

    componentDidUpdate(prevProps: EquipmentDetailPageProps): void {
        if (prevProps.id !== this.props.id) {
            this.applyRouteId("update");
        }
    }

    render() {
        const { item, bindings, runs, loading, error } = this.state;
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
                    <ErrorState message={error ?? "Oprema nije pronađena."} />
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
                        sx={{
                            m: 0,
                            "& dd": { ml: 2 },
                            "& dt": { fontWeight: 600, mt: 1 },
                        }}
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

                <EntityProcessBindingsPanel
                    subjectKind="EQUIPMENT"
                    subjectLabel={item.name}
                    equipmentItemId={item.id}
                    bindings={bindings}
                    runs={runs}
                    onRefresh={() => this.loadProcessData(item.id)}
                />
            </Box>
        );
    }
}

const mapDispatchToProps = {
    setLastPath,
};

const Connected = connect(null, mapDispatchToProps)(EquipmentDetailPageInner);
const EquipmentDetailWithNavigation = withNavigation(Connected);

export default function EquipmentDetailPage(): ReactElement {
    const { id } = useParams<{ id: string }>();
    return <EquipmentDetailWithNavigation id={id ?? ""} />;
}
