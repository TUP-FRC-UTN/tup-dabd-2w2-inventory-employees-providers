import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Supplier } from '../models/suppliers/supplier.model';
import { PaginatedResponse } from '../models/api-response';

@Injectable({
  providedIn: 'root'
})
export class ProvidersService {
  private apiUrl = 'http://localhost:8013/suppliers';

  constructor(private http: HttpClient) {}

  getProviders(filters?: {
    page?: number,
    size?: number
    name?: string,
    cuil?: string,
    contact?: string,
    address?: string,
    enabled?: boolean,
    'company.name'?: string,
    'service.name'?: string,
    start?: string,
    end?: string
}): Observable<PaginatedResponse<Supplier>> {
    let params = new HttpParams();
  
    if (filters) {
      Object.keys(filters).forEach(key => {
        const value = filters[key as keyof typeof filters];
        // Verificación especial para fechas
        if (value !== undefined && value !== '' && value !== null) {
          // Para fechas, asegurarse de que sean fechas válidas
          if ((key === 'start' || key === 'end') && !this.isValidDate(value as string)) {
            return;
          }
          params = params.append(key, value.toString());
        }
      });
    }
    return this.http.get<PaginatedResponse<Supplier>>(`${this.apiUrl}/pageable`, { params });
}

// Método auxiliar para validar fechas
private isValidDate(dateString: string): boolean {
  const date = new Date(dateString);
  return date instanceof Date && !isNaN(date.getTime());
}

  getProviderById(id: number): Observable<Supplier> {
    return this.http.get<Supplier>(`${this.apiUrl}/${id}`);
  }

  addProvider(provider: Supplier): Observable<Supplier> {
    return this.http.post<Supplier>(this.apiUrl, provider);
  }
  
  updateProvider(provider: Supplier): Observable<Supplier> {
    return this.http.put<Supplier>(this.apiUrl, provider);
  }
  
  
  deleteProvider(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`);
  }
}
