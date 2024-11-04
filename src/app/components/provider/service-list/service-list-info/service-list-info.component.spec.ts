import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ServiceListInfoComponent } from './service-list-info.component';

describe('ServiceListInfoComponent', () => {
  let component: ServiceListInfoComponent;
  let fixture: ComponentFixture<ServiceListInfoComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ServiceListInfoComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ServiceListInfoComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
