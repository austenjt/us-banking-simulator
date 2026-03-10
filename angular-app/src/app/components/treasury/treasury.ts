import { Component, inject } from '@angular/core';
import { SimulationService } from '../../services/simulation.service';

@Component({
  selector: 'app-treasury',
  imports: [],
  templateUrl: './treasury.html',
  styleUrl: './treasury.css',
})
export class Treasury {
  protected sim = inject(SimulationService);
}
