import { Component } from "react";
import { Navigate } from "react-router-dom";
import { connect } from "react-redux";
import { Box, CircularProgress } from "@mui/material";

import type { RootState } from "../store";

interface OwnProps {
    element: React.ReactElement;
}

interface StateProps {
    isAuthenticated: boolean;
    initialized: boolean;
}

type Props = OwnProps & StateProps;

class ProtectedRouteComponent extends Component<Props> {
    render() {
        const { isAuthenticated, initialized, element } = this.props;

        if (!initialized) {
            return (
                <Box
                    sx={{
                        display: "flex",
                        justifyContent: "center",
                        alignItems: "center",
                        minHeight: 200,
                    }}
                >
                    <CircularProgress />
                </Box>
            );
        }

        if (!isAuthenticated) {
            return <Navigate to="/login" replace />;
        }

        return element;
    }
}

const mapStateToProps = (state: RootState): StateProps => ({
    isAuthenticated: state.auth.isAuthenticated,
    initialized: state.auth.initialized,
});

export const ProtectedRoute = connect(mapStateToProps)(ProtectedRouteComponent);
