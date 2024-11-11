import { Component, ElementRef, inject, OnInit, ViewChild } from '@angular/core';
import { FormBuilder, FormControl, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { InventoryService } from '../../../services/inventory.service';
import { Inventory, Transaction } from '../../../models/inventory.model';
import { Chart, ChartType, registerables } from 'chart.js';
import { CommonModule } from '@angular/common';
import { MainContainerComponent } from 'ngx-dabd-grupo01';
import { MapperService } from '../../../services/MapperCamelToSnake/mapper.service';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { InventoryDashboardInfoComponent } from './inventory-dashboard-info/inventory-dashboard-info.component';
import { InventoryDashComponent } from "../../dashboard/inventory-dash/inventory-dash.component";

Chart.register(...registerables);

@Component({
  selector: 'app-inventory-dashboard',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, MainContainerComponent, InventoryDashComponent],
  templateUrl: './inventory-dashboard.component.html',
  styleUrls: ['./inventory-dashboard.component.css']
})
export class InventoryDashboardComponent implements OnInit {
  @ViewChild('stockStatusChart') stockStatusChartRef!: ElementRef;
  @ViewChild('stockByCategoryChart') stockByCategoryChartRef!: ElementRef;
  @ViewChild('rotationTrendChart') rotationTrendChartRef!: ElementRef;

  mapperService = inject(MapperService);
  private modalService = inject(NgbModal);

  // Propiedades para KPIs
  totalStock: number = 0;
  criticalStockCount: number = 0;
  normalStockCount: number = 0;
  averageRotation: number = 0;
  mostCommonCategory: string = '';

  // Datos para gráficos
  inventories: Inventory[] = [];
  rotationData: { [key: string]: number } = {};
  stockStatusData = {
    normal: 0,
    critical: 0,
    excess: 0
  };
  categoryStockData: { [key: string]: number } = {};

  searchInput = new FormControl('');
  filterForm: FormGroup;

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
        this.calculateMetrics();
      },
      error: (error) => {
        console.error('Error fetching inventories:', error);
      }
    });
  }

  calculateMetrics(): void {
    // Reiniciar contadores
    this.totalStock = 0;
    this.criticalStockCount = 0;
    this.normalStockCount = 0;
    this.rotationData = {};
    this.categoryStockData = {};
    let totalRotation = 0;
    let rotationCount = 0;

    // Procesamiento de inventarios
    this.inventories.forEach((inventory) => {
      const mappedInventory = this.mapperService.toCamelCase(inventory);
      const article = mappedInventory.article;

      // Actualizar stock total
      this.totalStock += mappedInventory.stock || 0;

      // Conteo de stock crítico/normal
      if (mappedInventory.stock <= mappedInventory.minStock) {
        this.criticalStockCount++;
      } else {
        this.normalStockCount++;
      }

      // Cálculo de rotación
      if (mappedInventory.transactions?.length) {
        const rotation = this.calculateRotationIndex(mappedInventory.transactions);
        totalRotation += rotation;
        rotationCount++;
      }

      // Actualizar datos por categoría
      const category = article?.articleCategory?.denomination || 'Sin Categoría';
      this.categoryStockData[category] = (this.categoryStockData[category] || 0) + (mappedInventory.stock || 0);

      // Procesar transacciones para tendencia de rotación
      mappedInventory.transactions?.forEach((transaction: Transaction) => {
        const mappedTransaction = this.mapperService.toCamelCase(transaction);
        if (mappedTransaction.transactionDate) {
          const month = new Date(mappedTransaction.transactionDate).toLocaleString('default', { month: 'long' });
          this.rotationData[month] = (this.rotationData[month] || 0) + 1;
        }
      });
    });

    // Calcular rotación promedio
    this.averageRotation = rotationCount > 0 ? totalRotation / rotationCount : 0;

    // Encontrar categoría más común
    this.mostCommonCategory = this.findMostCommonCategory();

    // Crear gráficos
    this.createCharts();
  }

  private calculateRotationIndex(transactions: Transaction[]): number {
    // Implementar cálculo de índice de rotación
    return transactions.length > 0 ? transactions.length / 30 : 0; // Ejemplo simplificado
  }

  private findMostCommonCategory(): string {
    return Object.entries(this.categoryStockData)
      .sort(([,a], [,b]) => b - a)[0]?.[0] || 'Sin Categoría';
  }

  createCharts(): void {
    this.createStockStatusChart();
    this.createStockByCategoryChart();
    this.createRotationTrendChart();
  }

  createStockStatusChart(): void {
    if (this.stockStatusChartRef) {
      new Chart(this.stockStatusChartRef.nativeElement, {
        type: 'doughnut',
        data: {
          labels: ['Stock Normal', 'Stock Crítico'],
          datasets: [{
            data: [this.normalStockCount, this.criticalStockCount],
            backgroundColor: ['#28a745', '#dc3545']
          }]
        },
        options: {
          responsive: true,
          plugins: {
            legend: {
              position: 'right'
            }
          }
        }
      });
    }
  }

  createStockByCategoryChart(): void {
    if (this.stockByCategoryChartRef) {
      const labels = Object.keys(this.categoryStockData);
      const data = Object.values(this.categoryStockData);

      new Chart(this.stockByCategoryChartRef.nativeElement, {
        type: 'bar',
        data: {
          labels,
          datasets: [{
            label: 'Stock por Categoría',
            data,
            backgroundColor: '#007bff'
          }]
        },
        options: {
          responsive: true,
          scales: {
            y: {
              beginAtZero: true
            }
          }
        }
      });
    }
  }

  createRotationTrendChart(): void {
    if (this.rotationTrendChartRef) {
      const labels = Object.keys(this.rotationData);
      const data = Object.values(this.rotationData);

      new Chart(this.rotationTrendChartRef.nativeElement, {
        type: 'line',
        data: {
          labels,
          datasets: [{
            label: 'Tendencia de Rotación',
            data,
            borderColor: '#17a2b8',
            tension: 0.1
          }]
        },
        options: {
          responsive: true,
          scales: {
            y: {
              beginAtZero: true
            }
          }
        }
      });
    }
  }

  applyFilters(): void {
    const filters = this.filterForm.value;
    this.inventoryService.getFilteredInventories(filters).subscribe({
      next: (filteredInventories) => {
        this.inventories = filteredInventories;
        this.calculateMetrics();
      }
    });
  }

  clearFilters(): void {
    this.filterForm.reset();
    this.getInventories();
  }

  showInfo(): void {
    this.modalService.open(InventoryDashboardInfoComponent, {
      size: 'lg',
      backdrop: 'static',
      keyboard: false,
      centered: true,
      scrollable: true
    });
  }
}