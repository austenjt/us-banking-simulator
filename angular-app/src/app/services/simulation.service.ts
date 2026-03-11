import { Injectable, computed, signal } from '@angular/core';
import {
  BankState,
  CustomerState,
  FedState,
  LogEntry,
  PrimaryDealerState,
  TreasuryState,
} from '../models/simulation.models';

const TBILL_VALUE = 1000;

@Injectable({ providedIn: 'root' })
export class SimulationService {
  // ── State signals ──────────────────────────────────────────────────────────

  readonly fed = signal<FedState>({
    tBillAssets: 0,
    discountWindowLoans: 0,
    iorb: 5,
  });

  // Bank starts with lots of excess reserves (reflects post-QE reality).
  // depositLiabilities matches the sum of all customer starting deposits (5000+3000).
  // Equity = reserveBalance - depositLiabilities = 50000 - 8000 = $42,000.
  readonly bank = signal<BankState>({
    reserveBalance: 50000,
    loanAssets: 0,
    tBills: 0,
    depositLiabilities: 8000,
    discountWindowDebt: 0,
  });

  readonly customers = signal<CustomerState[]>([
    { id: 1, deposits: 5000, cash: 0, loanLiabilities: 0, properties: 0, tBills: 0 },
    { id: 2, deposits: 3000, cash: 0, loanLiabilities: 0, properties: 0, tBills: 0 },
  ]);

  readonly treasury = signal<TreasuryState>({
    tBillsOutstanding: 0,
    tBillsInventory: 0,
    tga: 0,
  });

  // Primary dealers have their own cash (held at their custodian bank).
  readonly primaryDealer = signal<PrimaryDealerState>({
    tBills: 0,
    reserveBalance: 20000,
  });

  readonly log = signal<LogEntry[]>([]);

  // Capital constraint (replaces obsolete reserve ratio).
  // Reserve requirements were eliminated March 2020. Modern lending is constrained
  // by capital requirements (Basel III). Default 8% = standard Tier-1 minimum.
  readonly minCapitalRatio = signal<number>(8);
  readonly constraintLocked = signal<boolean>(false);

  // ── Derived / computed ─────────────────────────────────────────────────────

  /** Total reserve balances the Fed owes to the banking system (its liability). */
  readonly fedReserveBalances = computed(
    () => this.bank().reserveBalance + this.primaryDealer().reserveBalance
  );

  readonly bankEquity = computed(() => {
    const b = this.bank();
    return (
      b.reserveBalance +
      b.loanAssets +
      b.tBills * TBILL_VALUE -
      b.depositLiabilities -
      b.discountWindowDebt
    );
  });

  readonly bankTotalAssets = computed(() => {
    const b = this.bank();
    return b.reserveBalance + b.loanAssets + b.tBills * TBILL_VALUE;
  });

  readonly bankCapitalRatio = computed(() => {
    const assets = this.bankTotalAssets();
    if (assets === 0) return 100;
    return (this.bankEquity() / assets) * 100;
  });

  readonly currencyInCirculation = computed(() =>
    this.customers().reduce((sum, c) => sum + c.cash, 0)
  );

  /** M1: demand deposits + currency in circulation. */
  readonly m1 = computed(() =>
    this.customers().reduce((sum, c) => sum + c.deposits + c.cash, 0)
  );

  /** Monetary base (M0): system reserves + currency in circulation. */
  readonly monetaryBase = computed(() =>
    this.fedReserveBalances() + this.currencyInCirculation()
  );

  /** Total face value of all outstanding Treasury T-Bills. */
  readonly nationalDebt = computed(() =>
    this.treasury().tBillsOutstanding * TBILL_VALUE
  );

  /** Total customer loan liabilities. */
  readonly totalPrivateDebt = computed(() =>
    this.customers().reduce((sum, c) => sum + c.loanLiabilities, 0)
  );

  // ── Infrastructure ─────────────────────────────────────────────────────────

  setMinCapitalRatio(value: number): void {
    if (!this.constraintLocked()) this.minCapitalRatio.set(value);
  }

  private lockConstraint(): void {
    if (!this.constraintLocked()) this.constraintLocked.set(true);
  }

  private logTransaction(message: string): void {
    this.log.update(entries => [
      ...entries,
      { time: new Date().toLocaleTimeString(), message },
    ]);
  }

  private updateCustomer(id: number, updater: (c: CustomerState) => CustomerState): void {
    this.customers.update(cs => cs.map(c => (c.id === id ? updater(c) : c)));
  }

  // ── Customer operations ────────────────────────────────────────────────────

  depositPaycheck(customerId: number): void {
    this.lockConstraint();
    const paycheck = Math.floor(Math.random() * 2000) + 1000;
    // Employer's bank transfers reserves to our bank; customer deposit grows.
    this.updateCustomer(customerId, c => ({ ...c, deposits: c.deposits + paycheck }));
    this.bank.update(b => ({
      ...b,
      depositLiabilities: b.depositLiabilities + paycheck,
      reserveBalance: b.reserveBalance + paycheck,
    }));
    this.logTransaction(
      `Customer ${customerId} received paycheck $${paycheck}. Employer's bank transferred reserves; new deposit created.`
    );
  }

  withdrawCash(customerId: number): void {
    this.lockConstraint();
    const amount = Math.floor(Math.random() * 500) + 100;
    const customer = this.customers().find(c => c.id === customerId)!;
    if (customer.deposits >= amount && this.bank().reserveBalance >= amount) {
      this.updateCustomer(customerId, c => ({
        ...c,
        deposits: c.deposits - amount,
        cash: c.cash + amount,
      }));
      // Reserves leave the banking system and become currency in circulation.
      this.bank.update(b => ({
        ...b,
        depositLiabilities: b.depositLiabilities - amount,
        reserveBalance: b.reserveBalance - amount,
      }));
      this.logTransaction(
        `Customer ${customerId} withdrew $${amount} cash. Reserves converted to currency in circulation.`
      );
    } else {
      this.logTransaction(
        `Customer ${customerId} withdrawal of $${amount} failed — insufficient funds.`
      );
    }
  }

  depositCash(customerId: number): void {
    this.lockConstraint();
    const amount = Math.floor(Math.random() * 500) + 100;
    const customer = this.customers().find(c => c.id === customerId)!;
    if (customer.cash >= amount) {
      this.updateCustomer(customerId, c => ({
        ...c,
        cash: c.cash - amount,
        deposits: c.deposits + amount,
      }));
      // Currency re-enters banking system; reserves increase.
      this.bank.update(b => ({
        ...b,
        depositLiabilities: b.depositLiabilities + amount,
        reserveBalance: b.reserveBalance + amount,
      }));
      this.logTransaction(
        `Customer ${customerId} deposited $${amount} cash. Currency converted back to reserves.`
      );
    } else {
      this.logTransaction(
        `Customer ${customerId} cash deposit of $${amount} failed — insufficient cash.`
      );
    }
  }

  /**
   * KEY FIX: Loans create deposits (endogenous money creation).
   * The bank does NOT lend out existing reserves. It simultaneously creates
   * a loan asset and a new deposit liability. Reserves are untouched at
   * origination; they only move later when the borrower spends.
   * Constraint: capital ratio (equity / total assets), NOT reserves.
   */
  requestPropertyLoan(customerId: number): void {
    this.lockConstraint();
    const loanAmount = Math.floor(Math.random() * 20000) + 5000;
    const bank = this.bank();
    const equity = this.bankEquity();
    const newTotalAssets = this.bankTotalAssets() + loanAmount;
    const projectedCapRatio = newTotalAssets > 0 ? (equity / newTotalAssets) * 100 : 100;
    const minCap = this.minCapitalRatio();

    if (projectedCapRatio >= minCap) {
      let propNum = 0;
      this.customers.update(cs =>
        cs.map(c => {
          if (c.id === customerId) {
            propNum = c.properties + 1;
            return {
              ...c,
              properties: propNum,
              loanLiabilities: c.loanLiabilities + loanAmount,
              deposits: c.deposits + loanAmount, // ← new money: the loan IS the deposit
            };
          }
          return c;
        })
      );
      // Bank creates both sides simultaneously. Reserves do NOT change.
      this.bank.update(b => ({
        ...b,
        loanAssets: b.loanAssets + loanAmount,           // new asset
        depositLiabilities: b.depositLiabilities + loanAmount, // new liability = new money
      }));
      this.logTransaction(
        `Customer ${customerId} mortgage loan $${loanAmount} for property #${propNum}. ` +
        `Bank created $${loanAmount} NEW money (deposit). Reserves unchanged. ` +
        `Capital ratio: ${projectedCapRatio.toFixed(1)}%.`
      );
    } else {
      this.logTransaction(
        `Customer ${customerId} loan of $${loanAmount} denied — capital ratio too low ` +
        `(projected ${projectedCapRatio.toFixed(1)}% < min ${minCap}%). Bank needs more equity.`
      );
    }
  }

  customerBuyTBill(customerId: number): void {
    this.lockConstraint();
    const customer = this.customers().find(c => c.id === customerId)!;
    if (this.treasury().tBillsInventory === 0) {
      this.treasury.update(t => ({
        ...t,
        tBillsOutstanding: t.tBillsOutstanding + 1,
        tBillsInventory: t.tBillsInventory + 1,
      }));
      this.logTransaction(`Treasury auto-issued a T-Bill for Customer ${customerId}.`);
    }
    if (customer.deposits >= TBILL_VALUE) {
      this.updateCustomer(customerId, c => ({
        ...c,
        deposits: c.deposits - TBILL_VALUE,
        tBills: c.tBills + 1,
      }));
      // Customer pays from bank account → reserves move from bank to TGA.
      this.bank.update(b => ({
        ...b,
        depositLiabilities: b.depositLiabilities - TBILL_VALUE,
        reserveBalance: b.reserveBalance - TBILL_VALUE,
      }));
      this.treasury.update(t => ({
        ...t,
        tBillsInventory: t.tBillsInventory - 1,
        tga: t.tga + TBILL_VALUE,
      }));
      this.logTransaction(
        `Customer ${customerId} bought T-Bill via TreasuryDirect $${TBILL_VALUE}. ` +
        `Reserves moved to TGA. System reserves decreased.`
      );
    } else {
      this.logTransaction(`Customer ${customerId} T-Bill purchase denied — insufficient deposits.`);
    }
  }

  customerSellTBill(customerId: number): void {
    this.lockConstraint();
    const customer = this.customers().find(c => c.id === customerId)!;
    if (customer.tBills > 0 && this.treasury().tga >= TBILL_VALUE) {
      this.updateCustomer(customerId, c => ({
        ...c,
        tBills: c.tBills - 1,
        deposits: c.deposits + TBILL_VALUE,
      }));
      // Redemption: TGA funds flow back into banking system as reserves.
      this.bank.update(b => ({
        ...b,
        depositLiabilities: b.depositLiabilities + TBILL_VALUE,
        reserveBalance: b.reserveBalance + TBILL_VALUE,
      }));
      this.treasury.update(t => ({
        ...t,
        tga: t.tga - TBILL_VALUE,
        tBillsOutstanding: t.tBillsOutstanding - 1,
      }));
      this.logTransaction(
        `Customer ${customerId} redeemed T-Bill $${TBILL_VALUE}. TGA funded redemption; reserves restored.`
      );
    } else if (customer.tBills === 0) {
      this.logTransaction(`Customer ${customerId} has no T-Bills to redeem.`);
    } else {
      this.logTransaction(`Customer ${customerId} redemption denied — TGA insufficient.`);
    }
  }

  // ── Bank operations ────────────────────────────────────────────────────────

  /**
   * KEY FIX: Discount window — Fed creates NEW reserves (not depleting a pool).
   * The Fed has no finite reserve tank. It creates reserves as an accounting entry.
   * The bank incurs a liability (must repay). The Fed records a loan asset.
   */
  bankBorrowFromFed(): void {
    this.lockConstraint();
    // No depletion check — the Fed can always create reserves.
    this.bank.update(b => ({
      ...b,
      reserveBalance: b.reserveBalance + TBILL_VALUE,
      discountWindowDebt: b.discountWindowDebt + TBILL_VALUE,
    }));
    this.fed.update(f => ({
      ...f,
      discountWindowLoans: f.discountWindowLoans + TBILL_VALUE, // new asset
      // reserveBalances (computed) automatically increases via bank.reserveBalance
    }));
    this.logTransaction(
      `Bank borrowed $${TBILL_VALUE} from Fed discount window. ` +
      `Fed created $${TBILL_VALUE} in NEW reserves as an accounting entry. Bank now has a repayment obligation.`
    );
  }

  bankRepayFed(): void {
    this.lockConstraint();
    const bank = this.bank();
    if (bank.discountWindowDebt >= TBILL_VALUE && bank.reserveBalance >= TBILL_VALUE) {
      this.bank.update(b => ({
        ...b,
        reserveBalance: b.reserveBalance - TBILL_VALUE,
        discountWindowDebt: b.discountWindowDebt - TBILL_VALUE,
      }));
      this.fed.update(f => ({
        ...f,
        discountWindowLoans: f.discountWindowLoans - TBILL_VALUE,
      }));
      this.logTransaction(
        `Bank repaid $${TBILL_VALUE} to Fed. $${TBILL_VALUE} in reserves destroyed (unwound).`
      );
    } else if (bank.discountWindowDebt < TBILL_VALUE) {
      this.logTransaction(`Bank has no discount window debt to repay.`);
    } else {
      this.logTransaction(`Bank repayment failed — insufficient reserves.`);
    }
  }

  /**
   * KEY FIX: Bank buys T-Bills in the SECONDARY MARKET from the Primary Dealer —
   * not from Treasury directly. Reserves transfer (bank → dealer); no new reserves created.
   */
  bankBuyTBillFromDealer(): void {
    this.lockConstraint();
    const dealer = this.primaryDealer();
    if (this.bank().reserveBalance >= TBILL_VALUE && dealer.tBills > 0) {
      // Reserves transfer from bank to dealer. Net system reserves: unchanged.
      this.bank.update(b => ({
        ...b,
        reserveBalance: b.reserveBalance - TBILL_VALUE,
        tBills: b.tBills + 1,
      }));
      this.primaryDealer.update(d => ({
        ...d,
        tBills: d.tBills - 1,
        reserveBalance: d.reserveBalance + TBILL_VALUE,
      }));
      this.logTransaction(
        `Bank bought T-Bill from Primary Dealer (secondary market) $${TBILL_VALUE}. ` +
        `Reserves transferred bank → dealer. System reserves unchanged.`
      );
    } else if (dealer.tBills === 0) {
      this.logTransaction(`Primary Dealer has no T-Bills to sell.`);
    } else {
      this.logTransaction(`Bank has insufficient reserves to buy T-Bill.`);
    }
  }

  bankSellTBillToDealer(): void {
    this.lockConstraint();
    const dealer = this.primaryDealer();
    if (this.bank().tBills > 0 && dealer.reserveBalance >= TBILL_VALUE) {
      this.bank.update(b => ({
        ...b,
        tBills: b.tBills - 1,
        reserveBalance: b.reserveBalance + TBILL_VALUE,
      }));
      this.primaryDealer.update(d => ({
        ...d,
        tBills: d.tBills + 1,
        reserveBalance: d.reserveBalance - TBILL_VALUE,
      }));
      this.logTransaction(
        `Bank sold T-Bill to Primary Dealer (secondary market). Reserves transferred dealer → bank.`
      );
    } else if (this.bank().tBills === 0) {
      this.logTransaction(`Bank has no T-Bills to sell.`);
    } else {
      this.logTransaction(`Primary Dealer has insufficient funds.`);
    }
  }

  // ── Primary Dealer operations ──────────────────────────────────────────────

  /**
   * Primary Dealer buys T-Bills at Treasury AUCTION.
   * PDs are required to bid at every auction. Reserves move from dealer's
   * bank account to the Treasury General Account (TGA). System reserves decrease.
   */
  dealerBuyTBillAtAuction(): void {
    this.lockConstraint();
    if (this.treasury().tBillsInventory === 0) {
      this.logTransaction(`No T-Bills available at auction. Treasury must create one first.`);
      return;
    }
    if (this.primaryDealer().reserveBalance < TBILL_VALUE) {
      this.logTransaction(`Primary Dealer has insufficient funds for auction.`);
      return;
    }
    this.primaryDealer.update(d => ({
      ...d,
      tBills: d.tBills + 1,
      reserveBalance: d.reserveBalance - TBILL_VALUE,
    }));
    this.treasury.update(t => ({
      ...t,
      tBillsInventory: t.tBillsInventory - 1,
      tga: t.tga + TBILL_VALUE,
    }));
    // fedReserveBalances (computed) decreases because dealer.reserveBalance decreased.
    // TGA (at Fed) increased by same amount. Net Fed liabilities: unchanged.
    this.logTransaction(
      `Primary Dealer bought T-Bill at Treasury auction $${TBILL_VALUE}. ` +
      `Reserves moved from dealer's bank → TGA. System reserves decreased.`
    );
  }

  // ── Federal Reserve operations ─────────────────────────────────────────────

  /**
   * KEY FIX: Fed buys T-Bills from Primary Dealer in the SECONDARY MARKET (OMO).
   * PROHIBITED to buy directly from Treasury. New reserves are created from nothing.
   */
  fedBuyTBillFromDealer(): void {
    this.lockConstraint();
    if (this.primaryDealer().tBills === 0) {
      this.logTransaction(`Primary Dealer has no T-Bills to sell to the Fed.`);
      return;
    }
    this.primaryDealer.update(d => ({
      ...d,
      tBills: d.tBills - 1,
      reserveBalance: d.reserveBalance + TBILL_VALUE,
    }));
    this.fed.update(f => ({
      ...f,
      tBillAssets: f.tBillAssets + 1,
      // reserveBalances (computed) auto-increases via dealer.reserveBalance
    }));
    this.logTransaction(
      `Fed bought T-Bill from Primary Dealer (OMO) $${TBILL_VALUE}. ` +
      `$${TBILL_VALUE} in NEW reserves created as an accounting entry. Fed balance sheet EXPANDED.`
    );
  }

  /** Fed sells T-Bills to Primary Dealer (Quantitative Tightening). Reserves destroyed. */
  fedSellTBillToDealer(): void {
    this.lockConstraint();
    if (this.fed().tBillAssets === 0) {
      this.logTransaction(`Fed has no T-Bills to sell (SOMA empty).`);
      return;
    }
    if (this.primaryDealer().reserveBalance < TBILL_VALUE) {
      this.logTransaction(`Primary Dealer has insufficient funds to buy from Fed.`);
      return;
    }
    this.fed.update(f => ({ ...f, tBillAssets: f.tBillAssets - 1 }));
    this.primaryDealer.update(d => ({
      ...d,
      tBills: d.tBills + 1,
      reserveBalance: d.reserveBalance - TBILL_VALUE,
    }));
    // fedReserveBalances (computed) decreases. Reserves destroyed.
    this.logTransaction(
      `Fed sold T-Bill to Primary Dealer (QT) $${TBILL_VALUE}. ` +
      `$${TBILL_VALUE} in reserves DESTROYED. Fed balance sheet CONTRACTED.`
    );
  }

  // ── Treasury operations ────────────────────────────────────────────────────

  createTBill(): void {
    this.lockConstraint();
    this.treasury.update(t => ({
      ...t,
      tBillsOutstanding: t.tBillsOutstanding + 1,
      tBillsInventory: t.tBillsInventory + 1,
    }));
    this.logTransaction(`US Treasury created a new T-Bill (not yet sold — still in inventory).`);
  }

  /**
   * Treasury spends from TGA (e.g., government wages, contracts, benefits).
   * This is the fiscal channel: TGA decreases, bank reserves increase.
   * Customer 1 receives the payment as a concrete example.
   */
  treasurySpend(): void {
    this.lockConstraint();
    if (this.treasury().tga < TBILL_VALUE) {
      this.logTransaction(`Treasury spending denied — TGA balance insufficient.`);
      return;
    }
    this.treasury.update(t => ({ ...t, tga: t.tga - TBILL_VALUE }));
    this.updateCustomer(1, c => ({ ...c, deposits: c.deposits + TBILL_VALUE }));
    this.bank.update(b => ({
      ...b,
      depositLiabilities: b.depositLiabilities + TBILL_VALUE,
      reserveBalance: b.reserveBalance + TBILL_VALUE,
    }));
    this.logTransaction(
      `Treasury spent $${TBILL_VALUE} from TGA → Customer 1 received $${TBILL_VALUE} deposit. ` +
      `Reserves injected into banking system (fiscal spending = reserve injection).`
    );
  }
}
