import { Component } from '@angular/core';
import { RouterModule } from '@angular/router';
import { NgbCollapseModule, NgbDropdownModule, NgbToastModule } from '@ng-bootstrap/ng-bootstrap';
import { CommonModule } from '@angular/common';
import { SidevarComponent } from "./sidevar/sidevar.component";
import { ToastsContainer, Toast } from 'ngx-dabd-grupo01';


@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css'],
  standalone: true,
  imports: [RouterModule, NgbDropdownModule, NgbCollapseModule, CommonModule, SidevarComponent, ToastsContainer, NgbToastModule]
})
export class AppComponent {
  title = 'consorcio-management';
  isMenuCollapsed = true;
}