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
import { Router } from '@angular/router';
import { ReactiveFormsModule, UntypedFormControl, UntypedFormGroup } from '@angular/forms';
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
    ReactiveFormsModule
  ],
  providers: [DecimalPipe],
  selector: 'app-inventory-dashboard',
  templateUrl: './inventory-dashboard.component.html',
  styleUrls: ['./inventory-dashboard.component.scss']
})
export class InventoryDashboardComponent implements OnInit {

  mapperService: MapperService = inject(MapperService);
  inventoryService: InventoryService = inject(InventoryService);
  cdr: ChangeDetectorRef = inject(ChangeDetectorRef);
  noData: boolean = false;
  noDataBar: boolean = false;
  private modalService = inject(NgbModal);
  private router = inject(Router);

  // Propiedad para la etiqueta dinámica del KPI
  unitLabel: string = 'unidades'; // Valor inicial

  filtersForm = new UntypedFormGroup({
    unit: new UntypedFormControl(MeasurementUnit.UNITS),
    startDate: new UntypedFormControl(this.getDateOneMonthAgo()),
    endDate: new UntypedFormControl(this.getToday()),
  });

  private getToday(): string {
    const today = new Date();
    return today.toISOString().split('T')[0]; // Formato: YYYY-MM-DD
  }

  private getDateOneMonthAgo(): string {
    const date = new Date();
    date.setMonth(date.getMonth() - 12);
    return date.toISOString().split('T')[0]; // Formato: YYYY-MM-DD
  }


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
    this.applyFilters();
  }

  private updateMetricsAndCharts(selectedUnit: string): void {
    forkJoin({
        inventories: this.inventoryService.getInventories(),
        transactions: this.inventoryService.getTransactions()
    }).subscribe(({ inventories }) => {
        const camelCaseInventories = inventories.map(inv => this.mapperService.toCamelCase(inv));

        // Calcular métricas considerando todos los inventarios
        this.calculateMetrics(camelCaseInventories);

        // Filtrar inventarios solo para las métricas específicas de la unidad seleccionada
        const filteredInventories = camelCaseInventories.filter(inv => inv.article.measurementUnit === selectedUnit);

        // Actualizar gráficos
        this.updateCharts(filteredInventories);
    });
}

applyFilters(): void {
  const { unit, startDate, endDate } = this.filtersForm.value;

  if (unit) {
    // Actualizar el subtítulo dinámico del KPI
    this.unitLabel = this.getUnitLabel(unit);

    // Actualizar métricas globales y gráficos
    this.updateMetricsAndCharts(unit);

    // Cargar tendencias de transacciones basadas en las fechas y unidad seleccionada
    this.inventoryService.getFilteredInventory(unit, startDate, endDate).subscribe({
      next: (filteredInventories: Inventory[]) => {
        console.log('Respuesta del backend:', filteredInventories);

        const camelCaseInventories = filteredInventories.map(inv => this.mapperService.toCamelCase(inv));
        console.log('Datos mapeados a camelCase:', camelCaseInventories);

        // Actualizar métricas específicas de transacciones
        this.calculateTransactionMetrics(camelCaseInventories);
      },
      error: (error) => console.error('Error al cargar las tendencias de transacciones:', error)
    });
  } else {
    console.warn('Unidad no seleccionada en los filtros.');
  }
}


  resetFilters(): void {
    this.filtersForm.reset({
      unit: MeasurementUnit.UNITS,
      startDate: this.getDateOneMonthAgo(),
      endDate: this.getToday(),
    });
    console.log('Filtros restablecidos:', this.filtersForm.value);
    this.applyFilters();
  }


  private loadInventoryData(): void {
    console.log('Cargando datos iniciales...');
    forkJoin({
      inventories: this.inventoryService.getInventories(),
      transactions: this.inventoryService.getTransactions()
    }).subscribe({
      next: ({ inventories, transactions }) => {
        console.log('Datos de inventarios recibidos:', inventories);
        console.log('Datos de transacciones recibidos:', transactions);

        const camelCaseInventories = inventories.map(inv => this.mapperService.toCamelCase(inv));
        const camelCaseTransactions = transactions.map(trans => this.mapperService.toCamelCase(trans));

        console.log('Inventarios procesados:', camelCaseInventories);
        console.log('Transacciones procesadas:', camelCaseTransactions);

        this.calculateMetrics(camelCaseInventories);
        this.updateCharts(camelCaseInventories);
      },
      error: (error) => console.error('Error al cargar los datos:', error)
    });
  }


  private calculateMetrics(allInventories: Inventory[]): void {
    console.log('Calculando métricas para inventarios:', allInventories);

    // Filtrar inventarios según la unidad seleccionada
    const selectedUnit = this.filtersForm.get('unit')?.value;

    // Calcular total de artículos solo para la unidad seleccionada
    this.metrics.totalItems = allInventories
        .filter(inv => inv.article?.measurementUnit === selectedUnit)
        .reduce((sum, inv) => sum + (inv.stock || 0), 0);

    console.log('Total de artículos:', this.metrics.totalItems);

    // Calcular el valor total del inventario sin importar la unidad
    this.metrics.totalValue = allInventories.reduce((sum, inv) => {
        const lastTransactionWithPrice = inv.transactions?.slice().reverse().find(t => t.price !== null && t.price !== undefined);
        const price = lastTransactionWithPrice?.price || 0;
        return sum + ((inv.stock || 0) * price);
    }, 0);

    console.log('Valor total del inventario:', this.metrics.totalValue);

    // Identificar los artículos con bajo stock
    const lowStockItems = allInventories.filter(inv => {
        const isLowStock = inv.stock !== null && inv.minStock !== null && inv.stock <= inv.minStock && inv.stock > 0;
        return isLowStock;
    });
    this.metrics.lowStockItems = lowStockItems.length;

    console.log('Artículos con stock bajo:', this.metrics.lowStockItems);

    // Agrupar por categoría
    this.metrics.stockByCategory = new Map<string, number>();
    allInventories.forEach(inv => {
        const category = inv.article?.articleCategory;
        if (category && category.denomination) {
            const currentStock = this.metrics.stockByCategory.get(category.denomination) || 0;
            this.metrics.stockByCategory.set(category.denomination, currentStock + (inv.stock || 0));
        }
    });

    console.log('Stock por categoría:', Array.from(this.metrics.stockByCategory.entries()));

    // Calcular el artículo con más movimiento considerando todos los inventarios
    this.calculateMostMovedArticle(allInventories);

    console.log('Artículo con más movimiento:', this.metrics.mostArticleUsed);
}


private calculateTransactionMetrics(inventories: Inventory[]): void {
  console.log('Inventarios para métricas de transacciones:', inventories);

  const transactionTrends = new Map<string, { entries: number; outputs: number }>();

  inventories.forEach(inv => {
    inv.transactions.forEach(trans => {
      console.log('Procesando transacción:', trans);

      if (trans.transactionDate) {
        const date = new Date(trans.transactionDate);
        const monthKey = `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}`;
        const current = transactionTrends.get(monthKey) || { entries: 0, outputs: 0 };

        if (trans.transactionType === TransactionType.ENTRY) {
          current.entries += trans.quantity || 0;
        } else if (trans.transactionType === TransactionType.OUTPUT) {
          current.outputs += trans.quantity || 0;
        }

        transactionTrends.set(monthKey, current);
      }
    });
  });

  this.metrics.transactionTrends = {
    labels: Array.from(transactionTrends.keys()),
    entries: Array.from(transactionTrends.values()).map(v => v.entries),
    outputs: Array.from(transactionTrends.values()).map(v => v.outputs)
  };

  console.log('Tendencias de transacciones calculadas:', this.metrics.transactionTrends);
}


private updateCharts(inventories: Inventory[]): void {
  const stockByCategory = new Map<string, number>();
  inventories.forEach(inv => {
    const category = inv.article?.articleCategory?.denomination;
    if (category) {
      const currentStock = stockByCategory.get(category) || 0;
      stockByCategory.set(category, currentStock + (inv.stock || 0));
    }
  });

  const categoryEntries = Array.from(stockByCategory.entries());
  const colors = this.getColorsForData(categoryEntries.length);

  this.categoryChartData = {
    labels: categoryEntries.map(([category]) => category),
    datasets: [{
      data: categoryEntries.map(([_, value]) => value),
      backgroundColor: colors
    }]
  };

  this.transactionTrendsChartData = {
    labels: this.metrics.transactionTrends.labels,
    datasets: [
      { label: 'Entradas', data: this.metrics.transactionTrends.entries, backgroundColor: 'rgba(76, 175, 80, 0.8)' },
      { label: 'Salidas', data: this.metrics.transactionTrends.outputs, backgroundColor: 'rgba(244, 67, 54, 0.8)' }
    ]
  };

  console.log('Datos finales del gráfico de transacciones:', this.transactionTrendsChartData);
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

    // Método para obtener la etiqueta dinámica del KPI
    private getUnitLabel(unit: string): string {
      switch (unit) {
        case MeasurementUnit.UNITS:
          return 'unidades';
        case MeasurementUnit.KILOS:
          return 'kilos';
        case MeasurementUnit.LITERS:
          return 'litros';
        default:
          return 'medida desconocida';
      }
    }

  public capitalizeFirstLetter(text: string): string {
    if (!text) return '';
    return text.charAt(0).toUpperCase() + text.slice(1);
  }

  private calculateMostMovedArticle(inventories: Inventory[]): void {
    let mostMovedArticle = '';
    let maxTransactions = 0;

    inventories.forEach(inv => {
        const transactionCount = inv.transactions?.length || 0;
        if (transactionCount > maxTransactions) {
            maxTransactions = transactionCount;
            mostMovedArticle = inv.article?.name || ''; // Asume que el artículo tiene un campo `name`
        }
    });

    this.metrics.mostArticleUsed = mostMovedArticle;
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

  showInventoryItems(){
    this.router.navigate(['/inventories']);
  }
}
