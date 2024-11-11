import { Component, CUSTOM_ELEMENTS_SCHEMA, ElementRef, inject, OnInit, TemplateRef, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormControl, FormGroup } from '@angular/forms';
import { ProvidersService } from '../../../services/providers.service';
import { Supplier } from '../../../models/suppliers/supplier.model';
import { ToastService, MainContainerComponent } from 'ngx-dabd-grupo01';
import { debounceTime, distinctUntilChanged } from 'rxjs';
import { Chart, ChartType, registerables } from 'chart.js';
import { ProviderDashboardInfoComponent } from './provider-dashboard-info/provider-dashboard-info.component';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';

Chart.register(...registerables);

@Component({
  selector: 'app-provider-dashboard',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MainContainerComponent
  ],
  templateUrl: './provider-dashboard.component.html',
  styleUrls: ['./provider-dashboard.component.css'],
  schemas: [CUSTOM_ELEMENTS_SCHEMA]
})
export class ProviderDashboardComponent implements OnInit {
  @ViewChild('pieChart') pieChartRef!: ElementRef;

  providerList: Supplier[] = [];
  searchFilterAll = new FormControl('');
  filterForm: FormGroup;

  showModalFilter: boolean = false;

  serviceTypes: string[] = []; // Array para almacenar los tipos de servicio
  private modalService = inject(NgbModal);


  activeCount: number = 0;
  inactiveCount: number = 0;
  pieChart!: Chart;
  barChart: any;
  serviceCountMap: { [key: string]: number } = {};

  private providerService = inject(ProvidersService);
  private toastService = inject(ToastService);

  constructor(private fb: FormBuilder) {
    this.filterForm = this.fb.group({
      name: [''],
      cuil: [''],
      'service.name': [''],
      'company.name': [''],
      contact: [''],
      enabled: ['']
    });

    this.searchFilterAll.valueChanges
      .pipe(
        debounceTime(300),
        distinctUntilChanged()
      )
      .subscribe(searchTerm => {
        this.getProviders(searchTerm || '');
      });
  }

  ngOnInit(): void {
    this.getProviders();
    
  }

  getProviders(searchTerm?: string): void {
    const filters = { ...this.getFilters() };

    if (searchTerm) {
      filters.name = searchTerm;
      filters.cuil = searchTerm;
      filters['service.name'] = searchTerm;
      filters['company.name'] = searchTerm;
      filters.contact = searchTerm;
    }

    this.providerService.getProviders(filters).subscribe({
      next: (response) => {
        this.providerList = response.content;
        this.calculateMetrics();
        this.createPieChart();
        this.createBarChart();
      },
      error: () => {
        this.toastService.sendError('Error al cargar proveedores.');
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

  applyFilters(): void {
    this.getProviders();
    this.closeModalFilter();
  }

  clearFilters(): void {
    this.filterForm.reset();
    this.getProviders();
  }

  calculateMetrics(): void {
    this.activeCount = this.providerList.filter(provider => provider.enabled === true).length;
    this.inactiveCount = this.providerList.filter(provider => provider.enabled === false).length;

    this.serviceCountMap = this.providerList.reduce((acc, provider) => {
      const serviceName = provider.service?.name || 'Sin servicio';
      acc[serviceName] = (acc[serviceName] || 0) + 1;
      return acc;
    }, {} as { [key: string]: number });
  }

  createPieChart(): void {
    if (this.pieChart) {
      this.pieChart.destroy();
    }

    this.pieChart = new Chart(this.pieChartRef.nativeElement, {
      type: 'pie' as ChartType,
      data: {
        labels: ['Activos', 'Inactivos'],
        datasets: [{
          data: [this.activeCount, this.inactiveCount],
          backgroundColor: ['#28a745', '#dc3545']
        }]
      },
      options: {
        responsive: true,
        plugins: {
          legend: { position: 'top' }
        }
      }
    });
  }

  createBarChart(): void {
    if (this.barChart) {
      this.barChart.destroy();
    }

    const ctx = document.getElementById('barChart') as HTMLCanvasElement;
    const serviceTypes = Object.keys(this.serviceCountMap);
    const serviceCounts = Object.values(this.serviceCountMap);

    this.barChart = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: serviceTypes,
        datasets: [{
          label: 'Cantidad de Proveedores',
          data: serviceCounts,
          backgroundColor: '#007bff'
        }]
      },
      options: {
        responsive: true,
        plugins: { legend: { display: false } },
        scales: {
          x: { title: { display: true, text: 'Tipo de Servicio' } },
          y: { title: { display: true, text: 'Cantidad' }, beginAtZero: true }
        }
      }
    });
  }
  showInfo(): void {
    this.modalService.open(ProviderDashboardInfoComponent, {
      size: 'lg',
      backdrop: 'static',
      keyboard: false,
      centered: true,
      scrollable: true
    });
  }
  openModalFilter(): void {
    this.showModalFilter = true;
  }

  closeModalFilter(): void {
    this.showModalFilter = false;
  }
}
