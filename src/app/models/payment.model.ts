/**
 *   {
    "id": 0,
    "service": "string",
    "paymentDate": "2024-11-04",
    "paymentMethod": "string",
    "amount": 0,
    "installmentNumber": 0,
    "installmentTotal": 0,
    "enabled": true
  }
 */

export interface Payment {
    id: number;                 //  identificador unico del pago
    service: string;            //  nombre del servicio al que se le paga
    paymentDate: Date;          //  fecha del pago
    paymentMethod: string;      //  metodo del pago
    amount: number;             //  cantidad del pago
    installmentNumber: number;  //  numero de cuota
    installmentTotal: number;   //  total de cuotas
    enabled: boolean;           //  manejo del borrado logico
}