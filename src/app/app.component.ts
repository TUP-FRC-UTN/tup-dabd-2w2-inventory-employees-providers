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
  darkModeEnabled = false; // Estado para el modo oscuro

  toggleDarkMode() {
    this.darkModeEnabled = !this.darkModeEnabled;
    if (this.darkModeEnabled) {
      document.body.classList.add('dark-mode'); // Agrega clase al body
    } else {
      document.body.classList.remove('dark-mode'); // Remueve clase del body
    }
  }
}