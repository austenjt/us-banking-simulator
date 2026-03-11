import { Component, inject } from '@angular/core';
import { SimulationService } from '../../services/simulation.service';

@Component({
  selector: 'app-money-supply',
  imports: [],
  templateUrl: './money-supply.html',
  styleUrl: './money-supply.css',
})
export class MoneySupply {
  protected sim = inject(SimulationService);
}
