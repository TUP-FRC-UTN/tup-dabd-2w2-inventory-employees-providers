export interface Supplier {
  id: number;             // Identificador único del proveedor
  name: string;           // Nombre del proveedor
  details?: string;       // Detalles adicionales sobre el proveedor (opcional)
  cuil: string;           // CUIL del proveedor
  service: string;        // Servicio que ofrece el proveedor
  contact: string;        // Contacto del proveedor
  address: string;        // Dirección del proveedor
  enabled: boolean;       // Si está activo o no
}
