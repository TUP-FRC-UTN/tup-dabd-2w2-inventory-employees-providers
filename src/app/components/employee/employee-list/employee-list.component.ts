import { ChangeDetectorRef, Component, CUSTOM_ELEMENTS_SCHEMA, ElementRef, inject, OnInit, TemplateRef, ViewChild } from '@angular/core';
import { FormBuilder, FormControl, FormGroup, FormsModule, ReactiveFormsModule } from '@angular/forms';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { Router, RouterModule } from '@angular/router';
import { EmployeesService } from '../../../services/employees.service';
import { Employee, EmployeeType, StatusType, DocumentType } from '../../../models/employee.model';
import { ToastService, MainContainerComponent, ConfirmAlertComponent } from 'ngx-dabd-grupo01';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { debounceTime, distinctUntilChanged } from 'rxjs';
import { CommonModule } from '@angular/common';
import { MapperService } from '../../../services/MapperCamelToSnake/mapper.service';
import { Chart, ChartType } from 'chart.js';
import { EmployeeListInfoComponent } from './employee-list-info/employee-list-info.component';

@Component({
  selector: 'app-employee-list',
  standalone: true,
  imports: [
    CommonModule, ReactiveFormsModule, FormsModule, RouterModule,
    MainContainerComponent, ConfirmAlertComponent
  ],
  templateUrl: './employee-list.component.html',
  styleUrls: ['./employee-list.component.css'],
  schemas: [CUSTOM_ELEMENTS_SCHEMA]
})
export class EmployeeListComponent implements OnInit {
  @ViewChild('infoModal') infoModal!: TemplateRef<any>;
  @ViewChild('pieChart') pieChartRef!: ElementRef;
  
  showModalFilters: boolean = false;
  
  // Metrics
  inServiceCount = 0;
  inactiveCount = 0;
  typeCountMap: { [key: string]: number } = {};
  pieChart!: Chart;
  barChart!: Chart;

  // Lists
  employeeList: Employee[] = [];
  filteredEmployeeList: Employee[] = [];
  isLoading = false;

  // Forms and Filters
  filterForm!: FormGroup;
  searchFilter = new FormControl('');
  statusTypes = Object.values(StatusType);
  employeeTypes = Object.values(EmployeeType);
  documentTypes = Object.values(DocumentType);

  // Pagination
  currentPage: number = 0; // Changed to 0-based for backend compatibility
  totalItems: number = 0;
  totalPages:number = 0;
  pageSize: number = 10;
  sizeOptions: number[] = [5, 10, 20, 50, 100];

  selectedEmployee?: Employee;

  // Services

  private employeeService = inject(EmployeesService);
  private router = inject(Router);
  private modalService = inject(NgbModal);
  private toastService = inject(ToastService);
  private fb = inject(FormBuilder);
  private mapperService = inject(MapperService);

  constructor() {
    this.filterForm = this.fb.group({
      firstName: [''],
      lastName: [''],
      employeeType: [''],
      docType: [''],
      docNumber: [''],
      hiringDate: [''],
      salary: [''],
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

  getEmployees(page: number = 0, size: number = this.pageSize, searchTerm?: string): void {
    this.isLoading = true;
    const filters = {
      page: this.currentPage,
      size: this.pageSize,
      firstName: this.filterForm.get('firstName')?.value || '',
      lastName: this.filterForm.get('lastName')?.value || '',
      type: this.filterForm.get('employeeType')?.value || '',
      docType: this.filterForm.get('docType')?.value || '',
      docNumber: this.filterForm.get('docNumber')?.value || '',
      state: this.filterForm.get('state')?.value || '',
      date: this.filterForm.get('hiringDate')?.value || '',
      salary: this.filterForm.get('salary')?.value || ''
    };

    this.employeeService.getAllEmployeesPaged(filters).subscribe({
      next: (response) => {
        response = this.mapperService.toCamelCase(response);
        this.employeeList = this.mapperService.toCamelCase(response.content);
        this.filteredEmployeeList = [...this.employeeList];
        this.totalItems = response.totalElements;
        this.totalPages = response.totalPages;
        this.calculateMetrics();
        this.createPieChart();
        this.createBarChart();
        this.isLoading = false;
      },
      error: (error) => {
        console.error('Error fetching employees:', error);
        this.toastService.sendError('Error al cargar empleados.');
        this.isLoading = false;
      }
    });
  }

  applyFilters(): void {
    this.currentPage = 0; // Reset to first page when applying filters
    this.getEmployees();
    this.showModalFilters = false;
  }

  clearFilters(): void {
    this.filterForm.reset();
    this.searchFilter.setValue('');
    this.currentPage = 0;
    this.getEmployees();
  }

  onPageChange(page: number): void {
    this.currentPage = page - 1; // Convert to 0-based for backend
    this.getEmployees();
  }

  onItemsPerPageChange(): void {
    this.currentPage = 0;
    this.getEmployees();
  }

  // Metrics methods
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

  // Chart methods remain the same...
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

  // Export methods
  exportToPDF(): void {
    const doc = new jsPDF();
    autoTable(doc, {
      head: [['Empleado', 'Tipo', 'Documento', 'Fecha de contratación', 'Estado']],
      body: this.employeeList.map(employee => [
        `${employee.lastName} ${employee.firstName}`,
        employee.employeeType,
        `${employee.documentType}: ${employee.docNumber}`,
        new Date(employee.hiringDate).toLocaleDateString(),
        employee.state
      ])
    });
    doc.save('lista-empleados.pdf');
  }

  exportToExcel(): void {
    const data = this.employeeList.map(employee => ({
      Empleado: `${employee.lastName} ${employee.firstName}`,
      Tipo: employee.employeeType,
      Documento: `${employee.documentType}: ${employee.docNumber}`,
      'Fecha de contratación': new Date(employee.hiringDate).toLocaleDateString(),
      Estado: employee.state
    }));
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Empleados');
    XLSX.writeFile(wb, 'lista-empleados.xlsx');
  }

  // Modal methods
  openModalFilters(): void {
    this.showModalFilters = true;
  }

  closeModalFilters(): void {
    this.showModalFilters = false;
  }

  // CRUD operations
  editEmployee(employee: Employee): void {
    this.router.navigate(['employees/form', employee.id]);
  }

  deleteEmployee(id: number): void {
    const modalRef = this.modalService.open(ConfirmAlertComponent);
    modalRef.componentInstance.alertTitle = 'Confirmación';
    modalRef.componentInstance.alertMessage = '¿Estás seguro de eliminar este empleado?';
    modalRef.componentInstance.alertVariant = 'delete';

    modalRef.result.then((result) => {
      if (result) {
        this.employeeService.deleteEmployee(id).subscribe({
          next: () => {
            this.toastService.sendSuccess('Empleado eliminado con éxito.');
            this.getEmployees();
          },
          error: () => {
            this.toastService.sendError('Error al eliminar el empleado.');
          }
        });
      }
    });
  }


  showDetailModal(content: any, id: number) {
    console.log("Este es el metodo de showDetailModal");
    //debugger
    this.employeeService.getEmployeeById(id).subscribe({
      next: (employee) => {
        console.log('Detalles del empleado:', employee);
        console.log('this.selectedEmployee', this.selectedEmployee);
        console.log('este es el numero de telefono de this.selectedEmployee', this.selectedEmployee?.contactValue);
        this.selectedEmployee = employee;
        //debugger
        this.modalService.open(content, {
          ariaLabelledBy: 'modal-basic-title',
          size: 'lg'
        });
        console.log('this.selectedEmployee', this.selectedEmployee);
        console.log('este es el numero de telefono de this.selectedEmployee', this.selectedEmployee?.contactValue);
        console.log(this.selectedEmployee);
      },
      error: (error) => {
        console.error('Error al cargar los detalles del empleado:', error);
        this.toastService.sendError('Error al cargar los detalles del empleado.');
      }
    });
  }


  goToPreviousPage() {
    if (this.currentPage > 0) {
      this.currentPage--;
      this.getEmployees();
    }
  }
  
  goToNextPage() {
    if (this.currentPage < this.totalPages - 1) {
      this.currentPage++;
      this.getEmployees();
    }
  }

  showInfo(): void {
    this.modalService.open(EmployeeListInfoComponent, {
      size: 'lg',
      backdrop: 'static',
      keyboard: false,
      centered: true,
      scrollable: true
    });
  }
}

