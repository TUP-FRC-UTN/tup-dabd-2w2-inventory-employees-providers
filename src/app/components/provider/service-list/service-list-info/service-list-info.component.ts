import { Component } from '@angular/core';
import {NgbActiveModal} from "@ng-bootstrap/ng-bootstrap";

@Component({
  selector: 'app-service-list-info',
  standalone: true,
  imports: [],
  templateUrl: './service-list-info.component.html',
  styleUrl: './service-list-info.component.css'
})
export class ServiceListInfoComponent {
  constructor(public activeModal: NgbActiveModal) {}
}
