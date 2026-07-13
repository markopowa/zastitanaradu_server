import { Component } from "react";

import {
    Box,
    Link,
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableRow,
} from "@mui/material";
import { enqueueSnackbar } from "notistack";

import { getCompanyGeneratedDocuments } from "../api/processes";
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
}

export class GeneratedDocumentsPanel extends Component<Props, State> {
    state: State = {
        rows: [],
        loading: true,
        error: false,
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

    render() {
        const { rows, loading, error } = this.state;

        return (
            <SectionCard title="Generisani dokumenti">
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
