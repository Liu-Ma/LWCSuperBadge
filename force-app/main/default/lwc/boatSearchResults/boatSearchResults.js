import { LightningElement, api, wire } from 'lwc';
import { getRecord, updateRecord } from 'lightning/uiRecordApi';
import { ShowToastEvent } from 'lightning/platformShowToastEvent';
import { MessageContext, publish } from 'lightning/messageService';
import { refreshApex } from '@salesforce/apex';

import BOATMC from '@salesforce/messageChannel/BoatMessageChannel__c';
import getBoats from '@salesforce/apex/BoatDataService.getBoats';

// ...
const SUCCESS_TITLE = 'Success';
const MESSAGE_SHIP_IT     = 'Ship it!';
const SUCCESS_VARIANT     = 'success';
const ERROR_TITLE   = 'Error';
const ERROR_VARIANT = 'error';

export default class BoatSearchResults extends LightningElement {
  selectedBoatId;
  columns = [{ label: 'Name', fieldName: 'Name', type: 'text', editable : 'true'},
             { label: 'Length', fieldName: 'Length__c', type: 'text', editable : 'true'},
             { label: 'Price', fieldName: 'Price__c', type: 'currency', editable : 'true' },
             { label: 'Description', fieldName: 'Description__c', type: 'text', editable : 'true'} ];
  boatTypeId = '';
  boats;
  isLoading = false;
  draftValues = [];
  
  // wired message context
  @wire(MessageContext)
  messageContext;
  // wired getBoats method 
  @wire(getBoats, { boatTypeId: '$boatTypeId'})  
  wiredBoats(result) {
    this.boats=result;
  }
  
  // public function that updates the existing boatTypeId property
  // uses notifyLoading
  @api
  searchBoats(boatTypeId) { 
    this.boatTypeId=boatTypeId;
    this.notifyLoading(true);
  }
  
  // this public function must refresh the boats asynchronously
  // uses notifyLoading
  @api async refresh() { 
    refreshApex(this.boats);
    this.notifyLoading(true);
  }
  
  // this function must update selectedBoatId and call sendMessageService
  updateSelectedTile(event) { 
    this.selectedBoatId=event.detail.boatId;
    this.sendMessageService(this.selectedBoatId);
  }
  
  // Publishes the selected boat Id on the BoatMC.
  sendMessageService(boatId) { 
    // explicitly pass boatId to the parameter recordId
    const message = {recordId: boatId};
    publish(this.messageContext, BOATMC, message);
  }
  
  // This method must save the changes in the Boat Editor
  // Show a toast message with the title
  // clear lightning-datatable draft values
  handleSave(event) {
    console.log('enteredHandleSave');
    const recordInputs = event.detail.draftValues.slice().map(draft => {
        const fields = Object.assign({}, draft);
        console.log(draft);
        console.log(fields);
        return { fields };
    });
    const promises = recordInputs.map(recordInput =>
            //update boat record
            updateRecord(recordInput)
        );
    Promise.all(promises)
        .then(() => {
          
          console.log('.THEN ENTERED');
            this.dispatchEvent(
                new ShowToastEvent({
                    title: SUCCESS_TITLE,
                    message: MESSAGE_SHIP_IT,
                    variant: SUCCESS_VARIANT
                })
            );
            this.draftValues = [];
            this.refresh();
        })
        .catch(error => {
          console.log('.ERROR CAUGHT');
            this.dispatchEvent(
                new ShowToastEvent({
                    title: ERROR_TITLE,
                    message: error.body.message,
                    variant: ERROR_VARIANT
                })
            )
        })
        .finally(() => {
          console.log('.FINALLY ENTERED');
        });
  }
  // Check the current value of isLoading before dispatching the doneloading or loading custom event
  notifyLoading(isLoading) { 
      if(isLoading) {
        this.dispatchEvent(new CustomEvent('doneloading'));
      }else{
        this.dispatchEvent(new CustomEvent('loading'));
      }
  }
}