import { Component, inject, OnInit, TemplateRef, ViewChild } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ServicesService } from '../../../services/services.service';
import { Service } from '../../../models/service.model';
import Swal from 'sweetalert2';
import { ActivatedRoute, Router } from '@angular/router';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { ToastService } from 'ngx-dabd-grupo01';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-service-form',
  standalone: true,
  imports: [ReactiveFormsModule, CommonModule],
  templateUrl: './service-form.component.html',
  styleUrl: './service-form.component.css'
})
export class ServiceFormComponent implements OnInit {
  serviceForm: FormGroup;
  isEditMode = false;
  currentServiceId: number | null = null;

  private servicesService = inject(ServicesService);
  private fb = inject(FormBuilder);
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private modalService = inject(NgbModal);

  constructor(private toastService: ToastService) {
    this.serviceForm = this.fb.group({
      name: ['', [Validators.required, Validators.minLength(3)]],
      cuit: ['', [Validators.required, Validators.maxLength(11)]],
      type: ['', Validators.required],
      contact: ['', Validators.required],
      address: ['', Validators.required],
      details: ['', Validators.required]
    });
  }

  ngOnInit(): void {
    this.route.paramMap.subscribe(params => {
      const id = params.get('id');
      if (id) {
        this.isEditMode = true;
        this.currentServiceId = +id;
        this.loadServiceData(this.currentServiceId);
      }
    });
  }

  onSubmit(): void {
    if (this.serviceForm.valid) {
      const formData = { ...this.serviceForm.value };
      if (!this.isEditMode) {
        delete formData.id;
      }

      if (this.isEditMode && this.currentServiceId !== null) {
        formData.id = this.currentServiceId;
        this.updateService(formData);
      } else {
        this.addService(formData);
      }
    }
  }

  @ViewChild('infoModal') infoModal!: TemplateRef<any>;

  addService(serviceData: Service): void {
    this.servicesService.addService(serviceData).subscribe({
      next: () => {
        this.toastService.sendSuccess("El servicio ha sido creado con éxito.");
        this.resetForm();
        this.router.navigate(['/services/list']);
      },
      error: () => {
        this.toastService.sendError("Hubo un error en la creación del servicio.");
      }
    });
  }

  showInfo(): void {
    this.modalService.open(this.infoModal, { centered: true });
  }

  updateService(serviceData: Service): void {
    this.servicesService.updateService(serviceData).subscribe({
      next: () => {
        this.toastService.sendSuccess("El servicio ha sido modificado con éxito.");
        this.resetForm();
        this.router.navigate(['/services/list']);
      },
      error: () => {
        this.toastService.sendError("Hubo un error en la modificación del servicio.");
      }
    });
  }

  resetForm(): void {
    this.serviceForm.reset();
    this.isEditMode = false;
    this.currentServiceId = null;
    this.router.navigate(['/services/list']);
  }

  loadServiceData(id: number): void {
    this.servicesService.getServiceById(id).subscribe({
      next: (service: Service) => {
        this.currentServiceId = service.id;
        this.serviceForm.patchValue(service);
      },
      error: () => {
        Swal.fire('Error', 'No se pudo cargar los datos del servicio', 'error');
      }
    });
  }
}
