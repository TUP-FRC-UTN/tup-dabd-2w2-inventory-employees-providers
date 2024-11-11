import { Component, inject, OnInit, TemplateRef, ViewChild } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { MainContainerComponent } from 'ngx-dabd-grupo01';
import { ProviderTypeUpdateComponent } from "../provider-type-update/provider-type-update.component";
import { CompanyService } from '../../../services/suppliers/company.service';
import { Company } from '../../../models/suppliers/company.model';
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
export class ProvideConfigComponent implements OnInit {
  filterForm = new FormGroup({
    name: new FormControl(''),
    enabled: new FormControl('')
  });

  searchFilter = new FormControl('');
  showModalFilter: boolean = false;
  showServiceTypeUpdate: boolean = false;
  companies: Company[] = [];
  selectedCompany: Company | null = null;

  private modalService = inject(NgbModal);
  private companyService = inject(CompanyService);

  @ViewChild('infoModal') infoModal!: TemplateRef<any>;

  ngOnInit(): void {
    this.loadCompanies();
  }

  loadCompanies() {
    this.companyService.getCompanies().subscribe({
      next: (response) => {
        this.companies = response;
      },
      error: (error) => {
        console.error('Error loading companies:', error);
      }
    });
  }

  applyFilters() {
    // Implementar filtrado basado en this.filterForm.value
    const filters = this.filterForm.value;
    this.loadCompanies(); // Recargar y luego filtrar localmente
    
    if (filters.name) {
      this.companies = this.companies.filter(company => 
        company.name.toLowerCase().includes(filters.name!.toLowerCase())
      );
    }
    
    if (filters.enabled !== null && filters.enabled !== '') {
      this.companies = this.companies.filter(company => 
        company.enabled === (filters.enabled === 'true')
      );
    }
    
    this.closeModalFilter();
  }

  filterByStatus(status: string) {
    if (status === 'all') {
      this.loadCompanies();
    } else {
      const isEnabled = status === 'active';
      this.companies = this.companies.filter(company => company.enabled === isEnabled);
    }
  }

  onCompanyUpdate(company?: Company | null) {
    this.selectedCompany = company || null;
    this.showServiceTypeUpdate = true;
  }

  deleteCompany(id: number) {
    this.companyService.deleteCompany(id).subscribe({
      next: () => {
        this.loadCompanies();
      },
      error: (error) => {
        console.error('Error deleting company:', error);
      }
    });
  }

  closeModalFilter() {
    this.showModalFilter = false;
  }

  clearFilters() {
    this.filterForm.reset();
    this.loadCompanies();
  }

  onServiceTypeUpdateClose() {
    this.showServiceTypeUpdate = false;
    this.selectedCompany = null;
    this.loadCompanies();
  }

  showInfo() {
    this.modalService.open(this.infoModal, { centered: true });
  }

  exportToPDF(): void {
    const doc = new jsPDF();
    autoTable(doc, {
      head: [['Nombre', 'Estado']],
      body: this.companies.map(company => [
        company.name,
        company.enabled ? 'Activo' : 'Inactivo'
      ])
    });
    doc.save('companias.pdf');
  }

  exportToExcel(): void {
    const worksheet = XLSX.utils.json_to_sheet(this.companies.map(company => ({
      Nombre: company.name,
      Estado: company.enabled ? 'Activo' : 'Inactivo'
    })));
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Compañías');
    XLSX.writeFile(workbook, 'companias.xlsx');
  }
}