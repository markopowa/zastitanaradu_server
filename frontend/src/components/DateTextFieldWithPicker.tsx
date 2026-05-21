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
import { DateToString, StringToDate, todayLocalDate } from "../utils/date";

import type { DateTextFieldWithPickerProps } from "../types/components";

const startOfMonth = (d: Date): Date =>
    new Date(d.getFullYear(), d.getMonth(), 1);

const DateTextFieldWithPicker: FC<DateTextFieldWithPickerProps> = ({
    label,
    value,
    onChange,
    defaultYearsAgo,
    minYearsAgo,
    minYearsAgoMessage,
    allowPast = false,
    allowToday = true,
    helperText,
    error,
}) => {
    const futureOnly = !allowPast;
    const [open, setOpen] = useState(false);

    const parseDisplayDate = (v: string): Date | null => StringToDate(v);

    const defaultMonth = (): Date => {
        const today = todayLocalDate();
        if (futureOnly) {
            return startOfMonth(today);
        }
        const d = new Date();
        if (defaultYearsAgo != null) {
            d.setFullYear(d.getFullYear() - defaultYearsAgo);
        }
        return startOfMonth(d);
    };

    const clampMonth = (d: Date): Date => {
        if (!futureOnly) {
            return d;
        }
        const today = todayLocalDate();
        const min = startOfMonth(today);
        return d.getTime() < min.getTime() ? min : d;
    };

    const [currentMonth, setCurrentMonth] = useState<Date>(() => {
        const parsed = value ? parseDisplayDate(value) : null;
        return clampMonth(parsed ?? defaultMonth());
    });

    const selectedDate = value ? parseDisplayDate(value) : null;

    const handleOpen = (): void => {
        const parsed = value ? parseDisplayDate(value) : null;
        setCurrentMonth(clampMonth(parsed ?? defaultMonth()));
        setOpen(true);
    };

    const handleClose = (): void => setOpen(false);

    const today = todayLocalDate();
    const minMonth = futureOnly ? startOfMonth(today) : null;
    const atMinMonth =
        futureOnly &&
        minMonth != null &&
        startOfMonth(currentMonth).getTime() === minMonth.getTime();

    const handleMonthChange = (delta: number): void => {
        setCurrentMonth((prev) => {
            const next = new Date(
                prev.getFullYear(),
                prev.getMonth() + delta,
                1,
            );
            return clampMonth(next);
        });
    };

    const handleYearChange = (delta: number): void => {
        setCurrentMonth((prev) => {
            const next = new Date(
                prev.getFullYear() + delta,
                prev.getMonth(),
                1,
            );
            return clampMonth(next);
        });
    };

    const handleYearSelect = (newYear: number): void => {
        setCurrentMonth((prev) =>
            clampMonth(new Date(newYear, prev.getMonth(), 1)),
        );
    };

    const handleMonthSelect = (newMonth: number): void => {
        setCurrentMonth((prev) =>
            clampMonth(new Date(prev.getFullYear(), newMonth, 1)),
        );
    };

    const isDayDisabled = (day: number): boolean => {
        const year = currentMonth.getFullYear();
        const month = currentMonth.getMonth();
        const d = new Date(year, month, day);
        if (futureOnly) {
            const isPast = allowToday
                ? d.getTime() < today.getTime()
                : d.getTime() <= today.getTime();
            if (isPast) {
                return true;
            }
        }
        return false;
    };

    const handleSelectDay = (day: number): void => {
        const year = currentMonth.getFullYear();
        const month = currentMonth.getMonth() + 1;
        const d = new Date(year, month - 1, day);
        if (isDayDisabled(day)) {
            return;
        }
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
    const start = new Date(year, month, 1);
    const dayOfWeek = (start.getDay() + 6) % 7;
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
    const thisYear = new Date().getFullYear();
    const yearOptions: number[] = [];
    if (futureOnly) {
        for (let y = thisYear; y <= thisYear + 15; y += 1) {
            yearOptions.push(y);
        }
    } else {
        for (let y = thisYear; y >= thisYear - 100; y -= 1) {
            yearOptions.push(y);
        }
    }
    if (!yearOptions.includes(currentYear)) {
        yearOptions.unshift(currentYear);
        yearOptions.sort((a, b) => a - b);
    }

    const weekdayLabels = ["Po", "Ut", "Sr", "Če", "Pe", "Su", "Ne"];

    return (
        <>
            <TextField
                margin="dense"
                label={label}
                fullWidth
                value={value}
                onClick={handleOpen}
                error={error}
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
                            disabled={atMinMonth}
                            onClick={() => handleYearChange(-1)}
                            title="Prethodna godina"
                        >
                            {"«"}
                        </IconButton>
                        <IconButton
                            size="small"
                            disabled={atMinMonth}
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
                                    disabled={isDayDisabled(day)}
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
