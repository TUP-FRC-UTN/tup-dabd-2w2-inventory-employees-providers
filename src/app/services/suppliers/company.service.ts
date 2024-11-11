import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Company } from '../../models/suppliers/company.model';

@Injectable({
  providedIn: 'root'
})
export class CompanyService {

  private apiCompanyUrl = 'http://localhost:8009/suppliers/companies';

  constructor(private http: HttpClient) { }

  getCompanies(): Observable<Company[]> {
    return this.http.get<Company[]>(this.apiCompanyUrl);
  }

  getCompanyById(id: number): Observable<Company> {
    return this.http.get<Company>(`${this.apiCompanyUrl}/${id}`);
  }

  createCompany(company: Company): Observable<Company> {
    return this.http.post<Company>(this.apiCompanyUrl, company);
  }

  updateCompany(id: number, updatedCompany: Partial<Company>): Observable<Company> {
    return this.http.put<Company>(`${this.apiCompanyUrl}/${id}`, updatedCompany);
  }

  deleteCompany(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiCompanyUrl}/${id}`);
  }
}