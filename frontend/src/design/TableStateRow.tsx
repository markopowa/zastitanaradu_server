import { TableCell, TableRow } from "@mui/material";

import { EmptyState } from "./EmptyState";
import { ErrorState } from "./ErrorState";
import { LoadingState } from "./LoadingState";
import type { TableStateRowProps } from "../types/design";

export function TableStateRow({
    colSpan,
    state,
    emptyMessage = "Nema podataka.",
    errorMessage = "Greška pri učitavanju.",
    onRetry,
}: TableStateRowProps) {
    return (
        <TableRow>
            <TableCell colSpan={colSpan} align="center">
                {state === "loading" && <LoadingState />}
                {state === "empty" && <EmptyState message={emptyMessage} />}
                {state === "error" && (
                    <ErrorState message={errorMessage} onRetry={onRetry} />
                )}
            </TableCell>
        </TableRow>
    );
}
