import { Component, inject, OnInit, TemplateRef, ViewChild } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { MainContainerComponent } from 'ngx-dabd-grupo01';
import { ProviderTypeUpdateComponent } from "../provider-type-update/provider-type-update.component";
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';

@Component({
  selector: 'app-provide-config',
  standalone: true,
  imports: [MainContainerComponent, ReactiveFormsModule, ProviderTypeUpdateComponent],
  templateUrl: './provide-config.component.html',
  styleUrl: './provide-config.component.css'
})
export class ProvideConfigComponent implements OnInit{
  filterForm = new FormGroup({
    denomination : new FormControl(''),
    description : new FormControl(''),
    status : new FormControl('')
  });

  searchFilter = new FormControl('');
  showModalFilter: boolean = false;
  showServiceTypeUpdate: boolean = false;
  serviceTypes: ServiceType[] = [];
  selectedServiceType: any;

  private modalService = inject(NgbModal);

  @ViewChild('infoModal') infoModal!: TemplateRef<any>;

  //constructor(private service : ServicesService) {}


  ngOnInit(): void {}
  loadServiceTypes() {
  //  this.service.getServices().subscribe({
  //    next: (response) => {
  //      //this.serviceTypes = response.content;
  //    },
  //    error: (error) => {
  //      console.error(error);
  //    }
  //  });
  }
  applyFilters(){}
  filterByStatus(string : String){}
  onServiceTypeUpdate( service? : ServiceType | null){}

  deleteServiceType(service : number){}
  closeModalFilter(){}
  clearFilters(){}
  onServiceTypeUpdateClose(){}
  showInfo(){
    this.modalService.open(this.infoModal, { centered: true });
  }
  exportToPDF(): void {
    const doc = new jsPDF();
    autoTable(doc, {
      head: [['Denominación', 'Estado']],
      body: this.serviceTypes.map(service => [
        service.denomination,
        service.status.toString() === 'ACTIVE' ? 'Activo' : 'Inactivo'
      ])
    });
    doc.save('categorias-de-servicios.pdf');
  }

  exportToExcel(): void {
    const worksheet = XLSX.utils.json_to_sheet(this.serviceTypes.map(service => ({
      Denominación: service.denomination,
      Estado: service.status.toString() === 'ACTIVE' ? 'Activo' : 'Inactivo'
    })));
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Categorías');
    XLSX.writeFile(workbook, 'categorias-de-servicios.xlsx');
  }
}

export interface ServiceType {
  id: number;
  denomination: string;
  description: string;
  status: string;
}
