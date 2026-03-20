import type { ComponentType } from "react";
import {
    type Location,
    type NavigateFunction,
    useLocation,
    useNavigate,
} from "react-router-dom";

import { setNavigator } from "./navigation";

export interface WithNavigationProps {
    navigate: NavigateFunction;
    location: Location;
}

export const withNavigation = <P extends object>(
    WrappedComponent: ComponentType<P & WithNavigationProps>,
): ComponentType<Omit<P, keyof WithNavigationProps>> => {
    const WithNavigationComponent = (
        props: Omit<P, keyof WithNavigationProps>,
    ) => {
        const navigate = useNavigate();
        const location = useLocation();
        setNavigator(navigate);
        return (
            <WrappedComponent
                {...(props as P)}
                navigate={navigate}
                location={location}
            />
        );
    };

    return WithNavigationComponent;
};
