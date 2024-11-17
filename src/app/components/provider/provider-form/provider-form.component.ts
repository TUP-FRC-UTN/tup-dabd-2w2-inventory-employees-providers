import { Component, inject, OnInit, TemplateRef, ViewChild } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ProvidersService } from '../../../services/providers.service';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { Supplier } from '../../../models/suppliers/supplier.model';
import { Service } from '../../../models/suppliers/service.model';
import { Company } from '../../../models/suppliers/company.model';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { ToastService, MainContainerComponent } from 'ngx-dabd-grupo01';

@Component({
  selector: 'app-provider-form',
  standalone: true,
  imports: [ReactiveFormsModule, CommonModule, MainContainerComponent],
  templateUrl: './provider-form.component.html',
  styleUrl: './provider-form.component.css'
})
export class ProviderFormComponent implements OnInit {
  providerForm: FormGroup;
  isEditMode = false;
  currentProviderId: number | null = null;
  services: Service[] = [];
  companies: Company[] = [];

  private providerService = inject(ProvidersService);
  private fb = inject(FormBuilder);
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private modalService = inject(NgbModal);
  private toastService = inject(ToastService);

  constructor() {
    this.providerForm = this.fb.group({
      name: ['', Validators.required],
      cuil: ['', [Validators.required, Validators.minLength(11), Validators.maxLength(11)]],
      service: [null, Validators.required],
      company: [null, Validators.required],
      contact: ['', Validators.required],
      address: ['', Validators.required],
      details: ['', Validators.required]
    });
  }

  ngOnInit(): void {
    this.loadServices();
    this.loadCompanies();
    
    this.route.paramMap.subscribe(params => {
      const id = params.get('id');
      if (id) {
        this.isEditMode = true;
        this.currentProviderId = +id;
        this.loadProviderData(this.currentProviderId);
      }
    });
  }

  loadServices(): void {
    this.providerService.getServices().subscribe({
      next: (services) => {
        this.services = services;
      },
      error: (error) => {
        this.toastService.sendError('Error al cargar los servicios');
      }
    });
  }

  loadCompanies(): void {
    this.providerService.getCompany().subscribe({
      next: (companies) => {
        this.companies = companies;
      },
      error: (error) => {
        this.toastService.sendError('Error al cargar las compañías');
      }
    });
  }

  onSubmit(): void {
    if (this.providerForm.valid) {
      const formData = this.prepareFormData();
      
      if (this.isEditMode && this.currentProviderId !== null) {
        this.updateProvider(formData);
      } else {
        this.addProvider(formData);
      }
    } else {
      this.markFormGroupTouched(this.providerForm);
    }
  }

  prepareFormData(): any {
    const formValue = this.providerForm.value;
    
    // Preparar el DTO para el envío
    const formData: {
      id?: number;
      name: string;
      details: string;
      cuil: string;
      company: number;
      service: number;
      contact: string;
      address: string;
    } = {
      name: formValue.name,
      details: formValue.details,
      cuil: formValue.cuil,
      company: formValue.company,
      service: formValue.service,
      contact: formValue.contact,
      address: formValue.address
    };

    if (this.isEditMode && this.currentProviderId) {
      formData.id = this.currentProviderId;
    }

    return formData;
  }

  closeModal(): void {
    this.modalService.dismissAll();
  }

  private markFormGroupTouched(formGroup: FormGroup) {
    Object.values(formGroup.controls).forEach(control => {
      control.markAsTouched();
      if (control instanceof FormGroup) {
        this.markFormGroupTouched(control);
      }
    });
  }
  
  @ViewChild('infoModal') infoModal!: TemplateRef<any>;

  addProvider(providerData: any): void {
    this.providerService.addProvider(providerData).subscribe({
      next: (response) => {
        this.toastService.sendSuccess("El proveedor ha sido creado con éxito.");
        this.resetForm();
        this.router.navigate(['/providers/list']);
      },
      error: (error) => {
        this.toastService.sendError("Hubo un error en la creación del proveedor.");
      }
    });
  }

  showInfo(): void {
    this.modalService.open(this.infoModal, { centered: true });
  }
  
  updateProvider(providerData: any): void {
    this.providerService.updateProvider(providerData).subscribe({
      next: (response) => {
        this.toastService.sendSuccess("El proveedor ha sido modificado con éxito.");
        this.resetForm();
        this.router.navigate(['/providers/list']);
      },
      error: (error) => {
        this.toastService.sendError("Hubo un error en la modificación del proveedor.");
      }
    });
  }

  resetForm() {
    this.providerForm.reset();
    this.isEditMode = false;
    this.currentProviderId = null;
    this.router.navigate(['/providers/list']);
  }

  loadProviderData(id: number): void {
    this.providerService.getProviderById(id).subscribe({
      next: (provider: Supplier) => {
        this.currentProviderId = provider.id;
        this.providerForm.patchValue({
          name: provider.name,
          cuil: provider.cuil,
          service: provider.service?.id,
          company: provider.company?.id,
          contact: provider.contact,
          address: provider.address,
          details: provider.details
        });
      },
      error: (error) => {
        this.toastService.sendError('No se pudo cargar los datos del proveedor');
      }
    });
  }
}