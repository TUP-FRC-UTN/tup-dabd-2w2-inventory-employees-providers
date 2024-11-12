import { Component, OnInit, ViewChild, ElementRef, inject, ChangeDetectorRef, AfterViewInit } from '@angular/core';
import { FormBuilder, FormControl, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { CommonModule, DecimalPipe } from '@angular/common';
import { Chart, ChartType, registerables } from 'chart.js';
import { ToastService, MainContainerComponent } from 'ngx-dabd-grupo01';
import { forkJoin, map } from 'rxjs';
import { debounceTime, distinctUntilChanged } from 'rxjs';
import { Employee, EmployeeType, StatusType, EmployeePayment } from '../../../models/employee.model';
import { EmployeesService } from '../../../services/employees.service';
import { MapperService } from '../../../services/MapperCamelToSnake/mapper.service';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { EmployeeDashboardInfoComponent } from './employe-dashboard-info/employee-dashboard-info.component';
import { ChartDataset, ChartOptions } from 'chart.js';

Chart.register(...registerables);

@Component({
  selector: 'app-employee-dashboard',
  standalone: true,
  imports: [MainContainerComponent, CommonModule, ReactiveFormsModule],
  providers: [DecimalPipe],
  templateUrl: './employee-dashboard.component.html',
  styleUrls: ['./employee-dashboard.component.scss']
})
export class EmployeeDashboardComponent implements OnInit, AfterViewInit {
  @ViewChild('pieChart') pieChart!: ElementRef<HTMLCanvasElement>;
  @ViewChild('barChart') barChart!: ElementRef<HTMLCanvasElement>;
  @ViewChild('lineChart') lineChart!: ElementRef<HTMLCanvasElement>;
  @ViewChild('salaryChart') salaryChart!: ElementRef<HTMLCanvasElement>;
  @ViewChild('employeeCategoryChartRef') employeeCategoryChartRef!: ElementRef;

  // KPI Variables
  employeeList: Employee[] = [];
  employeesHiredLastMonth: number = 0;
  inServiceCount: number = 0;
  inactiveCount: number = 0;
  averageSalary: number = 0;
  totalPayroll: number = 0;
  employeesByType: Map<string, number> = new Map();
  retentionRate: number = 0;
  avgTenure: number = 0;
  private dataLoaded = false;
  // Form Controls
  filterForm: FormGroup;
  searchFilterAll = new FormControl('');
  
  // Charts
  charts: any = {};
  employeeTypesBar = Object.values(EmployeeType);
  employeeTypeCountMap: { [key: string]: number } = {};
  employeeCategoryData: { [key: string]: number } = {};
  
  
  // Chart Config
  pieChartEmployeeStatusLabels: string[] = ['En Servicio', 'Inactivo'];
  pieChartEmployeeStatusDatasets: ChartDataset<'pie', number[]>[] = [
    {
      data: [],
      backgroundColor: ['#28a745', '#dc3545']
    }
  ];

  pieChartOptions: ChartOptions<'pie'> = {
    responsive: true,
    plugins: {
      legend: { position: 'top' }
    }
  };

  // Service Injections
  private employeesService = inject(EmployeesService);
  private toastService = inject(ToastService);
  private mapperService = inject(MapperService);
  private modalService = inject(NgbModal);

  constructor(
    private fb: FormBuilder,
    private cdr: ChangeDetectorRef
  ) {
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
        this.getEmployees(searchTerm || '');
      });
  }

  ngOnInit(): void {
    // Solo cargamos los datos una vez
    if (!this.dataLoaded) {
      this.loadEmployeeData();
    }
  }
  ngAfterViewInit(): void {
    // Ya no llamamos a loadEmployeeData aquí
    // Solo aseguramos que los gráficos se inicialicen cuando haya datos
    this.cdr.detectChanges();
  }

  loadDashboardData(): void {
    this.employeesService.getEmployees().subscribe(employees => {
      this.employeeList = employees;
      this.calculateKPIs();
      this.initializeCharts();
    });
    this.loadPayrollData();
  }

  getEmployees(searchTerm?: string): void {
    const filters = { ...this.getFilters() };
  
    if (searchTerm) {
      filters.name = searchTerm;
      filters.cuil = searchTerm;
      filters['service.name'] = searchTerm;
      filters['company.name'] = searchTerm;
      filters.contact = searchTerm;
    }
  
    this.employeesService.getAllEmployeesPaged().subscribe({
      next: (response) => {
        this.employeeList = this.mapperService.toCamelCase(response.content);
        this.calculateMetrics();
        this.pieChartEmployeeStatusDatasets[0].data = [this.inServiceCount, this.inactiveCount];
        // Reinicializar los charts después de actualizar los datos
        setTimeout(() => {
          this.initializeCharts();
        });
      },
      error: () => {
        this.toastService.sendError('Error al cargar empleados.');
      }
    });
  }

  calculateKPIs(): void {
    const now = new Date();
    const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);

    this.inServiceCount = this.employeeList.filter(e => e.state === StatusType.ACTIVE).length;
    this.inactiveCount = this.employeeList.filter(e => e.state === StatusType.INACTIVE).length;
    
    this.employeesHiredLastMonth = this.employeeList.filter(e => {
      const hiringDate = new Date(e.hiringDate);
      return hiringDate >= lastMonth && hiringDate <= now;
    }).length;

    this.averageSalary = this.employeeList.reduce((acc, emp) => acc + emp.salary, 0) / this.employeeList.length;
    this.totalPayroll = this.employeeList.reduce((acc, emp) => acc + emp.salary, 0);
    this.retentionRate = (this.inServiceCount / this.employeeList.length) * 100;
    this.avgTenure = this.calculateAverageTenure();
    this.calculateEmployeesByType();
  }

  calculateMetrics(): void {
    const oneMonthAgo = new Date();
    oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);

    this.employeesHiredLastMonth = this.employeeList.filter(
      (employee) => new Date(employee.hiringDate) >= oneMonthAgo
    ).length;

    this.inServiceCount = this.employeeList.filter(e => e.state === 'IN_SERVICE').length;
    this.inactiveCount = this.employeeList.filter(e => e.state === 'DOWN').length;

    // Reiniciar el mapa de conteo por tipo
    this.employeeTypeCountMap = {};
    Object.values(EmployeeType).forEach(type => {
      this.employeeTypeCountMap[type] = 0;
    });
  
    this.employeeList.forEach(employee => {
      if (employee.employeeType) {
        this.employeeTypeCountMap[employee.employeeType] = 
          (this.employeeTypeCountMap[employee.employeeType] || 0) + 1;
      }
    });

    // Actualizar también el Map de employeesByType
    this.employeesByType.clear();
    Object.entries(this.employeeTypeCountMap).forEach(([type, count]) => {
      this.employeesByType.set(type, count);
    });

    // Calcular otros KPIs
    if (this.employeeList.length > 0) {
      this.averageSalary = this.employeeList.reduce((acc, emp) => acc + emp.salary, 0) / this.employeeList.length;
      this.totalPayroll = this.employeeList.reduce((acc, emp) => acc + emp.salary, 0);
      this.retentionRate = (this.inServiceCount / this.employeeList.length) * 100;
      this.avgTenure = this.calculateAverageTenure();
    }
  }


  calculateAverageTenure(): number {
    const now = new Date();
    const tenures = this.employeeList.map(emp => {
      const hiringDate = new Date(emp.hiringDate);
      return (now.getTime() - hiringDate.getTime()) / (1000 * 60 * 60 * 24 * 365);
    });
    return tenures.reduce((acc, curr) => acc + curr, 0) / tenures.length;
  }

  calculateEmployeesByType(): void {
    Object.values(EmployeeType).forEach(type => {
      const count = this.employeeList.filter(emp => emp.employeeType === type).length;
      this.employeesByType.set(type, count);
    });
  }

  loadPayrollData(): void {
    const paymentRequests = this.employeeList.map(emp => 
      this.employeesService.getEmployeePayments(emp.id)
    );

    forkJoin(paymentRequests).subscribe(allPayments => {
      this.initializePayrollChart(allPayments.flat());
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

  showInfo(): void {
    this.modalService.open(EmployeeDashboardInfoComponent, {
      size: 'lg',
      backdrop: 'static',
      keyboard: false,
      centered: true,
      scrollable: true
    });
  }

  initializeCharts(): void {
    if (this.pieChart && this.barChart && this.lineChart) {
      // Destruir charts existentes si los hay
      if (Chart.getChart(this.pieChart.nativeElement)) {
        Chart.getChart(this.pieChart.nativeElement)?.destroy();
      }
      if (Chart.getChart(this.barChart.nativeElement)) {
        Chart.getChart(this.barChart.nativeElement)?.destroy();
      }
      if (Chart.getChart(this.lineChart.nativeElement)) {
        Chart.getChart(this.lineChart.nativeElement)?.destroy();
      }
  
      this.initializeStatusPieChart();
      this.initializeEmployeeTypeChart();
      this.initializeTenureDistributionChart();
    }
  }

  createPieChart(): void {
    if (this.pieChart) {
      const chart = Chart.getChart(this.pieChart.nativeElement);
      if (chart) {
        chart.destroy();
      }
    }

    new Chart(this.pieChart.nativeElement, {
      type: 'pie',
      data: {
        labels: ['Activos', 'Inactivos'],
        datasets: [{
          data: [this.inServiceCount, this.inactiveCount],
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
    if (!this.barChart) return;
    
    const existingChart = Chart.getChart(this.barChart.nativeElement);
    if (existingChart) {
      existingChart.destroy();
    }
  
    const labels = Object.keys(this.employeeTypeCountMap);
    const data = Object.values(this.employeeTypeCountMap);
  
    new Chart(this.barChart.nativeElement, {
      type: 'bar',
      data: {
        labels: labels,
        datasets: [{
          label: 'Cantidad de Empleados por Tipo',
          data: data,
          backgroundColor: '#007bff',
          borderColor: '#0056b3',
          borderWidth: 1
        }]
      },
      options: {
        responsive: true,
        plugins: {
          legend: {
            display: false
          },
          title: {
            display: true,
            text: 'Distribución de Empleados por Tipo'
          }
        },
        scales: {
          y: {
            beginAtZero: true,
            title: {
              display: true,
              text: 'Cantidad de Empleados'
            }
          },
          x: {
            title: {
              display: true,
              text: 'Tipo de Empleado'
            }
          }
        }
      }
    });
  }
  // Gráficos adicionales del primer componente
  initializeStatusPieChart(): void {
    const ctx = this.pieChart.nativeElement.getContext('2d');
    if (!ctx) return;

    new Chart(ctx, {
      type: 'pie',
      data: {
        labels: ['Activos', 'Inactivos'],
        datasets: [{
          data: [this.inServiceCount, this.inactiveCount],
          backgroundColor: ['#4CAF50', '#F44336']
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: 'bottom'
          },
          title: {
            display: true,
            text: 'Distribución de Estado de Empleados'
          }
        }
      }
    });
  }

  initializeEmployeeTypeChart(): void {
    if (!this.barChart?.nativeElement) return;

    // Destruir el gráfico existente si hay uno
    if (this.charts.barChart) {
      this.charts.barChart.destroy();
    }

    const data = Array.from(this.employeesByType.entries());
    
    this.charts.barChart = new Chart(this.barChart.nativeElement, {
      type: 'bar',
      data: {
        labels: data.map(([type]) => type),
        datasets: [{
          label: 'Cantidad de Empleados',
          data: data.map(([, count]) => count),
          backgroundColor: [
            '#FF9800',
            '#2196F3',
            '#4CAF50',
            '#9C27B0'
          ]
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          title: {
            display: true,
            text: 'Empleados por Tipo'
          },
          legend: {
            display: true,
            position: 'bottom'
          }
        },
        scales: {
          y: {
            beginAtZero: true,
            title: {
              display: true,
              text: 'Cantidad de Empleados'
            }
          }
        }
      }
    });
}

  initializeTenureDistributionChart(): void {
    if (this.lineChart) {
      const ctx = this.lineChart.nativeElement.getContext('2d');
      if (ctx) {
    const tenureRanges = this.calculateTenureRanges();

    this.charts.lineChart = new Chart(ctx, {
      type: 'line',
      data: {
        labels: ['0-1 año', '1-2 años', '2-5 años', '5+ años'],
        datasets: [{
          label: 'Distribución de Antigüedad',
          data: tenureRanges,
          fill: false,
          borderColor: '#3F51B5',
          tension: 0.1
        }]
      },
      options: {
        responsive: true,
        plugins: {
          title: {
            display: true,
            text: 'Distribución de Antigüedad'
          }
        }
      }
        });
      }
    }
  }

  initializePayrollChart(payments: EmployeePayment[]): void {
    if (!this.salaryChart) return;
  
    const ctx = this.salaryChart.nativeElement.getContext('2d');
    if (!ctx) return;
  
    const existingChart = Chart.getChart(this.salaryChart.nativeElement);
    if (existingChart) {
      existingChart.destroy();
    }
  
    const monthlyTotals = this.calculateMonthlyPayroll(payments);
  
    this.charts.salaryChart = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: Array.from(monthlyTotals.keys()),
        datasets: [{
          label: 'Total Mensual de Nómina',
          data: Array.from(monthlyTotals.values()),
          backgroundColor: '#FF5722'
        }]
      },
      options: {
        responsive: true,
        plugins: {
          title: {
            display: true,
            text: 'Evolución de la Nómina Mensual'
          }
        }
      }
    });
  }

  calculateTenureRanges(): number[] {
    const ranges = [0, 0, 0, 0]; // 0-1, 1-2, 2-5, 5+
    const now = new Date();

    this.employeeList.forEach(emp => {
      const hiringDate = new Date(emp.hiringDate);
      console.log('Fecha de contratacion de los empleados', hiringDate);
      const years = (now.getTime() - hiringDate.getTime()) / (1000 * 60 * 60 * 24 * 365);

      if (years <= 1) ranges[0]++;
      else if (years <= 2) ranges[1]++;
      else if (years <= 5) ranges[2]++;
      else ranges[3]++;
    });

    return ranges;
  }

  calculateMonthlyPayroll(payments: EmployeePayment[]): Map<string, number> {
    const monthlyTotals = new Map<string, number>();

    payments.forEach(payment => {
      const date = new Date(payment.paymentDate);
      const monthYear = `${date.getMonth() + 1}/${date.getFullYear()}`;
      
      const currentTotal = monthlyTotals.get(monthYear) || 0;
      monthlyTotals.set(monthYear, currentTotal + payment.paymentAmount);
    });

    return new Map([...monthlyTotals.entries()].sort());
  }

  loadEmployeeData(): void {
    this.employeesService.getAllEmployeesPaged().subscribe({
      next: (response) => {
        this.employeeList = this.mapperService.toCamelCase(response.content);
        this.calculateMetrics();
        
        // Inicializar gráficos una sola vez después de cargar los datos
        this.destroyExistingCharts();
        this.initializeCharts();
      },
      error: (error) => {
        console.error('Error al cargar empleados:', error);
        this.toastService.sendError('Error al cargar empleados.');
      }
    });
  }

  private initializeAllCharts(): void {
    if (!this.employeeList.length) {
      console.warn('No hay datos para mostrar en los gráficos');
      return;
    }
    // Destruimos los gráficos existentes antes de crear nuevos
    this.destroyExistingCharts();

    if (this.pieChart?.nativeElement) {
      this.initializeStatusPieChart();
    }

    if (this.barChart?.nativeElement) {
      this.initializeEmployeeTypeChart();
    }

    if (this.lineChart?.nativeElement) {
      this.initializeTenureDistributionChart();
    }

    if (this.salaryChart?.nativeElement) {
      this.loadPayrollData();
    }
  }
  private destroyExistingCharts(): void {
    const charts = [
      this.pieChart?.nativeElement,
      this.barChart?.nativeElement,
      this.lineChart?.nativeElement,
      this.salaryChart?.nativeElement
    ];

    charts.forEach(canvas => {
      if (canvas) {
        const chart = Chart.getChart(canvas);
        if (chart) {
          chart.destroy();
        }
      }
    });
  }
  formatNumber(value: number): string {
    return value.toFixed(1);
  }
}