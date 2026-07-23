import { useEffect, useState } from "react";
import { Box, Button, CircularProgress, Stack } from "@mui/material";
import DescriptionIcon from "@mui/icons-material/Description";
import { enqueueSnackbar } from "notistack";

import {
    downloadBzrDocument,
    getBzrDocumentCatalog,
} from "../api/riskAssessment";
import type { BzrDocumentKind } from "../api/riskAssessment";

interface Props {
    clientCompanyId: number;
}

export function BzrDocumentsPanel({ clientCompanyId }: Props) {
    const [kinds, setKinds] = useState<BzrDocumentKind[]>([]);
    const [busy, setBusy] = useState<string | null>(null);

    useEffect(() => {
        void (async () => {
            try {
                setKinds(await getBzrDocumentCatalog());
            } catch {
                enqueueSnackbar("Greška pri učitavanju liste dokumenata.", {
                    variant: "error",
                });
            }
        })();
    }, []);

    const handleDownload = async (k: BzrDocumentKind) => {
        setBusy(k.kind);
        try {
            await downloadBzrDocument(clientCompanyId, k.kind, k.label);
        } catch {
            enqueueSnackbar("Greška pri generisanju dokumenta.", {
                variant: "error",
            });
        } finally {
            setBusy(null);
        }
    };

    return (
        <Box>
            <Stack spacing={1}>
                {kinds.map((k) => (
                    <Button
                        key={k.kind}
                        variant="outlined"
                        startIcon={
                            busy === k.kind ? (
                                <CircularProgress size={16} />
                            ) : (
                                <DescriptionIcon />
                            )
                        }
                        disabled={busy !== null}
                        onClick={() => void handleDownload(k)}
                        sx={{ justifyContent: "flex-start" }}
                    >
                        {k.label}
                    </Button>
                ))}
            </Stack>
        </Box>
    );
}
