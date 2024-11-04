// Definimos la interfaz Service para representar un servicio en el sistema.
export interface Service {
    id: number;             // Identificador único del servicio
    name: string;           // Nombre del servicio
    details?: string;       // Detalles adicionales sobre el servicio (opcional)
    cuit: string;           // CUIL del proveedor del servicio
    type: string;           // Tipo de servicio
    contact: string;        // Contacto del proveedor del servicio
    address: string;        // Dirección del proveedor del servicio
    enabled: boolean;       // Si está activo o no
  }