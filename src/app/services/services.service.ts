import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Service } from '../models/service.model';
import { PaginatedResponse } from '../models/api-response';

@Injectable({
    providedIn: 'root'
  })
export class ServicesService {
    private apiUrl = 'http://localhost:8013/service'; //URL de la API para servicios
    
    constructor(private http: HttpClient) {}

    getServices(filters?: {
        name?: string,
        type?: string,
        enabled?: boolean,
        page?: number,
        size?: number
      }): Observable<PaginatedResponse<Service>> {
        let params = new HttpParams();
      
        if (filters) {
          Object.keys(filters).forEach(key => {
            const value = filters[key as keyof typeof filters];
            if (value !== undefined && value !== '') {
              params = params.append(key, value.toString());
            }
          });
        }
        return this.http.get<PaginatedResponse<Service>>(`${this.apiUrl}/pageable`, { params });
      }
}