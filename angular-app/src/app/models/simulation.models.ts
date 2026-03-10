export interface FedState {
  tBillAssets: number;          // Assets: T-Bills in SOMA portfolio (count)
  discountWindowLoans: number;  // Assets: outstanding loans to banks
  iorb: number;                 // Interest on Reserve Balances (policy rate %)
}

export interface BankState {
  reserveBalance: number;       // Assets: account at the Fed
  loanAssets: number;           // Assets: loans outstanding to customers
  tBills: number;               // Assets: T-Bills held (count)
  depositLiabilities: number;   // Liabilities: owed to customers
  discountWindowDebt: number;   // Liabilities: owed to Fed (discount window)
}

export interface CustomerState {
  id: number;
  deposits: number;
  cash: number;
  loanLiabilities: number;
  properties: number;
  tBills: number;
}

export interface TreasuryState {
  tBillsOutstanding: number;   // Liabilities: total T-Bills issued (count)
  tBillsInventory: number;     // T-Bills created but not yet sold (count)
  tga: number;                 // Assets: Treasury General Account balance at Fed
}

export interface PrimaryDealerState {
  tBills: number;              // T-Bills in inventory (count)
  reserveBalance: number;      // Cash (held at their custodian bank)
}

export interface LogEntry {
  time: string;
  message: string;
}
