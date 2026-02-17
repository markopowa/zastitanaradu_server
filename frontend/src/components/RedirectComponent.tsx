import { Component } from "react";
import { Navigate } from "react-router-dom";
import { connect } from "react-redux";

import type { RootState } from "../store";
import { hasPermissionWithPrefix } from "../utils/permissions";
import type { AuthUser } from "../types/auth";
import { paths } from "../locations";

const ALLOWED_HOME_PATHS = new Set<string>([
    paths.profile,
    paths.users,
    paths.roles,
    paths.documents,
    paths.documentCategories,
    paths.trainings,
    paths.trainingSessions,
    paths.trainingAttendance,
    paths.trainingPrograms,
]);

interface StateProps {
    isAuthenticated: boolean;
    initialized: boolean;
    user?: AuthUser;
    lastPath?: string;
}

type Props = StateProps;

class RedirectComponent extends Component<Props> {
    render() {
        const { isAuthenticated, initialized, user, lastPath } = this.props;

        if (!initialized) {
            return null;
        }

        if (!isAuthenticated || !user) {
            return <Navigate to={paths.login} replace />;
        }

        if (lastPath && lastPath !== paths.login && ALLOWED_HOME_PATHS.has(lastPath)) {
            return <Navigate to={lastPath} replace />;
        }

        const permissions = user.permissions ?? [];

        let targetPath: string = paths.profile;
        if (hasPermissionWithPrefix(permissions, "documents.view_document")) {
            targetPath = paths.documents;
        } else if (hasPermissionWithPrefix(permissions, "trainings.view_training")) {
            targetPath = paths.trainings;
        }

        return <Navigate to={targetPath} replace />;
    }
}

const mapStateToProps = (state: RootState): StateProps => ({
    isAuthenticated: state.auth.isAuthenticated,
    initialized: state.auth.initialized,
    user: state.auth.user,
    lastPath: state.location.lastPath,
});

export default connect(mapStateToProps)(RedirectComponent);


