import { ChangeDetectorRef, inject } from '@angular/core';
import { AfterViewInit, Component, OnInit } from '@angular/core';
import { BaseChartDirective } from 'ng2-charts';
import { ChartConfiguration, ChartData, registerables } from 'chart.js';
import { ArticleCateg, ArticleCondition, ArticleType, MeasurementUnit } from '../../../models/article.model';
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
import ChartDataLabels from 'chartjs-plugin-datalabels';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { InventoryDashboardInfoComponent } from './inventory-dashboard-info/inventory-dashboard-info.component';
Chart.register(...registerables, ChartDataLabels);
Chart.register(
  ArcElement,
  CategoryScale,
  LinearScale,
  LineElement,
  PointElement,
  Title,
  Tooltip,
  Legend,
  Colors,
);
interface InventoryMetrics {
  totalItems: number;
  totalValue: number;
  lowStockItems: number;
  mostArticleUsed: string;
  stockByCategory: Map<string, number>;
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
  private modalService = inject(NgbModal);

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

   // Configuración del gráfico de tortas (Stock por Categoría)
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

  chartOptions: ChartConfiguration['options'] = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: true, position: 'top' },
      tooltip: { enabled: true, mode: 'index', intersect: false },
      datalabels: {
        display: false // Desactivar datalabels globalmente
      }
    }
  };

categoryChartOptions: ChartConfiguration['options'] = {
  responsive: true,
  plugins: {
    legend: { display: true, position: 'top' },
    tooltip: { enabled: true },
    datalabels: {
      display: true,
      color: '#000000',
      anchor: 'center',
      align: 'center',
      font: {
        weight: 'bold',
        size: 14 // Ajusta el tamaño según tus necesidades
      },
      formatter: (value) => `${value}` // Formato de la etiqueta
    }
  }
};

barChartOptions: ChartConfiguration<'bar'>['options'] = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: { display: true, position: 'top' },
    tooltip: { enabled: true, mode: 'index', intersect: false }
  },
  scales: {
    x: { display: true, stacked: true },
    y: { display: true, stacked: true, beginAtZero: true }
  }
};
transactionTrendsChartData: ChartData<'bar'> = {
  labels: [], // Se actualizará con los meses de las transacciones
  datasets: [
    { label: 'Entradas', data: [], backgroundColor: 'rgba(76, 175, 80, 0.8)', borderColor: 'rgba(76, 175, 80, 1)', borderWidth: 1 },
    { label: 'Salidas', data: [], backgroundColor: 'rgba(244, 67, 54, 0.8)', borderColor: 'rgba(244, 67, 54, 1)', borderWidth: 1 }
  ]
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
     // Filtrar y contar solo artículos registrables con unidad de medida en "unidades"
  this.metrics.totalItems = inventories
  .filter(inv => inv.article?.articleType === ArticleType.REGISTRABLE || inv.article.measurementUnit === MeasurementUnit.UNITS)
  .reduce((sum, inv) => sum + (inv.stock || 0), 0);

console.log("Total de artículos registrables en 'unidades':", this.metrics.totalItems);

    // Total value
    this.metrics.totalValue = inventories.reduce((sum, inv) => {
      const lastTransactionWithPrice = inv.transactions?.slice().reverse().find(t => t.price !== null && t.price !== undefined);
      const price = lastTransactionWithPrice?.price || 0;
      return sum + ((inv.stock || 0) * price);
    }, 0);

    // Low stock items
    const lowStockItems = inventories.filter(inv => {
      console.log(`Artículo: ${inv.article?.name || 'Sin nombre'}`);
      console.log(`Stock actual: ${inv.stock}, Stock mínimo: ${inv.minStock}`);
      const isLowStock = inv.stock !== null && inv.minStock !== null && inv.stock <= inv.minStock && inv.stock > 0;
      console.log(`¿Es stock bajo? ${isLowStock}`);
      return isLowStock;
    });
    this.metrics.lowStockItems = lowStockItems.length;

    console.log("Total de artículos con stock bajo:", this.metrics.lowStockItems);

    // Agrupar el stock total por categoría
    this.metrics.stockByCategory = new Map<string, number>();
    inventories.forEach(inv => {
      const category = inv.article?.articleCategory;
      if (category && category.denomination) {
        const currentStock = this.metrics.stockByCategory.get(category.denomination) || 0;
        this.metrics.stockByCategory.set(category.denomination, currentStock + (inv.stock || 0));
      }
    });

    // Agrupar el stock total por condición
    this.metrics.stockByCondition = new Map();
    inventories.forEach(inv => {
      const condition = inv.article?.articleCondition;
      if (condition) {
        const currentStock = this.metrics.stockByCondition.get(condition) || 0;
        this.metrics.stockByCondition.set(condition, currentStock + (inv.stock || 0));
      }
    });

    // Mapa para contar transacciones por artículo
    const transactionCountMap = new Map<string, { name: string; count: number }>();

    inventories.forEach(inv => {
      if (inv.article?.name && inv.transactions) {
        const totalTransactions = inv.transactions.reduce((sum, t) => sum + (t.quantity || 0), 0);
        const currentCount = transactionCountMap.get(inv.article.name)?.count || 0;
        transactionCountMap.set(inv.article.name, { name: inv.article.name, count: currentCount + totalTransactions });
      }
    });

    // Mostrar detalles de las transacciones por artículo
    console.log("Detalles de transacciones por artículo:", Array.from(transactionCountMap.entries()));

    // Determinar el artículo más transaccionado
    const sortedTransactions = Array.from(transactionCountMap.values()).sort((a, b) => b.count - a.count);
    this.metrics.mostArticleUsed = sortedTransactions.length > 0 ? sortedTransactions[0].name : 'Sin transacciones';

    console.log("Artículo más transaccionado:", this.metrics.mostArticleUsed);
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
  // Convertir el mapa de categorías a un arreglo de entradas para el gráfico de tortas
  const categoryEntries = Array.from(this.metrics.stockByCategory.entries());
  console.log("categoryEntries:", categoryEntries); // Verifica el contenido de categoryEntries

  // Generar colores adicionales en tonos pastel solo si son necesarios
  const colors = this.getColorsForData(categoryEntries.length);
  console.log("colors:", colors); // Verifica los colores generados

  // Asignar los datos agrupados al gráfico de tortas
  this.categoryChartData = {
    labels: categoryEntries.map(([category]) => category),
    datasets: [{
      data: categoryEntries.map(([_, value]) => value),
      backgroundColor: colors
    }]
  };
  console.log("categoryChartData:", this.categoryChartData); // Verifica la estructura final de categoryChartData

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
          { label: 'Entradas', data: this.metrics.transactionTrends.entries, backgroundColor: 'rgba(76, 175, 80, 0.8)', borderColor: 'rgba(76, 175, 80, 1)', borderWidth: 1 },
          { label: 'Salidas', data: this.metrics.transactionTrends.outputs, backgroundColor: 'rgba(244, 67, 54, 0.8)', borderColor: 'rgba(244, 67, 54, 1)', borderWidth: 1 }
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
