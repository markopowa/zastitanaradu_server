import { useEffect, useState } from "react";
import { Box, Button, CircularProgress, Typography } from "@mui/material";

import { api } from "../api/client";

interface FilePreviewContentProps {
    url: string;
    label?: string;
}

export function FilePreviewContent({
    url,
    label = "Dokument",
}: FilePreviewContentProps) {
    const lower = url.toLowerCase().split("?")[0];
    const ext = lower.substring(lower.lastIndexOf(".") + 1);
    const isImage = [
        "png",
        "jpg",
        "jpeg",
        "gif",
        "webp",
        "bmp",
        "svg",
    ].includes(ext);
    const isPdf = ext === "pdf";

    const [blobUrl, setBlobUrl] = useState<string | null>(null);
    const [fetchError, setFetchError] = useState(false);

    useEffect(() => {
        if (!isImage && !isPdf) return;
        let revoked = false;
        api.get<Blob>(url, { responseType: "blob" })
            .then((res) => {
                if (revoked) return;
                const objectUrl = URL.createObjectURL(res.data);
                setBlobUrl(objectUrl);
            })
            .catch(() => setFetchError(true));
        return () => {
            revoked = true;
            setBlobUrl((prev) => {
                if (prev) URL.revokeObjectURL(prev);
                return null;
            });
        };
    }, [url, isImage, isPdf]);

    if (fetchError) {
        return (
            <Box sx={{ textAlign: "center", py: 4 }}>
                <Typography variant="body2" color="error" sx={{ mb: 2 }}>
                    Greška pri učitavanju fajla.
                </Typography>
            </Box>
        );
    }

    if (isImage) {
        if (!blobUrl) {
            return (
                <Box sx={{ display: "flex", justifyContent: "center", py: 4 }}>
                    <CircularProgress />
                </Box>
            );
        }
        return (
            <Box
                sx={{
                    display: "flex",
                    justifyContent: "center",
                    maxHeight: "70vh",
                }}
            >
                <img
                    src={blobUrl}
                    alt={label}
                    style={{ maxWidth: "100%", maxHeight: "70vh" }}
                />
            </Box>
        );
    }

    if (isPdf) {
        if (!blobUrl) {
            return (
                <Box sx={{ display: "flex", justifyContent: "center", py: 4 }}>
                    <CircularProgress />
                </Box>
            );
        }
        return (
            <Box sx={{ height: "70vh" }}>
                <iframe
                    src={blobUrl}
                    title={label}
                    style={{ width: "100%", height: "100%", border: "none" }}
                />
            </Box>
        );
    }

    return (
        <Box sx={{ textAlign: "center", py: 4 }}>
            <Typography variant="body2" sx={{ mb: 2 }}>
                Pregled ovog tipa fajla (.{ext || "?"}) nije podržan u
                pretraživaču. Klikni dole da skineš ili otvoriš fajl.
            </Typography>
            <Button
                variant="contained"
                href={url}
                target="_blank"
                rel="noreferrer"
            >
                Otvori / preuzmi fajl
            </Button>
        </Box>
    );
}
