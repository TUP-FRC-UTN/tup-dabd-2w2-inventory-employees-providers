import { AbstractControl, ValidationErrors, AsyncValidatorFn } from '@angular/forms';
import { Observable, of } from 'rxjs';
import { map, catchError } from 'rxjs/operators';

// Esta función devuelve un validador asíncrono
export function identifierUniqueValidator(existingIdentifiers: () => Observable<string[]>): AsyncValidatorFn {
  return (control: AbstractControl): Observable<ValidationErrors | null> => {
    if (!control.value) {
      return of(null); // Si no hay valor, no hay error
    }

    return existingIdentifiers().pipe(
      map(existingIds => {
        return existingIds.includes(control.value) ? { identifierNotUnique: true } : null; // Devuelve un error si el identificador ya existe
      }),
      catchError(() => of(null)) // En caso de error, devuelve null
    );
  };
}
