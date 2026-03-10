import { Component, Input, inject } from '@angular/core';
import { SimulationService } from '../../services/simulation.service';
import { CustomerState } from '../../models/simulation.models';

@Component({
  selector: 'app-customer',
  imports: [],
  templateUrl: './customer.html',
  styleUrl: './customer.css',
})
export class Customer {
  @Input() customerId!: number;
  protected sim = inject(SimulationService);

  protected get customer(): CustomerState {
    return this.sim.customers().find(c => c.id === this.customerId)!;
  }
}
