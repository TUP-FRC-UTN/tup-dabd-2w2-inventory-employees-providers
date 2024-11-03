import { CommonModule } from '@angular/common';
import { Component, inject, Input, OnInit } from '@angular/core';
import { FormArray, FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { DaySchedule, EmployeeSchedule, ShiftType } from '../../../models/employee.model';
import { EmployeesService } from '../../../services/employees.service';

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
  @Input() employeeId?: number;

  private readonly scheduleService = inject(EmployeesService);

  daysOfWeek = [
    { id: 'MONDAY', label: 'Lunes' },
    { id: 'TUESDAY', label: 'Martes' },
    { id: 'WEDNESDAY', label: 'Miércoles' },
    { id: 'THURSDAY', label: 'Jueves' },
    { id: 'FRIDAY', label: 'Viernes' },
    { id: 'SATURDAY', label: 'Sábado' },
    { id: 'SUNDAY', label: 'Domingo' }
  ];

  shiftTypes = Object.values(ShiftType);

  accessForm = new FormGroup({
    dateFrom: new FormControl('', [Validators.required]),
    dateTo: new FormControl('', [Validators.required]),
    shiftType: new FormControl<ShiftType>(ShiftType.MORNING, [Validators.required]),
    schedules: new FormArray([])
  });

  ngOnInit(): void {
    this.initializeScheduleForm();
  }

  private initializeScheduleForm(): void {
    this.daysOfWeek.forEach(day => {
      (this.accessForm.get('schedules') as FormArray).push(
        new FormGroup({
          day: new FormControl(day.id),
          selected: new FormControl(false),
          entry_time: new FormControl('', [Validators.required]),
          exit_time: new FormControl('', [Validators.required])
        })
      );
    });
  }

  get schedules(): FormArray {
    return this.accessForm.get('schedules') as FormArray;
  }

  toggleDay(index: number): void {
    const schedule = this.schedules.at(index);
    const currentValue = schedule.get('selected')?.value;
    schedule.get('selected')?.setValue(!currentValue);

    if (!currentValue) {
      schedule.get('entry_time')?.enable();
      schedule.get('exit_time')?.enable();
    } else {
      schedule.get('entry_time')?.disable();
      schedule.get('exit_time')?.disable();
    }
  }

  isDaySelected(index: number): boolean {
    return this.schedules.at(index).get('selected')?.value || false;
  }

  saveSchedule(): void {
    if (this.accessForm.valid && this.employeeId) {
      const formValue = this.accessForm.value;
      const daySchedules: { [key: string]: DaySchedule } = {};

      this.schedules.controls.forEach(control => {
        if (control.get('selected')?.value) {
          daySchedules[control.get('day')?.value] = {
            entry_time: control.get('entry_time')?.value,
            exit_time: control.get('exit_time')?.value
          };
        }
      });

      const schedule: EmployeeSchedule = {
        employee_id: this.employeeId,
        start_date: formValue.dateFrom!,
        finish_date: formValue.dateTo!,
        shift_type: formValue.shiftType!,
        day_schedules: daySchedules
      };

      this.scheduleService.createSchedule(schedule).subscribe({
        next: (response) => {
          console.log('Horario guardado exitosamente', response);
          // Aquí puedes agregar tu lógica de éxito
        },
        error: (error) => {
          console.error('Error al guardar el horario', error);
          // Aquí puedes agregar tu lógica de error
        }
      });
    }
  }

  
}
