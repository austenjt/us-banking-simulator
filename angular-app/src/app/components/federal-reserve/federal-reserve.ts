import { Component, inject } from '@angular/core';
import { SimulationService } from '../../services/simulation.service';

@Component({
  selector: 'app-federal-reserve',
  imports: [],
  templateUrl: './federal-reserve.html',
  styleUrl: './federal-reserve.css',
})
export class FederalReserve {
  protected sim = inject(SimulationService);
}
