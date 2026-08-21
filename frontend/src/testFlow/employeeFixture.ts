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
export const TEST_OWNER_NATIONAL_ID = buildValidJmbg("010299071012");

export const TEST_EMPLOYEE_PRIMARY: TestEmployeeFixture = {
    first_name: "Marko",
    last_name: "Petrović",
    father_name: "Stevan",
    national_id: TEST_OWNER_NATIONAL_ID,
    place_of_birth: "Niš",
    email: TEST_OWNER_EMAIL,
    org_unit: "Proizvodnja",
    position: "Viljuškarista",
    job_role_name: "Viljuškarista",
};

const FIRST_NAMES = [
    "Marko",
    "Ana",
    "Nikola",
    "Jelena",
    "Milan",
    "Ivana",
    "Stefan",
    "Marija",
    "Luka",
    "Teodora",
];

const LAST_NAMES = [
    "Petrović",
    "Jović",
    "Nikolić",
    "Ilić",
    "Đorđević",
    "Stojanović",
    "Pavlović",
    "Marković",
];

const FATHER_NAMES = [
    "Stevan",
    "Miloš",
    "Dragan",
    "Zoran",
    "Petar",
    "Nemanja",
    "Boško",
];

const CITIES = [
    "Niš",
    "Beograd",
    "Novi Sad",
    "Kragujevac",
    "Subotica",
    "Čačak",
    "Kraljevo",
];

const ORG_UNITS = [
    "Proizvodnja",
    "Magacin",
    "Administracija",
    "Održavanje",
    "Logistika",
];

const POSITIONS = [
    "Viljuškarista",
    "Magacioner",
    "Operater",
    "Administrativni radnik",
    "Mehaničar",
];

function pick<T>(items: readonly T[]): T {
    return items[Math.floor(Math.random() * items.length)]!;
}

let randomEmployeeSeq = 0;

export function randomTestEmployee(): TestEmployeeFixture {
    randomEmployeeSeq += 1;
    const position = pick(POSITIONS);
    const seq = String(randomEmployeeSeq).padStart(3, "0");
    return {
        first_name: pick(FIRST_NAMES),
        last_name: `${pick(LAST_NAMES)} ${randomEmployeeSeq}`,
        father_name: pick(FATHER_NAMES),
        national_id: buildValidJmbg(`010299071${seq}`),
        place_of_birth: pick(CITIES),
        email: TEST_OWNER_EMAIL,
        org_unit: pick(ORG_UNITS),
        position,
        job_role_name: position,
    };
}
