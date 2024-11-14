import { Component, inject } from '@angular/core';
import { FormBuilder, FormGroup } from '@angular/forms';
import { MainContainerComponent } from 'ngx-dabd-grupo01';
import { debounceTime, distinctUntilChanged } from 'rxjs';
import { ProvidersService } from '../../../../services/providers.service';
import { Company } from '../../../../models/suppliers/company.model';

@Component({
  selector: 'app-list-empresas-reg',
  standalone: true,
  imports: [MainContainerComponent],
  templateUrl: './list-empresas-reg.component.html',
  styleUrl: './list-empresas-reg.component.css'
})
export class ListEmpresasRegComponent {
  showActiveCompaniesModal = false;
  activeCompaniesForm: FormGroup;
  filteredActiveCompanies: any[] = [];
  companies: Company[] = [];
  private providerService = inject(ProvidersService);

  constructor(private fb: FormBuilder) {
    this.activeCompaniesForm = this.fb.group({
      searchTerm: ['']
    });
  }

  ngOnInit() {
    this.loadActiveCompanies();
  }

  loadActiveCompanies() {
    this.providerService.getCompany().subscribe({
      next: (response) => {
        this.companies = response;
      }, 
      error: () => {
        console.log('Error al cargar compañias.');
      }
    })
  }
  private setupFormSubscription() {
    this.activeCompaniesForm.get('searchTerm')?.valueChanges
      .pipe(
        debounceTime(300),
        distinctUntilChanged()
      )
      .subscribe(() => {
        this.filterActiveCompanies();
      });
  }

  openActiveCompaniesModal() {
    this.showActiveCompaniesModal = true;
    this.filterActiveCompanies();
    document.body.classList.add('modal-open');
  }

  closeActiveCompaniesModal() {
    this.showActiveCompaniesModal = false;
    document.body.classList.remove('modal-open');
    this.activeCompaniesForm.reset();
  }

  filterActiveCompanies() {
    const searchTerm = this.activeCompaniesForm.get('searchTerm')?.value?.toLowerCase();

  }
 
}
