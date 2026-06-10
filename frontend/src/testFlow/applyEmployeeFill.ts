import { jmbgToDateString } from "../utils/jmbg";
import type { JobRole } from "../types/processes";
import type { TestEmployeeFixture } from "./employeeFixture";

export interface EmployeeFormFillFields {
    first_name: string;
    last_name: string;
    father_name: string;
    national_id: string;
    date_of_birth: string;
    place_of_birth: string;
    email: string;
    org_unit: string;
    position: string;
    occupation: string;
    high_risk_position_name: string;
    job_role: string;
}

export function employeeFormFillFields(
    fixture: TestEmployeeFixture,
    jobRoles: JobRole[],
): EmployeeFormFillFields {
    const role =
        jobRoles.find((r) => r.name === fixture.job_role_name) ??
        jobRoles.find((r) => r.name === "Viljuškarista") ??
        jobRoles[0];
    const jobRoleName = role?.name ?? fixture.job_role_name;
    return {
        first_name: fixture.first_name,
        last_name: fixture.last_name,
        father_name: fixture.father_name,
        national_id: fixture.national_id,
        date_of_birth: jmbgToDateString(fixture.national_id) ?? "",
        place_of_birth: fixture.place_of_birth,
        email: fixture.email,
        org_unit: fixture.org_unit,
        position: fixture.position,
        occupation: jobRoleName,
        high_risk_position_name: jobRoleName,
        job_role: role ? String(role.id) : "",
    };
}
