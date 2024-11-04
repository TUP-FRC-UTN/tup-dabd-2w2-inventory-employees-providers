import { Component, CUSTOM_ELEMENTS_SCHEMA, ElementRef, inject, OnInit, TemplateRef, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormsModule, FormBuilder, FormControl, FormGroup } from '@angular/forms';
import { NgbModal, NgbPaginationModule } from '@ng-bootstrap/ng-bootstrap';
import { Router, RouterModule } from '@angular/router';
import { ServicesService } from '../../../services/services.service';
import { Service } from '../../../models/service.model';
import { ToastService, MainContainerComponent, ConfirmAlertComponent } from 'ngx-dabd-grupo01';
import { debounceTime, distinctUntilChanged } from 'rxjs';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Chart, ChartType, registerables } from 'chart.js';
import { ServiceListInfoComponent } from './service-list-info/service-list-info.component';

Chart.register(...registerables);

@Component({
  selector: 'app-service-list',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    FormsModule,
    RouterModule,
    MainContainerComponent,
    ConfirmAlertComponent,
    NgbPaginationModule
  ],
  templateUrl: './service-list.component.html',
  styleUrls: ['./service-list.component.css'],
  schemas: [CUSTOM_ELEMENTS_SCHEMA]
})
export class ServiceListComponent implements OnInit {
  @ViewChild('pieChart') pieChartRef!: ElementRef;
  @ViewChild('servicesTable') servicesTable!: ElementRef;
  @ViewChild('infoModal') infoModal!: TemplateRef<any>;

  serviceList: Service[] = [];
  filteredServices: Service[] = [];
  //private originalService: Service[] = [];
  isLoading = false;

  searchFilterAll = new FormControl('');
  filterForm: FormGroup;

  showModalFilter: boolean = false;

  currentPage: number = 1;
  totalPages: number = 1;
  totalItems: number = 0;
  pageSize: number = 10;

  //  Variables de Metricas
  activeCount: number = 0;
  inactiveCount: number = 0;
  pieChart!: Chart;
  barChart: any;
  typeCountMap: { [key: string]: number } = {};

  private serviceService = inject(ServicesService);
  private router = inject(Router);
  private modalService = inject(NgbModal);
  private toastService = inject(ToastService);

  constructor(private fb: FormBuilder) {
    this.filterForm = this.fb.group({
      name: [''],
      cuit: [''],
      type: [''],
      contact: [''],
      address: [''],
      enabled: ['']
    });

    this.searchFilterAll.valueChanges
      .pipe(
        debounceTime(300),
        distinctUntilChanged()
      )
      .subscribe(searchTerm => {
        this.getServices(this.currentPage - 1, this.pageSize, searchTerm || '');
      });
  }

  ngOnInit(): void {
    this.getServices();
  }

  getServices(page: number = 0, size: number = this.pageSize, searchTerm?: string): void {
    this.isLoading = true;

    const filters = {
      ...this.getFilters(),
      page,
      size
    };

    if (searchTerm) {
      filters.name = searchTerm;
      filters.cuit = searchTerm;
      filters.type = searchTerm;
      filters.contact = searchTerm;
      filters.address = searchTerm;
    }

    this.serviceService.getServices(filters).subscribe({
      next: (response) => {
        this.serviceList = response.content;
        this.filteredServices = response.content;
        //this.originalService = response.content;
        this.totalItems = response.totalElements;

        //  Calcular total de paginas
        this.totalPages = Math.ceil(this.totalItems / this.pageSize);
        this.isLoading = false;

        this.calculateMetrics();
        this.createPieChart();
        this.createBarChart();
      },
      error: (error) => {
        console.error('Error fetching services:', error);
        this.toastService.sendError('Error al cargar servicios.');
        this.isLoading = false;
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


  applyFilters(): void {
    this.currentPage = 1;
    this.getServices(0, this.pageSize);
    this.closeModalFilter();
  }

  clearFilters(): void {
    this.filterForm.reset();
    this.currentPage = 1;
    this.getServices(0, this.pageSize);
    this.showModalFilter = false;
  }

  onItemsPerPageChange(): void {
    this.currentPage = 1;
    this.totalPages = Math.ceil(this.totalItems / this.pageSize);
    this.getServices(0, this.pageSize);
  }

  onPageChange(page: number): void {
    this.currentPage = page;
    this.getServices(page - 1, this.pageSize);
  }

  // Calculo de Metricas
  calculateMetrics(): void {
    this.activeCount = this.serviceList.filter(service => service.enabled === true).length;
    this.inactiveCount = this.serviceList.filter(service => service.enabled === false).length;

    this.typeCountMap = this.serviceList.reduce((acc, service) => {
      const type = service.type;
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
        labels: ['Activos', 'Inactivos'],
        datasets: [{
          data: [this.activeCount, this.inactiveCount],
          backgroundColor: ['#28a745', '#dc3545']
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
    const serviceTypes = Object.keys(this.typeCountMap);
    const serviceCounts = Object.values(this.typeCountMap);

    this.barChart = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: serviceTypes,
        datasets: [{
          label: 'Cantidad de Servicios',
          data: serviceCounts,
          backgroundColor: '#007bff'
        }]
      },
      options: {
        responsive: true,
        plugins: {
          legend: { display: false }
        },
        scales: {
          x: { title: { display: true, text: 'Tipo de Servicio' } },
          y: { title: { display: true, text: 'Cantidad' }, beginAtZero: true }
        }
      }
    });
  }

  // Modal methods
  openModalFilter(): void {
    this.showModalFilter = true;
  }

  closeModalFilter(): void {
    this.showModalFilter = false;
  }

  exportToExcel(): void {
    try {
      let element = document.getElementById('servicesTable');
      if (!element) {
        element = this.createTableFromData();
      }
      const ws: XLSX.WorkSheet = XLSX.utils.table_to_sheet(element);
      const wb: XLSX.WorkBook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Servicios');
      XLSX.writeFile(wb, 'servicios.xlsx');
    } catch (error) {
      console.error('Error exporting to Excel:', error);
    }
  }

  exportToPDF(): void {
    const doc = new jsPDF();
    const tableColumn = ['Nombre', 'CUIT', 'Tipo de Servicio', 'Contacto', 'Direccion', 'Estado'];
    const tableRows: any[][] = [];

    this.serviceList.forEach((service) => {
      const serviceData = [
        service.name,
        service.cuit,
        service.type,
        service.contact,
        service.address,
        service.enabled ? 'Activo' : 'Inactivo'
      ];
      tableRows.push(serviceData);
    });

    autoTable(doc, {
      head: [tableColumn],
      body: tableRows,
    });

    doc.save('servicios.pdf');
  }

  private createTableFromData(): HTMLTableElement {
    const table = document.createElement('table');
    const thead = table.createTHead();
    const tbody = table.createTBody();

    const headerRow = thead.insertRow();
    ['Nombre', 'CUIT', 'Tipo de servicio', 'Contacto', 'Direccion', 'Estado'].forEach(text => {
      const th = document.createElement('th');
      th.textContent = text;
      headerRow.appendChild(th);
    });

    this.serviceList.forEach((service) => {
      const row = tbody.insertRow();
      [
        service.name,
        service.cuit,
        service.type,
        service.contact,
        service.address,
        service.enabled ? 'Activo' : 'Inactivo'
      ].forEach((text) => {
        const cell = row.insertCell();
        cell.textContent = text;
      });
    });

    return table;
  }

  editService(id: number): void {
    this.router.navigate(['/services/form', id]);
  }

  deleteService(id: number): void {
    const modalRef = this.modalService.open(ConfirmAlertComponent);
    modalRef.componentInstance.alertTitle = 'Confirmación';
    modalRef.componentInstance.alertMessage = '¿Estás seguro de eliminar este servicio?';
    modalRef.componentInstance.alertVariant = 'delete';

    modalRef.result.then((result) => {
      if (result) {
        this.serviceService.deleteService(id).subscribe({
          next: () => {
            this.toastService.sendSuccess("Servicio eliminado correctamente");
            this.getServices();
          },
          error: () => {
            this.toastService.sendError("Error al eliminar el servicio");
          }
        });
      }
    });
  }

  trackByFn(index: number, item: Service): number {
    return item.id;
  }

  openInfoModal(content: TemplateRef<any>) {
    this.modalService.open(content, { centered: true });
  }

  goToPreviousPage() {
    if (this.currentPage > 1) {
      this.currentPage--;
      this.getServices(this.currentPage - 1, this.pageSize);
    }
  }
  
  goToNextPage() {
    if (this.currentPage < this.totalPages) {
      this.currentPage++;
      this.getServices(this.currentPage - 1, this.pageSize);
    }
  }

  showInfo(): void {
    this.modalService.open(ServiceListInfoComponent, {
      size: 'lg',
      backdrop: 'static',
      keyboard: false,
      centered: true,
      scrollable: true
    });
  }
}
