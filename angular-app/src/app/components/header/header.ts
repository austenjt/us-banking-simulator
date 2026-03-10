import { Component, inject } from '@angular/core';
import { SimulationService } from '../../services/simulation.service';

@Component({
  selector: 'app-header',
  imports: [],
  templateUrl: './header.html',
  styleUrl: './header.css',
})
export class Header {
  protected sim = inject(SimulationService);

  onCapitalRatioChange(event: Event): void {
    const value = parseFloat((event.target as HTMLInputElement).value);
    if (value >= 0 && value <= 100) {
      this.sim.setMinCapitalRatio(value);
    } else {
      alert('Please enter a number between 0 and 100.');
      (event.target as HTMLInputElement).value = String(this.sim.minCapitalRatio());
    }
  }
}
