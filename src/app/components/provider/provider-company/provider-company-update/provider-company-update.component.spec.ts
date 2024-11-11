import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ProviderCompanyUpdateComponent } from './provider-company-update.component';

describe('ProviderCompanyUpdateComponent', () => {
  let component: ProviderCompanyUpdateComponent;
  let fixture: ComponentFixture<ProviderCompanyUpdateComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ProviderCompanyUpdateComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ProviderCompanyUpdateComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
