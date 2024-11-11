import { Company } from "./company.model";

export interface Supplier {
    id: number;
    name: string;
    details: string;
    cuil: string;
    service: string;
    contact: string;
    address: string;
    company: Company;
    registration: string;
    enabled: boolean;
}