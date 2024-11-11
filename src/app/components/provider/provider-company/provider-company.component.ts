import { Component, OnInit, ViewChild, TemplateRef, inject } from '@angular/core';
import { FormBuilder, FormGroup, FormControl, ReactiveFormsModule } from '@angular/forms';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { MainContainerComponent, ToastService } from 'ngx-dabd-grupo01';
import { Company } from '../../../models/suppliers/company.model';
import { CompanyService } from '../../../services/suppliers/company.service';

@Component({
  selector: 'app-provider-company',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    MainContainerComponent
  ],
  templateUrl: './provider-company.component.html',
  styleUrls: ['./provider-company.component.css']
})
export class ProviderCompanyComponent implements OnInit {
  @ViewChild('infoModal') infoModal!: TemplateRef<any>;

  companies: Company[] = [];
  filteredCompanies: Company[] = [];
  originalCompanies: Company[] = [];
  isLoading = false;
  selectedCompany: Company | null = null;
  showCompanyUpdate: boolean = false;

  // Formulario de filtros
  filterForm: FormGroup;
  searchFilter: FormControl = new FormControl('');
  selectedStatusFilter: string = ''; // Filtro de estado

  private modalService = inject(NgbModal);
  private companyService = inject(CompanyService);
  private toastService = inject(ToastService);
  private fb = inject(FormBuilder);

  constructor() {
    this.filterForm = this.fb.group({
      name: [''],
      status: ['']
    });
  }

  ngOnInit(): void {
    this.getCompanies();
  }

  getCompanies(): void {
    this.isLoading = true;
    this.companyService.getCompanies().subscribe(
      (response: Company[]) => {
        this.originalCompanies = response;
        this.companies = [...this.originalCompanies];
        this.filteredCompanies = [...this.originalCompanies];
        this.isLoading = false;
        this.applyFilters(); // Aplicar filtro inicial si ya hay algún valor
      },
      (error) => {
        console.error('Error al obtener las compañías:', error);
        this.toastService.sendError('Error al cargar las compañías.');
        this.isLoading = false;
      }
    );
  }

  applyFilters(): void {
    const searchText = this.searchFilter.value ? this.searchFilter.value.toLowerCase() : '';
    this.filteredCompanies = this.originalCompanies.filter(company => {
      const matchesName = company.name.toLowerCase().includes(searchText);
      const matchesStatus = this.selectedStatusFilter ? company.enabled === (this.selectedStatusFilter === 'Activo') : true;
      return matchesName && matchesStatus;
    });
    this.companies = [...this.filteredCompanies];
  }

  filterByStatus(status: string): void {
    this.selectedStatusFilter = status;
    this.applyFilters();
  }

  clearFilters(): void {
    this.filterForm.reset();
    this.applyFilters();
  }

  openModalFilter(): void {
    this.modalService.open(this.infoModal, { centered: true });
  }

  closeModalFilter(): void {
    this.modalService.dismissAll();
  }

  deleteCompany(id: number): void {
    // Implementar lógica de eliminación de compañía
  }

  onCompanyUpdate(company?: Company): void {
    this.selectedCompany = company || null;
    this.showCompanyUpdate = true;
  }

  onCompanyUpdateClose(): void {
    this.showCompanyUpdate = false;
    this.selectedCompany = null;
    this.getCompanies();
  }

  showInfo(): void {
    this.modalService.open(this.infoModal, { centered: true });
  }
}