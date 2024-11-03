import { Component, CUSTOM_ELEMENTS_SCHEMA, ElementRef, inject, OnInit, TemplateRef, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormsModule, FormBuilder, FormControl, FormGroup } from '@angular/forms';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { Router, RouterModule } from '@angular/router';
import { ProvidersService } from '../../../services/providers.service';
import { Supplier } from '../../../models/supplier.model';
import { ToastService, MainContainerComponent, ConfirmAlertComponent } from 'ngx-dabd-grupo01';
import { debounceTime, distinctUntilChanged } from 'rxjs';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';


@Component({
  selector: 'app-provider-list',
  standalone: true,
  imports: [
    CommonModule, // Para *ngIf y *ngFor
    ReactiveFormsModule, // Para formControl
    FormsModule, // Para ngModel
    RouterModule, // Para routerLink
    MainContainerComponent, // Componente del contenedor principal
    ConfirmAlertComponent 
  ],
  templateUrl: './provider-list.component.html',
  styleUrls: ['./provider-list.component.css'],
  schemas: [CUSTOM_ELEMENTS_SCHEMA] // Agrega esta línea

})
export class ProviderListComponent implements OnInit {
  @ViewChild('providersTable') providersTable!: ElementRef;
  @ViewChild('infoModal') infoModal!: TemplateRef<any>;

  // sortColumn: string = '';
  // sortDirection: 'asc' | 'desc' = 'asc';

  providerList: Supplier[] = [];
  filteredProviders: Supplier[] = [];
  private originalProviders: Supplier[] = []; // Se usa como referencia para filtros
  isLoading = false;

  searchFilterAll = new FormControl('');
  filterForm: FormGroup;

  showModalFilter: boolean = false;

  currentPage: number = 1;
  totalItems: number = 0;
  itemsPerPage: number = 10;
  pageSize: number = 10;
  sizeOptions: number[] = [5,10, 20, 50, 100];


  private providerService = inject(ProvidersService);
  private router = inject(Router);
  private modalService = inject(NgbModal);
  private toastService = inject(ToastService);

  constructor(private ProvidersService: ProvidersService,private fb: FormBuilder) {
    this.filterForm = this.fb.group({
      name: new FormControl(''),
      cuil: new FormControl(''),
      service: new FormControl(''),
      phone: new FormControl(''),
      enabled: new FormControl('')
    });

     // Configuración de filtro de búsqueda de TOODO ALL
     this.searchFilterAll.valueChanges
     .pipe(
       debounceTime(300),
       distinctUntilChanged()
     )
     .subscribe(searchTerm => {
       this.filterProviders(searchTerm || '');
     });
}

  ngOnInit(): void {
    this.getProviders();
    this.setupFilterSubscriptions();
  }

  filterProviders(searchTerm: string): void {
    if (!searchTerm) {
      this.providerList = [...this.originalProviders];
      return;
    }

    this.providerList = this.originalProviders.filter(provider =>
      provider.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      provider.cuil.toLowerCase().includes(searchTerm.toLowerCase()) ||
      provider.service.toLowerCase().includes(searchTerm.toLowerCase()) ||
      provider.contact.toLowerCase().includes(searchTerm.toLowerCase()) ||
      provider.address.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }
  

  openModalFilter(): void {
    this.showModalFilter = true;
  }
  openInfoModal(content: TemplateRef<any>) {
    this.modalService.open(content, { centered: true });
  }

  closeModalFilter(): void {
    this.showModalFilter = false;
  }

  private setupFilterSubscriptions(): void {
    // Object.keys(this.filterForm.controls).forEach(key => {
    //   this.filterForm.get(key)?.valueChanges.subscribe(() => {
    //     this.applyFilters();
    //   });
    // });
  }

  trackByFn(index: number, item: Supplier): number {
    return item.id; // Suponiendo que `id` es un identificador único de cada proveedor
  }  

  getProviders(page: number = 0, size: number = this.pageSize): void {
    this.isLoading = true;
    const filters = this.getFilters(); // Obtén los filtros actuales si es necesario
  
    this.providerService.getProviders({ ...filters, page, size }).subscribe(response => {
      this.originalProviders = response.content;
      this.providerList = [...this.originalProviders];
      this.filteredProviders = [...this.originalProviders];
      this.totalItems = response.totalElements; // Ajusta `totalItems` según la respuesta de la API
      this.isLoading = false;
    });
  }
  

  onItemsPerPageChange(): void {
    this.currentPage = 1; // Reinicia a la primera página
    this.getProviders(this.currentPage - 1, this.pageSize);
  }
  
  onPageChange(event: any): void {
    const page = event as number; // Asegura que sea tratado como número
    this.currentPage = page;
    this.getProviders(this.currentPage - 1, this.pageSize);
  }
  
  
  // Método para obtener los filtros actuales (opcional, si los estás usando)
  private getFilters(): any {
    return {
      name: this.filterForm.get('name')?.value || '',
      cuil: this.filterForm.get('cuil')?.value || '',
      service: this.filterForm.get('service')?.value || '',
      phone: this.filterForm.get('phone')?.value || '',
      enabled: this.filterForm.get('enabled')?.value
    };
  }

applyFilters(): void {
  const filters = {
    name: this.filterForm.get('name')?.value?.toLowerCase() || '',
    cuil: this.filterForm.get('cuil')?.value || '',
    service: this.filterForm.get('service')?.value?.toLowerCase() || '',
    phone: this.filterForm.get('phone')?.value || '',
    enabled: this.filterForm.get('enabled')?.value !== '' 
    ? this.filterForm.get('enabled')?.value === 'true' 
      ? true 
      : false 
    : null
};

  console.log('Applying filters:', filters);

  // Filtra siempre a partir de originalProviders
  this.filteredProviders = this.originalProviders.filter(provider => {
    const matchesName = filters.name ? provider.name.toLowerCase().includes(filters.name) : true;
    const matchesCuil = filters.cuil ? provider.cuil.includes(filters.cuil) : true;
    const matchesService = filters.service ? provider.service.toLowerCase().includes(filters.service) : true;
    const matchesPhone = filters.phone ? provider.contact.includes(filters.phone) : true;
    const matchesEnabled = filters.enabled !== null ? provider.enabled === filters.enabled : true;

    return matchesName && matchesCuil && matchesService && matchesPhone && matchesEnabled;
  });

  console.log('Filtered providers:', this.filteredProviders);

  // Actualiza la lista visible con los resultados filtrados
  this.providerList = [...this.filteredProviders];
  this.closeModalFilter();
}


clearFilters(): void {
  this.filterForm.reset(); // Restablece todos los filtros
  this.filterForm.get('enabled')?.setValue(''); // Establece el campo "Estado" en "Todos los Estados"
  this.providerList = [...this.originalProviders]; // Restaura la lista completa de proveedores
  this.filteredProviders = [...this.originalProviders];
  this.showModalFilter = false; // Cierra el modal
}


  exportToPDF() {
    const doc = new jsPDF();
    const tableColumn = ['Nombre', 'CUIL', 'Tipo de servicio', 'Dirección', 'Numero de Telefono', 'Estado'];
    const tableRows: any[][] = [];
  
    this.providerList.forEach((provider) => {
       //const providerAddress = this.addresses.find((addr) => addr.id === provider.addressId);
      const providerData = [
        provider.name,
        provider.cuil,
        provider.service,
        provider.address,
        provider.contact,
        //providerAddress ? providerAddress.street_address : 'N/A', // Mostramos la dirección
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

  exportToExcel() {
    try {
      let element = document.getElementById('providersTable');
      if (!element) {
        console.warn('Table element not found in DOM, using component data instead.');
        element = this.createTableFromData();
      }
      const ws: XLSX.WorkSheet = XLSX.utils.table_to_sheet(element);
      const wb: XLSX.WorkBook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Proveedores');
      XLSX.writeFile(wb, 'proveedores.xlsx');
    } catch (error) {
      console.error('Error exporting to Excel:', error);
      // Aquí puedes añadir una notificación al usuario si lo deseas
    }
  }
  private createTableFromData(): HTMLTableElement {
    const table = document.createElement('table');
    const thead = table.createTHead();
    const tbody = table.createTBody();

    // Crear encabezados
    const headerRow = thead.insertRow();
    ['Nombre', 'Tipo de servicio', 'Contacto', 'Estado'].forEach(text => {
      const th = document.createElement('th');
      th.textContent = text;
      headerRow.appendChild(th);
    });

    this.providerList.forEach((provider) => {
      const row = tbody.insertRow();
      [provider.name, provider.cuil, provider.service, 
         provider.enabled ? 'Activo' : 'Inactivo'].forEach((text) => {
        const cell = row.insertCell();
        cell.textContent = text;
      });
    });

    return table;
  }

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
}
