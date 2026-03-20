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
    Typography,
} from "@mui/material";
import CalendarMonthIcon from "@mui/icons-material/CalendarMonth";
import { DateToString, StringToDate } from "../utils/date";

import type { DateTextFieldWithPickerProps } from "../types/components";

const DateTextFieldWithPicker: FC<DateTextFieldWithPickerProps> = ({
    label,
    value,
    onChange,
}) => {
    const [open, setOpen] = useState(false);

    const parseDisplayDate = (v: string): Date | null => StringToDate(v);

    const [currentMonth, setCurrentMonth] = useState<Date>(() => {
        const parsed = value ? parseDisplayDate(value) : null;
        return parsed ?? new Date();
    });

    const selectedDate = value ? parseDisplayDate(value) : null;

    const handleOpen = (): void => {
        const parsed = value ? parseDisplayDate(value) : null;
        setCurrentMonth(parsed ?? new Date());
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

    const handleSelectDay = (day: number): void => {
        const year = currentMonth.getFullYear();
        const month = currentMonth.getMonth() + 1;
        const d = new Date(year, month - 1, day);
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

    const monthLabel = currentMonth.toLocaleDateString("sr-RS", {
        month: "long",
        year: "numeric",
    });

    const weekdayLabels = ["Po", "Ut", "Sr", "Če", "Pe", "Su", "Ne"];

    return (
        <>
            <TextField
                margin="dense"
                label={label}
                fullWidth
                value={value}
                onClick={handleOpen}
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
                        pb: 1,
                    }}
                >
                    <IconButton
                        size="small"
                        onClick={() => handleMonthChange(-1)}
                    >
                        {"<"}
                    </IconButton>
                    <Typography variant="subtitle1" component="span">
                        {monthLabel}
                    </Typography>
                    <IconButton
                        size="small"
                        onClick={() => handleMonthChange(1)}
                    >
                        {">"}
                    </IconButton>
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
