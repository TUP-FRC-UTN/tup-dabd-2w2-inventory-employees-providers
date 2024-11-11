import { Component, CUSTOM_ELEMENTS_SCHEMA, ElementRef, inject, OnInit, TemplateRef, ViewChild } from '@angular/core';
import { FormBuilder, FormControl, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { EmployeesService } from '../../../services/employees.service';
import { Employee } from '../../../models/employee.model';
import { ToastService, MainContainerComponent } from 'ngx-dabd-grupo01';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { debounceTime, distinctUntilChanged } from 'rxjs';
import { Chart, ChartType, registerables } from 'chart.js';
import { CommonModule } from '@angular/common';
import { MapperService } from '../../../services/MapperCamelToSnake/mapper.service';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { EmployeeDashboardInfoComponent } from './employe-dashboard-info/employee-dashboard-info.component';

Chart.register(...registerables);

@Component({
  selector: 'app-employee-dashboard',
  standalone: true,
  imports: [
    MainContainerComponent,CommonModule,ReactiveFormsModule
  ],
  templateUrl: './employee-dashboard.component.html',
  styleUrls: ['./employee-dashboard.component.css'],
  schemas: [CUSTOM_ELEMENTS_SCHEMA]
})
export class EmployeeDashboardComponent implements OnInit {
  @ViewChild('pieChart') pieChartRef!: ElementRef;

  showModalFilters: boolean = false;
  private modalService = inject(NgbModal);


  // Metrics
  inServiceCount = 0;
  inactiveCount = 0;
  typeCountMap: { [key: string]: number } = {};
  pieChart!: Chart;
  barChart!: Chart;

  // Lists
  employeeList: Employee[] = [];

  // Forms and Filters
  filterForm!: FormGroup;
  searchFilter = new FormControl('');
  statusTypes = ['IN_SERVICE', 'DOWN'];
  employeeTypes = ['FULL_TIME', 'PART_TIME'];

  private employeeService = inject(EmployeesService);
  private toastService = inject(ToastService);
  private fb = inject(FormBuilder);
  private mapperService = inject(MapperService);

  constructor() {
    this.filterForm = this.fb.group({
      firstName: [''],
      lastName: [''],
      employeeType: [''],
      docNumber: [''],
      state: ['']
    });

    // Search filter with debounce
    this.searchFilter.valueChanges
      .pipe(debounceTime(300), distinctUntilChanged())
      .subscribe(() => this.getEmployees());
  }

  ngOnInit(): void {
    this.getEmployees();
  }

  getEmployees(): void {
    const filters = {
      firstName: this.filterForm.get('firstName')?.value || '',
      lastName: this.filterForm.get('lastName')?.value || '',
      employeeType: this.filterForm.get('employeeType')?.value || '',
      docNumber: this.filterForm.get('docNumber')?.value || '',
      state: this.filterForm.get('state')?.value || ''
    };

   /* this.employeeService.getAllEmployeesPaged(filters).subscribe({
      next: (response) => {
        this.employeeList = this.mapperService.toCamelCase(response.content);
        this.calculateMetrics();
        this.createPieChart();
        this.createBarChart();
      },
      error: (error) => {
        console.error('Error fetching employees:', error);
        this.toastService.sendError('Error al cargar empleados.');
      }
    });*/
  }

  applyFilters(): void {
    this.getEmployees();
    this.showModalFilters = false;
  }

  clearFilters(): void {
    this.filterForm.reset();
    this.searchFilter.setValue('');
    this.getEmployees();
  }

  calculateMetrics(): void {
    this.inServiceCount = this.employeeList.filter(employee => employee.state === 'IN_SERVICE').length;
    this.inactiveCount = this.employeeList.filter(employee => employee.state === 'DOWN').length;
    
    this.typeCountMap = this.employeeList.reduce((acc, employee) => {
      const type = employee.employeeType;
      if (type) {
        acc[type] = (acc[type] || 0) + 1;
      }
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
        labels: ['En Servicio', 'Inactivo'],
        datasets: [{
          data: [this.inServiceCount, this.inactiveCount],
          backgroundColor: ['#28a745', '#dc3545'],
        }]
      },
      options: {
        responsive: true,
        plugins: {
          legend: {
            position: 'top'
          }
        }
      }
    });
  }

  createBarChart(): void {
    if (this.barChart) {
      this.barChart.destroy();
    }

    const ctx = document.getElementById('barChart') as HTMLCanvasElement;
    const employeeTypes = Object.keys(this.typeCountMap);
    const typeCounts = Object.values(this.typeCountMap);

    this.barChart = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: employeeTypes,
        datasets: [{
          label: 'Cantidad de Empleados',
          data: typeCounts,
          backgroundColor: '#007bff'
        }]
      },
      options: {
        responsive: true,
        plugins: {
          legend: { display: false }
        },
        scales: {
          x: { title: { display: true, text: 'Tipo de Empleado' } },
          y: { title: { display: true, text: 'Cantidad' }, beginAtZero: true }
        }
      }
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
  openModalFilters(): void {
    this.showModalFilters = true;
  }

  closeModalFilters(): void {
    this.showModalFilters = false;
  }
}
