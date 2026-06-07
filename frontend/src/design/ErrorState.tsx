import { Alert, Button } from "@mui/material";

import type { ErrorStateProps } from "../types/design";

export function ErrorState({ message, onRetry }: ErrorStateProps) {
    return (
        <Alert
            severity="error"
            action={
                onRetry != null ? (
                    <Button color="inherit" size="small" onClick={onRetry}>
                        Pokušaj ponovo
                    </Button>
                ) : undefined
            }
        >
            {message}
        </Alert>
    );
}
