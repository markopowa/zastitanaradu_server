import { Component } from "react";
import { connect } from "react-redux";
import {
    Box,
    Paper,
    Typography,
    Table,
    TableHead,
    TableRow,
    TableCell,
    TableBody,
} from "@mui/material";

import type { RootState } from "../store";
import { fetchDocuments } from "../store/documentsSlice";
import type { DocumentFile } from "../types/documents";

interface StateProps {
    documents: DocumentFile[];
}

interface DispatchProps {
    fetchDocuments: () => void;
}

type Props = StateProps & DispatchProps;

interface State {}

class DocumentsListPage extends Component<Props, State> {
    componentDidMount(): void {
        this.props.fetchDocuments();
    }

    render() {
        const { documents } = this.props;

        return (
            <Box sx={{ p: 4 }}>
                <Typography variant="h5" gutterBottom>
                    Dokumenti
                </Typography>
                <Paper>
                    <Table>
                        <TableHead>
                            <TableRow>
                                <TableCell>Naziv</TableCell>
                                <TableCell>Kategorija</TableCell>
                                <TableCell>Datum učitavanja</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {documents.map((doc) => (
                                <TableRow key={doc.id}>
                                    <TableCell>{doc.title}</TableCell>
                                    <TableCell>{doc.category.name}</TableCell>
                                    <TableCell>{doc.uploadedAt}</TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </Paper>
            </Box>
        );
    }
}

const mapStateToProps = (state: RootState): StateProps => ({
    documents: state.documents.documents,
});

const mapDispatchToProps: DispatchProps = {
    fetchDocuments,
};

export default connect(mapStateToProps, mapDispatchToProps)(DocumentsListPage);


