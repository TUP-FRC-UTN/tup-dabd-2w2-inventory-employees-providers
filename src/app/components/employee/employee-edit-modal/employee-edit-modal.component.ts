import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { Employee, EmployeeType } from '../../../models/employee.model';
import { EmployeesService } from '../../../services/employees.service';
import { FormsModule, NgModel, ReactiveFormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { StatusType } from '../../../models/inventory.model';

@Component({
  selector: 'app-employee-edit-modal',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './employee-edit-modal.component.html',
  styleUrl: './employee-edit-modal.component.css'
})
export class EmployeeEditModalComponent implements OnInit {
  @Input() isModalOpen = false;
  @Output() closeModal = new EventEmitter<void>();
  
  employee: Employee | null = null;
  employeeTypes = Object.values(EmployeeType);
  documentTypes = Object.values(DocumentType);
  statusTypes = Object.values(StatusType);

  constructor(private employeeService: EmployeesService) {}

  ngOnInit(): void {
    this.employeeService.getSelectedEmployee().subscribe(employee => {
      if (employee) {
        this.employee = { ...employee };
      }
    });
  }

  onSave() {
    if (this.employee) {
      this.employeeService.updateEmployee(this.employee).subscribe({
        next: () => {
          this.onClose();
          location.reload();
        },
        error: (error) => {
          console.error('Error updating employee:', error);
          alert('Error al actualizar el empleado');
        }
      });
    }
  }

  onClose() {
    this.isModalOpen = false;
    this.closeModal.emit();
  }
}
