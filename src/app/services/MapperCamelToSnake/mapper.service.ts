// import { Injectable } from '@angular/core';

// @Injectable({
//   providedIn: 'root',
// })
// export class MapperService {
//   constructor() {}

//   // Convierte un objeto de camelCase a snake_case
//   toSnakeCase(obj: any): any {
//     if (typeof obj !== 'object' || obj === null) {
//       return obj; // Retorna el valor si no es un objeto
//     }

//     if (Array.isArray(obj)) {
//       return obj.map(this.toSnakeCase.bind(this)); // Mapea sobre cada elemento si es un array
//     }

//     return Object.keys(obj).reduce((acc, key) => {
//       // Convierte la clave a snake_case
//       const snakeKey = key.replace(/([A-Z])/g, '_$1').toLowerCase();
//       acc[snakeKey] = this.toSnakeCase(obj[key]); // Llama recursivamente para los valores
//       return acc;
//     }, {} as any); // Asegura que acc es un objeto
//   }

//   // Convierte un objeto de snake_case a camelCase
//   toCamelCase(obj: any): any {
//     if (typeof obj !== 'object' || obj === null) {
//       return obj; // Retorna el valor si no es un objeto
//     }

//     if (Array.isArray(obj)) {
//       return obj.map(this.toCamelCase.bind(this)); // Mapea sobre cada elemento si es un array
//     }

//     return Object.keys(obj).reduce((acc, key) => {
//       // Convierte la clave a camelCase
//       const camelKey = key.replace(/(_\w)/g, (matches) => matches[1].toUpperCase());
//       acc[camelKey] = this.toCamelCase(obj[key]); // Llama recursivamente para los valores
//       return acc;
//     }, {} as any); // Asegura que acc es un objeto
//   }
// }
import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root',
})
export class MapperService {
  constructor() {}

  // Convierte un objeto de camelCase a snake_case
  toSnakeCase(obj: any): any {
    if (typeof obj !== 'object' || obj === null) {
      return obj;
    }

    if (Array.isArray(obj)) {
      return obj.map(this.toSnakeCase.bind(this));
    }

    return Object.keys(obj).reduce((acc, key) => {
      const snakeKey = key.replace(/([A-Z])/g, '_$1').toLowerCase();
      acc[snakeKey] = this.toSnakeCase(obj[key]);
      return acc;
    }, {} as any);
  }

  // Convierte un objeto de snake_case a camelCase
  toCamelCase(obj: any): any {
    if (typeof obj !== 'object' || obj === null) {
      return obj;
    }

    if (Array.isArray(obj)) {
      return obj.map(this.toCamelCase.bind(this));
    }

    return Object.keys(obj).reduce((acc, key) => {
      const camelKey = key.replace(/(_\w)/g, (matches) => matches[1].toUpperCase());
      
      // Manejar específicamente los campos de fecha
      if (key === 'hiring_date' || key === 'birth_date') {
        // Si el valor es una fecha válida, convertirla
        const dateValue = obj[key];
        if (dateValue && typeof dateValue === 'string') {
          try {
            // Intentar crear un objeto Date y convertirlo a formato ISO
            const date = new Date(dateValue);
            if (!isNaN(date.getTime())) {
              acc[camelKey] = date.toISOString().split('T')[0];
            } else {
              acc[camelKey] = dateValue;
            }
          } catch (error) {
            acc[camelKey] = dateValue;
          }
        } else {
          acc[camelKey] = dateValue;
        }
      } else {
        // Para otros campos, realizar la conversión normal
        acc[camelKey] = this.toCamelCase(obj[key]);
      }
      
      return acc;
    }, {} as any);
  }

  // Método auxiliar para formatear fechas
  private formatDate(dateString: string): string {
    try {
      const date = new Date(dateString);
      if (!isNaN(date.getTime())) {
        return date.toISOString().split('T')[0];
      }
      return dateString;
    } catch {
      return dateString;
    }
  }
}
