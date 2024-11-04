import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Payment } from '../models/payment.model';
import { PaginatedResponse } from '../models/api-response';

@Injectable({
    providedIn: 'root'
  })
export class PaymentService {
    private apiUrl = 'http://localhost:8013/service/payments';

    constructor(private http: HttpClient) {}
    
        // El metodo para hacer el get del paginado con filtros
        getPayments(filters?: {
            page?: number,      // Nro de pagina
            size?: number       // Items en la pagina
            server?: string, 
            start?: Date, 
            end?: Date,
            method?: string,     // Nombre del servicio o empresa
            amount?: number,      // CUIT del servicio (no es CUIL!)
            installmentNumber: number,
            installmentTotal: number,
            enabled?: boolean,  // Borrado logico
          }): Observable<PaginatedResponse<Payment>> {
            let params = new HttpParams();
          
            if (filters) {
              Object.keys(filters).forEach(key => {
                const value = filters[key as keyof typeof filters];
                if (value !== undefined && value !== '') {
                  params = params.append(key, value.toString());
                }
              });
            }
            return this.http.get<PaginatedResponse<Payment>>(`${this.apiUrl}/paged`, { params });
          }
    
}