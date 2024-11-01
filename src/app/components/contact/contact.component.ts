import { Component, OnInit } from '@angular/core';
import { FormArray, FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ContactService } from '../../services/contact.service';
import { AdressService } from '../../services/adress.service';

@Component({
  selector: 'app-contact',
  standalone: true,
  imports: [ReactiveFormsModule],
  templateUrl: './contact.component.html',
  styleUrl: './contact.component.css'
})
export class ContactComponent implements OnInit {

  contactsForm: FormGroup;
  adressForm: FormGroup;

  constructor(    
    private fb: FormBuilder,
    private contactService: ContactService,
    private adressService: AdressService)
    {

    this.contactsForm = this.fb.group({
      contacts: this.fb.array([this.createContactFormGroup()])
    });
    this.adressForm = this.fb.group({});
  }

  get contacts(): FormArray {
    return this.contactsForm.get('contacts') as FormArray;
  }

    ngOnInit(): void {
        this.contactService.getContacts().subscribe((data) => {
            this.contactsForm = this.fb.group(data);
        });

        this.adressService.getAdress().subscribe((data) => {
            this.adressForm = this.fb.group(data);
        });

    }

    onSubmitContact(){
      this.contactService.updateContact(this.contactsForm.value.contacts).subscribe();
    }
    onSubmitAddress() {
      // Handle address form submission
      this.adressService.updateAddress(this.adressForm.value).subscribe();
    }
    addContact(): void {
      this.contacts.push(this.createContactFormGroup());
    }

    createContactFormGroup(): FormGroup {
      return this.fb.group({
        contactValue: ['', Validators.required],
        contactType: ['EMAIL', Validators.required]
      });
    }
}
