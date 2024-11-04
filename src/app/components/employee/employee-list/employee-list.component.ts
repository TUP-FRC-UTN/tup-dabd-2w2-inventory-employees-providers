import { ChangeDetectorRef, Component, CUSTOM_ELEMENTS_SCHEMA, ElementRef, inject, OnInit, TemplateRef, ViewChild } from '@angular/core';
import { FormBuilder, FormControl, FormGroup, FormsModule, ReactiveFormsModule } from '@angular/forms';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { Router, RouterModule } from '@angular/router';
import { EmployeesService } from '../../../services/employees.service';
import { Employee, EmployeeType, StatusType } from '../../../models/employee.model';
import { ToastService, MainContainerComponent, ConfirmAlertComponent } from 'ngx-dabd-grupo01';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { debounceTime, distinctUntilChanged } from 'rxjs';
import { CommonModule } from '@angular/common';
import { MapperService } from '../../../services/MapperCamelToSnake/mapper.service';
import { Chart, ChartType } from 'chart.js';

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
  showModalFilters: boolean = false;

  //Metricas
  @ViewChild('pieChart') pieChartRef!: ElementRef;
  inServiceCount = 0;
  inactiveCount = 0;
  typeCountMap: { [key: string]: number } = {};
  pieChart!: Chart;
  barChart!: Chart;

  employeeList: Employee[] = [];
  filteredEmployeeList: Employee[] = [];
  private originalEmployeeList: Employee[] = [];
  isLoading = false;

  filterForm!: FormGroup;
  searchFilter = new FormControl('');
  statusTypes = Object.values(StatusType);
  employeeTypes = Object.values(EmployeeType);
  documentTypes = Object.values(DocumentType);

  currentPage: number = 1;
  totalItems: number = 0;
  itemsPerPage: number = 10;
  sizeOptions: number[] = [5, 10, 20, 50, 100];
  selectedStatus?: StatusType;

  private employeeService = inject(EmployeesService);
  private router = inject(Router);
  private modalService = inject(NgbModal);
  private toastService = inject(ToastService);
  private fb = inject(FormBuilder);
  private mapperService = inject(MapperService); // Inyectamos MapperService

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
  
    this.searchFilter.valueChanges
      .pipe(debounceTime(300), distinctUntilChanged())
      .subscribe((searchTerm) => this.applySearchFilter(searchTerm ?? ''));
  }

  ngOnInit(): void {
    this.getEmployees();
    this.calculateMetrics();
    this.createPieChart();
    this.createBarChart();
  }

  //METRICAS
  calculateMetrics(): void {
    // Contadores de empleados en servicio e inactivos
    this.inServiceCount = this.employeeList.filter(employee => employee.state === 'IN_SERVICE').length;
    this.inactiveCount = this.employeeList.filter(employee => employee.state === 'DOWN').length;

    // Calcula la cantidad de empleados por tipo
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
        datasets: [
          {
            data: [this.inServiceCount, this.inactiveCount],
            backgroundColor: ['#28a745', '#dc3545'],
          }
        ]
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

  // Método para abrir el modal de información
  openInfoModal() {
    this.modalService.open(this.infoModal, { centered: true });
  }

  // Método para abrir el modal de filtros
  openModalFilters() {
    this.showModalFilters = true;
  }

  closeModalFilters() {
    this.showModalFilters = false;
  }

getEmployees(): void {
    this.isLoading = true;
    this.employeeService.getEmployees().subscribe({
        next: (employeeList) => {
            this.originalEmployeeList = this.mapperService.toCamelCase(employeeList);
            this.employeeList = [...this.originalEmployeeList];
            this.filteredEmployeeList = [...this.originalEmployeeList];
            this.calculateMetrics(); // Calcula las métricas después de cargar los empleados
            this.createPieChart();
            this.createBarChart();
            this.isLoading = false;
        },
        error: (error) => {
            console.error('Error al obtener empleados:', error);
            this.toastService.sendError('Error al cargar empleados.');
            this.isLoading = false;
        }
    });
}


  // applyFilters(): void {
  //   const filters = Object.fromEntries(
  //     Object.entries(this.filterForm.value).filter(([_, v]) => v != null && v !== "")
  //   );
  
  //   this.isLoading = true;
  //   this.employeeService.searchEmployees(filters).subscribe({
  //     next: (employees) => {
  //       this.employeeList = employees;
  //       this.filteredEmployeeList = [...employees];
  //       this.isLoading = false;
  //     },
  //     error: (error) => {
  //       console.error('Error al filtrar empleados:', error);
  //       this.toastService.sendError('Error al filtrar empleados.');
  //       this.isLoading = false;
  //     }
  //   });
  // }
  applyFilters(): void {
    const filters = {
      firstName: this.filterForm.get('firstName')?.value?.toLowerCase() || '',
      lastName: this.filterForm.get('lastName')?.value?.toLowerCase() || '',
      employeeType: this.filterForm.get('employeeType')?.value || '',
      docType: this.filterForm.get('docType')?.value || '',
      docNumber: this.filterForm.get('docNumber')?.value || '',
      hiringDate: this.filterForm.get('hiringDate')?.value || '',
      salary: this.filterForm.get('salary')?.value || '',
      state: this.filterForm.get('state')?.value || '',
    };
  
    console.log('Applying filters:', filters);
  
    // Aplica los filtros sobre la lista original
    this.filteredEmployeeList = this.originalEmployeeList.filter(employee => {
      const matchesFirstName = filters.firstName ? employee.firstName.toLowerCase().includes(filters.firstName) : true;
      const matchesLastName = filters.lastName ? employee.lastName.toLowerCase().includes(filters.lastName) : true;
      const matchesEmployeeType = filters.employeeType ? employee.employeeType === filters.employeeType : true;
      const matchesDocType = filters.docType ? employee.documentType === filters.docType : true;
      const matchesDocNumber = filters.docNumber ? employee.docNumber.includes(filters.docNumber) : true;
      const matchesHiringDate = filters.hiringDate ? new Date(employee.hiringDate).toLocaleDateString() === new Date(filters.hiringDate).toLocaleDateString() : true;
      const matchesSalary = filters.salary ? employee.salary.toString() === filters.salary.toString() : true;
      const matchesState = filters.state ? employee.state === filters.state : true;
  
      return (
        matchesFirstName &&
        matchesLastName &&
        matchesEmployeeType &&
        matchesDocType &&
        matchesDocNumber &&
        matchesHiringDate &&
        matchesSalary &&
        matchesState
      );
    });
  
    this.showModalFilters = false; // Cierra el modal
  }
  
  updateFilteredEmployees(filters: any): void {
    this.filteredEmployeeList = this.originalEmployeeList.filter(employee => {
      const matchesFirstName = filters.firstName ? employee.firstName.toLowerCase().includes(filters.firstName.toLowerCase()) : true;
      const matchesLastName = filters.lastName ? employee.lastName.toLowerCase().includes(filters.lastName.toLowerCase()) : true;
      const matchesEmployeeType = filters.employeeType ? employee.employeeType === filters.employeeType : true;
      const matchesDocType = filters.docType ? employee.documentType === filters.docType : true;
      const matchesDocNumber = filters.docNumber ? employee.docNumber.includes(filters.docNumber) : true;
      const matchesHiringDate = filters.hiringDate ? new Date(employee.hiringDate).toLocaleDateString() === new Date(filters.hiringDate).toLocaleDateString() : true;
      const matchesSalary = filters.salary ? employee.salary.toString() === filters.salary.toString() : true;
      const matchesState = filters.state ? employee.state === filters.state : true;
  
      return (
        matchesFirstName &&
        matchesLastName &&
        matchesEmployeeType &&
        matchesDocType &&
        matchesDocNumber &&
        matchesHiringDate &&
        matchesSalary &&
        matchesState
      );
    });
  
    // Actualiza métricas y gráficos después de aplicar el filtro
    this.updateMetricsAndCharts();
  }
  
  

  clearFilters(): void {
    // Restablece todos los filtros en el formulario
    this.filterForm.reset();
  
    // Establece los valores por defecto para los desplegables
    this.filterForm.get('employeeType')?.setValue(''); // Ajusta el tipo de empleado a "Todos"
    this.filterForm.get('state')?.setValue(''); // Ajusta el estado a "Todos"
  
    // Limpia la barra de búsqueda
    this.searchFilter.setValue('');
  
    // Restaura la lista completa de empleados
    this.employeeList = [...this.originalEmployeeList];
    this.filteredEmployeeList = [...this.originalEmployeeList];
  
    // Actualiza las métricas y los gráficos para reflejar la lista completa
    this.updateMetricsAndCharts();
  }
  
  applySearchFilter(searchTerm: string): void {
    console.log("Buscando empleados con término:", searchTerm);
  
    if (!searchTerm) {
      this.filteredEmployeeList = [...this.originalEmployeeList];
    } else {
      this.filteredEmployeeList = this.originalEmployeeList.filter(employee =>
        employee.firstName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        employee.lastName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        employee.docNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
        employee.salary.toString().toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
  
    console.log("Resultado de empleados filtrados:", this.filteredEmployeeList);
    this.updateMetricsAndCharts();
    
  }
  updateMetricsAndCharts(): void {
    this.calculateMetrics();
    this.createPieChart();
    this.createBarChart();
  }

  onPageChange(event: any): void {
    const page = event as number;
    this.currentPage = page;
    this.getEmployees();
  }

  onItemsPerPageChange(): void {
    this.currentPage = 1; // Reinicia la paginación a la primera página
    this.getEmployees(); // Llama a getEmployees para actualizar la lista
  }
  

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
}
