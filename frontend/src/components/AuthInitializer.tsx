import { Component, type ReactNode } from "react";
import { connect } from "react-redux";

import { loadMe } from "../store/authSlice";

import type {
    AuthInitializerDispatchProps,
    AuthInitializerProps,
    AuthInitializerState,
} from "../types/components";

class AuthInitializer extends Component<
    AuthInitializerProps,
    AuthInitializerState
> {
    componentDidMount(): void {
        void this.props.loadMe();
    }

    render(): ReactNode {
        return this.props.children;
    }
}

const mapDispatchToProps: AuthInitializerDispatchProps = {
    loadMe,
};

export default connect(null, mapDispatchToProps)(AuthInitializer);
