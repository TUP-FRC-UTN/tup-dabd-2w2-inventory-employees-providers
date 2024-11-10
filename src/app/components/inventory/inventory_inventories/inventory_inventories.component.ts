import { CommonModule } from '@angular/common';
import { Component, inject, OnInit, TemplateRef, viewChild } from '@angular/core';
import { FormBuilder, FormControl, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { ArticleFormComponent } from '../inventory_articles/inventory_articles_form/inventory_articles_form.component';
import { RouterModule } from '@angular/router';
import { TransactionComponentForm } from '../inventory_transaction/inventory_transaction_form/inventory_transaction_form.component';
import { InventoryTransactionTableComponent } from '../inventory_transaction/inventory_transaction_table/inventory_transaction_table.component';
import { InventoryInventoriesUpdateComponent } from './inventory-inventories-update/inventory-inventories-update.component';
import { MapperService } from '../../../services/MapperCamelToSnake/mapper.service';
import { Inventory, StatusType, } from '../../../models/inventory.model';
import { Article, MeasurementUnit, Status } from '../../../models/article.model';
import { InventoryService } from '../../../services/inventory.service';
import Swal from 'sweetalert2';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import * as XLSX from 'xlsx';
import autoTable from 'jspdf-autotable';
import { ToastService } from 'ngx-dabd-grupo01';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';


@Component({
  selector: 'app-inventory',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    RouterModule,
    FormsModule,
    ArticleFormComponent,
    TransactionComponentForm,
    InventoryTransactionTableComponent,
    InventoryInventoriesUpdateComponent,
  ],
  templateUrl: './inventory_inventories.component.html',
  styleUrls: ['./inventory_inventories.component.css']

})
export class InventoryTableComponent implements OnInit {

  private mapperService = inject(MapperService);
  private inventoryService = inject(InventoryService)
  private toastService = inject(ToastService);
  private modalService = inject(NgbModal);

  searchInput = new FormControl('');

  readonly infoModal = viewChild.required<TemplateRef<any>>('infoModal');

  showInfo(): void {
    this.modalService.open(this.infoModal(), { centered: true });
  }
  // Modals
  showRegisterForm: boolean = false;
  showRegisterTransactionForm: boolean = false;
  showTransactions: boolean = false;
  showInventoryUpdate: boolean = false;

  inventoryForm: FormGroup;
  inventories: Inventory[] = [];
  articles: Article[] = [];
  activeArticles: Article[] = []; // Solo los ítems activos
  articleMap: { [key: number]: string } = {}; // Mapa para almacenar nombre de ítems con sus IDs
  isEditing: boolean = false;
  editingInventoryId: any | null = null; // Para guardar el ID del inventario en edición

  //sorts
  sortedList: Inventory[] = [];
  sortColumn: string = '';
  sortDirection: 'asc' | 'desc' = 'asc';

  constructor(private fb: FormBuilder,) {
    this.inventoryForm = this.fb.group({
      article_id: ['', Validators.required],
      stock: [1, Validators.required], // Stock inicial es 1
      min_stock: [1],
      inventory_status: [StatusType.ACTIVE]
    });
    this.filterForm = this.fb.group({
      measure: [this.measurementUnits[2]],
    });

    this.filterForm = this.fb.group({
      articleNameFilter: [''],
      stockFilter: [''],
      locationFilter: [''],
      measure: [null]  // Agrega 'measure' si necesitas este filtro en particular.
    });


  }

  ngOnInit(): void {
    this.getInventories();
  }

  getInventories(): void {
    this.isLoading = true;
    this.searchInput.valueChanges.subscribe(data => {
      if (data === null || data === '') {
        this.getInventories();
      }
      this.inventories = this.inventories.filter(
        x => x.article.name.toLowerCase().includes(data!.toLowerCase())
      )
    })

    this.inventoryService.getInventories().subscribe((inventories: Inventory[]) => {
      this.inventories = inventories.map(inventory => ({
        ...this.mapperService.toCamelCase(inventory),
      }));
      this.inventories = inventories;
      this.filteredInventories = inventories;
      this.isLoading = false;
      this.inventoryService.getInventories().subscribe((inventories: any[]) => {
        this.inventories = inventories.map(inventory => ({
          ...this.mapperService.toCamelCase(inventory), // Convertir todo el inventario a camelCase
          article: this.mapperService.toCamelCase(inventory.article) // Convertir el artículo a camelCase
        }));
      });
      console.log(this.inventories)
    })
  };

  // Método para convertir la unidad de medida a una representación amigable
  getDisplayUnit(unit: MeasurementUnit): string {
    switch (unit) {
      case MeasurementUnit.LITERS:
        return 'Lts.';
      case MeasurementUnit.KILOS:
        return 'Kg.';
      case MeasurementUnit.UNITS:
        return 'Ud.';
      default:
        return unit; // Retorna el valor original si no coincide
    }
  }

  deleteInventory(id: number): void {
    Swal.fire({
      title: '¿Estas Seguro?',
      text: 'No podrás revertir esto',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#3085d6',
      cancelButtonColor: '#d33',
      confirmButtonText: 'Sí, eliminar',
      cancelButtonText: 'Cancelar'
    }).then(result => {
      if (result.isConfirmed) {
        this.inventoryService.deleteInventory(id).subscribe(() => {
          this.getInventories();
          this.toastService.sendSuccess('El inventario ha sido eliminado con éxito.');
        });
      }
    });
  }
  clearFilters(): void {
    this.filterForm.reset();  // Reinicia todos los filtros
    this.applyFilters();      // Aplica los filtros después de limpiar para actualizar la lista
  }
  applyFilters(): void {
    const filters = this.filterForm.value;

    this.inventoryService.getFilteredInventories(filters).subscribe({
      next: (filteredInventories) => {
        this.inventories = filteredInventories;  // Actualiza la lista con los inventarios filtrados
      },
      error: () => {
        alert('Hubo un problema al aplicar los filtros');
      }
    });
  }

  resetForm(): void {
    this.isEditing = false; // Desactivar el modo edición
    this.editingInventoryId = null; // Limpiar el ID del inventario en edición
    this.inventoryForm.reset({ stock: 1, min_stock: 1, inventory_status: 'Active' });
  }

  onNewTransaction(inventory: Inventory) {
    this.selectedInventory = inventory;
    this.showRegisterTransactionForm = !this.showRegisterTransactionForm;
  }
  onTransactions(inventory: Inventory) {
    this.selectedInventory = inventory;
    this.showTransactions = !this.showTransactions;
  }
  onInventoryUpdate(inventory: Inventory) {
    this.selectedInventory = inventory;
    this.showInventoryUpdate = true;
  }

  onRegisterTransactionClose() {
    console.log('onRegisterTransactionClose');
    debugger
    this.showRegisterTransactionForm = this.showRegisterTransactionForm;
    this.getInventories();
  }
  onTransactionsClose() {
    this.showTransactions = this.showTransactions;
    this.selectedInventory = null;
  }
  onInventoryUpdateClose() {
    debugger
    this.showInventoryUpdate = false;
    this.selectedInventory = null;
    this.getInventories();
  }

  onNewArticle() {
    this.showRegisterForm = !this.showRegisterForm;
  }
  onRegisterClose() {
    this.showRegisterForm = this.showRegisterForm;
  }

  currentPage: number = 0;
  itemsPerPage: number = 10;
  totalPages: number = 1;
  totalElements: number = 0;

  //Filtros
  showFilterModal: boolean = false;
  filteredInventories: Inventory[] = [];
  isLoading = false;
  originalInventories: Inventory[] = []; // Lista completa de inventarios (sin filtrar)
  currentFilter: string = 'all';          // Filtro actual

  // Filtros individuales para búsqueda en tiempo real
  articleNameFilter = new FormControl('');
  stockFilter = new FormControl('');
  minStockFilter = new FormControl('');
  locationFilter = new FormControl('');
  measurementUnits: MeasurementUnit[] = [MeasurementUnit.LITERS, MeasurementUnit.KILOS, MeasurementUnit.UNITS];


  // Formulario para filtros que requieren llamada al servidor
  filterForm: FormGroup;
  readonly MeasurementUnit = MeasurementUnit;

  selectedInventory: Inventory | null = null;
  showModalFilter: boolean = false;

  loadInventories(): void {
    this.inventoryService.getInventoriesPageable(this.currentPage, this.itemsPerPage)
      .subscribe({
        next: (page) => {
          console.log(page)
          page = this.mapperService.toCamelCase(page);
          console.log(page);
          this.inventories = this.mapperService.toCamelCase(page.content)
          this.totalPages = page.totalPages;
          this.totalElements = page.totalElements;
          this.currentPage = page.number;
        },
        error: (error) => {
          console.error('Error loading inventories:', error);
          // Handle error appropriately
        }
      });
  }
  filterActiveInventories(): void {
    this.currentFilter = 'active';
    this.inventories = this.originalInventories.filter(inventory => inventory.status === StatusType.ACTIVE);
  }

  filterInactiveInventories(): void {
    this.currentFilter = 'inactive';
    this.inventories = this.originalInventories.filter(inventory => inventory.status !== StatusType.ACTIVE);
  }

  showAllInventories(): void {
    this.currentFilter = 'all';
    this.inventories = [...this.originalInventories];
  }


  goToNextPage(): void {
    if (this.currentPage < this.totalPages - 1) {
      this.currentPage++;
      this.loadInventories();
    }
  }

  goToPreviousPage(): void {
    if (this.currentPage > 0) {
      this.currentPage--;
      this.loadInventories();
    }
  }

  onPageSizeChange(event: any): void {
    this.itemsPerPage = event.target.value;
    this.currentPage = 0; // Reset to first page
    this.loadInventories();
  }
  exportToPDF(): void {
    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4',
    });
    const title = 'Listado de Inventario';
    doc.setFontSize(20);
    doc.setTextColor(40, 40, 40);
    doc.text(title, doc.internal.pageSize.getWidth() / 2, 20, { align: 'center' });

    const tableColumn = ['Identificador', 'Artículo', 'Descripcion', 'Stock', 'Medida', 'Stock Mínimo', 'Ubicación'];
    const tableRows: any[][] = [];

    this.inventories.forEach(inventory => {
      const inventoryData = [
        inventory.article.identifier,
        inventory.article.name,
        inventory.article.description,
        inventory.stock,
        this.getDisplayUnit(inventory.article.measurementUnit),
        inventory.minStock,
        inventory.location
      ];
      tableRows.push(inventoryData);
    });

    autoTable(doc, {
      head: [tableColumn],
      body: tableRows,
      startY: 25,
    });

    doc.save('inventario.pdf');
  }

  exportToExcel(): void {
    try {
      let element = document.getElementById('inventoryTable');
      if (!element) {
        console.warn('No se encontró el elemento con el ID "inventoryTable"');
        element = this.createTableFromData();
      }
      const ws: XLSX.WorkSheet = XLSX.utils.table_to_sheet(element);
      const wb: XLSX.WorkBook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Inventario');
      XLSX.writeFile(wb, 'inventario.xlsx');
    } catch (error) {
      console.error('Error al exportar a Excel:', error);
    }
  }

  private createTableFromData(): HTMLTableElement {
    const table = document.createElement('table');
    const thead = table.createTHead();
    const tbody = table.createTBody();

    const headerRow = thead.insertRow();
    const headers = ['Identificador', 'Artículo', 'Descripcion', 'Stock', 'Medida', 'Stock Mínimo', 'Ubicación'].forEach(text => {
      const th = document.createElement('th');
      th.textContent = text;
      headerRow.appendChild(th);
    });

    this.inventories.forEach(inventory => {
      const unid = this.getDisplayUnit(inventory.article.measurementUnit);
      const row = tbody.insertRow();
      [inventory.article.identifier, inventory.article.name, inventory.article.description, inventory.stock, unid, inventory.minStock, inventory.location].forEach(text => {
        const cell = row.insertCell();
        cell.textContent = text !== undefined && text !== null ? text.toString() : null;
      });
    });

    return table;
  }

  sort(column: string): void {
    this.sortDirection = this.sortColumn === column ? (this.sortDirection === 'asc' ? 'desc' : 'asc') : 'asc';
    this.sortColumn = column;

    // Ordena la lista
    this.inventories = [...this.inventories].sort((a, b) => {
      // const valueA = a[column];
      //   const valueB = b[column];

      // if (valueA == null || valueB == null) return 0; // Evita ordenamiento si es null o undefined

      // if (valueA < valueB) return this.sortDirection === 'asc' ? -1 : 1;
      // if (valueA > valueB) return this.sortDirection === 'asc' ? 1 : -1;
      return 0;
    });
  }
}
