export type TrainingStatus = "ACTIVE" | "EXPIRES_SOON" | "EXPIRED";

export interface Employee {
    id: number;
    first_name: string;
    last_name: string;
    email?: string;
    org_unit?: string;
    position?: string;
}

export interface TrainingType {
    id: number;
    code: string;
    name: string;
    description?: string;
    default_validity_months?: number;
    is_for_high_risk_positions?: boolean;
}

export interface TrainingProgram {
    id: number;
    training_type: number;
    title: string;
    document_file?: number | null;
    created_at?: string;
    updated_at?: string;
}

export interface TrainingSession {
    id: number;
    training_type: number;
    program?: number | null;
    session_date: string;
    location: string;
    instructor: string;
    notes?: string;
}

export interface TrainingAttendance {
    id: number;
    employee: number;
    training_session: number;
    valid_until: string;
    certificate_number?: string;
    passed: boolean;
    notes?: string;
    created_by?: number;
    created_at?: string;
    status?: TrainingStatus;
}

export interface TrainingsState {
    employees: Employee[];
    types: TrainingType[];
    programs: TrainingProgram[];
    sessions: TrainingSession[];
    attendance: TrainingAttendance[];
    dashboardItems: TrainingAttendance[];
    loading: boolean;
    error?: string;
}


