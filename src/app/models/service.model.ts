//  Interfaz Service para representar un servicio de proveedores, 
//  esta es la Empresa o ente al que puede pertenecer un proveedor
export interface Service {
    id: number;             // Identificador unico del servicio
    name: string;           // Nombre del servicio
    details?: string;       // Detalles adicionales sobre el servicio (opcional)
    cuit: string;           // CUIT del servicio (no confundir con CUIL del proveedor)
    type: string;           // Tipo de servicio
    contact: string;        // Numero de telefono del servicio, empresa, o ente
    address: string;        // Calle, numero, altura y/o ubicacion de donde esta este servicio
    enabled: boolean;       // Maneja el borrado logico
  }