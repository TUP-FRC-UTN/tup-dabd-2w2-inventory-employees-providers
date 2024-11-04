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