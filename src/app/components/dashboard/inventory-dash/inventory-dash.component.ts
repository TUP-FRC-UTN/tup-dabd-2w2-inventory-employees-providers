
// inventory-dash.component.ts
import { Component, OnInit } from '@angular/core';
import { InventoryService } from '../../../services/inventory.service';
import { ChartConfiguration, ChartData } from 'chart.js';
import { Inventory, Transaction, TransactionType } from '../../../models/inventory.model';
import { CommonModule, DecimalPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { NgChartsModule } from 'ng2-charts';
import { Article } from '../../../models/article.model';
import { firstValueFrom } from 'rxjs';

@Component({
  selector: 'app-inventory-dash',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    NgChartsModule,
    DecimalPipe
  ],
  templateUrl: './inventory-dash.component.html',
  styleUrls: ['./inventory-dash.component.css']
})
export class InventoryDashComponent implements OnInit {
  currentRotation: number = 0;
  isRotationCritical: boolean = false;
  articles: Article[] = [];
  selectedArticleId: number | null = null;
  inventories: Inventory[] = [];
  transactions: Transaction[] = [];
  loading: boolean = false;
  currentStock: number = 0;

  chartData: ChartData<'line'> = {
    labels: [],
    datasets: [{
      data: [],
      label: 'Inventory Rotation',
      borderColor: 'rgb(75, 192, 192)',
      backgroundColor: 'rgba(75, 192, 192, 0.2)',
      fill: true,
      tension: 0.1
    }]
  };

  chartOptions: ChartConfiguration['options'] = {
    // ... mantener las opciones existentes
  };

  constructor(private inventoryService: InventoryService) {}

  ngOnInit() {
    this.loadArticles();
  }

  private async loadArticles() {
    try {
      const articles = await firstValueFrom(this.inventoryService.getArticles());
      this.articles = articles || [];
    } catch (error) {
      console.error('Error loading articles:', error);
      this.articles = [];
    }
  }

  async onArticleChange(articleId: number) {
    if (!articleId) return;
    
    this.selectedArticleId = articleId;
    this.loading = true;
    
    try {
      const [inventoriesResult, transactionsResult] = await Promise.all([
        firstValueFrom(this.inventoryService.getInventories()),
        firstValueFrom(this.inventoryService.getTransactions())
      ]);

      this.inventories = inventoriesResult || [];
      this.transactions = transactionsResult || [];

      if (this.inventories.length && this.transactions.length) {
        // Filtrar inventarios por artículo seleccionado
        const filteredInventories = this.inventories.filter(
          inv => inv.article.id === articleId
        );

        // Filtrar transacciones por inventarios del artículo seleccionado
        const inventoryIds = filteredInventories.map(inv => inv.id);
        const filteredTransactions = this.transactions.filter(
          trans => inventoryIds.includes(trans.inventoryId)
        );

        // Actualizar stock actual
        this.currentStock = filteredInventories.reduce(
          (sum, inv) => sum + inv.stock, 
          0
        );

        const monthlyData = this.calculateMonthlyRotation(filteredInventories, filteredTransactions);
        this.updateChartData(monthlyData);
      } else {
        // Resetear datos si no hay información
        this.resetData();
      }
    } catch (error) {
      console.error('Error loading data:', error);
      this.resetData();
    } finally {
      this.loading = false;
    }
  }

  private resetData() {
    this.currentStock = 0;
    this.currentRotation = 0;
    this.isRotationCritical = false;
    this.chartData = {
      labels: [],
      datasets: [{
        data: [],
        label: 'Inventory Rotation',
        borderColor: 'rgb(75, 192, 192)',
        backgroundColor: 'rgba(75, 192, 192, 0.2)',
        fill: true,
        tension: 0.1
      }]
    };
  }

  private calculateMonthlyRotation(inventories: Inventory[], transactions: Transaction[]): Map<string, number> {
    const monthlyData = new Map<string, number>();
    
    // Group transactions by month
    transactions.forEach(transaction => {
      const date = new Date(transaction.transactionDate!);
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      
      if (!monthlyData.has(monthKey)) {
        monthlyData.set(monthKey, 0);
      }
      
      // Only count OUTPUT transactions
      if (transaction.transactionType === TransactionType.OUTPUT) {
        monthlyData.set(
          monthKey, 
          monthlyData.get(monthKey)! + transaction.quantity
        );
      }
    });

    // Calculate total available items
    const totalAvailableItems = inventories.reduce(
      (sum, inventory) => sum + inventory.stock, 
      0
    );

    // Calculate rotation ratio for each month
    monthlyData.forEach((usedItems, month) => {
      const rotation = totalAvailableItems > 0 ? 
        usedItems / totalAvailableItems : 0;
      monthlyData.set(month, rotation);
    });

    return monthlyData;
  }

  private updateChartData(monthlyData: Map<string, number>) {
    // Sort months chronologically
    const sortedMonths = Array.from(monthlyData.keys()).sort();
    
    // Update chart data
    this.chartData = {
      labels: sortedMonths.map(month => {
        const [year, monthNum] = month.split('-');
        return `${monthNum}/${year}`;
      }),
      datasets: [{
        data: sortedMonths.map(month => monthlyData.get(month)!),
        label: 'Inventory Rotation',
        borderColor: 'rgb(75, 192, 192)',
        backgroundColor: 'rgba(75, 192, 192, 0.2)',
        fill: true,
        tension: 0.1
      }]
    };

    // Update current rotation (latest month)
    if (sortedMonths.length > 0) {
      const lastMonth = sortedMonths[sortedMonths.length - 1];
      this.currentRotation = monthlyData.get(lastMonth)!;
      this.isRotationCritical = this.currentRotation < 0.25;
    }
  }
}