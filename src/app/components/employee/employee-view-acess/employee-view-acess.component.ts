import { ChangeDetectorRef, Component, inject, TemplateRef, ViewChild } from '@angular/core';
import { EmployeeSchedule } from '../../../models/employee.model';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { EmployeesService } from '../../../services/employees.service';
import { finalize } from 'rxjs';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-employee-view-acess',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './employee-view-acess.component.html',
  styleUrl: './employee-view-acess.component.css'
})
export class EmployeeViewAcessComponent {
  @ViewChild('scheduleDetailModal') modalContent!: TemplateRef<any>;

  selectedSchedules: EmployeeSchedule[] = [];
  currentSchedule: EmployeeSchedule | null = null;
  loading = false;
  error: string | null = null;

  private modalService = inject(NgbModal);
  private employeesService = inject(EmployeesService);
  private cdr = inject(ChangeDetectorRef);

  // Definir el tipo para el orden de los días
  private readonly dayOrderMap: { [key: string]: number } = {
    'Lunes': 1,
    'Martes': 2,
    'Miércoles': 3,
    'Jueves': 4,
    'Viernes': 5,
    'Sábado': 6,
    'Domingo': 7
  };

  showEmployeeSchedule(employeeId: number): void {
    console.log('showEmployeeSchedule called with ID:', employeeId);
    this.loading = true;
    this.error = null;
    this.selectedSchedules = [];
    this.currentSchedule = null;

    this.employeesService.getEmployeeSchedules(employeeId).pipe(
      finalize(() => {
        this.loading = false;
        this.cdr.detectChanges();
      })
    ).subscribe({
      next: (response) => {
        // Convertir la respuesta a un array si no lo es
        const schedules = Array.isArray(response) ? response : [response];
        console.log('Received schedules:', schedules);
        console.log('schedules.length', schedules.length);
        if (schedules && schedules.length > 0) {
          this.selectedSchedules = schedules;
          this.currentSchedule = this.selectedSchedules[0];
          console.log('Current schedule:', this.currentSchedule);
          console.log('Selected schedules:', this.selectedSchedules);

          setTimeout(() => this.openModal(), 0);
        } else {
          this.error = 'No se encontraron horarios para este empleado';
          this.openModal();
        }
      },
      error: (err) => {
        console.error('Error loading schedules:', err);
        //this.error = 'Error al cargar los horarios: ' + (err.message || 'Error desconocido');
        this.error = 'No se encontraron horarios para este empleado';
        this.openModal();
      }
    });
  }

  getDaySchedules(): Array<{day: string, entry: string, exit: string}> {
    if (!this.currentSchedule?.day_schedules) return [];
    
    return Object.entries(this.currentSchedule.day_schedules)
      .map(([day, schedule]) => ({
        day: this.getDayName(day),
        entry: this.formatTime(schedule.entry_time),
        exit: this.formatTime(schedule.exit_time)
      }))
      .sort((a, b) => this.getDayOrder(a.day) - this.getDayOrder(b.day));
  }

  private getDayOrder(day: string): number {
    return this.dayOrderMap[day] || 8; // 8 como valor por defecto para días desconocidos
  }

  private openModal(): void {
    if (this.modalContent) {
      const modalRef = this.modalService.open(this.modalContent, {
        size: 'lg',
        backdrop: 'static',
        keyboard: false,
        centered: true
      });

      modalRef.result.then(
        () => {
          this.resetState();
        },
        () => {
          this.resetState();
        }
      );
    } else {
      console.error('Modal template not found!');
    }
  }

  private resetState(): void {
    this.selectedSchedules = [];
    this.currentSchedule = null;
    this.error = null;
  }

  getDayName(key: string): string {
    const days: Record<string, string> = {
      'MONDAY': 'Lunes',
      'TUESDAY': 'Martes',
      'WEDNESDAY': 'Miércoles',
      'THURSDAY': 'Jueves',
      'FRIDAY': 'Viernes',
      'SATURDAY': 'Sábado',
      'SUNDAY': 'Domingo'
    };
    return days[key] || key;
  }

  formatTime(time: string): string {
    if (!time) return '';
    return time.substring(0, 5);
  }

  setCurrentSchedule(schedule: EmployeeSchedule): void {
    this.currentSchedule = schedule;
  }
}