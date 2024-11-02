import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';

interface DayOfWeek {
  id: string;
  label: string;
}

@Component({
  selector: 'app-employee-access',
  standalone: true,
  imports: [ReactiveFormsModule, CommonModule],
  templateUrl: './employee-access.component.html',
  styleUrl: './employee-access.component.css'
})
export class EmployeeAccessComponent implements OnInit{
  daysOfWeek: DayOfWeek[] = [
    { id: 'MONDAY', label: 'Lunes' },
    { id: 'TUESDAY', label: 'Martes' },
    { id: 'WEDNESDAY', label: 'Miércoles' },
    { id: 'THURSDAY', label: 'Jueves' },
    { id: 'FRIDAY', label: 'Viernes' },
    { id: 'SATURDAY', label: 'Sábado' },
    { id: 'SUNDAY', label: 'Domingo' }
  ];

  accessForm = new FormGroup({
    dateFrom: new FormControl<string>('', [Validators.required]),
    dateTo: new FormControl<string>('', [Validators.required]),
    hourFrom: new FormControl<string>('', [Validators.required]),
    hourTo: new FormControl<string>('', [Validators.required]),
    daysOfWeek: new FormControl<string[]>([], [Validators.required, Validators.minLength(1)])  
  });

  ngOnInit(): void {
    // Inicializar el formulario si es necesario
  }

  toggleDay(dayId: string): void {
    const daysControl = this.accessForm.get('daysOfWeek');
    const currentDays = [...(daysControl?.value || [])];
    const index = currentDays.indexOf(dayId);
    
    if (index === -1) {
      currentDays.push(dayId);
    } else {
      currentDays.splice(index, 1);
    }
    
    daysControl?.setValue(currentDays);
    daysControl?.markAsTouched();
  }

  // Método para verificar si un día está seleccionado
  isDaySelected(dayId: string): boolean {
    return this.accessForm.get('daysOfWeek')?.value?.includes(dayId) || false;
  }

  
}
