import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { PaginatedResponse } from '../models/api-response';
import { Action, EmployeeAccess } from '../models/employeeAccess';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class EmployeeAssistanceService {
  private readonly httpClient = inject(HttpClient);
  private readonly apiUrl = "http://localhost:8001/access";

  getAllEmployeesPaged(
    page: number = 0,
    size: number = 10,
    filters?: {
      textFilter?: string;//documento del empleado
      fromDate?: string;
      toDate?: string;
      docType?: string; //DNI?
      actionType?: Action; //ENTRY O EXIT
      visitorType?: string; //EMPLOYEE
    }
  ): Observable<AssistancePage<EmployeeAccess>> {
    let params = new HttpParams()
      .set('page', page.toString())
      .set('size', size.toString());
  
    if (filters) {
      if (filters.textFilter) params = params.set('textFilter', filters.textFilter);
      if (filters.fromDate) params = params.set('fromDate', filters.fromDate);
      if (filters.toDate) params = params.set('toDate', filters.toDate);
      params = params.set('documentType', "CUIL");
      if (filters.actionType) params = params.set('actionType', filters.actionType);
      if (filters.visitorType) params = params.set('visitorType', "EMPLOYEE");
    }
  
    return this.httpClient.get<AssistancePage<EmployeeAccess>>(`${this.apiUrl}`, { params });
  }
}

export interface AssistancePage<T> {
  items: T[];
  totalElements:number
}
