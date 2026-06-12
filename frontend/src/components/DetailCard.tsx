import type { ReactNode } from "react";
import { Avatar, Box, Divider, Paper, Stack, Typography } from "@mui/material";

export interface DetailCardProps {
    title: string;
    icon?: ReactNode;
    action?: ReactNode;
    children: ReactNode;
}

export interface DetailFieldProps {
    label: string;
    value?: ReactNode;
}

export function DetailCard({ title, icon, action, children }: DetailCardProps) {
    return (
        <Paper variant="outlined" sx={{ overflow: "hidden" }}>
            <Box
                sx={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: 1,
                    px: 2,
                    py: 1.5,
                    bgcolor: "background.default",
                }}
            >
                <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                    {icon}
                    <Typography variant="subtitle2" fontWeight={700}>
                        {title}
                    </Typography>
                </Box>
                {action}
            </Box>
            <Divider />
            <Box sx={{ p: 2 }}>{children}</Box>
        </Paper>
    );
}

export function DetailFieldGrid({ children }: { children: ReactNode }) {
    return (
        <Box
            sx={{
                display: "grid",
                gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr" },
                gap: 2,
            }}
        >
            {children}
        </Box>
    );
}

export function DetailField({ label, value }: DetailFieldProps) {
    return (
        <Box sx={{ minWidth: 0 }}>
            <Typography
                variant="caption"
                component="div"
                color="text.secondary"
                sx={{ lineHeight: 1.4, mb: 0.25 }}
            >
                {label}
            </Typography>
            <Typography
                variant="body2"
                component="div"
                sx={{ overflowWrap: "break-word", wordBreak: "break-word" }}
            >
                {value ?? "—"}
            </Typography>
        </Box>
    );
}

export interface DetailHeaderCardProps {
    initials: string;
    title: string;
    subtitle?: ReactNode;
    badges?: ReactNode;
    action?: ReactNode;
}

export function DetailHeaderCard({
    initials,
    title,
    subtitle,
    badges,
    action,
}: DetailHeaderCardProps) {
    return (
        <Paper
            variant="outlined"
            sx={{
                p: 2,
                display: "flex",
                alignItems: { xs: "flex-start", sm: "center" },
                flexDirection: { xs: "column", sm: "row" },
                gap: 2,
                flexWrap: "wrap",
            }}
        >
            <Avatar
                sx={{
                    bgcolor: "primary.main",
                    color: "primary.contrastText",
                    width: 56,
                    height: 56,
                    fontSize: "1.25rem",
                    fontWeight: 700,
                    flexShrink: 0,
                }}
            >
                {initials}
            </Avatar>
            <Box sx={{ flex: 1, minWidth: 0 }}>
                <Typography
                    variant="h6"
                    sx={{ overflowWrap: "break-word", wordBreak: "break-word" }}
                >
                    {title}
                </Typography>
                {subtitle && (
                    <Typography variant="body2" color="text.secondary">
                        {subtitle}
                    </Typography>
                )}
                {badges && (
                    <Stack direction="row" flexWrap="wrap" gap={0.75} mt={0.75}>
                        {badges}
                    </Stack>
                )}
            </Box>
            {action && (
                <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap" }}>
                    {action}
                </Box>
            )}
        </Paper>
    );
}
