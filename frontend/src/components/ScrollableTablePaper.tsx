import { Paper } from "@mui/material";
import type { SxProps, Theme } from "@mui/material";

const DEFAULT_MAX_HEIGHT = "calc(100vh - 220px)";

export const tableCellEllipsis: SxProps<Theme> = {
  overflow: "hidden",
  textOverflow: "ellipsis",
  whiteSpace: "nowrap",
};

interface ScrollableTablePaperProps {
  children: React.ReactNode;
  maxHeight?: string;
  sx?: SxProps<Theme>;
}

export function ScrollableTablePaper({
  children,
  maxHeight = DEFAULT_MAX_HEIGHT,
  sx,
}: ScrollableTablePaperProps): React.ReactElement {
  return (
    <Paper
      sx={{
        overflow: "auto",
        maxHeight,
        width: "100%",
        ...sx,
      }}
    >
      {children}
    </Paper>
  );
}
