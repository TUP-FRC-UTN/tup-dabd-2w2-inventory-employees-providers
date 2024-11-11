import { Component, inject, OnInit, ChangeDetectorRef, ViewChild, ElementRef } from '@angular/core';
import { FormBuilder, FormControl, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { EmployeesService } from '../../../services/employees.service';
import { Employee, EmployeeType } from '../../../models/employee.model';
import { ToastService, MainContainerComponent } from 'ngx-dabd-grupo01';
import { ChartDataset, ChartOptions } from 'chart.js';
import { CommonModule } from '@angular/common';
import { MapperService } from '../../../services/MapperCamelToSnake/mapper.service';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { EmployeeDashboardInfoComponent } from './employe-dashboard-info/employee-dashboard-info.component';
import { BaseChartDirective } from 'ng2-charts';
import { Chart, ChartType, registerables } from 'chart.js';
import { debounceTime, distinctUntilChanged } from 'rxjs';

@Component({
  selector: 'app-employee-dashboard',
  standalone: true,
  imports: [MainContainerComponent, CommonModule, ReactiveFormsModule],
  templateUrl: './employee-dashboard.component.html',
  styleUrls: ['./employee-dashboard.component.css']
})
export class EmployeeDashboardComponent implements OnInit {
  @ViewChild('pieChart') pieChartRef!: ElementRef;
  @ViewChild('employeeCategoryChartRef') employeeCategoryChartRef!: ElementRef;
  

  // KPIs
  employeesHiredLastMonth = 0;
  inServiceCount = 0;
  inactiveCount = 0;
  employeeList: Employee[] = [];
  filterForm: FormGroup;
  pieChart!: Chart;
  barChart: any;
  employeeCategoryData: { [key: string]: number } = {};
  searchFilterAll = new FormControl('');
  typeCountMap: { [key: string]: number } = {};
  //employeeTypes = ['ADMINISTRATIVO', 'GUARDIA'];

  //Mapa para tipo de empleados
  employeeTypesBar = Object.values(EmployeeType);
  employeeTypeCountMap: { [key: string]: number } = {};

  // Chart Data
  pieChartEmployeeStatusLabels: string[] = ['En Servicio', 'Inactivo'];
  pieChartEmployeeStatusDatasets: ChartDataset<'pie', number[]>[] = [
    {
      data: [], // Se llenará dinámicamente en calculateMetrics
      backgroundColor: ['#28a745', '#dc3545']
    }
  ];

  public pieChartOptions: ChartOptions<'pie'> = {
    responsive: true,
    plugins: {
      legend: { position: 'top' }
    }
  };

  private employeeService = inject(EmployeesService);
  private toastService = inject(ToastService);
  private mapperService = inject(MapperService);
  private modalService = inject(NgbModal);
  // private cdr = inject(ChangeDetectorRef);

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
        this.getEmployees(searchTerm || '');
      });
  }

  ngOnInit(): void {
    this.loadEmployeeData();
    this.getEmployees();
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

    this.employeeService.getAllEmployeesPaged().subscribe({
      next: (response) => {
        this.employeeList = this.mapperService.toCamelCase(response.content);
        this.calculateMetrics();
        
        // Asigna los datos del gráfico de pie
        this.pieChartEmployeeStatusDatasets[0].data = [this.inServiceCount, this.inactiveCount];
        
        // Crear los gráficos después de tener los datos
        this.createPieChart();
        this.createBarChart();
      },
      error: () => {
        this.toastService.sendError('Error al cargar empleados.');
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

  loadEmployeeData(): void {
    this.employeeService.getAllEmployeesPaged().subscribe({
      next: (response) => {
        this.employeeList = this.mapperService.toCamelCase(response.content);
        this.calculateMetrics();
        
        // Asigna los datos del gráfico de pie
        this.pieChartEmployeeStatusDatasets[0].data = [this.inServiceCount, this.inactiveCount];
        
        // Crear los gráficos después de tener los datos
        this.createPieChart();
        this.createBarChart();
        
        console.log('Datos cargados - Conteo por tipo:', this.employeeTypeCountMap);
      },
      error: (error) => {
        console.error('Error al cargar empleados:', error);
        this.toastService.sendError('Error al cargar empleados.');
      }
    });
  }

  calculateMetrics(): void {
    const oneMonthAgo = new Date();
    oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);

    this.employeesHiredLastMonth = this.employeeList.filter(
      (employee) => new Date(employee.hiringDate) >= oneMonthAgo
    ).length;

    this.inServiceCount = this.employeeList.filter(e => e.state === 'IN_SERVICE').length;
    this.inactiveCount = this.employeeList.filter(e => e.state === 'DOWN').length;

    // Reiniciar el contador
    this.employeeTypeCountMap = {};

    // Inicializar todos los tipos posibles en 0
    Object.values(EmployeeType).forEach(type => {
      this.employeeTypeCountMap[type] = 0;
    });
  
    // Contar empleados por tipo
    this.employeeList.forEach(employee => {
      if (employee.employeeType) {
        this.employeeTypeCountMap[employee.employeeType] = 
          (this.employeeTypeCountMap[employee.employeeType] || 0) + 1;
      }
    });
  
    console.log('Empleados cargados:', {
      total: this.employeeList.length,
      porTipo: this.employeeTypeCountMap,
      primerEmpleado: this.employeeList[0] // Para verificar la estructura
    });
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

  createPieChart(): void {
    if (this.pieChart) {
      this.pieChart.destroy();
    }

    this.pieChart = new Chart(this.pieChartRef.nativeElement, {
      type: 'pie' as ChartType,
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
    const canvas = document.getElementById('barChart') as HTMLCanvasElement;
    if (!canvas) {
      console.error('No se encontró el elemento canvas para el gráfico de barras');
      return;
    }
  
    if (this.barChart) {
      this.barChart.destroy();
    }
  
    const labels = Object.keys(this.employeeTypeCountMap);
    const data = Object.values(this.employeeTypeCountMap);
  
    console.log('Datos para el gráfico de barras:', {
      labels,
      data
    });
  
    this.barChart = new Chart(canvas, {
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
}
