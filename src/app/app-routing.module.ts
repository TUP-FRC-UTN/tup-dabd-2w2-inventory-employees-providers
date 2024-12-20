import { Routes } from '@angular/router';
import { ProviderListComponent } from './components/provider/provider-list/provider-list.component';
import { ProviderFormComponent } from './components/provider/provider-form/provider-form.component';
import { EmployeeListComponent } from './components/employee/employee-list/employee-list.component';
import { EmployeeFormComponent } from './components/employee/employee-form/employee-form.component';
import { ArticleFormComponent } from './components/inventory/inventory_articles/inventory_articles_form/inventory_articles_form.component'
import { TransactionComponentForm } from './components/inventory/inventory_transaction/inventory_transaction_form/inventory_transaction_form.component';
import { InventoryTransactionTableComponent } from './components/inventory/inventory_transaction/inventory_transaction_table/inventory_transaction_table.component';
import { InventoryTableComponent } from './components/inventory/inventory_inventories/inventory_inventories.component';
import { InventoryArticleCategoryListComponent } from './components/inventory/inventory_config/inventory-article-category-list/inventory-article-category-list.component';
import { ProviderDashboardComponent } from './components/provider/provider-dashboard/provider-dashboard.component';
import { EmployeeDashboardComponent } from './components/employee/employee-dashboard/employee-dashboard.component';
import { InventoryDashboardComponent } from './components/inventory/inventory-dashboard/inventory-dashboard.component';
import { ProvideConfigComponent } from './components/provider/provide-config/provide-config.component';
import { ProviderTypeUpdateComponent } from './components/provider/provider-type-update/provider-type-update.component';
import { ProviderServiceComponent } from './components/provider/provider-service/provider-service.component';
import { ProviderServiceUpdateComponent } from './components/provider/provider-service-update/provider-service-update.component';
import { EmployeeViewAcessComponent } from './components/employee/employee-view-acess/employee-view-acess.component';

import { EmployeeAssistanceListComponent } from './components/employee/employee-assistance-list/employee-assistance-list.component';

import { ListEmpresasRegComponent } from './components/provider/dashboards/list-empresas-reg/list-empresas-reg.component';




export const routes: Routes = [
  { path: 'employees/assistance', component:EmployeeAssistanceListComponent},
  { path: 'employees/assistance/:id', component:EmployeeAssistanceListComponent},
  { path: 'employees/list', component: EmployeeListComponent },
  { path: 'employees/dashboard', component: EmployeeDashboardComponent },
  { path: 'employees/form', component: EmployeeFormComponent },
  { path: 'employees/form/:id', component: EmployeeFormComponent },
  { path: 'providers/list', component: ProviderListComponent },
  { path: 'providers/dashboard', component: ProviderDashboardComponent },
  { path: 'providers/form', component: ProviderFormComponent },
  { path: 'providers/form/:id', component: ProviderFormComponent },
  { path: 'articles/article', component: ArticleFormComponent},
  { path: 'articles/article/:id', component: ArticleFormComponent },
  { path: 'inventories', component: InventoryTableComponent },
  { path: 'inventory/dashboard', component: InventoryDashboardComponent },
  { path: 'transactions/:id', component: TransactionComponentForm },
  { path: 'inventories/transactions/:inventoryId', component: InventoryTransactionTableComponent },
  { path: 'inventories/config/category', component: InventoryArticleCategoryListComponent},
  { path: 'providers/config/company', component: ProvideConfigComponent},
  { path: 'providers/config/service', component: ProviderServiceComponent},
  { path: 'providers/config/service/update', component: ProviderServiceUpdateComponent},
  { path: 'employees/access/detail', component: EmployeeViewAcessComponent},
  { path: 'employees/assistant', component: EmployeeAssistanceListComponent},
  { path: 'providers/dashboard/modal/company', component: ListEmpresasRegComponent},
  { path: '', redirectTo: '/employees', pathMatch: 'full'}

];

