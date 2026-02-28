import { connect } from "react-redux";
import type { RootState } from "../store";
import { hasPermission, hasAnyPermission } from "../utils/permissions";

interface StateProps {
    permissions: string[];
}

type Props = StateProps & {
    permission?: string;
    anyOf?: string[];
    children: React.ReactNode;
};

function PermissionGateComponent({
    permissions,
    permission,
    anyOf,
    children,
}: Props): React.ReactNode {
    if (permission != null && !hasPermission(permissions, permission))
        return null;
    if (
        anyOf != null &&
        anyOf.length > 0 &&
        !hasAnyPermission(permissions, anyOf)
    )
        return null;
    return children;
}

const mapStateToProps = (state: RootState): StateProps => ({
    permissions: state.auth.user?.permissions ?? [],
});

export const PermissionGate = connect(mapStateToProps)(PermissionGateComponent);
