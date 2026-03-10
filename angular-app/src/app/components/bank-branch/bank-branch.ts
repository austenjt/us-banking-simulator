import { Component, inject } from '@angular/core';
import { SimulationService } from '../../services/simulation.service';

@Component({
  selector: 'app-bank-branch',
  imports: [],
  templateUrl: './bank-branch.html',
  styleUrl: './bank-branch.css',
})
export class BankBranch {
  protected sim = inject(SimulationService);
  protected Math = Math;
}
