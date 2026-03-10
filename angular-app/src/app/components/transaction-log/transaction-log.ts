import { Component, ElementRef, ViewChild, effect, inject } from '@angular/core';
import { SimulationService } from '../../services/simulation.service';

@Component({
  selector: 'app-transaction-log',
  imports: [],
  templateUrl: './transaction-log.html',
  styleUrl: './transaction-log.css',
})
export class TransactionLog {
  protected sim = inject(SimulationService);

  @ViewChild('logContainer') logContainer?: ElementRef<HTMLDivElement>;

  constructor() {
    effect(() => {
      this.sim.log();
      setTimeout(() => {
        if (this.logContainer?.nativeElement) {
          this.logContainer.nativeElement.scrollTop = this.logContainer.nativeElement.scrollHeight;
        }
      });
    });
  }
}
