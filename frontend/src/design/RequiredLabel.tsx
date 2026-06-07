import { Box } from "@mui/material";

import type { RequiredLabelProps } from "../types/design";

export function RequiredLabel({ text }: RequiredLabelProps) {
    return (
        <>
            {text}{" "}
            <Box component="span" sx={{ color: "error.main" }}>
                *
            </Box>
        </>
    );
}
