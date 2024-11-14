import { ChangeDetectorRef, inject } from '@angular/core';
// inventory-dashboard.component.ts

import { AfterViewInit, Component, OnInit } from '@angular/core';
import { BaseChartDirective } from 'ng2-charts';
import { ChartConfiguration, ChartData } from 'chart.js';
import { ArticleCateg, ArticleCategory, ArticleCondition } from '../../../models/article.model';
import { InventoryService } from '../../../services/inventory.service';
import { Inventory, Transaction, TransactionType } from '../../../models/inventory.model';
import { MainContainerComponent } from 'ngx-dabd-grupo01';
import { CommonModule, DecimalPipe } from '@angular/common';
import { forkJoin } from 'rxjs';
import {
  ArcElement,
  CategoryScale,
  LinearScale,
  LineElement,
  PointElement,
  Title,
  Tooltip,
  Legend,
  Colors
} from 'chart.js';
import { Chart } from 'chart.js';
import { MapperService } from '../../../services/MapperCamelToSnake/mapper.service';
Chart.register(
  ArcElement,
  CategoryScale,
  LinearScale,
  LineElement,
  PointElement,
  Title,
  Tooltip,
  Legend,
  Colors
);
interface InventoryMetrics {
  totalItems: number;
  totalValue: number;
  lowStockItems: number;
  mostArticleUsed: string;
  stockByCategory: Map<ArticleCateg, number>;
  stockByCondition: Map<ArticleCondition, number>;
  transactionTrends: {
    labels: string[];
    entries: number[];
    outputs: number[];
  };
}

@Component({
  standalone: true,
  imports: [
    CommonModule,
    BaseChartDirective,
    MainContainerComponent,
    DecimalPipe,
  ],
  providers: [DecimalPipe],
  selector: 'app-inventory-dashboard',
  templateUrl: './inventory-dashboard.component.html',
  styleUrls: ['./inventory-dashboard.component.scss']
})
export class InventoryDashboardComponent implements OnInit, AfterViewInit {

  mapperService: MapperService = inject(MapperService);
  inventoryService: InventoryService = inject(InventoryService);
  cdr: ChangeDetectorRef = inject(ChangeDetectorRef);

  metrics: InventoryMetrics = {
    totalItems: 0,
    totalValue: 0,
    lowStockItems: 0,
    mostArticleUsed: '',
    stockByCategory: new Map(),
    stockByCondition: new Map(),
    transactionTrends: {
      labels: [],
      entries: [],
      outputs: []
    }
  };

  // Configuración de los gráficos
  categoryChartData: ChartData<'pie'> = {
    labels: [],
    datasets: [{
      data: [],
      backgroundColor: ['rgba(255, 99, 132, 0.8)', 'rgba(54, 162, 235, 0.8)', 'rgba(255, 206, 86, 0.8)']
    }]
  };

  conditionChartData: ChartData<'doughnut'> = {
    labels: [],
    datasets: [{
      data: [],
      backgroundColor: ['rgba(76, 175, 80, 0.8)', 'rgba(244, 67, 54, 0.8)', 'rgba(255, 193, 7, 0.8)']
    }]
  };

  transactionTrendsChartData: ChartData<'line'> = {
    labels: [],
    datasets: [
      { label: 'Entradas', data: [], borderColor: 'rgba(76, 175, 80, 1)', backgroundColor: 'rgba(76, 175, 80, 0.1)', tension: 0.4, fill: true },
      { label: 'Salidas', data: [], borderColor: 'rgba(244, 67, 54, 1)', backgroundColor: 'rgba(244, 67, 54, 0.1)', tension: 0.4, fill: true }
    ]
  };

  chartOptions: ChartConfiguration['options'] = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: { legend: { display: true, position: 'top' }, tooltip: { enabled: true, mode: 'index', intersect: false } },
    scales: { x: { display: true }, y: { display: true, beginAtZero: true } }
  };

  constructor() { }

  ngOnInit(): void {
    this.loadInventoryData();
  }

  ngAfterViewInit(): void {
    console.log('Datos de los gráficos después de la vista:', {
      category: this.categoryChartData,
      condition: this.conditionChartData,
      trends: this.transactionTrendsChartData
    });
  }

  private loadInventoryData(): void {
    forkJoin({
      inventories: this.inventoryService.getInventories(),
      transactions: this.inventoryService.getTransactions()
    }).subscribe({
      next: ({ inventories, transactions }) => {
        // Convertir datos a camelCase
        const camelCaseInventories = inventories.map(inv => this.mapperService.toCamelCase(inv));
        const camelCaseTransactions = transactions.map(trans => this.mapperService.toCamelCase(trans));

        // Calcular métricas y actualizar gráficos
        this.calculateMetrics(camelCaseInventories);
        this.calculateTransactionTrends(camelCaseTransactions);
        this.updateCharts();
      },
      error: (error) => console.error('Error loading data:', error)
    });
  }

  private calculateMetrics(inventories: Inventory[]): void {
    // Total items
    this.metrics.totalItems = inventories.reduce((sum, inv) => sum + (inv.stock || 0), 0);

    // Total value
    this.metrics.totalValue = inventories.reduce((sum, inv) => {
      const lastTransactionWithPrice = inv.transactions?.slice().reverse().find(t => t.price !== null && t.price !== undefined);
      const price = lastTransactionWithPrice?.price || 0;
      return sum + ((inv.stock || 0) * price);
    }, 0);


    // Low stock items
    this.metrics.lowStockItems = inventories.filter(inv => inv.stock !== null && inv.minStock !== null && inv.stock <= inv.minStock && inv.stock > 0).length;

    // Most used article - Artículo con mayor cantidad de movimientos (entradas y salidas)
  const usageMap = new Map<string, { name: string, usage: number }>();

  inventories.forEach(inv => {
    if (inv.article?.name && inv.transactions?.length > 0) {
      // Sumar todas las transacciones (entradas y salidas)
      const totalMovements = inv.transactions.reduce((sum, t) => sum + (t.quantity || 0), 0);

      // Solo añadir al mapa si tiene movimientos
      if (totalMovements > 0) {
        const currentUsage = usageMap.get(inv.article.name)?.usage || 0;
        usageMap.set(inv.article.name, { name: inv.article.name, usage: currentUsage + totalMovements });
      }
    }
  });

  // Ordenar los artículos por movimientos totales y seleccionar el que tiene más
  const sortedUsage = Array.from(usageMap.values()).sort((a, b) => b.usage - a.usage);
  this.metrics.mostArticleUsed = sortedUsage.length > 0 ? sortedUsage[0].name : 'Sin movimientos';


    // Stock by category and condition
    this.metrics.stockByCategory = new Map();
    this.metrics.stockByCondition = new Map();
    inventories.forEach(inv => {
      const category = inv.article?.articleCategory;
      const condition = inv.article?.articleCondition;
      if (category) {
        const currentStock = this.metrics.stockByCategory.get(category) || 0;
        this.metrics.stockByCategory.set(category, currentStock + (inv.stock || 0));
      }
      if (condition) {
        const currentStock = this.metrics.stockByCondition.get(condition) || 0;
        this.metrics.stockByCondition.set(condition, currentStock + (inv.stock || 0));
      }
    });
  }

  private calculateTransactionTrends(transactions: Transaction[]): void {
    const monthlyTransactions = new Map<string, { entries: number; outputs: number }>();
    transactions.forEach(t => {
      if (t.transactionDate) {
        const date = new Date(t.transactionDate);
        const monthKey = `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}`;
        const current = monthlyTransactions.get(monthKey) || { entries: 0, outputs: 0 };
        if (t.transactionType === TransactionType.ENTRY) {
          current.entries += t.quantity || 0;
        } else {
          current.outputs += t.quantity || 0;
        }
        monthlyTransactions.set(monthKey, current);
      }
    });
    const sortedMonths = Array.from(monthlyTransactions.entries()).sort((a, b) => a[0].localeCompare(b[0])).slice(-6);
    this.metrics.transactionTrends.labels = sortedMonths.map(([month]) => new Date(parseInt(month.split('-')[0]), parseInt(month.split('-')[1]) - 1).toLocaleDateString('es-ES', { month: 'short', year: '2-digit' }));
    this.metrics.transactionTrends.entries = sortedMonths.map(([_, data]) => data.entries);
    this.metrics.transactionTrends.outputs = sortedMonths.map(([_, data]) => data.outputs);
  }

  private updateCharts(): void {
    const categoryEntries = Array.from(this.metrics.stockByCategory.entries());
    // Generar colores adicionales en tonos pastel solo si son necesarios
    const colors = this.getColorsForData(categoryEntries.length);

    this.categoryChartData = {
      labels: categoryEntries.map(([category]) => category.denomination),
      datasets: [{
        data: categoryEntries.map(([_, value]) => value),
        backgroundColor: colors
      }]
    };

    const conditionEntries = Array.from(this.metrics.stockByCondition.entries());
    this.conditionChartData = {
      labels: conditionEntries.map(([condition]) => this.formatCondition(condition)),
      datasets: [{
        data: conditionEntries.map(([_, value]) => value),
        backgroundColor: ['rgba(76, 175, 80, 0.8)', 'rgba(244, 67, 54, 0.8)', 'rgba(255, 193, 7, 0.8)']
      }]
    };

    if (this.metrics.transactionTrends.labels.length > 0) {
      this.transactionTrendsChartData = {
        labels: this.metrics.transactionTrends.labels,
        datasets: [
          { label: 'Entradas', data: this.metrics.transactionTrends.entries, borderColor: 'rgba(76, 175, 80, 1)', backgroundColor: 'rgba(76, 175, 80, 0.1)', tension: 0.4, fill: true },
          { label: 'Salidas', data: this.metrics.transactionTrends.outputs, borderColor: 'rgba(244, 67, 54, 1)', backgroundColor: 'rgba(244, 67, 54, 0.1)', tension: 0.4, fill: true }
        ]
      };
    }
    this.cdr.detectChanges();
  }

  private formatCondition(condition: ArticleCondition): string {
    const conditionMap: Record<ArticleCondition, string> = {
      'FUNCTIONAL': 'Funcional',
      'DEFECTIVE': 'Defectuoso',
      'UNDER_REPAIR': 'En Reparación'
    };
    return conditionMap[condition] || condition;
  }

  // Método para obtener una lista de colores, manteniendo los iniciales y generando tonos pastel si es necesario
  private getColorsForData(dataLength: number): string[] {
    // Paleta base de colores
    const baseColors = [
      'rgba(255, 99, 132, 0.8)', // Rojo
      'rgba(54, 162, 235, 0.8)', // Azul
      'rgba(255, 206, 86, 0.8)', // Amarillo
      'rgba(75, 192, 192, 0.8)', // Verde agua
      'rgba(153, 102, 255, 0.8)', // Morado
      'rgba(255, 159, 64, 0.8)'   // Naranja
    ];

    // Copiar los colores base y agregar colores pastel adicionales si es necesario
    const colors = [...baseColors];
    while (colors.length < dataLength) {
      colors.push(this.generatePastelColor());
    }
    return colors.slice(0, dataLength);
  }

  // Método para generar un color pastel aleatorio
  private generatePastelColor(): string {
    const r = Math.floor((Math.random() * 127) + 127);
    const g = Math.floor((Math.random() * 127) + 127);
    const b = Math.floor((Math.random() * 127) + 127);
    return `rgba(${r}, ${g}, ${b}, 0.8)`;
  }
}
