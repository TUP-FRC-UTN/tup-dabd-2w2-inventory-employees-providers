import { Component, inject, OnInit, Output, TemplateRef, ViewChild } from '@angular/core';
import { AbstractControl, FormArray, FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { EmployeeType, Employee, DocumentType, StatusType } from '../../../models/employee.model';
import { ActivatedRoute, Router } from '@angular/router';
import { EmployeesService } from '../../../services/employees.service';
import { debounceTime, map, switchMap } from 'rxjs';
import { MapperService } from '../../../services/MapperCamelToSnake/mapper.service';
import { ToastService } from 'ngx-dabd-grupo01';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { CommonModule } from '@angular/common';
import { EmployeeAccessComponent } from "../employee-access/employee-access.component";
import { EmployeeContactComponent } from "../employee-contact/employee-contact.component";

@Component({
  selector: 'app-employee-form',
  standalone: true,
  imports: [ReactiveFormsModule, CommonModule, EmployeeAccessComponent, EmployeeContactComponent],
  templateUrl: './employee-form.component.html',
  styleUrls: ['./employee-form.component.scss'],
})
export class EmployeeFormComponent implements OnInit {
  employeeForm = new FormGroup({
    id:new FormControl(0),
    firstName: new FormControl('', [Validators.required, Validators.minLength(3), Validators.maxLength(100)]),
    lastName: new FormControl('', [Validators.required, Validators.minLength(3), Validators.maxLength(100)]),
    employeeType: new FormControl(EmployeeType.ADMINTRATIVO, Validators.required),
    hiringDate: new FormControl(new Date().toISOString().split('T')[0], [Validators.required]), // Default to today
    documentType: new FormControl(DocumentType.DNI, Validators.required),
    docNumber: new FormControl('', [Validators.required, Validators.pattern(/^[0-9.-]*$/)]),
    salary: new FormControl(0, [Validators.required, Validators.min(0)]),
    state: new FormControl(StatusType.ACTIVE),
    contacts: new FormArray([]),
    address: new FormGroup({
      street_address: new FormControl('', [Validators.required]),
      number: new FormControl(0, [Validators.required, Validators.min(0)]),
      floor: new FormControl(0, [Validators.required, Validators.min(0)]),
      apartment: new FormControl(''),
      city: new FormControl('', [Validators.required]),
      province: new FormControl('', [Validators.required]),
      country: new FormControl('', [Validators.required]),
      postal_code: new FormControl(0, [Validators.required, Validators.min(0)])
    })
  });

  contactTypes = ['PHONE', 'EMAIL'];
  
  get contacts() {
    return this.employeeForm.get('contacts') as FormArray;
  }

  addContact() {
    const contactForm = new FormGroup({
      contact_type: new FormControl('', Validators.required),
      contact_value: new FormControl('', [Validators.required])
    });
    this.contacts.push(contactForm);
  }

  removeContact(index: number) {
    this.contacts.removeAt(index);
  }
  
 currentEmployeeId!: number;

  constructor(private toastService: ToastService) {}

  @ViewChild('infoModal') infoModal!: TemplateRef<any>;

  private readonly employeeService = inject(EmployeesService);
  private readonly activatedRoute = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly mapperService = inject(MapperService);
  private modalService = inject(NgbModal);
  employeeTypes= Object.values(EmployeeType);
  documentTypes= Object.values(DocumentType);
  private currentId = 0;
  isEdit:boolean=false;

  showEmployeeForm = true;
  employeeRegistered = false;

  ngOnInit(): void {
    this.activatedRoute.params.subscribe((params) => {
      const id = +params['id'];
      console.log(id);
      if (id) {
        this.getById(id);
      }
    });
    this.addContact();
  }

  getById(id: number) {
    this.currentId=id;
    this.employeeService.getEmployeeById(id).subscribe((data) => {
      data = this.mapperService.toCamelCase(data);
      console.log(data);
      this.employeeForm.patchValue({
        id:data.id,
        firstName: data.firstName,
        lastName: data.lastName,
        employeeType: data.employeeType,
        hiringDate: new Date(data.hiringDate).toISOString().split('T')[0], // Format for input
        documentType: data.documentType,
        docNumber: data.docNumber,
        state: StatusType.ACTIVE,
        salary: data.salary,
        //TODO: ver que traiga la informacion del contacto y del address
        //address: data.address
      });
    });
    this.isEdit=true;
  }

  saveEmployee() {
    if (this.employeeForm.valid) {
      let employeeData = this.prepareEmployeeData();
      employeeData = this.mapperService.toSnakeCase(employeeData);
      console.log(employeeData);
      if (this.currentId!=0) {
        employeeData.id=this.currentId;
        this.updateEmployee(employeeData);
      } else {
        employeeData.id
        this.createEmployee(employeeData);
        //this.router.navigate(['/employees/list']); // Redirect to employee list       
      }
    }
  }
  resetForm(): void {
    this.showEmployeeForm = true;
    this.employeeRegistered = false;
    this.employeeForm.reset({
      id: 0,
      firstName: '',
      lastName: '',
      employeeType: EmployeeType.MANTENIMIENTO,
      hiringDate: new Date().toISOString().split('T')[0],
      documentType: DocumentType.DNI,
      docNumber: '',
      state: StatusType.ACTIVE,
      salary: 0,
      address: {
        street_address: '',
        number: 0,
        floor: 0,
        apartment: '',
        city: '',
        province: '',
        country: '',
        postal_code: 0
      }
    });
    this.contacts.clear();
    this.addContact();
  }
/*
  prepareEmployeeData(): Employee {
    const { id, firstName, lastName, employeeType, hiringDate, documentType, docNumber, salary, state } = this.employeeForm.value;    
    let parsedHiringDate: Date | null = new Date();
    /*if (hiringDate) {
      parsedHiringDate = new Date(hiringDate);
    }

    return {
      id,
      firstName,
      lastName,
      employeeType,
      documentType: documentType,
      docNumber,
      hiringDate,
      salary,
      state,
    } as Employee;
  } */
    prepareEmployeeData(): any {
      const formValue = this.employeeForm.value;
      
      // Crear el objeto base del empleado
      const employeeData = {
        id: formValue.id,
        first_name: formValue.firstName,
        last_name: formValue.lastName,
        employee_type: formValue.employeeType,
        document_type: formValue.documentType,
        doc_number: formValue.docNumber,
        hiring_date: formValue.hiringDate,
        salary: formValue.salary,
        state: formValue.state,
        contact: this.contacts.length > 0 ? this.contacts.at(0).value : null,
        address: formValue.address
      };
  
      return employeeData;
    }

  showInfo(): void {
    this.modalService.open(this.infoModal, { centered: true });
  }

  createEmployee(employee: Employee) {
    console.log(employee);
    console.log("Este es el metodo de createEmployee");
    this.employeeService.addEmployee(employee).subscribe({
      next: (response) => {
        this.toastService.sendSuccess("El Empleado ha sido creado con éxito.");
        if( response.id){
          this.currentEmployeeId = response.id;
          this.employeeRegistered = true;
          this.disableForm();
          console.log('id enviado', this.currentEmployeeId);
        }
        this.toastService.sendSuccess("Cargue los dato de acceso.");
        this.resetForm(); // Limpia el formulario
      },
      error: (error) => {
        this.toastService.sendError("Hubo un error en la creación del empleado.");
      } 
    });
  }

  disableForm(): void {
    Object.keys(this.employeeForm.controls).forEach(key => {
      this.employeeForm.get(key)?.disable();
      this.contacts.get('contact_type')?.disable();
    });
  }

  startNewEmployee(): void {
    this.resetForm();
    this.employeeForm.enable();
    this.currentEmployeeId = 0;
  }

  updateEmployee(employee: Employee) {
    console.log(employee);
    this.employeeService.updateEmployee(employee).subscribe({
      next: (response) => {
        this.toastService.sendSuccess("El Empleado ha sido modificado con éxito.");
      },
      error: (error) => {
        this.toastService.sendError("Hubo un error en la modificación del empleado.");
      }
    });
  }

  return() {
    this.router.navigate(['employees/list']);
  }

  documentExistsValidator(control: AbstractControl) {
    return control.valueChanges.pipe(
      debounceTime(300), // para evitar múltiples llamadas al backend
      switchMap((documentNumber) => 
        this.employeeService.checkIfDocumentExists(documentNumber)
      ),
      map((exists: boolean) => (exists ? { documentExists: true } : null))
    );
}

onCancel(){
  this.resetForm();
  this.router.navigate(['/employees/list']);
}
}