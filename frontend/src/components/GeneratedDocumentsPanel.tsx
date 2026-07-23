import { Component } from "react";

import {
    Box,
    Button,
    CircularProgress,
    Link,
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableRow,
} from "@mui/material";
import DownloadIcon from "@mui/icons-material/Download";
import { enqueueSnackbar } from "notistack";

import {
    generateCompanyObrazac6All,
    getCompanyGeneratedDocuments,
} from "../api/processes";
import { EmptyState, LoadingState, SectionCard } from "../design";
import { formatDateTimeDisplay } from "../utils/date";

import type { CompanyGeneratedDocumentRow } from "../types/processes";

interface Props {
    clientCompanyId: number;
}

interface State {
    rows: CompanyGeneratedDocumentRow[];
    loading: boolean;
    error: boolean;
    generatingObrazac6All: boolean;
}

export class GeneratedDocumentsPanel extends Component<Props, State> {
    state: State = {
        rows: [],
        loading: true,
        error: false,
        generatingObrazac6All: false,
    };

    componentDidMount(): void {
        this.load();
    }

    componentDidUpdate(prevProps: Props): void {
        if (prevProps.clientCompanyId !== this.props.clientCompanyId) {
            this.load();
        }
    }

    load = (): void => {
        const { clientCompanyId } = this.props;
        this.setState({ loading: true, error: false });
        getCompanyGeneratedDocuments(clientCompanyId)
            .then((rows) => this.setState({ rows, loading: false }))
            .catch(() => {
                this.setState({ loading: false, error: true });
                enqueueSnackbar("Greška pri učitavanju dokumenata.", {
                    variant: "error",
                });
            });
    };

    handleGenerateObrazac6All = (): void => {
        const { clientCompanyId } = this.props;
        this.setState({ generatingObrazac6All: true });
        generateCompanyObrazac6All(clientCompanyId)
            .then(() => {
                this.setState({ generatingObrazac6All: false });
                enqueueSnackbar("Generisano — preuzimanje u toku.", {
                    variant: "success",
                });
                this.load();
            })
            .catch((err: { message?: string }) => {
                this.setState({ generatingObrazac6All: false });
                enqueueSnackbar(
                    err.message ?? "Greška pri generisanju dokumenta.",
                    { variant: "error" },
                );
            });
    };

    render() {
        const { rows, loading, error, generatingObrazac6All } = this.state;

        return (
            <SectionCard
                title="Generisani dokumenti"
                action={
                    <Button
                        size="small"
                        variant="outlined"
                        startIcon={
                            generatingObrazac6All ? (
                                <CircularProgress size={16} />
                            ) : (
                                <DownloadIcon />
                            )
                        }
                        disabled={generatingObrazac6All}
                        onClick={this.handleGenerateObrazac6All}
                    >
                        Generiši Obrazac 6 — svi zaposleni
                    </Button>
                }
            >
                {loading ? (
                    <LoadingState />
                ) : error ? (
                    <EmptyState message="Greška pri učitavanju." />
                ) : rows.length === 0 ? (
                    <EmptyState message="Nema generisanih dokumenata." />
                ) : (
                    <Box sx={{ overflow: "auto" }}>
                        <Table size="small">
                            <TableHead>
                                <TableRow>
                                    <TableCell>Naziv</TableCell>
                                    <TableCell>Predmet</TableCell>
                                    <TableCell>Vrsta obaveze</TableCell>
                                    <TableCell>Datum</TableCell>
                                    <TableCell align="right">
                                        Akcije
                                    </TableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {rows.map((doc) => (
                                    <TableRow key={doc.id}>
                                        <TableCell>{doc.name}</TableCell>
                                        <TableCell>
                                            {doc.subject_label}
                                        </TableCell>
                                        <TableCell>
                                            {doc.process_type_name}
                                        </TableCell>
                                        <TableCell>
                                            {formatDateTimeDisplay(
                                                doc.created_at,
                                            )}
                                        </TableCell>
                                        <TableCell align="right">
                                            <Link
                                                href={doc.file_url}
                                                target="_blank"
                                                rel="noreferrer"
                                            >
                                                Preuzmi
                                            </Link>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </Box>
                )}
            </SectionCard>
        );
    }
}
