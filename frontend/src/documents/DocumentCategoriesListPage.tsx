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
import { fetchDocumentCategories } from "../store/documentsSlice";
import type { DocumentCategory } from "../types/documents";

interface StateProps {
    categories: DocumentCategory[];
}

interface DispatchProps {
    fetchDocumentCategories: () => void;
}

type Props = StateProps & DispatchProps;

interface State {}

class DocumentCategoriesListPage extends Component<Props, State> {
    componentDidMount(): void {
        this.props.fetchDocumentCategories();
    }

    render() {
        const { categories } = this.props;

        return (
            <Box sx={{ p: 4 }}>
                <Typography variant="h5" gutterBottom>
                    Kategorije dokumenata
                </Typography>
                <Paper>
                    <Table>
                        <TableHead>
                            <TableRow>
                                <TableCell>Šifra</TableCell>
                                <TableCell>Naziv</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {categories.map((cat) => (
                                <TableRow key={cat.id}>
                                    <TableCell>{cat.code}</TableCell>
                                    <TableCell>{cat.name}</TableCell>
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
    categories: state.documents.categories,
});

const mapDispatchToProps: DispatchProps = {
    fetchDocumentCategories,
};

export default connect(
    mapStateToProps,
    mapDispatchToProps,
)(DocumentCategoriesListPage);


