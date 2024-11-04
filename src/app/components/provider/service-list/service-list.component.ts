import { Component, CUSTOM_ELEMENTS_SCHEMA, ElementRef, inject, OnInit, TemplateRef, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormsModule, FormBuilder, FormControl, FormGroup } from '@angular/forms';
import { NgbModal, NgbPaginationModule } from '@ng-bootstrap/ng-bootstrap';
import { Router, RouterModule } from '@angular/router';
import { ServicesService } from '../../../services/services.service';
import { Service } from '../../../models/service.model';
import { ToastService, MainContainerComponent, ConfirmAlertComponent } from 'ngx-dabd-grupo01';
import { debounceTime, distinctUntilChanged } from 'rxjs';

@Component({
  selector: 'app-service-list',
  standalone: true,
  imports: [],
  templateUrl: './service-list.component.html',
  styleUrl: './service-list.component.css'
})
export class ServiceListComponent {

}
