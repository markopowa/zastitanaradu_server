import { Component } from "react";
import { Navigate } from "react-router-dom";
import { connect } from "react-redux";

import type { RootState } from "../store";

interface OwnProps {
    element: JSX.Element;
}

interface StateProps {
    isAuthenticated: boolean;
}

type Props = OwnProps & StateProps;

class ProtectedRouteComponent extends Component<Props> {
    render(): JSX.Element {
        const { isAuthenticated, element } = this.props;

        if (!isAuthenticated) {
            return <Navigate to="/auth/login" replace />;
        }

        return element;
    }
}

const mapStateToProps = (state: RootState): StateProps => ({
    isAuthenticated: state.auth.isAuthenticated,
});

export const ProtectedRoute = connect(mapStateToProps)(ProtectedRouteComponent);

