import { Component, inject, OnInit, ChangeDetectorRef } from '@angular/core';
import { FormBuilder, FormControl, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { EmployeesService } from '../../../services/employees.service';
import { Employee } from '../../../models/employee.model';
import { ToastService, MainContainerComponent } from 'ngx-dabd-grupo01';
import { BaseChartDirective } from 'ng2-charts';
import { ChartDataset, ChartOptions } from 'chart.js';
import { CommonModule } from '@angular/common';
import { MapperService } from '../../../services/MapperCamelToSnake/mapper.service';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { EmployeeDashboardInfoComponent } from './employe-dashboard-info/employee-dashboard-info.component';

@Component({
  selector: 'app-employee-dashboard',
  standalone: true,
  imports: [MainContainerComponent, CommonModule, ReactiveFormsModule, BaseChartDirective],
  templateUrl: './employee-dashboard.component.html',
  styleUrls: ['./employee-dashboard.component.css']
})
export class EmployeeDashboardComponent implements OnInit {
  // KPIs
  employeesHiredLastMonth = 0;
  inServiceCount = 0;
  inactiveCount = 0;
  employeeList: Employee[] = [];

  // Chart Data
  pieChartEmployeeStatusLabels: string[] = ['En Servicio', 'Inactivo'];
  pieChartEmployeeStatusDatasets: ChartDataset<'pie', number[]>[] = [
    {
      data: [], // Se llenará dinámicamente en calculateMetrics
      backgroundColor: ['#28a745', '#dc3545']
    }
  ];

  public pieChartOptions: ChartOptions<'pie'> = {
    responsive: true,
    plugins: {
      legend: { position: 'top' }
    }
  };

  private employeeService = inject(EmployeesService);
  private toastService = inject(ToastService);
  private fb = inject(FormBuilder);
  private mapperService = inject(MapperService);
  private modalService = inject(NgbModal);
  private cdr = inject(ChangeDetectorRef);

  constructor() {}

  ngOnInit(): void {
    this.loadEmployeeData();
  }

  loadEmployeeData(): void {
    this.employeeService.getAllEmployeesPaged({}).subscribe({
      next: (response) => {
        this.employeeList = this.mapperService.toCamelCase(response.content);
        this.calculateMetrics();

        // Asigna los datos del gráfico
        this.pieChartEmployeeStatusDatasets[0].data = [this.inServiceCount, this.inactiveCount];
        this.cdr.detectChanges();
      },
      error: (error) => {
        console.error('Error al cargar empleados:', error);
        this.toastService.sendError('Error al cargar empleados.');
      }
    });
  }

  calculateMetrics(): void {
    const oneMonthAgo = new Date();
    oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);

    this.employeesHiredLastMonth = this.employeeList.filter(
      (employee) => new Date(employee.hiringDate) >= oneMonthAgo
    ).length;

    this.inServiceCount = this.employeeList.filter(e => e.state === 'IN_SERVICE').length;
    this.inactiveCount = this.employeeList.filter(e => e.state === 'DOWN').length;
  }

  showInfo(): void {
    this.modalService.open(EmployeeDashboardInfoComponent, {
      size: 'lg',
      backdrop: 'static',
      keyboard: false,
      centered: true,
      scrollable: true
    });
  }
}
