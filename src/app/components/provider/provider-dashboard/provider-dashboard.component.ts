import { Component, Input, OnInit, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormControl, FormGroup, Validators, FormsModule } from '@angular/forms';
import { ProvidersService } from '../../../services/providers.service';
import { Supplier } from '../../../models/suppliers/supplier.model';
import { ToastService, MainContainerComponent } from 'ngx-dabd-grupo01';
import { debounceTime, distinctUntilChanged } from 'rxjs';
import { Chart, ChartConfiguration, ChartData, registerables } from 'chart.js';
import { ProviderDashboardInfoComponent } from './provider-dashboard-info/provider-dashboard-info.component';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { BaseChartDirective } from 'ng2-charts';
import { Company } from '../../../models/suppliers/company.model';
import { Service } from '../../../models/suppliers/service.model';

Chart.register(...registerables);

@Component({
  selector: 'app-provider-dashboard',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MainContainerComponent,
    BaseChartDirective, FormsModule
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
  companies: Company[] = [];
  services: Service[] = [];

  // KPI metrics
  metrics = {
    activeCount: 0,
    inactiveCount: 0,
    activationRate: 0, 
    monthlyGrowthRate: 5.2, // Mock value
    uniqueServicesCount: 0, //servicio unico
    uniqueCompaniesCount: 0,
    avgProvidersPerService: 0, //promedio de proveedores por servicio
    avgProvidersPerCompany: 0,
    securityProvidersCount: 0,
    maintenanceProvidersCount: 0,
    gardeningProvidersCount: 0,
    cleaningProvidersCount: 0,
    essentialServicesCount: 0,
    specializedServicesCount: 0,
    previousCompaniesCount: 0,
    companiesGrowthRate: 0,
    companiesGrowthCount: 0,
    previousProvidersCount: 0,
    providersGrowthCount: 0,
    currentMonthCount: 0,
    activationRateChange: 0,
    //Compañias 
    activeCompaniesCount: 0,
    inactiveCompaniesCount: 0,
    companiesActivationRate: 0,
    companiesActivationRateChange: 0,
    isNegativeTrend: false,
    isNegativeTrendActive: false,
    uniqueSuppliersCount: 0
  };
  previousProviderList: Supplier[] = [];
  previousCompaniesCount: number = 0;

  getMonthName(offset: number = 0): string {
    const date = new Date();
    date.setMonth(date.getMonth() - offset);
    return date.toLocaleString('es', { month: 'long' });
  }
  getGrowthDescription(): string {
    if (this.metrics.providersGrowthCount === 0) {
      return 'Sin cambios respecto al mes anterior';
    }

    if (this.metrics.providersGrowthCount > 0) {
      return `Incremento de ${this.metrics.providersGrowthCount} proveedores`;
    }

    // Caso de disminución
    const decrease = Math.abs(this.metrics.providersGrowthCount);
    return `Disminución de ${decrease} proveedores`;
  }
  // Chart configurations
  readonly chartConfigs = {
    pieChart: this.getChartConfig('pie', 'Estado de Proveedores'),
    barChart: this.getChartConfig('bar', 'Distribución por Tipo de Servicio', true),
    doughnutChart: this.getChartConfig('doughnut', 'Distribución de Servicios', false, 'right'),
    horizontalBarChart: this.getChartConfig('horizontalBar', 'Distribución por Zona'),
    // config para proveedores x compania
    companyBarChart: this.getChartConfig('bar', 'Proveedores por Compañía', true),

    //config proveedores por mes de registro
    monthlyRegistrationChart: this.getChartConfig('bar', 'Registro Mensual de Proveedores', true)
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

  companyBarChartData: ChartData<'bar'> = {
    labels: [],
    datasets: [{
      data: [],
      label: 'Cantidad de Proveedores',
      backgroundColor: '#4CAF50'
    }]
  };

  monthlyRegistrationChartData: ChartData<'bar'> = {
    labels: [],
    datasets: [{
      data: [],
      label: 'Proveedores Registrados',
      backgroundColor: '#3f51b5', // Color índigo para diferenciarlo
      borderRadius: 5 // Bordes redondeados para las barras
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
    //this.getProviders();
    this.getAllProviders();
    this.getCompany();
    this.getServices();
  }

  getCompany(): void {
    this.providerService.getCompany().subscribe({
      next: (response) => {
        console.log('Estas son las compañias', response);
        //this.providerList = response;
        this.companies = response;
        this.calculateMetrics();
        this.updateCharts();
      },
      error: () => {
        this.toastService.sendError('Error al cargar proveedores.');
      }
    });
  }
  getAllProviders(): void {
    this.providerService.getAllProvider().subscribe({
      next: (response) => {
        console.log('Estos son los proveedores', response);
        this.providerList = response;
        this.calculateMetrics();
        this.updateCharts();
      },
      error: () => {
        this.toastService.sendError('Error al cargar proveedores.');
      }
    });
  }
  getServices(): void {
    this.providerService.getServices().subscribe({
      next: (response) => {
        this.services = response;
        this.calculateMetrics();
        this.updateCharts();
      },
      error: () => {
        this.toastService.sendError('Error al cargar servicios.');
      }
    });
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

    // Cálculo de crecimiento
    const currentDate = new Date();
    const currentMonth = currentDate.getMonth();
    const currentYear = currentDate.getFullYear();
    
    // Cálculo de proveedores activos e inactivos
    metrics.activeCount = this.providerList.filter(p => p.enabled).length;
    metrics.inactiveCount = this.providerList.length - metrics.activeCount;
    // Cálculo del porcentaje de activación
    metrics.activationRate = this.providerList.length > 0 
      ? Math.round((metrics.activeCount / this.providerList.length) * 100)
      : 0;

    // Determinar si hay más inactivos que activos (como en empresas)
    this.metrics.isNegativeTrendActive = metrics.inactiveCount > metrics.activeCount;

    // Cálculo del cambio en la tasa de activación (solo para referencia)
    const previousActiveCount = this.previousProviderList.filter(p => p.enabled).length;
    const previousTotalCount = this.previousProviderList.length;
    const previousActivationRate = previousTotalCount > 0 
      ? Math.round((previousActiveCount / previousTotalCount) * 100)
      : 0;
    metrics.activationRateChange = metrics.activationRate - previousActivationRate;

    // Cálculo de proveedores activos e inactivos
    metrics.activeCount = this.providerList.filter(p => p.enabled).length;
    metrics.inactiveCount = this.providerList.length - metrics.activeCount;
    // Cálculo del porcentaje de activación
    metrics.activationRate = this.providerList.length > 0 
      ? Math.round((metrics.activeCount / this.providerList.length) * 100)
      : 0;

    // Calculo de unicas compañias
    const uniqueCompanies = new Set(
      this.companies.map(c => c.name).filter(Boolean)
    );
    metrics.uniqueCompaniesCount = uniqueCompanies.size;

    // Cálculo de empresas activas e inactivas
    metrics.activeCompaniesCount = this.companies.filter(c => c.enabled).length;
    metrics.inactiveCompaniesCount = this.companies.length - metrics.activeCompaniesCount;

    // Cálculo del porcentaje de activación de empresas
    metrics.companiesActivationRate = this.companies.length > 0 
      ? Math.round((metrics.activeCompaniesCount / this.companies.length) * 100)
      : 0;

    metrics.isNegativeTrend = this.metrics.inactiveCompaniesCount > this.metrics.activeCompaniesCount;
    // Cálculo del porcentaje de crecimiento de empresas
    metrics.companiesGrowthCount = metrics.activeCompaniesCount - this.previousCompaniesCount;
    metrics.companiesGrowthRate = this.previousCompaniesCount > 0
      ? Math.round(((metrics.activeCompaniesCount - this.previousCompaniesCount) / this.previousCompaniesCount) * 100)
      : metrics.activeCompaniesCount > 0 ? 100 : 0;

    // Calcular proveedores del mes actual y anterior
    const currentMonthProviders = this.providerList.filter(provider => {
      const regDate = new Date(provider.registration);
      return regDate.getMonth() === currentMonth && 
             regDate.getFullYear() === currentYear;
    });

    // Calcular proveedores del mes anterior
    const previousMonthProviders = this.providerList.filter(provider => {
      const regDate = new Date(provider.registration);
      const isPreviousMonth = currentMonth === 0 
        ? regDate.getMonth() === 11 && regDate.getFullYear() === currentYear - 1
        : regDate.getMonth() === currentMonth - 1 && regDate.getFullYear() === currentYear;
      return isPreviousMonth;
    });

    metrics.currentMonthCount = currentMonthProviders.length;
    metrics.previousProvidersCount = previousMonthProviders.length;
    metrics.providersGrowthCount = currentMonthProviders.length - previousMonthProviders.length;
  
    // Calcular tasa de crecimiento mensual
    metrics.monthlyGrowthRate = previousMonthProviders.length > 0
      ? ((currentMonthProviders.length - previousMonthProviders.length) / previousMonthProviders.length * 100)
      : currentMonthProviders.length > 0 ? 100 : 0;

    const uniqueServicess = new Set(
      this.services.map(p => p.name).filter(Boolean)
    );
    metrics.uniqueServicesCount = uniqueServicess.size;

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
    const uniqueServices = new Set(this.services.map(p => p.name).filter(Boolean));
    metrics.uniqueServicesCount = uniqueServices.size;

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


  getBadgeClass(): string {
    if (this.metrics.providersGrowthCount > 0) {
      return 'bg-success';
    } else if (this.metrics.providersGrowthCount < 0) {
      return 'bg-danger';
    } else {
      return 'bg-secondary';
    }
  }

  getArrowClass(): string {
    if (this.metrics.providersGrowthCount > 0) {
      return 'bi-arrow-up';
    } else if (this.metrics.providersGrowthCount < 0) {
      return 'bi-arrow-down';
    } else {
      return 'bi-dash';
    }
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

      // Actualizar nuevo gráfico de compañías
    const companyDistribution = this.getCompanyDistribution();
    this.companyBarChartData.labels = Object.keys(companyDistribution);
    this.companyBarChartData.datasets[0].data = Object.values(companyDistribution);

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

  // Suppliers x Compania

  //metodo para calcular
  private getCompanyDistribution(): { [key: string]: number } {
    return this.providerList.reduce((acc, provider) => {
      const companyName = provider.company?.name || 'Sin compañía';
      acc[companyName] = (acc[companyName] || 0) + 1;
      return acc;
    }, {} as { [key: string]: number });
  }
  
  // Supplierx x mes de registro
  //metodo para calcular la distribución por mes
  private getMonthlyRegistrationDistribution(): { [key: string]: number } {
    // Ordenar los proveedores por fecha de registro
    const sortedProviders = [...this.providerList].sort((a, b) => {
      return new Date(a.registration).getTime() - new Date(b.registration).getTime();
    });
  
    // Crear objeto con la distribución
    const distribution = sortedProviders.reduce((acc, provider) => {
      const date = new Date(provider.registration);
      // Formatear la fecha como "MMM YYYY" (ej: "Nov 2024")
      const monthYear = date.toLocaleDateString('es', { 
        month: 'short', 
        year: 'numeric'
      });
      
      acc[monthYear] = (acc[monthYear] || 0) + 1;
      return acc;
    }, {} as { [key: string]: number });
  
    // Ordenar las entradas por fecha
    return Object.fromEntries(
      Object.entries(distribution).sort((a, b) => {
        const dateA = new Date(a[0]);
        const dateB = new Date(b[0]);
        return dateA.getTime() - dateB.getTime();
      })
    );
  }
}