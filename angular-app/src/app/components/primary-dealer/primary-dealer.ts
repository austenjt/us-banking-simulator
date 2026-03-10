import { Component, inject } from '@angular/core';
import { SimulationService } from '../../services/simulation.service';

@Component({
  selector: 'app-primary-dealer',
  imports: [],
  templateUrl: './primary-dealer.html',
  styleUrl: './primary-dealer.css',
})
export class PrimaryDealer {
  protected sim = inject(SimulationService);
}
