import { useState, type FC } from "react";
import {
    Box,
    Button,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    TextField,
    IconButton,
    InputAdornment,
    Select,
    MenuItem,
    Typography,
} from "@mui/material";
import CalendarMonthIcon from "@mui/icons-material/CalendarMonth";
import { DateToString, StringToDate } from "../utils/date";

import type { DateTextFieldWithPickerProps } from "../types/components";

const DateTextFieldWithPicker: FC<DateTextFieldWithPickerProps> = ({
    label,
    value,
    onChange,
    defaultYearsAgo,
    minYearsAgo,
    minYearsAgoMessage,
    helperText,
}) => {
    const [open, setOpen] = useState(false);

    const parseDisplayDate = (v: string): Date | null => StringToDate(v);

    const defaultMonth = (): Date => {
        const d = new Date();
        if (defaultYearsAgo != null) {
            d.setFullYear(d.getFullYear() - defaultYearsAgo);
        }
        d.setDate(1);
        return d;
    };

    const [currentMonth, setCurrentMonth] = useState<Date>(() => {
        const parsed = value ? parseDisplayDate(value) : null;
        return parsed ?? defaultMonth();
    });

    const selectedDate = value ? parseDisplayDate(value) : null;

    const handleOpen = (): void => {
        const parsed = value ? parseDisplayDate(value) : null;
        setCurrentMonth(parsed ?? defaultMonth());
        setOpen(true);
    };

    const handleClose = (): void => setOpen(false);

    const handleMonthChange = (delta: number): void => {
        setCurrentMonth((prev) => {
            const year = prev.getFullYear();
            const month = prev.getMonth();
            return new Date(year, month + delta, 1);
        });
    };

    const handleYearChange = (delta: number): void => {
        setCurrentMonth((prev) => {
            const year = prev.getFullYear();
            const month = prev.getMonth();
            return new Date(year + delta, month, 1);
        });
    };

    const handleYearSelect = (newYear: number): void => {
        setCurrentMonth((prev) => new Date(newYear, prev.getMonth(), 1));
    };

    const handleMonthSelect = (newMonth: number): void => {
        setCurrentMonth((prev) => new Date(prev.getFullYear(), newMonth, 1));
    };

    const handleSelectDay = (day: number): void => {
        const year = currentMonth.getFullYear();
        const month = currentMonth.getMonth() + 1;
        const d = new Date(year, month - 1, day);
        if (minYearsAgo != null) {
            const threshold = new Date();
            threshold.setFullYear(threshold.getFullYear() - minYearsAgo);
            if (d > threshold) {
                const msg =
                    minYearsAgoMessage ??
                    `Izabrani datum znači manje od ${minYearsAgo} godina. Da li si siguran?`;
                if (!window.confirm(msg)) {
                    return;
                }
            }
        }
        onChange(DateToString(d));
        setOpen(false);
    };

    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    const startOfMonth = new Date(year, month, 1);
    const dayOfWeek = (startOfMonth.getDay() + 6) % 7;
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    const weeks: (number | null)[][] = [];
    let currentDay = 1 - dayOfWeek;
    for (let w = 0; w < 6; w += 1) {
        const week: (number | null)[] = [];
        for (let d = 0; d < 7; d += 1) {
            if (currentDay < 1 || currentDay > daysInMonth) {
                week.push(null);
            } else {
                week.push(currentDay);
            }
            currentDay += 1;
        }
        weeks.push(week);
    }

    const selectedDay =
        selectedDate?.getDate() === undefined ? null : selectedDate.getDate();
    const selectedMonth =
        selectedDate?.getMonth() === undefined ? null : selectedDate.getMonth();
    const selectedYear =
        selectedDate?.getFullYear() === undefined
            ? null
            : selectedDate.getFullYear();

    const monthNames = [
        "Januar",
        "Februar",
        "Mart",
        "April",
        "Maj",
        "Jun",
        "Jul",
        "Avgust",
        "Septembar",
        "Oktobar",
        "Novembar",
        "Decembar",
    ];

    const currentYear = currentMonth.getFullYear();
    const yearOptions: number[] = [];
    const thisYear = new Date().getFullYear();
    for (let y = thisYear; y >= thisYear - 100; y -= 1) {
        yearOptions.push(y);
    }
    if (!yearOptions.includes(currentYear)) yearOptions.unshift(currentYear);

    const weekdayLabels = ["Po", "Ut", "Sr", "Če", "Pe", "Su", "Ne"];

    return (
        <>
            <TextField
                margin="dense"
                label={label}
                fullWidth
                value={value}
                onClick={handleOpen}
                helperText={helperText}
                slotProps={{
                    inputLabel: { shrink: true },
                    input: {
                        readOnly: true,
                        endAdornment: (
                            <InputAdornment position="end">
                                <IconButton size="small" onClick={handleOpen}>
                                    <CalendarMonthIcon fontSize="small" />
                                </IconButton>
                            </InputAdornment>
                        ),
                    },
                }}
            />
            <Dialog open={open} onClose={handleClose} maxWidth="xs" fullWidth>
                <DialogTitle
                    sx={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        gap: 1,
                        pb: 1,
                    }}
                >
                    <Box sx={{ display: "flex", gap: 0.5 }}>
                        <IconButton
                            size="small"
                            onClick={() => handleYearChange(-1)}
                            title="Prethodna godina"
                        >
                            {"«"}
                        </IconButton>
                        <IconButton
                            size="small"
                            onClick={() => handleMonthChange(-1)}
                            title="Prethodni mesec"
                        >
                            {"‹"}
                        </IconButton>
                    </Box>
                    <Box sx={{ display: "flex", gap: 1, flex: 1, mx: 1 }}>
                        <Select
                            size="small"
                            value={month}
                            onChange={(e) =>
                                handleMonthSelect(Number(e.target.value))
                            }
                            sx={{ flex: 1 }}
                        >
                            {monthNames.map((m, idx) => (
                                <MenuItem key={m} value={idx}>
                                    {m}
                                </MenuItem>
                            ))}
                        </Select>
                        <Select
                            size="small"
                            value={currentYear}
                            onChange={(e) =>
                                handleYearSelect(Number(e.target.value))
                            }
                            MenuProps={{
                                PaperProps: { sx: { maxHeight: 320 } },
                            }}
                            sx={{ width: 100 }}
                        >
                            {yearOptions.map((y) => (
                                <MenuItem key={y} value={y}>
                                    {y}
                                </MenuItem>
                            ))}
                        </Select>
                    </Box>
                    <Box sx={{ display: "flex", gap: 0.5 }}>
                        <IconButton
                            size="small"
                            onClick={() => handleMonthChange(1)}
                            title="Sledeći mesec"
                        >
                            {"›"}
                        </IconButton>
                        <IconButton
                            size="small"
                            onClick={() => handleYearChange(1)}
                            title="Sledeća godina"
                        >
                            {"»"}
                        </IconButton>
                    </Box>
                </DialogTitle>
                <DialogContent>
                    <Box
                        sx={{
                            display: "grid",
                            gridTemplateColumns: "repeat(7, 1fr)",
                            mb: 1,
                        }}
                    >
                        {weekdayLabels.map((d) => (
                            <Typography
                                key={d}
                                variant="caption"
                                align="center"
                                sx={{ fontWeight: 600 }}
                            >
                                {d}
                            </Typography>
                        ))}
                    </Box>
                    <Box
                        sx={{
                            display: "grid",
                            gridTemplateColumns: "repeat(7, 1fr)",
                            rowGap: 0.5,
                        }}
                    >
                        {weeks.flat().map((day, idx) =>
                            day == null ? (
                                <Box key={idx} />
                            ) : (
                                <Button
                                    key={idx}
                                    size="small"
                                    variant={
                                        selectedDay === day &&
                                        selectedMonth === month &&
                                        selectedYear === year
                                            ? "contained"
                                            : "text"
                                    }
                                    onClick={() => handleSelectDay(day)}
                                    sx={{ minWidth: 0, p: 0.5 }}
                                >
                                    {day}
                                </Button>
                            ),
                        )}
                    </Box>
                </DialogContent>
                <DialogActions>
                    <Button onClick={handleClose}>Zatvori</Button>
                </DialogActions>
            </Dialog>
        </>
    );
};

export default DateTextFieldWithPicker;
