import { CommonModule, DatePipe } from '@angular/common';
import { Component, inject, TemplateRef, ViewChild } from '@angular/core';
import { FormBuilder, FormControl, FormGroup, FormsModule, ReactiveFormsModule } from '@angular/forms';
import { Filter, FilterConfigBuilder, ToastService, TableFiltersComponent, MainContainerComponent } from 'ngx-dabd-grupo01';
import { EmployeesService } from '../../../services/employees.service';
import { ActivatedRoute, Router } from '@angular/router';
import { MapperService } from '../../../services/MapperCamelToSnake/mapper.service';
import jsPDF from 'jspdf';
import * as XLSX from 'xlsx';
import autoTable, { Table } from 'jspdf-autotable';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { EmployeeAssistanceService } from '../../../services/employee-assistance.service';
import { EmployeeAccess } from '../../../models/employeeAccess';
import { EmployeeAssistanceListInfoComponent } from './employee-assistance-list-info/employee-assistance-list-info.component';
import { Employee } from '../../../models/employee.model';

@Component({
  selector: 'app-employee-assistance-list',
  standalone: true,
  imports: [TableFiltersComponent, FormsModule,CommonModule, ReactiveFormsModule,MainContainerComponent],
  providers: [DatePipe],
  templateUrl: './employee-assistance-list.component.html',
  styleUrl: './employee-assistance-list.component.css'
})
export class EmployeeAssistanceListComponent {
  //Info
  @ViewChild('infoModal') infoModal!: TemplateRef<any>;

  // Services
  private employeeService = inject(EmployeesService);
  private assistanceService = inject(EmployeeAssistanceService);
  private activatedRouter = inject(ActivatedRoute);
  private toastService = inject(ToastService);
  private mapperService = inject(MapperService);
  private modalService = inject(NgbModal);

  // Lists
  employeeAssistances:EmployeeAccess[]=[];
  isLoading = false;
  
  //Employee Data
  currentEmployee:Employee | undefined;
  currentEmployeeId:number = 0;
  
  // Forms and Filters
  searchFilter:FormControl = new FormControl('');
  currentFilters! : Record<string,any>;
  filterConfig: Filter[] = new FilterConfigBuilder()
    .dateFilter(
      'Fecha Desde',
      'fromDate',
      '',
      'yyyy-MM-dd'
    )
    .dateFilter(
      'Fecha Hasta',
      'toDate',
      '',
      'yyyy-MM-dd'
    )
    .selectFilter(
      'Tipo de Acceso',
      '',
      'Seleccione un tipo',
      [
        {value:'',label:'Todos'},
        {value:'ENTRY', label:'Entradas'},
        {value:'EXIT', label:'Salidas'}
      ]
    )
  .build();
 
  filterChange($event: Record<string, any>) {
    const filters = $event;
    this.currentFilters = filters;
    if(this.currentEmployee!=undefined){
      this.getEmployees();
    }    
  }
  
  // Pagination
  currentPage: number = 0;
  totalItems: number = 0;
  totalPages:number = 0;
  pageSize: number = 10;
  sizeOptions: number[] = [5, 10, 20, 50, 100];

  ngOnInit(): void {
    this.activatedRouter.params.subscribe((params) =>{
      const id = +params['id'];
      if (id) {
        this.getById(id);
      }});
  }

  getById(id: number) {
    this.employeeService.getEmployee(id).subscribe({
      next: (response) => {
        this.currentEmployee = this.mapperService.toCamelCase(response);
        this.getEmployees();
      },
      error: (error) => {
        this.toastService.sendError("Hubo un error al obtener la información del empleado.");
        console.error(error);
      }
    })
  }

  getEmployees(page: number = this.currentPage, size: number = this.pageSize, searchTerm?: string): void {
    this.isLoading = true;
    let filters:Record<string,any> = [];
    if(this.currentFilters!=undefined){
      filters = this.currentFilters;
    }
    filters['textFilter'] = this.currentEmployee?.docNumber.toString();
    filters['visitorType'] = 'EMPLOYEE';

    this.assistanceService.getAllEmployeesPaged(this.currentPage,this.pageSize,filters).subscribe({
      next:(response) => {
        response = this.mapperService.toCamelCase(response);
        this.employeeAssistances = this.mapperService.toCamelCase(response.items);
        this.totalItems = response.totalElements;
        this.totalPages = (this.totalItems/this.pageSize);
        this.isLoading = false;
      },
      error: (error) => {
        console.error('Error trayendo asistencia:', error);
        this.toastService.sendError('Error al cargar asistencias.');
        this.isLoading = false;
      }
    })
  }

  applyFilters(): void {
    this.currentPage = 0;
    if(this.currentEmployee!=undefined){
      this.getEmployees();
    }
  }

  clearFilters(): void {
    this.searchFilter.setValue('');
    this.currentPage = 0;
    if(this.currentEmployee!=undefined){
      this.getEmployees();
    }  
  }

  onPageChange(page: number): void {
    this.currentPage = page - 1;
    if(this.currentEmployee!=undefined){
      this.getEmployees();
    }
  }

  onItemsPerPageChange(): void {
    this.currentPage = 0;
    if(this.currentEmployee!=undefined){
      this.getEmployees();
    }  
  }

  // Metodos de exportación
  exportToPDF(): void {
    const doc = new jsPDF();
    autoTable(doc, {
      head: [['Fecha', 'Hora', 'Acción', 'Comentarios', 'Tardío']],
      body: this.employeeAssistances.map(employee => [
        `${new Date(employee.actionDate).toLocaleDateString()}`,
        `${new Date(employee.actionDate).getHours()+':'+new Date(employee.actionDate).getMinutes()}`,
        `${employee.action}`,
        employee.comments,
        employee.isLate
      ])
    });
    doc.save('lista-accesos-empleados.pdf');
  }

  exportToExcel(): void {
    const data = this.employeeAssistances.map(employee => ({
      Fecha: `${new Date(employee.actionDate).toLocaleDateString()}`,
      Hora:`${new Date(employee.actionDate).getHours()+':'+new Date(employee.actionDate).getMinutes()}`,
      Acción:  `${employee.action}`,
      Comentarios: employee.comments,
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
      if(this.currentEmployee!=undefined){
        this.getEmployees();
      }
    }
  }
  
  goToNextPage() {
    if (this.currentPage < this.totalPages - 1) {
      this.currentPage++;
      if(this.currentEmployee!=undefined){
        this.getEmployees();
      }    
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
