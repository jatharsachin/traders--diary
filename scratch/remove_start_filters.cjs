const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '..', 'src', 'store', 'useTradeStore.ts');
let content = fs.readFileSync(filePath, 'utf8');

// Normalize line endings to LF
content = content.replace(/\r\n/g, '\n');

// Find and replace the hardcoded financial year filter block and the state assignment
const oldFilterBlockRegex = /\/\/ Filter data to only retain current Financial Year[\s\S]*?syncMetaToCloud\('bank_transactions', filteredBankTx\);\s*\}/;

if (!oldFilterBlockRegex.test(content)) {
  console.error("Could not find current FY filtering block in useTradeStore.ts");
  process.exit(1);
}

content = content.replace(oldFilterBlockRegex, '');

// Now replace the set state parameters in loadUserData
const oldSetState = `      set({
        trades: filteredTrades,
        setups,
        baseCapital,
        capitalAdjustments: filteredAdjustments,
        investments,
        weeklyRetrospectives,
        userName,
        userAvatar,
        activeBrokers,
        defaultBroker: defaultBroker as Broker,
        brokerAccounts,
        bankAccounts,
        brokerCharges,
        subscriptionExpenses,
        bankTransactions: filteredBankTx,
      });`;

const newSetState = `      set({
        trades,
        setups,
        baseCapital,
        capitalAdjustments,
        investments,
        weeklyRetrospectives,
        userName,
        userAvatar,
        activeBrokers,
        defaultBroker: defaultBroker as Broker,
        brokerAccounts,
        bankAccounts,
        brokerCharges,
        subscriptionExpenses,
        bankTransactions,
      });`;

if (content.indexOf(oldSetState) === -1) {
  console.error("Could not find state setter block in useTradeStore.ts");
  process.exit(1);
}

content = content.replace(oldSetState, newSetState);

fs.writeFileSync(filePath, content, 'utf8');
console.log("Successfully removed hardcoded startup year constraints from useTradeStore.ts!");
