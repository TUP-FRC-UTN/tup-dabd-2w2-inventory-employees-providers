import { Component, OnInit, ViewChild, ElementRef, inject, ChangeDetectorRef, AfterViewInit } from '@angular/core';
import { FormBuilder, FormControl, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { CommonModule, DatePipe, DecimalPipe } from '@angular/common';
import { Chart, ChartType, registerables } from 'chart.js';
import { ToastService, MainContainerComponent, FilterConfigBuilder, Filter, TableFiltersComponent } from 'ngx-dabd-grupo01';
import { forkJoin, map } from 'rxjs';
import { debounceTime, distinctUntilChanged } from 'rxjs';
import { Employee, EmployeeType, StatusType, EmployeePayment } from '../../../models/employee.model';
import { EmployeesService } from '../../../services/employees.service';
import { MapperService } from '../../../services/MapperCamelToSnake/mapper.service';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { EmployeeDashboardInfoComponent } from './employe-dashboard-info/employee-dashboard-info.component';
import { ChartDataset, ChartOptions } from 'chart.js';
import { ActiveEmployeesModalComponent } from './employee-enabled-modal/employee-enabled-modal.component';
import { EmployeeRecentHireModalComponent } from './employee-recent-hire-modal/employee-recent-hire-modal.component';

Chart.register(...registerables);
interface DateRange {
  label: string;
  startDate: string;
  endDate: string;
}

@Component({
  selector: 'app-employee-dashboard',
  standalone: true,
  imports: [MainContainerComponent, CommonModule, ReactiveFormsModule,TableFiltersComponent],
  providers: [DecimalPipe, DatePipe],
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
  
  //Filtrado graficos
  showDropdown = false;
  selectedPeriod: string = '7';
  fromDate: string | null = null;
  toDate: string | null = null;
  chartData: any[] = []; // Datos actuales para los gráficos
  isLoading: boolean = false; // Añadir esta propiedad para evitar el error
  dateFilterForm: FormGroup;
  predefinedRanges: DateRange[] = [];
  //FILTROS NUEVOS
  filterConfig: Filter[] = new FilterConfigBuilder()
  .selectFilter('Estado', 'enabled', 'Seleccione un Estado', [
    { value: '', label: 'Todos' },
    { value: 'true', label: 'Activo' },
    { value: 'false', label: 'Inactivo' },
  ])
  .dateFilter('Fecha desde', 'startDate', 'Seleccione una fecha')
  .dateFilter('Fecha hasta', 'endDate', 'Seleccione una fecha')
  .build();


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
    // Inicializar rangos predefinidos
    this.initializePredefinedRanges();

    // Mantener el filterForm existente
    this.filterForm = this.fb.group({
      name: [''],
      cuil: [''],
      'service.name': [''],
      'company.name': [''],
      contact: [''],
      enabled: ['']
    });

    // Agregar el nuevo dateFilterForm
    this.dateFilterForm = this.fb.group({
      startDate: [''],
      endDate: [''],
      selectedRange: ['']
    });
    this.searchFilterAll.valueChanges
    .pipe(debounceTime(300), distinctUntilChanged())
    .subscribe((searchTerm) => {
      this.getEmployees(searchTerm || '');
    });
    // Mantener searchFilterAll existente
    // this.searchFilterAll.valueChanges
    //   .pipe(
    //     debounceTime(300),
    //     distinctUntilChanged()
    //   )
    //   .subscribe(searchTerm => {
    //     this.getEmployeesWithDateFilter(searchTerm || '');
    //   });

    // Agregar suscripción a cambios en filtros de fecha

  }

  ngOnInit(): void {
    // Solo cargamos los datos una vez
    if (!this.dataLoaded) {
      this.loadEmployeeData();
    }
  }
  //NUEVOS FILTROS
  filterChange(filters: Record<string, any>): void {
    console.log('Filtros recibidos del componente:', filters); // Debug
  
    const { startDate, endDate, enabled } = filters;
  
    if (startDate && endDate && new Date(startDate) > new Date(endDate)) {
      this.toastService.sendError('La fecha "desde" no puede ser mayor que la fecha "hasta".');
      return;
    }
  
    const filterParams: any = {
      enabled,
      startDate: startDate || null,
      endDate: endDate || null,
    };
  
    console.log('Filtros construidos para el servicio:', filterParams); // Debug
  
    this.getEmployeesWithFilters(filterParams);
  }
  
  private buildFilters(searchTerm?: string): any {
    const formValues = this.dateFilterForm.value;
    const filters: any = {
      ...(searchTerm && { name: searchTerm }),
      ...(formValues.startDate && { startDate: formValues.startDate }),
      ...(formValues.endDate && { endDate: formValues.endDate }),
    };
    return filters;
  }
  private formatDateToLocalDateTime(date: string): string {
    const parsedDate = new Date(date);
    return `${parsedDate.toISOString().split('T')[0]}T00:00:00`; // Formato 'YYYY-MM-DDTHH:mm:ss'
  }
  
  getEmployeesWithFilters(filters?: any): void {
    const page = 0;
    const size = 40;
  
    const validFilters: any = {
      state: filters?.enabled ? this.mapStateToBackend(filters.enabled) : null,
      hiringDate: filters?.startDate && filters?.endDate 
        ? `${this.formatDateToISO(filters.startDate)},${this.formatDateToISO(filters.endDate)}`
        : null,
    };
  
    console.log('Filtros enviados al servicio:', validFilters); // Debug
  
    this.employeesService.getAllEmployeesPaged(page, size, validFilters).subscribe({
      next: (response) => {
        console.log('Respuesta recibida del servicio:', response); // Debug
        this.employeeList = response.content; 
        this.calculateMetrics();
        this.updateCharts();
      },
      error: (error) => {
        console.error('Error al cargar empleados con filtros:', error);
        this.toastService.sendError('Error al cargar empleados con los filtros aplicados.');
      },
    });
  }
  
  private mapStateToBackend(state: string): string | null {
    if (state === 'Activo') return 'IN_SERVICE';
    if (state === 'Inactivo') return 'DOWN';
    return null; // Si no hay estado seleccionado
  }
  private formatDateToISO(date: string): string {
    const parsedDate = new Date(date);
    return parsedDate.toISOString().split('T')[0]; // Formato 'yyyy-MM-dd'
  }
  
  
  
  
  // getEmployees(searchTerm?: string): void {
  //   const filters = { ...this.getFilters() };
  
  //   if (searchTerm) {
  //     filters.name = searchTerm;
  //     filters.cuil = searchTerm;
  //     filters['service.name'] = searchTerm;
  //     filters['company.name'] = searchTerm;
  //     filters.contact = searchTerm;
  //   }
  
  //   this.employeesService.getAllEmployeesPaged().subscribe({
  //     next: (response) => {
  //       this.employeeList = this.mapperService.toCamelCase(response.content);
  //       this.calculateMetrics();
  //       this.pieChartEmployeeStatusDatasets[0].data = [this.inServiceCount, this.inactiveCount];
  //       // Reinicializar los charts después de actualizar los datos
  //       setTimeout(() => {
  //         this.initializeCharts();
  //       });
  //     },
  //     error: () => {
  //       this.toastService.sendError('Error al cargar empleados.');
  //     }
  //   });
  // }
  getEmployees(searchTerm?: string): void {
    const filters = this.buildFilters(searchTerm);
  
    this.employeesService.getAllEmployeesPaged(filters).subscribe({
      next: (response) => {
        this.employeeList = this.mapperService.toCamelCase(response.content);
        this.calculateMetrics();
        this.updateCharts();
      },
      error: () => {
        this.toastService.sendError('Error al cargar empleados.');
      },
    });
  }
  updateCharts(): void {
    if (!this.employeeList.length) {
      console.warn('No hay datos para mostrar en los gráficos');
      this.toastService.sendError('No hay datos disponibles para actualizar los gráficos.');
      return;
    }
  
    // Actualizar el dataset del gráfico de pastel
    this.pieChartEmployeeStatusDatasets[0].data = [this.inServiceCount, this.inactiveCount];
  
    // Reiniciar gráficos existentes
    this.destroyExistingCharts();
  
    // Inicializar gráficos con los datos actuales
    this.initializeCharts();
  }
//TERMINA NUEVO FILTROS
  
  applyDateFilters(): void {
    const dateFilters = this.getDateFilters();
  
    // Si no hay filtros de fecha seleccionados, cargamos todos los empleados
    if (!dateFilters.startDate && !dateFilters.endDate) {
      this.getEmployees(); // Llama al método para obtener todos los empleados sin filtros
    } else if (dateFilters.startDate && dateFilters.endDate) {
      // Verificamos que haya fechas válidas antes de aplicar el filtro
      this.getEmployeesWithDateFilter();
    } else {
      this.toastService.sendError('Por favor, selecciona fechas válidas para aplicar el filtro.');
    }
  }
  
  
  private initializePredefinedRanges(): void {
    // Función auxiliar para formatear fechas en formato ISO
    const formatDateToISO = (date: Date): string => {
      return date.toISOString().split('T')[0];
    };

    const today = new Date();
    today.setHours(23, 59, 59, 999);

    // Último mes
    const lastMonth = new Date(today);
    lastMonth.setMonth(lastMonth.getMonth() - 1);
    lastMonth.setHours(0, 0, 0, 0);

    // Últimos 3 meses
    const last3Months = new Date(today);
    last3Months.setMonth(last3Months.getMonth() - 3);
    last3Months.setHours(0, 0, 0, 0);

    // Últimos 6 meses
    const last6Months = new Date(today);
    last6Months.setMonth(last6Months.getMonth() - 6);
    last6Months.setHours(0, 0, 0, 0);

    // Último año
    const lastYear = new Date(today);
    lastYear.setFullYear(lastYear.getFullYear() - 1);
    lastYear.setHours(0, 0, 0, 0);

    this.predefinedRanges = [
      {
        label: 'Último mes',
        startDate: formatDateToISO(lastMonth),
        endDate: formatDateToISO(today)
      },
      {
        label: 'Últimos 3 meses',
        startDate: formatDateToISO(last3Months),
        endDate: formatDateToISO(today)
      },
      {
        label: 'Últimos 6 meses',
        startDate: formatDateToISO(last6Months),
        endDate: formatDateToISO(today)
      },
      {
        label: 'Último año',
        startDate: formatDateToISO(lastYear),
        endDate: formatDateToISO(today)
      }
    ];
  }
  // Método para convertir fecha local a UTC
  private toUTCDate(dateStr: string): Date {
    const date = new Date(dateStr);
    return new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  }

  // Método para convertir LocalDateTime string a Date
  private parseLocalDateTime(dateTimeStr: string): Date {
    // Asumiendo que el formato es "YYYY-MM-DDTHH:mm:ss"
    return new Date(dateTimeStr);
  }

  // Nuevo método para obtener empleados con filtro de fecha
  getEmployeesWithDateFilter(searchTerm?: string): void {
    const filters = { ...this.getFilters() };
    const dateFilters = this.getDateFilters();
  
    if (searchTerm) {
      filters.name = searchTerm;
      filters.cuil = searchTerm;
      filters['service.name'] = searchTerm;
      filters['company.name'] = searchTerm;
      filters.contact = searchTerm;
    }
  
    this.employeesService.getAllEmployeesPaged().subscribe({
      next: (response) => {
        let filteredEmployees = this.mapperService.toCamelCase(response.content);
  
        // Aplicar filtros de fecha solo si `startDate` y `endDate` no son `null`
        if (dateFilters.startDate && dateFilters.endDate) {
          const startDate = this.toUTCDate(dateFilters.startDate);
          const endDate = this.toUTCDate(dateFilters.endDate);
  
          filteredEmployees = filteredEmployees.filter((emp: Employee) => {
            let hiringDate: Date;
  
            if (emp.hiringDate instanceof Date) {
              hiringDate = emp.hiringDate;
            } else if (typeof emp.hiringDate === 'string') {
              hiringDate = new Date(emp.hiringDate);
            } else {
              console.warn(`Employee with ID ${emp.id} has an invalid hiringDate format.`);
              return false;
            }
  
            return hiringDate >= startDate && hiringDate <= endDate;
          });
        }
  
        // Mostrar mensaje de error si no hay empleados en el rango
      if (filteredEmployees.length === 0) {
        this.toastService.sendError('No hay datos disponibles para el rango seleccionado');
        this.dateFilterForm.reset(); // Restablecer el formulario de fecha
        this.getEmployees(); // Llamar a getEmployees para obtener todos los empleados
      } else {
        this.employeeList = filteredEmployees;
        this.calculateMetrics();
        this.updateChartsWithFilteredData();
      }
    },
    error: () => {
      this.toastService.sendError('Error al cargar empleados.');
    }
  });
  }

  public LimpiarGraficos() : void {
    this.dateFilterForm.reset(); // Restablecer el formulario de fecha
    this.getEmployees();
  }
  

  // Nuevo método para actualizar los gráficos con datos filtrados
  private updateChartsWithFilteredData(): void {
    this.pieChartEmployeeStatusDatasets[0].data = [this.inServiceCount, this.inactiveCount];
    
    // Actualizar gráficos
    this.destroyExistingCharts();
    this.initializeCharts();

    // Detectar cambios
    this.cdr.detectChanges();
  }

  // Método para obtener filtros de fecha
  private getDateFilters(): { startDate: string | null, endDate: string | null } {
    const { startDate, endDate } = this.dateFilterForm.value;
    return {
      startDate: startDate || null,
      endDate: endDate || null
    };
  }

  // Método para aplicar rango predefinido
  applyPredefinedRange(range: DateRange): void {
    this.dateFilterForm.patchValue({
      startDate: range.startDate,
      endDate: range.endDate,
      selectedRange: range.label
    });
  }
  

  // Sobrescribir calculateMetrics para considerar las fechas
  private updateEmployeeTypeCountMap(): void {
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
  }

  private calculateFinancialMetrics(): void {
    this.averageSalary = this.employeeList.reduce((acc, emp) => acc + emp.salary, 0) / this.employeeList.length;
    this.totalPayroll = this.employeeList.reduce((acc, emp) => acc + emp.salary, 0);
    this.retentionRate = (this.inServiceCount / this.employeeList.length) * 100;
    this.avgTenure = this.calculateAverageTenure();
  }
  // fin de nuevo filtro fecha
  ngAfterViewInit(): void {
    // Aseguramos que los gráficos se inicialicen cuando haya datos
    this.cdr.detectChanges();
  }

  toggleDropdown() {
    this.showDropdown = !this.showDropdown;
  }

  applyFilter() {
    this.isLoading = true;
    const selectedPeriod = this.filterForm.get('selectedPeriod')?.value;
    const fromDate = this.filterForm.get('fromDate')?.value;
    const toDate = this.filterForm.get('toDate')?.value;

    // Verifica si el período seleccionado no es personalizado
    if (selectedPeriod !== 'custom') {
        const days = parseInt(selectedPeriod);
        const endDate = new Date();
        const startDate = new Date();
        startDate.setDate(endDate.getDate() - days);
        
        // Llama al método de filtrado con el rango calculado
        this.getDataFilteredByDateRange(startDate, endDate);
    } else if (fromDate && toDate) {
        // Convierte las fechas a objetos Date
        const startDate = new Date(fromDate);
        const endDate = new Date(toDate);

        // Llama al método de filtrado con el rango personalizado
        this.getDataFilteredByDateRange(startDate, endDate);
    } else {
        console.warn("Fechas de rango personalizadas no establecidas correctamente");
        this.toastService.sendError("Por favor, selecciona fechas válidas para el rango personalizado.");
    }
    this.isLoading = false;
}

getDataFilteredByDateRange(startDate: Date, endDate: Date): void {
  this.employeesService.getEmployeesPageable(0, 100).subscribe(
      (response) => {
          // Filtra empleados con una fecha de contratación dentro del rango
          this.chartData = response.content.filter(employee => {
              if (!employee.hiringDate) {
                  console.warn(`Employee with ID ${employee.id} is missing hiringDate.`);
                  return false;
              }

              const employeeDate = new Date(employee.hiringDate);
              return employeeDate.getTime() >= startDate.getTime() && employeeDate.getTime() <= endDate.getTime();
          });

          if (this.chartData.length > 0) {
              this.calculateMetrics();
             // this.updateCharts(this.chartData);
          } else {
              console.warn('No hay datos disponibles para el rango seleccionado');
              this.toastService.sendError('No hay datos disponibles para el rango seleccionado');
          }
      },
      (error) => {
          console.error('Error fetching data:', error);
          this.toastService.sendError('Error al obtener los datos.');
      }
  );
} 

  
 // Método para actualizar los gráficos
//  updateCharts(data: Employee[]): void {
//   if (data.length > 0) {
//       this.initializeCharts();
//   } else {
//       console.warn('No hay datos disponibles para el rango seleccionado');
//       this.toastService.sendError('No hay datos disponibles para el rango seleccionado');
//   }
// }


  formatChartData(data: any[]): any {
    // Transformación de `data` para adaptarlo al formato del gráfico
    return {
      labels: data.map(item => item.name), // Ejemplo: usar nombres de empleados como etiquetas
      datasets: [
        {
          label: 'Métricas',
          data: data.map(item => item.value) // Ejemplo: el valor de cada métrica
        }
      ]
    };
  }

  loadDashboardData(): void {
    this.employeesService.getEmployees().subscribe(employees => {
      this.employeeList = employees;
      this.calculateKPIs();
      this.initializeCharts();
    });
    this.loadPayrollData();
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
      type: 'bar',
      data: {
        labels: ['0-1 año', '1-2 años', '2-5 años', '5+ años'],
        datasets: [{
          label: 'Distribución de Antigüedad',
          data: tenureRanges,
          //fill: false,
          borderColor: '#3F51B5',
          backgroundColor: '#3F51B5',
          //tension: 0.1
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

 // Cargar datos iniciales con validación de `hiringDate`
 loadEmployeeData(): void {
  this.employeesService.getAllEmployeesPaged().subscribe({
    next: (response) => {
      this.employeeList = this.mapperService.toCamelCase(response.content);
      
      // Verifica si todos los empleados tienen `hiringDate` y si es un objeto Date
      this.employeeList.forEach(emp => {
        if (!emp.hiringDate || !(emp.hiringDate instanceof Date)) {
          console.warn(`Employee with ID ${emp.id} has invalid hiringDate:`, emp.hiringDate);
        }
      });

      this.calculateMetrics();
      this.initializeCharts();
    },
    error: (error) => {
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

  // VER MODAL PARA LOS EMPLEADOS ACTIVOS AL HACER CLICK EN LA CARD.
  showActiveEmployees(): void {
    const activeEmployees = this.employeeList.filter(emp => emp.state === StatusType.ACTIVE);
    
    const modalRef = this.modalService.open(ActiveEmployeesModalComponent, {
      size: 'lg',
      centered: true
    });
    
    modalRef.componentInstance.activeEmployees = activeEmployees;
  }
  
  // VER MODAL PARA LOS EMPLEADOS RECIENTEMENTE CONTRATADOS EN LA CARD.
  showRecentHires(): void {
    const oneMonthAgo = new Date();
    oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);
    
    const recentHires = this.employeeList.filter(emp => {
      const hiringDate = new Date(emp.hiringDate);
      return hiringDate >= oneMonthAgo;
    });
    
    const modalRef = this.modalService.open(EmployeeRecentHireModalComponent, {
      size: 'lg',
      centered: true
    });
    
    modalRef.componentInstance.recentHires = recentHires;
  }
}