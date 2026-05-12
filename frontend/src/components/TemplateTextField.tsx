import { useEffect, useRef } from "react";
import { Box, Chip, Typography, useTheme } from "@mui/material";
import type { SxProps, Theme } from "@mui/material";

export interface TemplateVariable {
    key: string;
    label: string;
}

interface TemplateTextFieldProps {
    value: string;
    onChange: (value: string) => void;
    variables: TemplateVariable[];
    label?: string;
    fullWidth?: boolean;
    multiline?: boolean;
    minRows?: number;
    margin?: "none" | "dense" | "normal";
    sx?: SxProps<Theme>;
}

type Segment = { type: "text"; text: string } | { type: "var"; key: string };

function parseSegments(value: string): Segment[] {
    const regex = /\{\{\s*([\w.]+)\s*\}\}/g;
    const result: Segment[] = [];
    let last = 0;
    let m: RegExpExecArray | null;
    while ((m = regex.exec(value)) !== null) {
        if (m.index > last)
            result.push({ type: "text", text: value.slice(last, m.index) });
        result.push({ type: "var", key: m[1] });
        last = m.index + m[0].length;
    }
    if (last < value.length)
        result.push({ type: "text", text: value.slice(last) });
    return result;
}

function extractValueFromDOM(el: HTMLElement): string {
    let out = "";
    for (const node of el.childNodes) {
        if (node.nodeType === Node.TEXT_NODE) {
            out += node.textContent ?? "";
        } else if (node.nodeType === Node.ELEMENT_NODE) {
            const child = node as HTMLElement;
            const varKey = child.getAttribute("data-var");
            if (varKey) {
                out += `{{ ${varKey} }}`;
            } else if (child.tagName === "BR") {
                out += "\n";
            } else if (child.tagName === "DIV") {
                out += "\n" + extractValueFromDOM(child);
            } else {
                out += extractValueFromDOM(child);
            }
        }
    }
    return out;
}

export default function TemplateTextField({
    value,
    onChange,
    variables,
    label,
    fullWidth,
    multiline,
    minRows = 1,
    margin = "none",
    sx,
}: TemplateTextFieldProps) {
    const theme = useTheme();
    const editorRef = useRef<HTMLDivElement>(null);
    const valueRef = useRef(value);
    const onChangeRef = useRef(onChange);
    const isFocused = useRef(false);
    onChangeRef.current = onChange;

    const getLabel = (key: string) =>
        variables.find((v) => v.key === key)?.label ?? key;

    const createChipSpan = (
        key: string,
        el: HTMLDivElement,
    ): HTMLSpanElement => {
        const span = document.createElement("span");
        span.setAttribute("contenteditable", "false");
        span.setAttribute("data-var", key);
        span.style.cssText =
            "display:inline-flex;align-items:center;background:" +
            theme.palette.primary.main +
            "1a;color:" +
            theme.palette.primary.dark +
            ";border:1px solid " +
            theme.palette.primary.light +
            ";border-radius:12px;padding:1px 4px 1px 8px;margin:0 2px;font-size:0.72rem;line-height:1.6;vertical-align:middle;user-select:none;white-space:nowrap";

        const label = document.createTextNode(getLabel(key));
        span.appendChild(label);

        const btn = document.createElement("button");
        btn.textContent = "✕";
        btn.style.cssText =
            "background:none;border:none;cursor:pointer;padding:0 0 0 3px;font-size:0.65rem;color:" +
            theme.palette.primary.dark +
            ";line-height:1;opacity:0.7";
        btn.addEventListener("mousedown", (e) => {
            e.preventDefault();
            span.remove();
            const v = extractValueFromDOM(el);
            valueRef.current = v;
            onChangeRef.current(v);
        });
        span.appendChild(btn);
        return span;
    };

    const rebuildDOM = (val: string) => {
        const el = editorRef.current;
        if (!el) return;
        el.innerHTML = "";
        const segments = parseSegments(val);
        for (const seg of segments) {
            if (seg.type === "var") {
                el.appendChild(createChipSpan(seg.key, el));
            } else {
                const lines = seg.text.split("\n");
                lines.forEach((line, i) => {
                    if (line) el.appendChild(document.createTextNode(line));
                    if (i < lines.length - 1)
                        el.appendChild(document.createElement("br"));
                });
            }
        }
    };

    useEffect(() => {
        rebuildDOM(value);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    useEffect(() => {
        if (!isFocused.current && value !== valueRef.current) {
            valueRef.current = value;
            rebuildDOM(value);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [value]);

    const handleInput = () => {
        const el = editorRef.current;
        if (!el) return;
        const v = extractValueFromDOM(el);
        valueRef.current = v;
        onChangeRef.current(v);
    };

    const insertVariable = (key: string) => {
        const el = editorRef.current;
        if (!el) return;
        el.focus();
        const chip = createChipSpan(key, el);
        const sel = window.getSelection();
        if (sel && sel.rangeCount > 0) {
            const range = sel.getRangeAt(0);
            if (el.contains(range.commonAncestorContainer)) {
                range.deleteContents();
                range.insertNode(chip);
                range.setStartAfter(chip);
                range.collapse(true);
                sel.removeAllRanges();
                sel.addRange(range);
            } else {
                el.appendChild(chip);
            }
        } else {
            el.appendChild(chip);
        }
        handleInput();
    };

    const mt = margin === "dense" ? 1 : margin === "normal" ? 2 : 0;
    const mb = margin === "dense" ? 0.5 : margin === "normal" ? 1 : 0;

    const minHeight = multiline ? `${minRows * 1.5}em` : "2em";

    return (
        <Box
            sx={[
                { mt, mb, width: fullWidth ? "100%" : undefined },
                ...(Array.isArray(sx) ? sx : sx ? [sx] : []),
            ]}
        >
            <Box
                sx={{
                    display: "flex",
                    flexWrap: "wrap",
                    gap: 0.5,
                    mb: 0.5,
                    alignItems: "center",
                }}
            >
                <Typography
                    variant="caption"
                    color="text.secondary"
                    sx={{ mr: 0.5 }}
                >
                    Ubaci:
                </Typography>
                {variables.map((v) => (
                    <Chip
                        key={v.key}
                        label={v.label}
                        size="small"
                        variant="outlined"
                        color="primary"
                        onClick={() => insertVariable(v.key)}
                        sx={{ cursor: "pointer", fontSize: "0.7rem" }}
                    />
                ))}
            </Box>

            <Box
                sx={{
                    border: `1px solid ${theme.palette.divider}`,
                    borderRadius: 1,
                    pt: label ? "18px" : "8.5px",
                    pb: "8.5px",
                    px: "14px",
                    minHeight,
                    width: fullWidth ? "100%" : undefined,
                    boxSizing: "border-box",
                    position: "relative",
                    "&:focus-within": {
                        borderColor: theme.palette.primary.main,
                        borderWidth: 2,
                        pt: label ? "17px" : "7.5px",
                        pb: "7.5px",
                        px: "13px",
                    },
                    "&:hover:not(:focus-within)": {
                        borderColor: theme.palette.text.primary,
                    },
                }}
            >
                {label && (
                    <Box
                        component="span"
                        sx={{
                            position: "absolute",
                            top: -10,
                            left: 10,
                            px: 0.5,
                            bgcolor: "background.paper",
                            color: "text.secondary",
                            fontSize: "0.75rem",
                            lineHeight: 1,
                            pointerEvents: "none",
                        }}
                    >
                        {label}
                    </Box>
                )}
                <Box
                    ref={editorRef}
                    contentEditable
                    suppressContentEditableWarning
                    onInput={handleInput}
                    onFocus={() => {
                        isFocused.current = true;
                    }}
                    onBlur={() => {
                        isFocused.current = false;
                    }}
                    sx={{
                        outline: "none",
                        minHeight,
                        lineHeight: 1.6,
                        fontSize: "1rem",
                        fontFamily: theme.typography.fontFamily,
                        whiteSpace: multiline ? "pre-wrap" : "nowrap",
                        wordBreak: "break-word",
                        overflowX: multiline ? undefined : "auto",
                        cursor: "text",
                    }}
                />
            </Box>
        </Box>
    );
}
