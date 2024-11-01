import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class AdressService {

  private apiUrl = 'http://localhost:3000'; //Url de Address
  constructor(private http: HttpClient) { }

  getAdress() : Observable<Address> {
    return this.http.get<Address>(this.apiUrl);
  }

  updateAddress(address: Address): Observable<Address> {
    return this.http.put<Address>(this.apiUrl, address);
  }
}
export interface Address {
  id: number;
  street: string;
  city: string;
  state: string;
  zipCode: string;
}
