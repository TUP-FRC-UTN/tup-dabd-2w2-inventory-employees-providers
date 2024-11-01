import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class ContactService {

  private apiUrl = 'https://localhost:8000/contacts'; //Api URL del enpoint de empleados

  constructor(private http: HttpClient) { }

  getContacts(): Observable<Contact> {
    return this.http.get<Contact>(this.apiUrl);
  }

  updateContact(contact: Contact): Observable<Contact> {
    return this.http.put<Contact>(this.apiUrl, contact);
  }

}
// contact.model.ts
export interface Contact {
  contactValue: string;
  contactType: 'EMAIL' | 'PHONE' | 'OTHER';
}
