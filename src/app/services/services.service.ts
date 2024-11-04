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
    
}