import { Routes } from '@angular/router';
import { ProviderListComponent } from './components/provider/provider-list/provider-list.component';
import { ProviderFormComponent } from './components/provider/provider-form/provider-form.component';
import { EmployeeListComponent } from './components/employee/employee-list/employee-list.component';
import { EmployeeFormComponent } from './components/employee/employee-form/employee-form.component';
import { ArticleFormComponent } from './components/inventory/inventory_articles/inventory_articles_form/inventory_articles_form.component'
import { TransactionComponentForm } from './components/inventory/inventory_transaction/inventory_transaction_form/inventory_transaction_form.component';
import { InventoryTransactionTableComponent } from './components/inventory/inventory_transaction/inventory_transaction_table/inventory_transaction_table.component';
import { InventoryTableComponent } from './components/inventory/inventory_inventories/inventory_inventories.component';



export const routes: Routes = [
  { path: 'employees/list', component: EmployeeListComponent },
  { path: 'employees/form', component: EmployeeFormComponent },
  { path: 'employees/form/:id', component: EmployeeFormComponent },
  { path: 'providers/list', component: ProviderListComponent },
  { path: 'providers/form', component: ProviderFormComponent },
  { path: 'providers/form/:id', component: ProviderFormComponent },
  { path: 'articles/article', component: ArticleFormComponent},
  { path: 'articles/article/:id', component: ArticleFormComponent },
  { path: 'inventories', component: InventoryTableComponent },
  { path: 'transactions/:id', component: TransactionComponentForm },
  { path: 'inventories/transactions/:inventoryId', component: InventoryTransactionTableComponent },
  { path: '', redirectTo: '/employees', pathMatch: 'full' }
];

