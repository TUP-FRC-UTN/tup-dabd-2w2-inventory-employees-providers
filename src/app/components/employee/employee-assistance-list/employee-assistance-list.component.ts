import { CommonModule, DatePipe } from '@angular/common';
import { Component, inject, TemplateRef, ViewChild } from '@angular/core';
import { FormBuilder, FormControl, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { Filter, FilterConfigBuilder, ToastService, TableFiltersComponent, MainContainerComponent } from 'ngx-dabd-grupo01';
import { EmployeesService } from '../../../services/employees.service';
import { ActivatedRoute, Router } from '@angular/router';
import { MapperService } from '../../../services/MapperCamelToSnake/mapper.service';
import { debounceTime, distinctUntilChanged } from 'rxjs';
import jsPDF from 'jspdf';
import * as XLSX from 'xlsx';
import autoTable, { Table } from 'jspdf-autotable';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { EmployeeAssistanceService } from '../../../services/employee-assistance.service';
import { EmployeeAccess } from '../../../models/employeeAccess';
import { EmployeeAssistanceListInfoComponent } from './employee-assistance-list-info/employee-assistance-list-info.component';

@Component({
  selector: 'app-employee-assistance-list',
  standalone: true,
  imports: [TableFiltersComponent, CommonModule, ReactiveFormsModule,MainContainerComponent],
  providers: [DatePipe],
  templateUrl: './employee-assistance-list.component.html',
  styleUrl: './employee-assistance-list.component.css'
})
export class EmployeeAssistanceListComponent {
  //Info
  @ViewChild('infoModal') infoModal!: TemplateRef<any>;



  // Lists
  employeeAssistances:EmployeeAccess[]=[];
  isLoading = false;
  currentFilters! : Record<string,any>;

  // Forms and Filters
  searchFilter:FormControl = new FormControl('');
  filterForm: FormGroup;
  paginationForm: FormGroup;
  filterConfig: Filter[] = new FilterConfigBuilder()
    .textFilter(
     'Nombre',
     'firstName',
     ''
    )
    .dateFilter(
      'Fecha Desde',
      'fromDate',
      '',
      'dd-MM-yyyy'
    )
    .dateFilter(
      'Fecha Hasta',
      'toDate',
      '',
      'dd-MM-yyyy'
    )
    .selectFilter(
      'Tipo de Acceso',
      'actionType',
      'Seleccione un Tipo',
      [
        { value: '', label: 'Todos' },
        { value: 'ENTRY', label: 'Entradas' },
        { value: 'EXIT', label: 'Salidas' },
      ]
    )
    .build();

    constructor(private fb: FormBuilder) {
      this.filterForm = this.fb.group({
        searchFilter: this.searchFilter,
      });
      this.paginationForm = this.fb.group({
        page: [0],
        size: [this.pageSize],
      });
    }
 
    filterChange($event: Record<string, any>) {
      const filters = $event;
      this.currentFilters = filters;
      //this.getEmployees();
    }
  
  // Pagination
  currentPage: number = 0;
  totalItems: number = 0;
  totalPages:number = 0;
  pageSize: number = 10;
  sizeOptions: number[] = [5, 10, 20, 50, 100];

  // Services
  private employeeService = inject(EmployeesService);
  private assistanceService = inject(EmployeeAssistanceService);
  private router = inject(Router);
  private activatedRouter = inject(ActivatedRoute);
  private toastService = inject(ToastService);
  private mapperService = inject(MapperService);
  private modalService = inject(NgbModal);

  ngOnInit(): void {
    this.getEmployees();
  }

  getEmployees(page: number = 0, size: number = this.pageSize, searchTerm?: string): void {
    this.isLoading = true;
    const filters = this.currentFilters;
    
    this.assistanceService.getAllEmployeesPaged(this.currentPage,this.pageSize,filters).subscribe({
      next:(response) => {
        response = this.mapperService.toCamelCase(response);
        this.employeeAssistances = this.mapperService.toCamelCase(response.content);
        this.totalItems = response.totalElements;
        this.totalPages = response.totalPages;
        this.isLoading = false;
      },
      error: (error) => {
        console.error('Error trayendo asistencia:', error);
        this.toastService.sendError('Error al cargar horarios.');
        this.isLoading = false;
      }
    })
  }

  applyFilters(): void {
    this.currentPage = 0;
    this.getEmployees();
  }

  clearFilters(): void {
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

  // Export methods
  exportToPDF(): void {
    const doc = new jsPDF();
    autoTable(doc, {
      head: [['Empleado', 'Acción', 'Documento', 'Comentarios', 'Tardío']],
      body: this.employeeAssistances.map(employee => [
        `${employee.lastName} ${employee.firstName}`,
        `${employee.action}: ${employee.actionDate.toLocaleDateString()}`,
        `${employee.docType}: ${employee.docNumber}`,
        employee.comments,
        employee.isLate
      ])
    });
    doc.save('lista-accesos-empleados.pdf');
  }

  exportToExcel(): void {
    const data = this.employeeAssistances.map(employee => ({
      Empleado: `${employee.lastName} ${employee.firstName}`,
      Acción:  `${employee.action}: ${employee.actionDate.toLocaleDateString()}`,
      Documento: `${employee.docType}: ${employee.docNumber}`,
      'Comentarios': employee.comments,
      Tardío: employee.isLate
    }));
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Accesos de Empleados');
    XLSX.writeFile(wb, 'lista-accesos-empleados.xlsx');
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

  private formatearFecha(fecha: string | Date | null): string {
    if (!fecha) return '';
    
    // Si ya es un objeto Date
    if (fecha instanceof Date) {
      return fecha.toISOString().split('T')[0];
    }
    
    // Si es un string, manejar diferentes formatos
    try {
      // Manejar formato LocalDateTime (yyyy-MM-dd'T'HH:mm:ss)
      if (fecha.includes('T')) {
        return fecha.split('T')[0];
      }
      
      // Si es solo un string de fecha (yyyy-MM-dd)
      return fecha;
    } catch (error) {
      console.error('Error al formatear la fecha:', error);
      return '';
    }
  }

  showInfo(): void {
    this.modalService.open(EmployeeAssistanceListInfoComponent, {
      size: 'lg',
      backdrop: 'static',
      keyboard: false,
      centered: true,
      scrollable: true
    });
  }
}
