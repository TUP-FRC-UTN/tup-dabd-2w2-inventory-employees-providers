import { Component, ElementRef, inject, OnInit, ViewChild } from '@angular/core';
import { FormBuilder, FormControl, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { InventoryService } from '../../../services/inventory.service';
import { Inventory } from '../../../models/inventory.model';
import { Chart, ChartType, registerables } from 'chart.js';
import { CommonModule } from '@angular/common';
import { MainContainerComponent } from 'ngx-dabd-grupo01';
import { MapperService } from '../../../services/MapperCamelToSnake/mapper.service';

Chart.register(...registerables);

@Component({
  selector: 'app-inventory-dashboard',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule,MainContainerComponent],
  templateUrl: './inventory-dashboard.component.html',
  styleUrls: ['./inventory-dashboard.component.css']
})
export class InventoryDashboardComponent implements OnInit {

  mapperService: MapperService =  inject(MapperService);
  @ViewChild('rotationInventoryChart') rotationInventoryChartRef!: ElementRef;
  @ViewChild('stockLevelChart') stockLevelChartRef!: ElementRef;
  @ViewChild('stockByCategoryChart') stockByCategoryChartRef!: ElementRef;

  searchInput = new FormControl('');
  filterForm: FormGroup;

  inventories: Inventory[] = [];
  rotationData: { [key: string]: number } = {}; // Datos para rotación de inventario por mes
  criticalStockData: { critical: number; adequate: number } = { critical: 0, adequate: 0 }; // Datos de stock crítico
  categoryStockData: { [key: string]: number } = {}; // Datos para el gráfico de stock por categoría

  constructor(
    private inventoryService: InventoryService,
    private fb: FormBuilder
  ) {
    this.filterForm = this.fb.group({
      articleNameFilter: [''],
      stockFilter: [''],
      locationFilter: [''],
      measure: [null]
    });
  }

  ngOnInit(): void {
    this.getInventories();
  }

  getInventories(): void {
    this.inventoryService.getInventories().subscribe({
      next: (inventories) => {
        this.inventories = inventories;
        this.calculateMetrics(); // Llama a calculateMetrics después de obtener los datos
      },
      error: (error) => {
        console.error('Error fetching inventories:', error);
      }
    });
  }

  applyFilters(): void {
    const filters = this.filterForm.value;
    this.inventoryService.getFilteredInventories(filters).subscribe(filteredInventories => {
      this.inventories = filteredInventories;
      this.calculateMetrics();
      this.createCharts();
    });
  }

  clearFilters(): void {
    this.filterForm.reset();
    this.getInventories();
  }

  calculateMetrics(): void {
    // Inicializamos los datos de métricas
    this.rotationData = {}; // Inicializamos la rotación de inventario por mes
    this.criticalStockData = { critical: 0, adequate: 0 }; // Nivel de stock crítico
    this.categoryStockData = {}; // Nivel de stock por categoría

    // Iteramos sobre la lista de inventarios
    this.inventories.forEach((inventory) => {
      // Convertir el objeto article a camelCase
      const article = this.mapperService.toCamelCase(inventory.article); // Convierte article a camelCase

      // Verificación de las transacciones para calcular rotación de inventario
      inventory.transactions?.forEach(transaction => {
        // Convertir la transacción a camelCase
        const mappedTransaction = this.mapperService.toCamelCase(transaction); // Convierte transaction a camelCase

        if (mappedTransaction.transactionDate) { // Verificamos si transactionDate está definido
          const month = new Date(mappedTransaction.transactionDate).toLocaleString('default', { month: 'long' });
          this.rotationData[month] = (this.rotationData[month] || 0) + 1;
        }
      });

      // Cálculo de Nivel de Stock Crítico
      const stock = inventory.stock;
      const minStock = inventory.minStock;
      if (stock !== undefined && minStock !== undefined) {
        if (stock <= minStock) {
          this.criticalStockData.critical += 1;
        } else {
          this.criticalStockData.adequate += 1;
        }
      }

      // Cálculo de Nivel de Stock por Categoría
      const category = article?.articleCategory?.denomination || 'Sin Categoría'; // Usamos article convertido
      this.categoryStockData[category] = (this.categoryStockData[category] || 0) + (stock || 0);
    });

    // Llama a los métodos para crear gráficos
    this.createRotationInventoryChart();
    this.createStockLevelChart();
    this.createStockByCategoryChart();
  }




  createCharts(): void {
    this.createRotationInventoryChart();
    this.createStockLevelChart();
    this.createStockByCategoryChart();
  }

  createRotationInventoryChart(): void {
    const labels = Object.keys(this.rotationData);
    const data = Object.values(this.rotationData);
    new Chart(this.rotationInventoryChartRef.nativeElement, {
      type: 'bar' as ChartType,
      data: {
        labels,
        datasets: [{
          label: 'Rotación de Inventario',
          data,
          backgroundColor: '#007bff'
        }]
      },
      options: { responsive: true }
    });
  }

  createStockLevelChart(): void {
    const critical = this.criticalStockData.critical;
    const adequate = this.criticalStockData.adequate;
    new Chart(this.stockLevelChartRef.nativeElement, {
      type: 'pie' as ChartType,
      data: {
        labels: ['Stock Crítico', 'Stock Adecuado'],
        datasets: [{
          data: [critical, adequate],
          backgroundColor: ['#dc3545', '#28a745']
        }]
      },
      options: { responsive: true }
    });
  }

  createStockByCategoryChart(): void {
    const labels = Object.keys(this.categoryStockData);
    const data = Object.values(this.categoryStockData);

    new Chart(this.stockByCategoryChartRef.nativeElement, {
      type: 'pie' as ChartType,
      data: {
        labels,
        datasets: [{
          data,
          backgroundColor: ['#007bff', '#ffc107', '#28a745']
        }]
      },
      options: { responsive: true }
    });
  }


  openModalFilters(): void {
    // Abre el modal de filtros
  }

  closeModalFilters(): void {
    // Cierra el modal de filtros
  }
}
