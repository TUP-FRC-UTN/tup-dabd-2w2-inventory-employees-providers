import { InventoryService } from './../../../../services/inventory.service';
import { ArticleCateg, ArticleInventoryPost, ArticlePost } from '../../../../models/article.model';
import { Component, EventEmitter, inject, OnInit, Output, TemplateRef, ViewChild } from '@angular/core';
import { FormBuilder, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { Article, ArticleCategory, ArticleType, ArticleCondition, MeasurementUnit,Status } from '../../../../models/article.model';
import { MapperService } from '../../../../services/MapperCamelToSnake/mapper.service';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { Inventory, StatusType } from '../../../../models/inventory.model';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { MainContainerComponent, ToastService } from 'ngx-dabd-grupo01';


@Component({
  selector: 'app-article',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule,RouterModule, MainContainerComponent], // Agrega ReactiveFormsModule aquí
  templateUrl: './inventory_articles_form.component.html',
  styleUrls: ['./inventory_articles_form.component.css']
})
export class ArticleFormComponent implements OnInit {

  return() {
    this.router.navigate(['inventories']);
  }
  @Output() showRegisterForm = new EventEmitter<void>();
  isModalOpen : boolean = true;
  private mapperService = inject(MapperService);
  private readonly activatedRoute = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private modalService = inject(NgbModal);

  @ViewChild('infoModal') infoModal!: TemplateRef<any>;

  articleForm: FormGroup;
  articles: Article[] = [];
  isEditing: boolean = false; // Variable para controlar el estado de edición
  currentArticleId?: number; // Almacena el ID del ítem actual en edición

  // Propiedades para los enumerados
  ArticleType = ArticleType; // Asignamos el enum ArticleType a una propiedad del componente
  ArticleStatus = ArticleCondition; // Asignamos el enum ArticleStatus a una propiedad del componente
  ArticleCategory: ArticleCateg[] = []; // Asignamos el enum ArticleCategory a una propiedad del componente
  MeasurementUnit = MeasurementUnit; // Asignamos el enum MeasurementUnit a una propiedad del componente



  constructor(private fb: FormBuilder, private inventoryService: InventoryService, private toast : ToastService) {
    this.articleForm = this.fb.group({
      identifier: [{ value: '', disabled: true }, Validators.required],
      name: ['', Validators.required],
      description: [''],
      articleType: [ArticleType.NON_REGISTRABLE, Validators.required],
      articleCondition: [ArticleCondition.FUNCTIONAL, Validators.required],
      articleCategory: [Validators.required],
      measurementUnit: [MeasurementUnit.UNITS, Validators.required],
      location: ['', Validators.required], // Campo ubicación del inventario
      stock: [{value: '', disabled: false}, Validators.required],    // Campo stock del inventario
      stockMin: [''], // Campo stock mínimo del inventario
      price: ['']    // Campo precio para la transacción inicial
    });
  }

  ngOnInit(): void {
    this.activatedRoute.params.subscribe((params) => {
      const id = +params['id'];
      if (id) {
        this.getById(id);
      }
    });
    this.articleForm.get('articleType')?.valueChanges.subscribe(this.handleArticleTypeChange.bind(this));
    this.loadCategories();
  }

  loadCategories(): void {
    this.inventoryService.getArticleCategories().subscribe(
      (data: ArticleCateg[]) => {
        // Filtra las categorías activas
        console.log(data);
        this.ArticleCategory = data.filter(category => category.status.toString() === 'ACTIVE');

        // Verifica si hay categorías activas y establece el valor del formulario
        if (this.ArticleCategory.length > 0) {
          this.articleForm.get('articleCategory')?.setValue(this.ArticleCategory[0].id);
        }
      },
      (error) => {
        console.error('Error al cargar las categorías', error);
      }
    );
}


  checkIdentifier() {
    const identifier = this.articleForm.get('identifier')?.value;
    if (identifier) {
      this.inventoryService.articleExist(identifier).subscribe(
        (exists) => {
          if (exists) {
            // Si el identificador existe, establecer el error en el control
            this.articleForm.get('identifier')?.setErrors({ unique: true });
          } else {
            // Si no existe, limpiar los errores
            this.articleForm.get('identifier')?.setErrors(null);
          }
        },
        (error) => {
          console.error('Error al verificar el identificador:', error);
          // Manejar el error aquí si es necesario
        }
      );
    }
  }


  showInfo(): void {
    this.modalService.open(this.infoModal, { centered: true });
  }

  getById(id: number) {
    this.inventoryService.getArticleInventory(id).subscribe((data) => {
      this.currentArticleId=id;
      data = this.mapperService.toCamelCase(data);
      console.log(data);
      this.articleForm.patchValue({
        identifier: data.article.identifier,
        name: data.article.name,
        description:data.article.description,
        articleType: data.article.articleType,
        articleCondition:data.article.articleCondition,
        measurementUnit: data.article.measurementUnit,
        location:data.location,
        stock:data.stock,
        stockMin:data.minStock,
        price:data.price
      });
    });
    this.articleForm.get('id')?.disable();
    this.articleForm.get('articleType')?.disable();
    this.articleForm.get('articleCondition')?.disable();
    this.articleForm.get('stock')?.disable();
    this.articleForm.get('location')?.disable();
    this.isEditing=true;
  }

  handleArticleTypeChange(value: ArticleType): void {
    if(this.isEditing||this.currentArticleId!=undefined){
      return;
    }
    if(value === ArticleType.REGISTRABLE) {
      this.articleForm.get('identifier')?.enable();
      this.articleForm.get('measurementUnit')?.disable();
      this.articleForm.get('measurementUnit')?.setValue(MeasurementUnit.UNITS)
      this.articleForm.get('stock')?.disable();
      this.articleForm.get('stock')?.setValue(1);
      this.articleForm.get('stockMin')?.disable();
    } else {
      this.articleForm.get('identifier')?.disable();
      this.articleForm.get('stockMin')?.enable();
      this.articleForm.get('measurementUnit')?.enable();
      this.articleForm.get('identifier')?.reset();
      this.articleForm.get('stock')?.enable();
      this.articleForm.get('stock')?.setValue('');
    }
  }

  addArticle(): void {
    if (this.articleForm.valid) {
      const article: ArticlePost = {
        identifier: this.articleForm.get('identifier')?.value ?? null,
        name: this.articleForm.get('name')?.value,
        description: this.articleForm.get('description')?.value ?? null,
        articleCondition: this.articleForm.get('articleCondition')?.value,
        articleCategoryId: this.articleForm.get('articleCategory')?.value,
        articleType: this.articleForm.get('articleType')?.value,
        measurementUnit: this.articleForm.get('measurementUnit')?.value
      };
      const articleInventory: ArticleInventoryPost = {
        article,
        stock: this.articleForm.get('stock')?.value,
        minStock: this.articleForm.get('stockMin')?.value ?? null,
        location: this.articleForm.get('location')?.value ?? null,
        price: this.articleForm.get('price')?.value ?? null
      };

      const articleInventoryFormatted = this.mapperService.toSnakeCase(articleInventory);
      if(!this.isEditing){
        console.log(articleInventoryFormatted);
        this.inventoryService.addInventoryArticle(articleInventoryFormatted).subscribe((data) => {
          console.log(data);
          this.resetForm(); // Limpia el formulario después de crear exitosamente
          this.router.navigate(['/inventories']);
          this.toast.sendSuccess('Artículo creado exitosamente');
        })
      }
      else {
        this.toast.sendError('Error al crear Artículo.');
      }
       if (this.currentArticleId!= undefined){
        this.inventoryService.updateArticle(this.currentArticleId,articleInventoryFormatted.article as Article).subscribe((data)=> console.log(data));
        let inventoryUpdate= {
          stock: articleInventory.stock,
          minStock: articleInventory.minStock,
          location: articleInventory.location,
        }
        const inventoryUpdateFormatted = this.mapperService.toSnakeCase(inventoryUpdate);
        //this.inventoryService.updateInventory(this.currentArticleId).subscribe((data)=> console.log(data));
      }
    }
  }

  resetForm(): void {
    this.articleForm.reset({
      identifier: '',
      name: '',
      description: '',
      location: '',
      articleType: ArticleType.REGISTRABLE, // Valor por defecto
      articleCondition: ArticleCondition.FUNCTIONAL, // Valor por defecto
      articleCategory: ArticleCategory.DURABLES, // Valor por defecto
      measurementUnit: MeasurementUnit.UNITS // Valor por defecto
    });
    this.isEditing = false; // Cambia el estado a no edición
    this.currentArticleId = undefined; // Limpia el ID del ítem actual
  }

  onClose(){
    this.showRegisterForm.emit();
    this.isModalOpen = false
  }


}
