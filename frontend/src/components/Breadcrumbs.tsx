import { Breadcrumbs as MuiBreadcrumbs, Link, Typography } from "@mui/material";
import { Link as RouterLink } from "react-router-dom";

export interface BreadcrumbItem {
    label: string;
    path?: string;
}

interface AppBreadcrumbsProps {
    items: BreadcrumbItem[];
}

export function AppBreadcrumbs({ items }: AppBreadcrumbsProps) {
    if (items.length === 0) return null;

    return (
        <MuiBreadcrumbs
            aria-label="putanja"
            sx={{ mb: 1, fontSize: "0.875rem" }}
        >
            {items.map((item, index) => {
                const isLast = index === items.length - 1;
                if (isLast || item.path == null) {
                    return (
                        <Typography
                            key={`${item.label}-${index}`}
                            color="text.primary"
                            variant="body2"
                        >
                            {item.label}
                        </Typography>
                    );
                }
                return (
                    <Link
                        key={`${item.label}-${index}`}
                        component={RouterLink}
                        to={item.path}
                        underline="hover"
                        color="inherit"
                        variant="body2"
                    >
                        {item.label}
                    </Link>
                );
            })}
        </MuiBreadcrumbs>
    );
}
