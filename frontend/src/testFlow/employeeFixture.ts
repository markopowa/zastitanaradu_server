import { buildValidJmbg } from "../utils/jmbg";

export interface TestEmployeeFixture {
    first_name: string;
    last_name: string;
    father_name: string;
    national_id: string;
    place_of_birth: string;
    email: string;
    org_unit: string;
    position: string;
    job_role_name: string;
}

export const TEST_OWNER_EMAIL = "markovuckovic1992@gmail.com";

export const TEST_EMPLOYEE_PRIMARY: TestEmployeeFixture = {
    first_name: "Marko",
    last_name: "Petrović",
    father_name: "Stevan",
    national_id: buildValidJmbg("010299071012"),
    place_of_birth: "Niš",
    email: TEST_OWNER_EMAIL,
    org_unit: "Proizvodnja",
    position: "Viljuškarista",
    job_role_name: "Viljuškarista",
};

export const TEST_EMPLOYEE_HIGH_RISK: TestEmployeeFixture = {
    first_name: "Petar",
    last_name: "Jović",
    father_name: "Miloš",
    national_id: buildValidJmbg("150598571001"),
    place_of_birth: "Beograd",
    email: TEST_OWNER_EMAIL,
    org_unit: "Proizvodnja",
    position: "Viljuškarista",
    job_role_name: "Viljuškarista",
};

export const TEST_EMPLOYEE_LOW_RISK: TestEmployeeFixture = {
    first_name: "Ana",
    last_name: "Nikolić",
    father_name: "Dragan",
    national_id: buildValidJmbg("220897571002"),
    place_of_birth: "Novi Sad",
    email: TEST_OWNER_EMAIL,
    org_unit: "Magacin",
    position: "Magacioner",
    job_role_name: "Magacioner",
};

export const TEST_OWNER_NATIONAL_ID = TEST_EMPLOYEE_PRIMARY.national_id;
