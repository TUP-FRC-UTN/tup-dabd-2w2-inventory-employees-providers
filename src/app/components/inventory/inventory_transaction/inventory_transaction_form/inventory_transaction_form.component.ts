import { Component, EventEmitter, inject, Input, OnInit, Output } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { InventoryService } from '../../../../services/inventory.service';
import { Transaction, TransactionType, Inventory, TransactionPost } from '../../../../models/inventory.model';
import { CommonModule } from '@angular/common';
import { Article } from '../../../../models/article.model';
import { ActivatedRoute } from '@angular/router';
import { MapperService } from '../../../../services/MapperCamelToSnake/mapper.service';
import { ToastService } from 'ngx-dabd-grupo01';

@Component({
  selector: 'app-transaction',
  templateUrl: './inventory_transaction_form.component.html',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
    styleUrls: ['./inventory_transaction_form.component.css']
})
export class TransactionComponentForm implements OnInit {

  private mapperService = inject(MapperService);
  private toastService = inject(ToastService);

@Input() inventoryId: string | null = null;
@Output() closeRegisterTransaction = new EventEmitter<void>();
@Output() showRegisterTransactionForm = new EventEmitter<void>();
isModalOpen : boolean = true;


  transactionForm: FormGroup;

  transactions: Transaction[] = [];
  inventories: Inventory[] = [];
  isEditing: boolean = false;
  editingTransactionId: number= 0;
  selectedTransactionType: TransactionType = TransactionType.ENTRY; // Para el control de tipo de transacción
  articleMap: { [key: number]: Article } = {}; // Mapa para almacenar ítems con sus IDs
  inventoryMap: { [key: number]: Inventory } = {}; // Mapa para almacenar inventarios
  articles: Article[] = [];

  constructor(private fb: FormBuilder, private inventoryService: InventoryService, private route: ActivatedRoute) {
    this.transactionForm = this.fb.group({
      transactionType: [TransactionType.ENTRY, Validators.required],
      quantity: [0, Validators.required],
      price: [0],
      transactionDate: [{ value: new Date().toISOString().split('T')[0] }]
    });
  }

  ngOnInit(): void {
    if (this.inventoryId) {
      console.log('ID de inventario recibido:', this.inventoryId);
    }
    // Escuchar cambios en el tipo de transacción para habilitar/deshabilitar el campo de precio
    this.transactionForm.get('transactionType')?.valueChanges.subscribe((type: TransactionType) => {
    if (type === TransactionType.OUTPUT) {
      this.transactionForm.get('price')?.disable();
    } else {
      this.transactionForm.get('price')?.enable();
    }
  });
  }

  addTransaction(): void {
    if (this.transactionForm.valid) {
        const formValues = this.transactionForm.value;

        // Crear la transacción con el nuevo modelo TransactionPost
        const newTransaction: TransactionPost = {
            transactionType: formValues.transactionType,
            quantity: formValues.quantity,
            price: this.transactionForm.get('transactionType')?.value === 'OUTPUT' ? null : this.transactionForm.get('price')?.value,
            transactionDate: formValues.transactionDate,
        };

        const transactionFormatted = this.mapperService.toSnakeCase(newTransaction);
        console.log(transactionFormatted);
        if (this.inventoryId) {
            this.inventoryService.addTransaction(transactionFormatted, this.inventoryId).subscribe({
                next: () => {
                    this.getTransactions();
                    this.onClose();
                },
                error: (error) => {
                  const errorMessage = error.error?.message || 'Error desconocido';
                  this.toastService.sendError(errorMessage);
                }
            });
        } else {
            console.error('Error: inventoryId no está definido');
        }
    }
}

  getTransactions(): void {
    this.inventoryService.getTransactions().subscribe(transactions => {
      this.transactions = transactions;
    });
    console.log('Transacciones cargadas:', this.transactions); // Verificar si las transacciones tienen el inventory_id correcto

  }

  onClose(){
    debugger
    this.closeRegisterTransaction.emit();
    this.isModalOpen = false
  }
}
