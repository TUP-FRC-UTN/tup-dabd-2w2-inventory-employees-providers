import { Component, EventEmitter, inject, Input, Output } from '@angular/core';
import { Company } from '../../../../models/suppliers/company.model';
import { MapperService } from '../../../../services/MapperCamelToSnake/mapper.service';
import { FormBuilder, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { CompanyService } from '../../../../services/suppliers/company.service';
import { CommonModule } from '@angular/common';
import { ToastService } from 'ngx-dabd-grupo01';

@Component({
  selector: 'app-provider-company-update',
  standalone: true,
  imports: [FormsModule, CommonModule, ReactiveFormsModule],
  templateUrl: './provider-company-update.component.html',
  styleUrls: ['./provider-company-update.component.css']
})
export class ProviderCompanyUpdateComponent {
  private mapperService = inject(MapperService);
  private companyService = inject(CompanyService);
  private toastService = inject(ToastService);

  @Input() company: Company | null = null;
  @Output() closeModal = new EventEmitter<void>();
  isModalOpen: boolean = true;
  companyUpdateForm: FormGroup;

  constructor(private fb: FormBuilder) {
    this.companyUpdateForm = this.fb.group({
      name: ['', Validators.required]
    });
  }

  ngOnChanges(): void {
    if (this.company) {
      this.companyUpdateForm.patchValue({
        name: this.company.name
      });
    }
  }

  saveCompanyChanges(): void {
    if (this.companyUpdateForm.valid) {
      const companyData = {
        name: this.companyUpdateForm.get('name')?.value
      };
      const companyUpdateFormatted = this.mapperService.toSnakeCase(companyData);

      if (this.company) {
        this.companyService.updateCompany(companyUpdateFormatted).subscribe(
          (data) => {
            this.toastService.sendSuccess('La compañía ha sido actualizada con éxito.');
            this.onClose();
          },
          (error) => {
            this.toastService.sendError('No se pudo modificar la compañía. ' + error.message);
          }
        );
      } else {
        this.companyService.createCompany(companyUpdateFormatted).subscribe(
          (data) => {
            this.toastService.sendSuccess('La compañía ha sido creada con éxito.');
            this.onClose();
          },
          (error) => {
            this.toastService.sendError('No se pudo crear la compañía. ' + error.message);
          }
        );
      }
    } else {
      this.toastService.sendError('El formulario no es válido. Por favor, completa todos los campos requeridos.');
    }
  }

  onClose() {
    this.closeModal.emit();
    this.isModalOpen = false;
  }
}