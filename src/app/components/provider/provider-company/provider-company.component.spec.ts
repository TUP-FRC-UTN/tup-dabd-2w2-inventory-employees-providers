import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ProviderCompanyComponent } from './provider-company.component';

describe('ProviderCompanyComponent', () => {
  let component: ProviderCompanyComponent;
  let fixture: ComponentFixture<ProviderCompanyComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ProviderCompanyComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ProviderCompanyComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
