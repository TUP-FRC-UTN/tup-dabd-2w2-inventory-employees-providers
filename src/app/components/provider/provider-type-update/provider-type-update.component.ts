import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule } from '@angular/forms';

@Component({
  selector: 'app-provider-type-update',
  standalone: true,
  imports: [ReactiveFormsModule],
  templateUrl: './provider-type-update.component.html',
  styleUrl: './provider-type-update.component.css'
})
export class ProviderTypeUpdateComponent  implements OnInit{

  @Input() serviceType: any; //Cambiar a ServiceType o lo que fuese
  @Output() closeModal = new EventEmitter<void>();
  @Output() showServiceTypeUpdate = new EventEmitter<void>();

  isModalOpen : boolean = true
  serviceTypeForm = new FormGroup({
    denomination : new FormControl(''),
    description : new FormControl('')
  })


  ngOnInit(): void {
    //Called after the constructor, initializing input properties, and the first call to ngOnChanges.
    //Add 'implements OnInit' to the class.
    
  }
  get denominationControl() {
    return this.serviceTypeForm.get('denomination');
  }

  get descriptionControl() {
    return this.serviceTypeForm.get('description');
  }
  saveServiceTypeChanges(){}
  onClose(){
    this.isModalOpen = false;
    this.closeModal.emit();
  }

}
