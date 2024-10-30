import { platformBrowserDynamic } from '@angular/platform-browser-dynamic';
import { bootstrapApplication } from '@angular/platform-browser';
import { provideHttpClient, withFetch } from '@angular/common/http';
import { AppComponent } from './app/app.component';
import { provideRouter } from '@angular/router';
import { routes } from '././app/app-routing.module';

bootstrapApplication(AppComponent, {
  providers: [
    provideRouter(routes), // Configura el routing de la aplicación
    provideHttpClient(withFetch()) // Configura HttpClient con la opción de Fetch para SSR
  ]
}).catch(err => console.error(err));
