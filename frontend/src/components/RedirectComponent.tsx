import { Component } from "react";
import { Navigate } from "react-router-dom";
import { connect } from "react-redux";

import type { RootState } from "../store";
import { hasPermissionWithPrefix } from "../utils/permissions";
import type { AuthUser } from "../types/auth";

interface StateProps {
    isAuthenticated: boolean;
    user?: AuthUser;
}

type Props = StateProps;

class RedirectComponent extends Component<Props> {
    render(): JSX.Element {
        const { isAuthenticated, user } = this.props;

        if (!isAuthenticated || !user) {
            return <Navigate to="/auth/login" replace />;
        }

        const permissions = user.permissions ?? [];

        let targetPath = "/auth/profile";
        if (hasPermissionWithPrefix(permissions, "view_training")) {
            targetPath = "/trainings";
        } else if (hasPermissionWithPrefix(permissions, "view_document")) {
            targetPath = "/documents";
        }

        return <Navigate to={targetPath} replace />;
    }
}

const mapStateToProps = (state: RootState): StateProps => ({
    isAuthenticated: state.auth.isAuthenticated,
    user: state.auth.user,
});

export default connect(mapStateToProps)(RedirectComponent);


