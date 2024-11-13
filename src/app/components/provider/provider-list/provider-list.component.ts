import { Component, CUSTOM_ELEMENTS_SCHEMA, ElementRef, inject, OnInit, TemplateRef, ViewChild } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { ReactiveFormsModule, FormsModule, FormBuilder, FormControl, FormGroup } from '@angular/forms';
import { NgbModal, NgbPaginationModule } from '@ng-bootstrap/ng-bootstrap';
import { Router, RouterModule } from '@angular/router';
import { ProvidersService } from '../../../services/providers.service';
import { Supplier } from '../../../models/suppliers/supplier.model';
import { ToastService, MainContainerComponent, ConfirmAlertComponent } from 'ngx-dabd-grupo01';
import { debounceTime, distinctUntilChanged } from 'rxjs';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Chart, ChartType, registerables } from 'chart.js';
import { ProviderListInfoComponent } from './provider-list-info/provider-list-info.component';
import { TableFiltersComponent, Filter, FilterConfigBuilder } from 'ngx-dabd-grupo01';

Chart.register(...registerables);

@Component({
  selector: 'app-provider-list',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    FormsModule,
    RouterModule,
    MainContainerComponent,
    ConfirmAlertComponent,
    NgbPaginationModule,
    TableFiltersComponent
  ],
  providers:[DatePipe],
  templateUrl: './provider-list.component.html',
  styleUrls: ['./provider-list.component.css'],
  schemas: [CUSTOM_ELEMENTS_SCHEMA]
})
export class ProviderListComponent implements OnInit {
  //@ViewChild('pieChart') pieChartRef!: ElementRef;
  @ViewChild('providersTable') providersTable!: ElementRef;
  @ViewChild('infoModal') infoModal!: TemplateRef<any>;

  providerList: Supplier[] = [];
  filteredProviders: Supplier[] = [];
  originalProviders: Supplier[] = [];
  isLoading = false;

  searchFilterAll:FormControl = new FormControl('');
  filterForm: FormGroup;

  showModalFilter: boolean = false;

  currentPage: number = 1;
  totalPages:number = 1;
  totalItems: number = 0;
  pageSize: number = 10;
  currentFilters! : Record<string,any>;

  activeCount: number = 0;
  inactiveCount: number = 0;
  pieChart!: Chart;
  barChart: any;
  serviceCountMap: { [key: string]: number } = {};

  private providerService = inject(ProvidersService);
  private router = inject(Router);
  private modalService = inject(NgbModal);
  private toastService = inject(ToastService);

  filterConfig: Filter[] = new FilterConfigBuilder()
  .textFilter(
    'Nombre',
    'name',
    ''
  )
  .textFilter(
    'CUIL',
    'cuil',
    ''
  )
  .textFilter(
    'Servicio',
    'service',
    ''
  )
  .textFilter(
    'Número de Teléfono',
    'phone',
    ''
  )
  .selectFilter(
    'Estado',
    'enabled',
    'Seleccione un Estado',
    [
      { value: '', label: 'Todos' },
      { value: 'true', label: 'Activo' },
      { value: 'false', label: 'Inactivo' }
    ]
  )
  .build();

  filterChange($event: Record<string, any>) {
    const filters = $event;
    this.currentFilters = filters;
    this.getProviders();
  }

  constructor(private fb: FormBuilder) {
    this.filterForm = this.fb.group({
      name: [''],
      cuil: [''],
      'service.name': [''],
      'company.name': [''],
      contact: [''],
      address: [''],
      enabled: [''],
      start: [''],    // Nueva fecha de inicio
      end: ['']       // Nueva fecha de fin
    });

    // Configure global search with debounce
    this.searchFilterAll.valueChanges
      .pipe(
        debounceTime(300),
        distinctUntilChanged()
      )
      .subscribe(searchTerm => {

        this.filterProviders(searchTerm || '');

      });
  }
  
  searchProviders(searchTerm:string){
    if (!this.searchFilterAll.value||this.searchFilterAll.value==null) {
      this.getProviders();
   }

   this.providerList = this.providerList.filter(p =>
     p.name.toLowerCase().includes(searchTerm.toLowerCase() ?? '')
     ||p.details?.toLowerCase().includes(searchTerm.toLowerCase() ?? '')
     ||p.service.name.toLowerCase().includes(searchTerm.toLowerCase() ?? '')
   );  }

  // Nuevo método para filtrado local
private filterProviders(searchTerm: string): void {
  if (!searchTerm) {
      this.providerList = [...this.originalProviders];
      return;
  }

  const term = searchTerm.toLowerCase().trim();
  this.providerList = this.originalProviders.filter(provider => 
      // Buscar en todos los campos visibles
      provider.name.toLowerCase().includes(term) ||
      provider.cuil.toLowerCase().includes(term) ||
      provider.service?.name.toLowerCase().includes(term) ||
      provider.company?.name.toLowerCase().includes(term) ||
      provider.contact.toLowerCase().includes(term) ||
      provider.address.toLowerCase().includes(term)
  );

  // Actualizar métricas y gráficos con los datos filtrados
  this.calculateMetrics();
  // this.createPieChart();
  this.createBarChart();
}

  ngOnInit(): void {
    this.getProviders();
  }

// Modificar getProviders para guardar la lista original
getProviders(page: number = 0, size: number = this.pageSize): void {
  this.isLoading = true;
  
  const filters = {
      ...this.getFilters(),
      page,
      size
  };

  this.providerService.getProviders(filters).subscribe({
      next: (response) => {
          this.originalProviders = response.content;  // Guardar la lista original
          this.providerList = [...this.originalProviders];  // Copia inicial
          this.totalItems = response.totalElements;
          this.totalPages = Math.ceil(this.totalItems / this.pageSize);
          this.isLoading = false;
          
          this.calculateMetrics();
          // this.createPieChart();
          this.createBarChart();
      },
      error: (error) => {
          console.error('Error fetching providers:', error);
          this.toastService.sendError('Error al cargar proveedores.');
          this.isLoading = false;
      }
  });
}

  private getFilters(): any {
    const formValues = this.filterForm.value;
    const filters: any = {};

    // Only add non-empty values to the filters
    Object.keys(formValues).forEach(key => {
      const value = formValues[key];
      if (value !== '' && value !== null && value !== undefined) {
        filters[key] = value;
      }
    });

    return filters;
  }

  applyFilters(): void {
    const filters = this.filterForm.value;
    
    // Solo incluir fechas si ambas están presentes y son válidas
    if (filters.start && filters.end) {
        const startDate = new Date(filters.start);
        const endDate = new Date(filters.end);
        
        if (endDate < startDate) {
            this.toastService.sendError('La fecha final no puede ser anterior a la fecha inicial');
            return;
        }
    }
    
    this.currentPage = 1;
    this.getProviders(0, this.pageSize);
    this.closeModalFilter();
}
  clearFilters(): void {
    this.filterForm.reset();
    this.currentPage = 1;
    this.getProviders(0, this.pageSize);
    this.showModalFilter = false;
  }

  onItemsPerPageChange(): void {
    this.currentPage = 1;
    this.totalPages = Math.ceil(this.totalItems / this.pageSize);
    this.getProviders(0, this.pageSize);
  }

  onPageChange(page: number): void {
    this.currentPage = page;
    this.getProviders(page - 1, this.pageSize);
  }

  // Metrics calculation methods
  calculateMetrics(): void {
    this.activeCount = this.providerList.filter(provider => provider.enabled === true).length;
    this.inactiveCount = this.providerList.filter(provider => provider.enabled === false).length;

    this.serviceCountMap = this.providerList.reduce((acc, provider) => {
      const serviceName = provider.service?.name || 'Sin servicio';
      acc[serviceName] = (acc[serviceName] || 0) + 1;
      return acc;
    }, {} as { [key: string]: number });
  }

  /*createPieChart(): void {
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
  }*/

  createBarChart(): void {
    if (this.barChart) {
      this.barChart.destroy();
    }

    const ctx = document.getElementById('barChart') as HTMLCanvasElement;
    const serviceTypes = Object.keys(this.serviceCountMap);
    const serviceCounts = Object.values(this.serviceCountMap);

    this.barChart = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: serviceTypes,
        datasets: [{
          label: 'Cantidad de Proveedores',
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

  // Export methods remain the same
  exportToExcel(): void {
    try {
      let element = document.getElementById('providersTable');
      if (!element) {
        element = this.createTableFromData();
      }
      const ws: XLSX.WorkSheet = XLSX.utils.table_to_sheet(element);
      const wb: XLSX.WorkBook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Proveedores');
      XLSX.writeFile(wb, 'proveedores.xlsx');
    } catch (error) {
      console.error('Error exporting to Excel:', error);
    }
  }

  exportToPDF(): void {
    const doc = new jsPDF();
    const tableColumn = ['Nombre', 'CUIL', 'Servicio', 'Compañía', 'Dirección', 'Contacto', 'Registro', 'Estado'];
    const tableRows: any[][] = [];
  
    this.providerList.forEach((provider) => {
      const providerData = [
        provider.name,
        provider.cuil,
        provider.service?.name,
        provider.company?.name,
        provider.address,
        provider.contact,
        provider.registration ? new Date(provider.registration).toLocaleDateString() : '',
        provider.enabled ? 'Activo' : 'Inactivo'
      ];
      tableRows.push(providerData);
    });
  
    autoTable(doc, {
      head: [tableColumn],
      body: tableRows,
    });
  
    doc.save('proveedores.pdf');
  }


  private createTableFromData(): HTMLTableElement {
    const table = document.createElement('table');
    const thead = table.createTHead();
    const tbody = table.createTBody();
  
    const headerRow = thead.insertRow();
    ['Nombre', 'CUIL', 'Servicio', 'Compañía', 'Contacto', 'Registro', 'Estado'].forEach(text => {
      const th = document.createElement('th');
      th.textContent = text;
      headerRow.appendChild(th);
    });
  
    this.providerList.forEach((provider) => {
      const row = tbody.insertRow();
      [
        provider.name,
        provider.cuil,
        provider.service.name,
        provider.company.name,
        provider.contact,
        provider.registration,
        provider.enabled ? 'Activo' : 'Inactivo'
      ].forEach((text) => {
        const cell = row.insertCell();
        cell.textContent = text;
      });
    });
  
    return table;
  }

  // Navigation methods
  editProvider(id: number): void {
    this.router.navigate(['/providers/form', id]);
  }

  deleteProvider(id: number): void {
    const modalRef = this.modalService.open(ConfirmAlertComponent);
    modalRef.componentInstance.alertTitle = 'Confirmación';
    modalRef.componentInstance.alertMessage = '¿Estás seguro de eliminar este proveedor?';
    modalRef.componentInstance.alertVariant = 'delete';

    modalRef.result.then((result) => {
      if (result) {
        this.providerService.deleteProvider(id).subscribe({
          next: () => {
            this.toastService.sendSuccess("Proveedor eliminado correctamente");
            this.getProviders();
          },
          error: () => {
            this.toastService.sendError("Error al eliminar el proveedor");
          }
        });
      }
    });
  }

  trackByFn(index: number, item: Supplier): number {
    return item.id;
  }

  // openInfoModal(content: TemplateRef<any>) {
  //   this.modalService.open(content, { centered: true });
  // }

  goToPreviousPage() {
    if (this.currentPage > 1) {
      this.currentPage--;
      this.getProviders(this.currentPage - 1, this.pageSize);
    }
  }
  
  goToNextPage() {
    if (this.currentPage < this.totalPages) {
      this.currentPage++;
      this.getProviders(this.currentPage - 1, this.pageSize);
    }
  }
  
  showInfo(): void {
    this.modalService.open(ProviderListInfoComponent, {
      size: 'lg',
      backdrop: 'static',
      keyboard: false,
      centered: true,
      scrollable: true
    });
  }
}