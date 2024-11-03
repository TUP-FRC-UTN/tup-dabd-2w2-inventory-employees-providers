// import { CommonModule } from '@angular/common';
// import { FormControl, FormGroup, FormsModule, ReactiveFormsModule } from '@angular/forms';
// import { NgbModal, NgbPagination } from '@ng-bootstrap/ng-bootstrap';
// import { MainContainerComponent, TableComponent, ToastService } from 'ngx-dabd-grupo01';
// import { Observable } from 'rxjs';
// import { MapperService } from '../../../../services/MapperCamelToSnake/mapper.service';
// import { InventoryService } from '../../../../services/inventory.service';
// import { Component, inject, OnInit } from '@angular/core';
// import { ArticleCateg, ArticleCategory } from '../../../../models/article.model';
// import Swal from 'sweetalert2';
// import { ArticleCategoryUpdateComponent } from './article-category-update/article-category-update.component';
// import { RouterModule } from '@angular/router';
// import { StatusType } from '../../../../models/inventory.model';


// @Component({
//   selector: 'app-inventory-article-category-list',
//   standalone: true,
//   imports: [
//     CommonModule,
//     ReactiveFormsModule,
//     RouterModule,
//     FormsModule,
//     ArticleCategoryUpdateComponent
//   ],
//   templateUrl: './inventory-article-category-list.component.html',
//   styleUrl: './inventory-article-category-list.component.css'
// })
// export class InventoryArticleCategoryListComponent implements OnInit {

//   private mapperService = inject(MapperService);
//   private inventoryService = inject(InventoryService)
//   private toastService = inject(ToastService);
//   private modalService = inject(NgbModal);
//   categories: ArticleCateg[] = [];
//   isLoading = false;
//   selectedCategory: ArticleCateg | null = null;
//   showCategoryUpdate: boolean = false;

//   ngOnInit(): void {
//     this.getCategories();
//   }

//   getCategories(): void {
//     this.inventoryService.getArticleCategories().subscribe(
//       (data: ArticleCateg[]) => {
//         this.categories = data;
//         this.isLoading = true;
//         console.log(this.categories);
//       },
//       (error) => {
//         console.error('Error al obtener las categorías:', error);
//       }
//     );
//   }


//   deleteCategory(id: number): void {
//     console.log(id);
//     Swal.fire({
//       title: '¿Estas Seguro?',
//       text: 'No podrás revertir esto',
//       icon: 'warning',
//       showCancelButton: true,
//       confirmButtonColor: '#3085d6',
//       cancelButtonColor: '#d33',
//       confirmButtonText: 'Sí, eliminar',
//       cancelButtonText: 'Cancelar'
//     }).then(result => {
//       if (result.isConfirmed) {
//         this.inventoryService.deleteCategories(id).subscribe(() => {
//           this.getCategories();
//           this.toastService.sendSuccess('La categoría ha sido eliminada con éxito.');
//         });
//       }
//     });
//   }

//   // activateCategory(id: number): void{
//   //   const categoryUpdate = {
//   //   status: StatusType.INACTIVE
//   //   };
//   //   this.inventoryService.updateCategory(id, categoryUpdate).subscribe(() => {
//   //     this.getCategories();
//   //     this.toastService.sendSuccess('La categoría ha sido eliminada con éxito.');
//   //   });
//   // }


//   onCategoryUpdate(category?: ArticleCateg){
//     if(category) {
//       this.selectedCategory = category;
//     }
//     this.showCategoryUpdate = !this.showCategoryUpdate;
//   }

//   onCategoryUpdateClose() {
//     this.showCategoryUpdate = false;
//     this.selectedCategory = null;
//     this.getCategories();
//   }

// }
