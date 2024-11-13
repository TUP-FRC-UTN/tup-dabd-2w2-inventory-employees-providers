// inventory-dashboard.component.ts

import { AfterViewInit, Component, OnInit } from '@angular/core';
import { BaseChartDirective  } from 'ng2-charts';
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
export class InventoryDashboardComponent implements OnInit , AfterViewInit {
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

  categoryChartData: ChartData<'pie'> = {
    labels: [],
    datasets: [{
      data: [],
      backgroundColor: [
        'rgba(255, 99, 132, 0.8)',
        'rgba(54, 162, 235, 0.8)',
        'rgba(255, 206, 86, 0.8)',
        'rgba(75, 192, 192, 0.8)',
        'rgba(153, 102, 255, 0.8)'
      ],
      hoverBackgroundColor: [
        'rgba(255, 99, 132, 1)',
        'rgba(54, 162, 235, 1)',
        'rgba(255, 206, 86, 1)',
        'rgba(75, 192, 192, 1)',
        'rgba(153, 102, 255, 1)'
      ]
    }]
  };

  conditionChartData: ChartData<'doughnut'> = {
    labels: [],
    datasets: [{
      data: [],
      backgroundColor: [
        'rgba(76, 175, 80, 0.8)',
        'rgba(244, 67, 54, 0.8)',
        'rgba(255, 193, 7, 0.8)'
      ],
      hoverBackgroundColor: [
        'rgba(76, 175, 80, 1)',
        'rgba(244, 67, 54, 1)',
        'rgba(255, 193, 7, 1)'
      ]
    }]
  };

  transactionTrendsChartData: ChartData<'line'> = {
    labels: [],
    datasets: [
      {
        label: 'Entradas',
        data: [],
        borderColor: 'rgba(76, 175, 80, 1)',
        backgroundColor: 'rgba(76, 175, 80, 0.1)',
        tension: 0.4,
        fill: true
      },
      {
        label: 'Salidas',
        data: [],
        borderColor: 'rgba(244, 67, 54, 1)',
        backgroundColor: 'rgba(244, 67, 54, 0.1)',
        tension: 0.4,
        fill: true
      }
    ]
  };

  chartOptions: ChartConfiguration['options'] = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: true,
        position: 'top',
      },
      tooltip: {
        enabled: true,
        mode: 'index',
        intersect: false,
      }
    },
    scales: {
      x: {
        display: true,
      },
      y: {
        display: true,
        beginAtZero: true
      }
    }
  };

  constructor(private inventoryService: InventoryService) {
    console.log('InventoryDashboardComponent initialized');
  }

  ngOnInit(): void {
    this.loadInventoryData();
  }

  private loadInventoryData(): void {
    console.log('Loading inventory data...');
    forkJoin({
      inventories: this.inventoryService.getInventories(),
      transactions: this.inventoryService.getTransactions()
    }).subscribe({
      next: ({ inventories, transactions }) => {
        console.log('Data loaded:', { inventories, transactions });
        this.calculateMetrics(inventories);
        this.calculateTransactionTrends(transactions);
        this.updateCharts();
      },
      error: (error) => {
        console.error('Error loading data:', error);
      }
    });
  }

  private calculateMetrics(inventories: Inventory[]): void {
    console.log('Calculating metrics for inventories:', inventories);
    
    // Total items
    this.metrics.totalItems = inventories.reduce((sum, inv) => sum + (inv.stock || 0), 0);
    console.log('Total items:', this.metrics.totalItems);

    // Total value
    this.metrics.totalValue = inventories.reduce((sum, inv) => {
      const lastTransactionWithPrice = inv.transactions?.slice()
        .reverse()
        .find(t => t.price !== null && t.price !== undefined);
      const price = lastTransactionWithPrice?.price || 0;
      return sum + ((inv.stock || 0) * price);
    }, 0);
    console.log('Total value:', this.metrics.totalValue);

    // Low stock items
    this.metrics.lowStockItems = inventories.filter(inv => {
      console.log('Checking low stock for:', inv.article.name, 'Stock:', inv.stock, 'MinStock:', inv.minStock);
      return inv.stock !== undefined && 
             inv.stock !== null && 
             inv.minStock !== undefined && 
             inv.minStock !== null && 
             inv.stock <= inv.minStock &&
             inv.stock > 0; // Solo contar items que aún tienen stock
    }).length;

    // Most used article - FIXED
    const usageMap = new Map<string, { name: string, usage: number }>();
    
    // Primero, calculamos el uso total para cada artículo
    inventories.forEach(inv => {
      if (inv.article?.name && inv.transactions?.length > 0) {
        // Calcular salidas totales
        const outputs = inv.transactions
          .filter(t => t.transactionType === TransactionType.OUTPUT)
          .reduce((sum, t) => sum + (t.quantity || 0), 0);
          
        // Actualizar el mapa de uso
        const currentUsage = usageMap.get(inv.article.name)?.usage || 0;
        usageMap.set(inv.article.name, {
          name: inv.article.name,
          usage: currentUsage + outputs
        });
        
        console.log(`Usage for ${inv.article.name}:`, outputs);
      }
    });
    
    const sortedUsage = Array.from(usageMap.values())
      .sort((a, b) => b.usage - a.usage);

    // Asignar el artículo más usado
    if (sortedUsage.length > 0) {
      this.metrics.mostArticleUsed = sortedUsage[0].name;
      console.log('Most used articles:', sortedUsage);
    } else {
      this.metrics.mostArticleUsed = 'Sin movimientos';
    }
    console.log('Most used article:', this.metrics.mostArticleUsed);

    // Stock by category
    this.metrics.stockByCategory = new Map();
    inventories.forEach(inv => {
      if (inv.article?.articleCategory) {
        const category = inv.article.articleCategory;
        const currentStock = this.metrics.stockByCategory.get(category) || 0;
        this.metrics.stockByCategory.set(category, currentStock + (inv.stock || 0));
      }
    });
    console.log('Stock by category:', Array.from(this.metrics.stockByCategory.entries()));

    // Stock by condition
    this.metrics.stockByCondition = new Map();
    inventories.forEach(inv => {
      if (inv.article?.articleCondition) {
        const condition = inv.article.articleCondition;
        const currentStock = this.metrics.stockByCondition.get(condition) || 0;
        this.metrics.stockByCondition.set(condition, currentStock + (inv.stock || 0));
      }
    });
    console.log('Stock by condition:', Array.from(this.metrics.stockByCondition.entries()));
  }

  private calculateTransactionTrends(transactions: Transaction[]): void {
    console.log('Calculating transaction trends:', transactions);
    
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

    const sortedMonths = Array.from(monthlyTransactions.entries())
      .sort((a, b) => a[0].localeCompare(b[0]))
      .slice(-6);

    this.metrics.transactionTrends.labels = sortedMonths.map(([month]) => {
      const [year, monthNum] = month.split('-');
      return new Date(parseInt(year), parseInt(monthNum) - 1)
        .toLocaleDateString('es-ES', { month: 'short', year: '2-digit' });
    });
    this.metrics.transactionTrends.entries = sortedMonths.map(([_, data]) => data.entries);
    this.metrics.transactionTrends.outputs = sortedMonths.map(([_, data]) => data.outputs);
    
    console.log('Transaction trends calculated:', this.metrics.transactionTrends);
  }

  private updateCharts(): void {
    console.log('Actualizando gráficos...');

    // Actualizar gráfico de categorías
    const categoryEntries = Array.from(this.metrics.stockByCategory.entries());
    this.categoryChartData = {
      labels: categoryEntries.map(([category]) => category.denomination),
      datasets: [{
        data: categoryEntries.map(([_, value]) => value),
        backgroundColor: [
          'rgba(255, 99, 132, 0.8)',
          'rgba(54, 162, 235, 0.8)',
          'rgba(255, 206, 86, 0.8)',
          'rgba(75, 192, 192, 0.8)',
          'rgba(153, 102, 255, 0.8)'
        ]
      }]
    };
    console.log('Datos del gráfico de categorías:', this.categoryChartData);

    // Actualizar gráfico de condición
    const conditionEntries = Array.from(this.metrics.stockByCondition.entries());
    this.conditionChartData = {
      labels: conditionEntries.map(([condition]) => this.formatCondition(condition)),
      datasets: [{
        data: conditionEntries.map(([_, value]) => value),
        backgroundColor: [
          'rgba(76, 175, 80, 0.8)',
          'rgba(244, 67, 54, 0.8)',
          'rgba(255, 193, 7, 0.8)'
        ]
      }]
    };
    console.log('Datos del gráfico de condición:', this.conditionChartData);

    // Actualizar gráfico de tendencias
    if (this.metrics.transactionTrends.labels.length > 0) {
      this.transactionTrendsChartData = {
        labels: this.metrics.transactionTrends.labels,
        datasets: [
          {
            label: 'Entradas',
            data: this.metrics.transactionTrends.entries,
            borderColor: 'rgba(76, 175, 80, 1)',
            backgroundColor: 'rgba(76, 175, 80, 0.1)',
            tension: 0.4,
            fill: true
          },
          {
            label: 'Salidas',
            data: this.metrics.transactionTrends.outputs,
            borderColor: 'rgba(244, 67, 54, 1)',
            backgroundColor: 'rgba(244, 67, 54, 0.1)',
            tension: 0.4,
            fill: true
          }
        ]
      };
      console.log('Datos del gráfico de tendencias:', this.transactionTrendsChartData);
    }
  }

  private formatCondition(condition: ArticleCondition): string {
    const conditionMap: Record<ArticleCondition, string> = {
      'FUNCTIONAL': 'Funcional',
      'DEFECTIVE': 'Defectuoso',
      'UNDER_REPAIR': 'En Reparación'
    };
    return conditionMap[condition] || condition;
  }
  ngAfterViewInit() {
    console.log('Datos de los gráficos después de la vista:', {
      category: this.categoryChartData,
      condition: this.conditionChartData,
      trends: this.transactionTrendsChartData
    });
  }
}