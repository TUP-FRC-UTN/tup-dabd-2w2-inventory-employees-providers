import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';

@Component({
  selector: 'app-address',
  standalone: true,
  imports: [ReactiveFormsModule, CommonModule],
  templateUrl: './address.component.html',
  styleUrl: './address.component.css'
})
export class AddressComponent {

  isEdit = false;
  direccionForm: FormGroup;

  constructor(private fb: FormBuilder) {
    this.direccionForm = this.fb.group({
      calle: ['', Validators.required],
      numero: ['', Validators.required],
      piso: [''],
      departamento: [''],
      ciudad: ['', Validators.required],
      provincia: ['', Validators.required],
      pais: ['', Validators.required],
      codigoPostal: ['', Validators.required]
    });
  }
  ngOnInit(): void {}

  onSubmit(): void {
    if (this.direccionForm.valid) {
      // Lógica para manejar el envío del formulario
      console.log(this.direccionForm.value);
    }
  }

}
