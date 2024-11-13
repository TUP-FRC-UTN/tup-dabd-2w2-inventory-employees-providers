import { Component, inject, OnInit } from '@angular/core';
import { CommonModule, DecimalPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { BaseChartDirective } from 'ng2-charts';

import { ChartConfiguration, ChartOptions } from 'chart.js';
import { Article } from '../../../models/article.model';
import { Inventory, Transaction, TransactionType } from '../../../models/inventory.model';
import { InventoryService } from '../../../services/inventory.service';
import { MapperService } from '../../../services/MapperCamelToSnake/mapper.service';

@Component({
  selector: 'app-inventory-dash',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    BaseChartDirective,
    DecimalPipe
  ],
  templateUrl: './inventory-dash.component.html',
  styleUrls: ['./inventory-dash.component.css']
})
export class InventoryDashComponent implements OnInit {
  // Properties for article selection
  articles: Article[] = [];
  selectedArticleId: number | null = null;
  loading = false;

  inventoryArticles : Inventory[] = [];

  // Current inventory stats
  currentStock: number = 0;
  currentRotation: number = 0;
  isRotationCritical: boolean = false;
  minStock: number = 0;
  maxStock: number = 0;
  averageRotation: number = 0;

  // Current inventory
  currentInventory: Inventory | null = null;

  //
  private mapperService = inject(MapperService);
  // Chart configuration
  chartData: ChartConfiguration<'line'>['data'] = {
    labels: [],
    datasets: [{
      data: [],
      label: 'Índice de Rotación',
      borderColor: 'rgb(75, 192, 192)',
      tension: 0.1
    }]
  };

  chartOptions: ChartOptions<'line'> = {
    responsive: true,
    plugins: {
      legend: {
        display: true,
      }
    },
    scales: {
      y: {
        beginAtZero: true
      }
    }
  };

  constructor(private inventoryService: InventoryService) {}

  ngOnInit() {
    this.loadArticles();
  }

  loadArticles() {
    this.inventoryService.getInventories().subscribe({
      next: (inventories) => {
        this.inventoryArticles = inventories;
        console.log('Inventories:', this.inventoryArticles);
      }, error: (error) => {
        console.error('Error loading inventories:', error);
      }
    })
  }

  onArticleChange(inventarioId: number) {
    if (!inventarioId) {
      this.resetDashboard();
      return;
    }
    console.log('Selected article ID:', inventarioId);
    this.loading = true;
    this.selectedArticleId = inventarioId;

    // Primero obtenemos los inventarios
    this.inventoryService.getInventories({
      articleName: this.articles.find(a => a.id === inventarioId)?.name
    }).subscribe({
      next: (inventories) => {
        const inventory = inventories[inventarioId]; // Tomamos el primer inventario encontrado
        console.log('Inventory:', inventory);
        if (inventory) {
          this.currentInventory = inventory;
          this.minStock = inventory.minStock;
          this.maxStock = inventory.stock;
          console.log('stock', inventory.stock),
          console.log('minStock', inventory.minStock);
          //debugger
          this.updateInventoryStats(inventory);
          this.loadTransactionHistory(inventory.id!);
        } else {
          console.error('No inventory found for this article');
          this.resetDashboard();
        }
        console.log('Inventories:', inventories);
        this.loading = false;
      },
      error: (error) => {
        console.error('Error loading inventory:', error);
        this.loading = false;
        this.resetDashboard();
      }
    });
  }

  private resetDashboard() {
    this.currentStock = 0;
    this.currentRotation = 0;
    this.isRotationCritical = false;
    this.minStock = 0;
    this.maxStock = 0;
    this.averageRotation = 0;
    this.currentInventory = null;
    this.chartData.labels = [];
    this.chartData.datasets[0].data = [];
  }

  private updateInventoryStats(inventory: Inventory) {

    this.currentStock = inventory.stock;
    this.minStock = inventory.minStock;
    this.maxStock = inventory.stock;
    //debugger
    // Calculate rotation index based on transactions
    if (inventory.transactions) {
      this.calculateRotationIndex(inventory);
    }
  }

  private calculateRotationIndex(inventory: Inventory) {
    // Usar todas las transacciones sin filtro de fecha
    if (!inventory.transactions || inventory.transactions.length === 0) {
        console.log('No hay transacciones para calcular rotación');
        this.currentRotation = 0;
        this.isRotationCritical = true;
        return;
    }

    // Calcula el índice de rotación como (salidas totales / stock promedio)
    const outputs = inventory.transactions
        .filter(t => t.transactionType === 'OUTPUT')
        .reduce((sum, t) => sum + t.quantity, 0);
    console.log('outputs', outputs);    

    // Calcular el stock promedio basado en todas las transacciones
    let runningStock = this.currentStock;
    let stockSum = runningStock;
    let count = 1;

    console.log('runningStock', runningStock);
    console.log('stockSum', stockSum);
      
    // Ordenar transacciones por fecha de más reciente a más antigua
    const sortedTransactions = [...inventory.transactions].sort((a, b) => 
        new Date(b.transactionDate!).getTime() - new Date(a.transactionDate!).getTime()
    );

    console.log('sortedTransactions', sortedTransactions);

    // Calcular el stock histórico para obtener un promedio más preciso
    sortedTransactions.forEach(transaction => {
        if (transaction.transactionType === 'OUTPUT') {
            runningStock -= transaction.quantity; // Sumamos porque vamos hacia atrás en el tiempo
        } else {
            runningStock += transaction.quantity;
        }
        stockSum += runningStock;
        console.log('stockSum', stockSum);
        count++;
    });
    

    const averageStock = stockSum / count;
    console.log('averageStock', averageStock);
    // Calcular la rotación
    this.currentRotation = averageStock > 0 ? (outputs / averageStock) : 0;
    console.log('currentRotation', this.currentRotation);
    this.isRotationCritical = this.currentRotation < 0.3;
}
private loadTransactionHistory(inventoryId: number) {
  this.inventoryService.getTransactionsInventory(inventoryId.toString()).subscribe({
    next: (transactions) => {
      // Mapear las transacciones a camelCase
      const mappedTransactions = transactions.map(transaction => 
        this.mapperService.toCamelCase(transaction)
      );
      console.log('Transacciones mapeadas:', mappedTransactions);
      this.updateChartData(mappedTransactions);
    },
    error: (error) => {
      console.error('Error loading transactions:', error);
    }
  });
}

private updateChartData(transactions: Transaction[]) {
  console.log('Iniciando updateChartData con transactions:', transactions);

  if (!transactions || transactions.length === 0) {
      console.log('No hay transacciones para mostrar');
      return;
  }

  // Ordenar transacciones por fecha
  const sortedTransactions = [...transactions].sort((a, b) => {
      const dateA = this.parseDate(a.transactionDate);
      const dateB = this.parseDate(b.transactionDate);
      return dateA.getTime() - dateB.getTime();
  });

  let runningStock = this.currentStock;
  const timelineData: {date: string, stock: number, rotationIndex: number}[] = [];
  
  sortedTransactions.forEach(transaction => {
      console.log('Procesando transacción:', transaction);
      
      // Actualizar stock
      if (transaction.transactionType === TransactionType.OUTPUT) {
          runningStock -= transaction.quantity;
      } else {
          runningStock += transaction.quantity;
      }

      // Formatear fecha
      const formattedDate = this.formatDate(transaction.transactionDate);
      console.log('Fecha formateada:', formattedDate);

      // Calcular rotación
      const rotationIndex = runningStock > 0 ? transaction.quantity / runningStock : 0;

      timelineData.push({
          date: formattedDate,
          stock: runningStock,
          rotationIndex: rotationIndex
      });
  });

  console.log('Timeline data calculada:', timelineData);

  // Actualizar gráfico
  this.chartData = {
      labels: timelineData.map(point => point.date),
      datasets: [{
          data: timelineData.map(point => point.rotationIndex),
          label: 'Índice de Rotación',
          borderColor: 'rgb(75, 192, 192)',
          tension: 0.1
      }]
  };

  // Calcular rotación promedio
  const rotationValues = timelineData.map(point => point.rotationIndex);
  this.averageRotation = rotationValues.length > 0 ?
      rotationValues.reduce((sum, val) => sum + val, 0) / rotationValues.length : 0;
  
  console.log('Rotación promedio calculada:', this.averageRotation);
}

// Método auxiliar para parsear fechas
private parseDate(dateString: string | undefined | null): Date {
  if (!dateString) {
      return new Date();
  }

  // Primero intentamos parsear la fecha directamente
  const date = new Date(dateString);
  if (!isNaN(date.getTime())) {
      return date;
  }

  // Si la fecha incluye una T, es formato ISO
  if (dateString.includes('T')) {
      const [datePart] = dateString.split('T');
      return new Date(datePart);
  }

  // Si la fecha está en formato DD/MM/YYYY
  if (dateString.includes('/')) {
      const [day, month, year] = dateString.split('/').map(Number);
      return new Date(year, month - 1, day);
  }

  // Si la fecha está en formato YYYY-MM-DD
  if (dateString.includes('-')) {
      const [year, month, day] = dateString.split('-').map(Number);
      return new Date(year, month - 1, day);
  }

  console.error('Formato de fecha no reconocido:', dateString);
  return new Date();
}

// Método auxiliar para formatear fechas
private formatDate(dateString: string | undefined | null): string {
  if (!dateString) {
      return 'Fecha no disponible';
  }

  try {
      const date = this.parseDate(dateString);
      // Formatear como DD/MM/YYYY
      return `${date.getDate().toString().padStart(2, '0')}/${
          (date.getMonth() + 1).toString().padStart(2, '0')}/${
          date.getFullYear()}`;
  } catch (error) {
      console.error('Error al formatear la fecha:', dateString, error);
      return dateString;
  }
}
}