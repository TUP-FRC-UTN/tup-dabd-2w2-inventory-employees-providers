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
  imports: [
    CommonModule,
    ReactiveFormsModule,
    FormsModule,
    RouterModule,
    MainContainerComponent,
    ConfirmAlertComponent,
    NgbPaginationModule
  ],
  templateUrl: './service-list.component.html',
  styleUrls: ['./service-list.component.css'],
  schemas: [CUSTOM_ELEMENTS_SCHEMA]
})
export class ServiceListComponent implements OnInit {

  @ViewChild('servicesTable') servicesTable!: ElementRef;
  @ViewChild('infoModal') infoModal!: TemplateRef<any>;

  serviceList: Service[] = [];
  filteredServices: Service[] = [];
  isLoading = false;

  searchFilterAll = new FormControl('');
  filterForm: FormGroup;

  currentPage: number = 1;
  totalPages: number = 1;
  totalItems: number = 0;
  pageSize: number = 10;

  private serviceService = inject(ServicesService);
  private router = inject(Router);
  private modalService = inject(NgbModal);
  private toastService = inject(ToastService);

  constructor(private fb: FormBuilder) {
    this.filterForm = this.fb.group({
      name: [''],
      provider: [''],
      contact: [''],
      enabled: ['']
    });

    this.searchFilterAll.valueChanges
      .pipe(
        debounceTime(300),
        distinctUntilChanged()
      )
      .subscribe(searchTerm => {
        this.getServices(this.currentPage - 1, this.pageSize, searchTerm || '');
      });
  }

  ngOnInit(): void {
    this.getServices();
  }

  getServices(page: number = 0, size: number = this.pageSize, searchTerm?: string): void {
    this.isLoading = true;

    const filters = {
      ...this.getFilters(),
      page,
      size
    };

    if (searchTerm) {
      filters.name = searchTerm;
      filters.provider = searchTerm;
      filters.contact = searchTerm;
    }

    this.serviceService.getServices(filters).subscribe({
      next: (response) => {
        this.serviceList = response.content;
        this.filteredServices = response.content;
        this.totalItems = response.totalElements;
        this.totalPages = Math.ceil(this.totalItems / this.pageSize);
        this.isLoading = false;
      },
      error: (error) => {
        console.error('Error fetching services:', error);
        this.toastService.sendError('Error al cargar servicios.');
        this.isLoading = false;
      }
    });
  }

  private getFilters(): any {
    const formValues = this.filterForm.value;
    const filters: any = {};

    Object.keys(formValues).forEach(key => {
      const value = formValues[key];
      if (value !== '' && value !== null && value !== undefined) {
        filters[key] = value;
      }
    });

    return filters;
  }
}
