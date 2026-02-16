export type TrainingStatus = "ACTIVE" | "EXPIRES_SOON" | "EXPIRED";

export interface TrainingType {
    id: string;
    code: string;
    name: string;
    description?: string;
    defaultValidityMonths?: number;
    isForHighRiskPositions?: boolean;
}

export interface TrainingProgram {
    id: string;
    trainingTypeId: string;
    title: string;
    documentFileId?: string;
}

export interface TrainingSession {
    id: string;
    trainingTypeId: string;
    programId?: string;
    sessionDate: string;
    location: string;
    instructor: string;
    notes?: string;
}

export interface TrainingAttendance {
    id: string;
    employeeId: string;
    trainingSessionId: string;
    validUntil: string;
    certificateNumber?: string;
    passed: boolean;
    notes?: string;
    status: TrainingStatus;
}

export interface TrainingsState {
    types: TrainingType[];
    programs: TrainingProgram[];
    sessions: TrainingSession[];
    attendance: TrainingAttendance[];
    dashboardItems: TrainingAttendance[];
    loading: boolean;
    error?: string;
}


