import { Component } from '@angular/core';
import { Header } from './components/header/header';
import { Customer } from './components/customer/customer';
import { BankBranch } from './components/bank-branch/bank-branch';
import { PrimaryDealer } from './components/primary-dealer/primary-dealer';
import { FederalReserve } from './components/federal-reserve/federal-reserve';
import { Treasury } from './components/treasury/treasury';
import { TransactionLog } from './components/transaction-log/transaction-log';

@Component({
  selector: 'app-root',
  imports: [Header, Customer, BankBranch, PrimaryDealer, FederalReserve, Treasury, TransactionLog],
  templateUrl: './app.html',
  styleUrl: './app.css',
})
export class App {}
