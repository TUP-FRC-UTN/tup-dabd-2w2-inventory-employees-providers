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

    // El metodo para hacer el get del paginado con filtros
    getServices(filters?: {
        page?: number,      // Nro de pagina
        size?: number       // Items en la pagina
        name?: string,      // Nombre del servicio o empresa
        cuit?: string,      // CUIT del servicio (no es CUIL!)
        type?: string,      // Tipo de servicio o empresa
        contact?: string,   // Telefono
        address?: string,   // Direccion, calle, altura, etc.
        enabled?: boolean,  // Borrado logico
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

    // GET BY ID del back
    getServiceById(id: number): Observable<Service> {
    return this.http.get<Service>(`${this.apiUrl}/${id}`);
    }

    // POST del back
    addService(service: Service): Observable<Service> {
    return this.http.post<Service>(this.apiUrl, service);
    }

    // PUT del back
    updateService(service: Service): Observable<Service> {
        return this.http.put<Service>(this.apiUrl, service);
    }

    // DELETE del back
    deleteService(id: number): Observable<void> {
        return this.http.delete<void>(`${this.apiUrl}/${id}`);
    }
}