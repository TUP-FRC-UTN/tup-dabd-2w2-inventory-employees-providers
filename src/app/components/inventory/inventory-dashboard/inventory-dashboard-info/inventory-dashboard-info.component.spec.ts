import { ComponentFixture, TestBed } from '@angular/core/testing';

import { InventoryDashboardInfoComponent } from './inventory-dashboard-info.component';

describe('InventoryDashboardInfoComponent', () => {
  let component: InventoryDashboardInfoComponent;
  let fixture: ComponentFixture<InventoryDashboardInfoComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [InventoryDashboardInfoComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(InventoryDashboardInfoComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
