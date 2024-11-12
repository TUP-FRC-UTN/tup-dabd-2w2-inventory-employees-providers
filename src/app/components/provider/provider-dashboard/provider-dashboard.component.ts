import { Component, OnInit, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormControl, FormGroup, Validators } from '@angular/forms';
import { ProvidersService } from '../../../services/providers.service';
import { Supplier } from '../../../models/suppliers/supplier.model';
import { ToastService, MainContainerComponent } from 'ngx-dabd-grupo01';
import { debounceTime, distinctUntilChanged } from 'rxjs';
import { Chart, ChartConfiguration, ChartData, registerables } from 'chart.js';
import { ProviderDashboardInfoComponent } from './provider-dashboard-info/provider-dashboard-info.component';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { BaseChartDirective } from 'ng2-charts';

Chart.register(...registerables);

@Component({
  selector: 'app-provider-dashboard',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MainContainerComponent,
    BaseChartDirective
  ],
  templateUrl: './provider-dashboard.component.html',
  styleUrls: ['./provider-dashboard.component.css']
})
export class ProviderDashboardComponent implements OnInit {
  @ViewChild(BaseChartDirective) chart?: BaseChartDirective;

  // Form controls
  providerList: Supplier[] = [];
  searchFilterAll = new FormControl('');
  filterForm: FormGroup ;
  showModalFilter = false;

  // KPI metrics
  metrics = {
    activeCount: 0,
    inactiveCount: 0,
    activationRate: 0,
    monthlyGrowthRate: 5.2, // Mock value
    uniqueServicesCount: 0,
    uniqueCompaniesCount: 0,
    avgProvidersPerService: 0,
    avgProvidersPerCompany: 0,
    securityProvidersCount: 0,
    maintenanceProvidersCount: 0,
    gardeningProvidersCount: 0,
    cleaningProvidersCount: 0,
    essentialServicesCount: 0,
    specializedServicesCount: 0
  };

  // Chart configurations
  readonly chartConfigs = {
    pieChart: this.getChartConfig('pie', 'Estado de Proveedores'),
    barChart: this.getChartConfig('bar', 'Distribución por Tipo de Servicio', true),
    doughnutChart: this.getChartConfig('doughnut', 'Distribución de Servicios', false, 'right'),
    horizontalBarChart: this.getChartConfig('horizontalBar', 'Distribución por Zona')
  };

  // Chart data
  pieChartData: ChartData<'pie'> = {
    labels: ['Activos', 'Inactivos'],
    datasets: [{ 
      data: [0, 0],
      backgroundColor: ['#28a745', '#dc3545']
    }]
  };

  barChartData: ChartData<'bar'> = {
    labels: [],
    datasets: [{
      data: [],
      label: 'Cantidad de Proveedores',
      backgroundColor: '#007bff'
    }]
  };

  doughnutChartData: ChartData<'doughnut'> = {
    labels: ['Servicios Esenciales', 'Servicios Especializados'],
    datasets: [{
      data: [0, 0],
      backgroundColor: ['#17a2b8', '#ffc107']
    }]
  };

  horizontalBarChartData: ChartData<'bar'> = {
    labels: ['Zona Norte', 'Zona Sur', 'Zona Este', 'Zona Oeste', 'Zona Central'],
    datasets: [{
      data: [0, 0, 0, 0, 0],
      backgroundColor: '#20c997'
    }]
  };

  constructor(
    private fb: FormBuilder,
    private providerService: ProvidersService,
    private toastService: ToastService,
    private modalService: NgbModal
  ) {
    this.filterForm = this.fb.group({
      serviceName: ['', Validators.maxLength(100)],
      enabled: [''],
      registration: ['']
    });
    this.initializeForm();
    this.setupSearchFilter();
  }

  ngOnInit(): void {
    this.getProviders();
  }

  private initializeFilterForm(): FormGroup {
    return this.fb.group({
      serviceName: ['', Validators.maxLength(100)],
      enabled: [''],
      registration: ['']
    });
  }

  private initializeForm(): void {
    this.filterForm = this.fb.group({
      serviceName: [''],
      enabled: [''],
      registration: ['']
    });
  }

  private setupSearchFilter(): void {
    this.searchFilterAll.valueChanges
      .pipe(
        debounceTime(300),
        distinctUntilChanged()
      )
      .subscribe(searchTerm => {
        this.getProviders(searchTerm || '');
      });
  }

  private getChartConfig(
    type: string, 
    title: string, 
    showAxes = false, 
    legendPosition: 'top' | 'right' = 'top'
  ): ChartConfiguration['options'] {
    const config: ChartConfiguration['options'] = {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { 
          position: legendPosition,
          display: true 
        },
        title: {
          display: true,
          text: title
        }
      }
    };

    if (showAxes) {
      config.scales = {
        x: { 
          title: { display: true, text: 'Servicios' },
          ticks: { maxRotation: 45, minRotation: 45 }
        },
        y: { 
          title: { display: true, text: 'Cantidad' },
          beginAtZero: true,
          ticks: { stepSize: 1 }
        }
      };
    }

    return config;
  }

  getProviders(searchTerm?: string): void {
    const filters = this.getFilters(searchTerm);

    this.providerService.getProviders(filters).subscribe({
      next: (response) => {
        this.providerList = response.content;
        this.calculateMetrics();
        this.updateCharts();
      },
      error: () => {
        this.toastService.sendError('Error al cargar proveedores.');
      }
    });
  }

  private calculateMetrics(): void {
    const metrics = this.metrics;
    
    metrics.activeCount = this.providerList.filter(p => p.enabled).length;
    metrics.inactiveCount = this.providerList.length - metrics.activeCount;
    metrics.activationRate = this.providerList.length > 0 
      ? Math.round((metrics.activeCount / this.providerList.length) * 100)
      : 0;

    // Service-specific counts
    metrics.securityProvidersCount = this.getProvidersCountByService('seguridad');
    metrics.maintenanceProvidersCount = this.getProvidersCountByService('mantenimiento');
    metrics.gardeningProvidersCount = this.getProvidersCountByService('jardinería');
    metrics.cleaningProvidersCount = this.getProvidersCountByService('limpieza');

    console.log(metrics);
    console.log('Estas son las de seguridad', metrics.securityProvidersCount);
    console.log('Estas son las de mantenimiento', metrics.maintenanceProvidersCount);
    console.log('Estas son las de jardineria', metrics.gardeningProvidersCount);
    console.log('Estas son las de limpieza', metrics.cleaningProvidersCount);

    // Unique counts
    const uniqueServices = new Set(this.providerList.map(p => p.service?.name).filter(Boolean));
    const uniqueCompanies = new Set(this.providerList.map(p => p.company?.name).filter(Boolean));


    
    metrics.uniqueServicesCount = uniqueServices.size;
    metrics.uniqueCompaniesCount = uniqueCompanies.size;

    // Essential vs Specialized services
    metrics.essentialServicesCount = 
      metrics.securityProvidersCount + 
      metrics.maintenanceProvidersCount + 
      metrics.cleaningProvidersCount;
    console.log('Estas son las de esenciales', metrics.maintenanceProvidersCount);
    metrics.specializedServicesCount = this.providerList.length - metrics.essentialServicesCount;
    console.log('Estas son las de especializados', metrics.specializedServicesCount);
    // Averages
    metrics.avgProvidersPerService = metrics.uniqueServicesCount > 0
      ? Math.round(this.providerList.length / metrics.uniqueServicesCount)
      : 0;
    metrics.avgProvidersPerCompany = metrics.uniqueCompaniesCount > 0
      ? Math.round(this.providerList.length / metrics.uniqueCompaniesCount)
      : 0;
  }

  private getProvidersCountByService(service: string): number {
    return this.providerList.filter(p => 
      p.service?.name?.toLowerCase().includes(service)
    ).length;
  }

  private updateCharts(): void {
    if (!this.providerList.length) return;

    const metrics = this.metrics;
    
    // Update pie chart
    this.pieChartData.datasets[0].data = [metrics.activeCount, metrics.inactiveCount];
    
    // Update bar chart
    const serviceDistribution = this.getServiceDistribution();
    this.barChartData.labels = Object.keys(serviceDistribution);
    this.barChartData.datasets[0].data = Object.values(serviceDistribution);

    // Update doughnut chart
    this.doughnutChartData.datasets[0].data = [
      metrics.essentialServicesCount,
      metrics.specializedServicesCount
    ];

    // Update horizontal bar chart
    this.horizontalBarChartData.datasets[0].data = this.getZoneDistribution();

    // Force chart update
    this.chart?.update();
  }

  private getServiceDistribution(): { [key: string]: number } {
    return this.providerList.reduce((acc, provider) => {
      const serviceName = provider.service?.name || 'Sin categorizar';
      acc[serviceName] = (acc[serviceName] || 0) + 1;
      return acc;
    }, {} as { [key: string]: number });
  }

  private getZoneDistribution(): number[] {
    const total = this.providerList.length;
    return [
      Math.floor(total * 0.25), // Norte
      Math.floor(total * 0.20), // Sur
      Math.floor(total * 0.15), // Este
      Math.floor(total * 0.20), // Oeste
      Math.floor(total * 0.20)  // Central
    ];
  }

  private getFilters(searchTerm?: string): any {
    const filters = { ...this.filterForm.value };
    
    if (searchTerm) {
      filters.name = searchTerm;
      filters.cuil = searchTerm;
      filters['service.name'] = searchTerm;
      filters['company.name'] = searchTerm;
    }

    return Object.entries(filters)
      .filter(([_, value]) => value !== '' && value != null)
      .reduce((acc, [key, value]) => ({ ...acc, [key]: value }), {});
  }

  // UI Actions
  showInfo(): void {
    this.modalService.open(ProviderDashboardInfoComponent, {
      size: 'lg',
      backdrop: 'static',
      keyboard: false,
      centered: true,
      scrollable: true
    });
  }

  applyFilters(): void {
    this.getProviders();
    this.closeModalFilter();
  }

  clearFilters(): void {
    this.filterForm.reset();
    this.getProviders();
  }

  openModalFilter(): void {
    this.showModalFilter = true;
  }

  closeModalFilter(): void {
    this.showModalFilter = false;
  }
}