import { CommonModule } from '@angular/common';
import { Component, EventEmitter, inject, Input, OnInit, Output } from '@angular/core';
import { FormArray, FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { DaySchedule, EmployeeSchedule, ShiftType } from '../../../models/employee.model';
import { EmployeesService } from '../../../services/employees.service';
import { ToastService } from 'ngx-dabd-grupo01';

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
  @Output() schedulesSaved = new EventEmitter<void>();

  private scheduleService = inject(EmployeesService);
  private toast = inject(ToastService);
  
  daysOfWeek: DayOfWeek[] = [
    { id: 'MONDAY', label: 'Lunes' },
    { id: 'TUESDAY', label: 'Martes' },
    { id: 'WEDNESDAY', label: 'Miércoles' },
    { id: 'THURSDAY', label: 'Jueves' },
    { id: 'FRIDAY', label: 'Viernes' },
    { id: 'SATURDAY', label: 'Sábado' },
    { id: 'SUNDAY', label: 'Domingo' }
  ];

  shiftTypes = Object.values(ShiftType);
  shiftTypeLabels: { [key in ShiftType]: string } = {
    [ShiftType.MORNING]: 'Mañana',
    [ShiftType.AFTERNOON]: 'Tarde',
    [ShiftType.NIGHT]: 'Noche'
  };

  selectedDays: string[] = [];
  selectedShift: ShiftType = ShiftType.MORNING;
  showDaysError = false;

  accessForm = new FormGroup({
    dateFrom: new FormControl('', [Validators.required]),
    dateTo: new FormControl('', [Validators.required]),
    shiftType: new FormControl<ShiftType>(ShiftType.MORNING, [Validators.required]),
    entryTime: new FormControl('', [Validators.required]),
    exitTime: new FormControl('', [Validators.required])
  });

  constructor() {}

  ngOnInit(): void {}

  toggleDay(dayId: string): void {
    const index = this.selectedDays.indexOf(dayId);
    if (index === -1) {
      this.selectedDays.push(dayId);
    } else {
      this.selectedDays.splice(index, 1);
    }
    this.showDaysError = false;
  }

  toggleShift(shift: ShiftType): void {
    this.selectedShift = shift;
    this.accessForm.get('shiftType')?.setValue(shift);
  }

  getSelectedDaysLabels(): string[] {
    return this.selectedDays.map(dayId => 
      this.daysOfWeek.find(day => day.id === dayId)?.label || dayId
    );
  }

  isFormValid(): boolean {
    return this.accessForm.valid && this.selectedDays.length > 0;
  }

  saveSchedule(): void {
    if (!this.isFormValid() || !this.employeeId) {
      if (this.selectedDays.length === 0) {
        this.showDaysError = true;
      }
      return;
    }

    const formValue = this.accessForm.value;
    const daySchedules: { [key: string]: DaySchedule } = {};

    this.selectedDays.forEach(day => {
      daySchedules[day] = {
        entry_time: formValue.entryTime!,
        exit_time: formValue.exitTime!
      };
    });

    const schedule: EmployeeSchedule = {
      employee_id: this.employeeId,
      start_date: new Date(formValue.dateFrom!).toISOString(),
      finish_date: new Date(formValue.dateTo!).toISOString(),
      shift_type: formValue.shiftType as ShiftType,
      day_schedules: daySchedules
    };

    this.scheduleService.createSchedule(schedule).subscribe({
      next: (response) => {
        console.log('Horario guardado exitosamente', response);
        this.toast.sendSuccess('Horario guardado exitosamente');
        this.resetForm();
      },
      error: (error) => {
        console.error('Error al guardar el horario', error);
        this.toast.sendError('Error al guardar el horario');
      }
    });
  }

  resetForm(): void{
    this.accessForm.reset({
      dateFrom: '',
      dateTo: '',
      shiftType: ShiftType.MORNING,
      entryTime: '',
      exitTime: ''
    });
    this.selectedDays = [];
    this.selectedShift = ShiftType.MORNING;
    this.showDaysError = false;
  }

  newEmployee(){
    this.employeeId = undefined;
    this.schedulesSaved.emit();
  }
}
